import React, { useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, ShieldCheck } from 'lucide-react';
import { useWebStore } from '../../store/useWebStore';
import { useTranslation } from '../../localization/useTranslation';
import { Avatar } from '../../components/Avatar';

interface CallModalProps {
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  onAccept,
  onReject,
  onEnd,
  onToggleMic,
  onToggleVideo,
}) => {
  const { activeCall, setActiveCall } = useWebStore();
  const { t } = useTranslation();

  // Duration timer ticker when connected
  useEffect(() => {
    if (activeCall?.state !== 'connected') return;
    const interval = setInterval(() => {
      setActiveCall((prev) =>
        prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.state]);

  if (!activeCall) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(10, 15, 25, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#111827',
          borderRadius: 24,
          padding: '36px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid #1f2937',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        {/* Security badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            backgroundColor: '#064e3b',
            color: '#34d399',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          <ShieldCheck size={14} />
          <span>E2EE DTLS-SRTP Audio/Video</span>
        </div>

        {/* Peer Avatar */}
        <div style={{ marginBottom: 16 }}>
          <Avatar name={activeCall.peerUsername} size={92} />
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>
          @{activeCall.peerUsername}
        </h2>

        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#9ca3af' }}>
          {activeCall.state === 'incoming'
            ? t('incoming_call')
            : activeCall.state === 'outgoing'
            ? t('outgoing_call')
            : `${t('call_active')} (${formatDuration(activeCall.durationSeconds)})`}
        </p>

        {/* Call Controls */}
        {activeCall.state === 'incoming' ? (
          <div style={{ display: 'flex', gap: 24 }}>
            <button
              onClick={onReject}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
              }}
            >
              <PhoneOff size={26} />
            </button>

            <button
              onClick={onAccept}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Phone size={26} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Mic Toggle */}
            <button
              onClick={onToggleMic}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: activeCall.isMuted ? '#ef4444' : '#374151',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {activeCall.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Video Toggle */}
            {activeCall.callType === 'video' && (
              <button
                onClick={onToggleVideo}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: !activeCall.isVideoEnabled ? '#ef4444' : '#374151',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {!activeCall.isVideoEnabled ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={onEnd}
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
              }}
            >
              <PhoneOff size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
