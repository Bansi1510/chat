import React, { useState, useRef } from 'react';
import { Send, Paperclip, Clock, Mic, X, Image, FileText } from 'lucide-react';
import { useWebStore, Message } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { useTranslation } from '../../localization/useTranslation';
import { api } from '../../services/api';
import { Socket } from 'socket.io-client';

interface ChatInputBarProps {
  socket: Socket | null;
  replyTo: Message | null;
  onClearReply: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ socket, replyTo, onClearReply }) => {
  const { theme, user, activeConvo, setMessages } = useWebStore();
  const { t } = useTranslation();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;

  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const handleTyping = (isTyping: boolean) => {
    if (!socket || !activeConvo) return;
    socket.emit('chat:typing', { conversationId: activeConvo.id, isTyping });
  };

  const handleSend = async (scheduledFor?: Date) => {
    if (!text.trim() && !isRecording) return;
    if (!activeConvo || !socket || !user) return;

    const clientMsgId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload: any = {
      conversationId: activeConvo.id,
      clientMsgId,
      ciphertext: text.trim(),
      type: 'text',
      replyToId: replyTo?.id,
    };

    if (scheduledFor) {
      payload.isScheduled = true;
      payload.scheduledFor = scheduledFor;
    }

    // Optimistic UI append if not scheduled
    if (!scheduledFor) {
      const optimisticMsg: Message = {
        id: clientMsgId,
        conversationId: activeConvo.id,
        senderId: user.id,
        clientMsgId,
        ciphertext: text.trim(),
        type: 'text',
        delivered: false,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    socket.emit('message:send', payload);
    setText('');
    onClearReply();
    handleTyping(false);
    setShowScheduleModal(false);
    setScheduledTime('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvo || !socket || !user) return;

    try {
      // 1. Get backend signature
      const signRes = await api.post('/media/sign-upload');
      const { signature, timestamp, apiKey, cloudName, folder } = signRes.data.data;

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const isVideo = file.type.startsWith('video/');
      const uploadType = isVideo ? 'video' : 'image';
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${uploadType}/upload`;

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.secure_url) {
        const clientMsgId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const payload = {
          conversationId: activeConvo.id,
          clientMsgId,
          ciphertext: file.name,
          type: file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : 'document',
          attachments: [
            {
              fileUrl: uploadData.secure_url,
              fileType: file.type,
              fileSizeBytes: file.size,
              fileName: file.name,
              thumbnailUrl: uploadData.secure_url,
            },
          ],
        };

        socket.emit('message:send', payload);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Media upload failed. Please try again.');
    } finally {
      setShowAttachMenu(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Finish recording simulation
      clearInterval(timerRef.current);
      setIsRecording(false);
      if (socket && activeConvo) {
        socket.emit('chat:recording', { conversationId: activeConvo.id, isRecording: false });
        const clientMsgId = `voice_${Date.now()}`;
        socket.emit('message:send', {
          conversationId: activeConvo.id,
          clientMsgId,
          ciphertext: `Voice Memo (${recordingSeconds}s)`,
          type: 'voice',
        });
      }
      setRecordingSeconds(0);
    } else {
      // Start recording simulation
      setIsRecording(true);
      setRecordingSeconds(0);
      if (socket && activeConvo) {
        socket.emit('chat:recording', { conversationId: activeConvo.id, isRecording: true });
      }
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  return (
    <div
      style={{
        backgroundColor: tokens.bgSecondary,
        borderTop: `1px solid ${tokens.border}`,
        padding: '12px 16px',
        position: 'relative',
      }}
    >
      {/* Reply Banner */}
      {replyTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: tokens.bgTertiary,
            padding: '6px 12px',
            borderRadius: 8,
            marginBottom: 8,
            borderLeft: `3px solid ${tokens.primaryAccent}`,
            fontSize: 13,
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600, color: tokens.primaryAccent }}>Replying: </span>
            <span style={{ color: tokens.textSecondary }}>{replyTo.ciphertext || 'Attachment'}</span>
          </div>
          <button
            onClick={onClearReply}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: tokens.textMuted }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Attach Menu Popover */}
      {showAttachMenu && (
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            left: 16,
            backgroundColor: tokens.bgElevated,
            borderRadius: 14,
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: tokens.textPrimary,
              cursor: 'pointer',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Image size={18} color="#3b82f6" />
            <span>Image or Video</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: tokens.textPrimary,
              cursor: 'pointer',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <FileText size={18} color="#8b5cf6" />
            <span>Document</span>
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowScheduleModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              color: tokens.textPrimary,
              cursor: 'pointer',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Clock size={18} color="#f59e0b" />
            <span>Schedule Message</span>
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Main Input Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Attachment Toggle */}
        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            padding: 6,
            borderRadius: '50%',
            display: 'flex',
          }}
        >
          <Paperclip size={20} />
        </button>

        {/* Text Input / Recording Bar */}
        {isRecording ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: tokens.dangerBg,
              color: tokens.danger,
              padding: '10px 16px',
              borderRadius: 24,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: tokens.danger,
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>{t('recording')} ({recordingSeconds}s)</span>
          </div>
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping(e.target.value.length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('type_a_message')}
            style={{
              flex: 1,
              backgroundColor: tokens.bgTertiary,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
              borderRadius: 24,
              padding: '12px 18px',
              fontSize: 14,
              outline: 'none',
            }}
          />
        )}

        {/* Mic / Voice Note Toggle */}
        <button
          onClick={toggleRecording}
          style={{
            backgroundColor: isRecording ? tokens.danger : 'transparent',
            border: 'none',
            color: isRecording ? '#ffffff' : tokens.textMuted,
            cursor: 'pointer',
            padding: 8,
            borderRadius: '50%',
            display: 'flex',
          }}
        >
          <Mic size={20} />
        </button>

        {/* Send Button */}
        <button
          onClick={() => handleSend()}
          disabled={!text.trim() && !isRecording}
          style={{
            backgroundColor: tokens.primaryAccent,
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !text.trim() && !isRecording ? 'default' : 'pointer',
            opacity: !text.trim() && !isRecording ? 0.5 : 1,
            transition: 'opacity 0.2s',
            flexShrink: 0,
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: tokens.bgElevated,
            border: `1px solid ${tokens.border}`,
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 30,
            width: 300,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: tokens.textPrimary }}>
            Schedule Message Dispatch
          </div>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${tokens.border}`,
              backgroundColor: tokens.bgTertiary,
              color: tokens.textPrimary,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowScheduleModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: tokens.textMuted,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (scheduledTime) handleSend(new Date(scheduledTime));
              }}
              style={{
                backgroundColor: tokens.primaryAccent,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
