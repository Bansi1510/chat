import { Types } from 'mongoose';
import { Conversation } from '../../models/Conversation';
import { Message, MessageType } from '../../models/Message';
import { AppError } from '../../utils/AppError';

export async function getConversations(userId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const convos = await Conversation.find({ participants: userObjectId })
    .populate('participants', 'username avatarUrl lastSeenAt')
    .sort({ lastMessageAt: -1 })
    .lean();

  const results = await Promise.all(
    convos.map(async (c) => {
      const peer = c.participants.find((p: any) => p._id.toString() !== userId) as any;
      const lastMsg = await Message.findOne({
        conversationId: c._id,
        deletedFor: { $ne: userObjectId },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .sort({ createdAt: -1 })
        .lean();

      const unreadCount = await Message.countDocuments({
        conversationId: c._id,
        senderId: { $ne: userObjectId },
        readBy: { $ne: userObjectId },
        deletedFor: { $ne: userObjectId },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });

      return {
        id: c._id.toString(),
        peer: peer
          ? {
              id: peer._id.toString(),
              username: peer.username,
              avatarUrl: peer.avatarUrl || null,
              lastSeenAt: peer.lastSeenAt || null,
            }
          : null,
        disappearingSeconds: c.disappearingSeconds || 0,
        pinned: (c.pinnedBy || []).some((id: any) => id.toString() === userId),
        muted: (c.mutedBy || []).some((id: any) => id.toString() === userId),
        lastMessage: lastMsg
          ? {
              id: lastMsg._id.toString(),
              senderId: lastMsg.senderId.toString(),
              ciphertext: lastMsg.ciphertext,
              type: lastMsg.type,
              createdAt: lastMsg.createdAt,
              delivered: lastMsg.deliveredTo.length > 0,
              read: lastMsg.readBy.length > 0,
            }
          : null,
        unreadCount,
      };
    })
  );

  return results;
}

export async function getMessages(
  userId: string,
  conversationId: string,
  before?: string,
  limit = 50
) {
  const userObjectId = new Types.ObjectId(userId);
  const convo = await Conversation.findOne({
    _id: conversationId,
    participants: userObjectId,
  });
  if (!convo) throw AppError.notFound('Conversation not found');

  const query: any = {
    conversationId: new Types.ObjectId(conversationId),
    deletedFor: { $ne: userObjectId },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages.reverse().map((m) => ({
    id: m._id.toString(),
    conversationId: m.conversationId.toString(),
    senderId: m.senderId.toString(),
    clientMsgId: m.clientMsgId,
    ciphertext: m.ciphertext,
    type: m.type,
    mediaUrl: m.mediaUrl,
    mediaMeta: m.mediaMeta,
    replyToId: m.replyToId?.toString() || null,
    forwarded: m.forwarded,
    edited: m.edited,
    editedAt: m.editedAt,
    reactions: m.reactions || [],
    starred: (m.starredBy || []).some((id: any) => id.toString() === userId),
    delivered: (m.deliveredTo || []).length > 0,
    read: (m.readBy || []).length > 0,
    deletedForEveryone: m.deletedForEveryone,
    expiresAt: m.expiresAt,
    createdAt: m.createdAt,
  }));
}

export async function sendMessage(
  senderId: string,
  data: {
    conversationId: string;
    clientMsgId: string;
    ciphertext: string;
    type?: MessageType;
    mediaUrl?: string;
    mediaMeta?: any;
    replyToId?: string;
    forwarded?: boolean;
    isScheduled?: boolean;
    scheduledFor?: Date;
  }
) {
  const senderObjectId = new Types.ObjectId(senderId);
  const convo = await Conversation.findOne({
    _id: data.conversationId,
    participants: senderObjectId,
  });
  if (!convo) throw AppError.notFound('Conversation not found');

  // Calculate disappearing expiry if enabled
  let expiresAt: Date | null = null;
  if (convo.disappearingSeconds && convo.disappearingSeconds > 0) {
    expiresAt = new Date(Date.now() + convo.disappearingSeconds * 1000);
  }

  const msg = await Message.create({
    conversationId: convo._id,
    senderId: senderObjectId,
    clientMsgId: data.clientMsgId,
    ciphertext: data.ciphertext,
    type: data.type || 'text',
    mediaUrl: data.mediaUrl || null,
    mediaMeta: data.mediaMeta || null,
    replyToId: data.replyToId ? new Types.ObjectId(data.replyToId) : null,
    forwarded: !!data.forwarded,
    expiresAt,
    isScheduled: !!data.isScheduled,
    scheduledFor: data.scheduledFor || null,
  });

  if (!data.isScheduled) {
    await Conversation.updateOne(
      { _id: convo._id },
      { $set: { lastMessageAt: new Date() } }
    );
  }

  return {
    id: msg._id.toString(),
    conversationId: convo._id.toString(),
    senderId,
    clientMsgId: msg.clientMsgId,
    ciphertext: msg.ciphertext,
    type: msg.type,
    mediaUrl: msg.mediaUrl,
    mediaMeta: msg.mediaMeta,
    replyToId: msg.replyToId?.toString() || null,
    forwarded: msg.forwarded,
    expiresAt: msg.expiresAt,
    createdAt: msg.createdAt,
  };
}

export async function markAsDelivered(userId: string, messageIds: string[]) {
  const userObjectId = new Types.ObjectId(userId);
  await Message.updateMany(
    { _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) } },
    { $addToSet: { deliveredTo: userObjectId } }
  );
}

export async function markAsRead(userId: string, messageIds: string[]) {
  const userObjectId = new Types.ObjectId(userId);
  await Message.updateMany(
    { _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) } },
    {
      $addToSet: {
        deliveredTo: userObjectId,
        readBy: userObjectId,
      },
    }
  );
}

