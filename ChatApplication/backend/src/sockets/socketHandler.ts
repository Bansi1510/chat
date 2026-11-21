import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config/prisma';
import * as chatService from '../modules/chat/chat.service';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  authContext?: {
    userId: string;
    sessionId: string;
    role: string;
  };
}

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function setupSocketIO(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }
      const auth = await authenticateToken(token);
      socket.authContext = auth;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const auth = socket.authContext!;
    const userId = auth.userId;

    // Join personal room for 1:1 notifications & call signalling
    socket.join(`user:${userId}`);

    // Update user presence
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
    io.emit('user:status', { userId, status: 'online' });

    // Join user's conversations
    const userConvos = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    userConvos.forEach((c) => socket.join(`conversation:${c.conversationId}`));

    logger.info(`User connected to socket: ${userId}`);

    // Typing and Recording indicator
    socket.on('chat:typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('chat:recording', (data: { conversationId: string; isRecording: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('chat:recording', {
        conversationId: data.conversationId,
        userId,
        isRecording: data.isRecording,
      });
    });

    // Real-time message sending
    socket.on('message:send', async (data: any, callback) => {
      try {
        const msg = await chatService.sendMessage(userId, data);
        io.to(`conversation:${data.conversationId}`).emit('message:new', msg);
        if (callback) callback({ success: true, message: msg });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Delivery & Read acknowledgements
    socket.on('message:delivered', async (data: { messageIds: string[]; conversationId: string }) => {
      await chatService.markAsDelivered(userId, data.messageIds);
      socket.to(`conversation:${data.conversationId}`).emit('message:delivered', {
        messageIds: data.messageIds,
        userId,
      });
    });

    socket.on('message:read', async (data: { messageIds: string[]; conversationId: string }) => {
      await chatService.markAsRead(userId, data.messageIds);
      socket.to(`conversation:${data.conversationId}`).emit('message:read', {
        messageIds: data.messageIds,
        userId,
      });
    });

    // WebRTC E2EE Signalling
    socket.on('call:offer', (data: { targetUserId: string; offer: any; type: 'audio' | 'video'; dtlsFingerprint?: string }) => {
      socket.to(`user:${data.targetUserId}`).emit('call:incoming', {
        callerId: userId,
        offer: data.offer,
        type: data.type,
        dtlsFingerprint: data.dtlsFingerprint,
      });
    });

    socket.on('call:answer', (data: { targetUserId: string; answer: any; dtlsFingerprint?: string }) => {
      socket.to(`user:${data.targetUserId}`).emit('call:answered', {
        calleeId: userId,
        answer: data.answer,
        dtlsFingerprint: data.dtlsFingerprint,
      });
    });

    socket.on('call:ice-candidate', (data: { targetUserId: string; candidate: any }) => {
      socket.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
        fromUserId: userId,
        candidate: data.candidate,
      });
    });

    socket.on('call:end', (data: { targetUserId: string }) => {
      socket.to(`user:${data.targetUserId}`).emit('call:ended', { fromUserId: userId });
    });

    // Live Location streaming
    socket.on('location:stream', (data: { conversationId: string; latitude: number; longitude: number }) => {
      socket.to(`conversation:${data.conversationId}`).emit('location:update', {
        conversationId: data.conversationId,
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    });

    socket.on('disconnect', async () => {
      const now = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: now },
      });
      io.emit('user:status', { userId, status: 'offline', lastSeenAt: now });
      logger.info(`User disconnected: ${userId}`);
    });
  });

  return io;
}