export async function deleteMessage(userId: string, messageId: string, forEveryone: boolean) {
  const userObjectId = new Types.ObjectId(userId);
  const msg = await Message.findById(messageId);
  if (!msg) throw AppError.notFound('Message not found');

  if (forEveryone) {
    if (msg.senderId.toString() !== userId) {
      throw AppError.forbidden('Can only delete your own messages for everyone');
    }
    msg.deletedForEveryone = true;
    msg.ciphertext = ''; // Redact content
    await msg.save();
    return { deletedForEveryone: true };
  } else {
    await Message.updateOne({ _id: messageId }, { $addToSet: { deletedFor: userObjectId } });
    return { deletedForMe: true };
  }
}

export async function reactToMessage(userId: string, messageId: string, emoji: string) {
  const userObjectId = new Types.ObjectId(userId);
  await Message.updateOne(
    { _id: messageId },
    {
      $pull: { reactions: { userId: userObjectId } },
    }
  );
  if (emoji) {
    await Message.updateOne(
      { _id: messageId },
      {
        $push: { reactions: { userId: userObjectId, emoji } },
      }
    );
  }
}

export async function updateConversationSettings(
  userId: string,
  conversationId: string,
  patch: { disappearingSeconds?: number; pinned?: boolean; muted?: boolean; wallpaper?: string }
) {
  const userObjectId = new Types.ObjectId(userId);
  const convo = await Conversation.findOne({ _id: conversationId, participants: userObjectId });
  if (!convo) throw AppError.notFound('Conversation not found');

  const update: any = {};
  if (typeof patch.disappearingSeconds === 'number') {
    update.disappearingSeconds = patch.disappearingSeconds;
  }
  if (typeof patch.pinned === 'boolean') {
    if (patch.pinned) update.$addToSet = { ...(update.$addToSet || {}), pinnedBy: userObjectId };
    else update.$pull = { ...(update.$pull || {}), pinnedBy: userObjectId };
  }
  if (typeof patch.muted === 'boolean') {
    if (patch.muted) update.$addToSet = { ...(update.$addToSet || {}), mutedBy: userObjectId };
    else update.$pull = { ...(update.$pull || {}), mutedBy: userObjectId };
  }
  if (patch.wallpaper !== undefined) {
    update[`wallpapers.${userId}`] = patch.wallpaper;
  }

  await Conversation.updateOne({ _id: conversationId }, update);
}
