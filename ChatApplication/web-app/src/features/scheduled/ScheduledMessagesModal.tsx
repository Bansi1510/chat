import React, { useState, useEffect } from 'react';
import { Trash2, Calendar } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { api } from '../../services/api';

export const ScheduledMessagesModal: React.FC = () => {
  const { activeModal, setActiveModal, theme } = useWebStore();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;
  const [scheduledList, setScheduledList] = useState<any[]>([]);

  const fetchScheduled = async () => {
    try {
      const res = await api.get('/messages/scheduled');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setScheduledList(list);
    } catch (err) {
      console.error(err);
      setScheduledList([]);
    }
  };

  useEffect(() => {
    if (activeModal === 'scheduled') {
      fetchScheduled();
    }
  }, [activeModal]);

  const handleCancel = async (msgId: string) => {
    try {
      await api.delete(`/messages/scheduled/${msgId}`);
      setScheduledList((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'scheduled'}
      onClose={() => setActiveModal('none')}
      title="Scheduled Messages"
      maxWidth={480}
    >
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {scheduledList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: tokens.textMuted }}>
            No scheduled messages pending dispatch.
          </div>
        ) : (
          scheduledList.map((msg) => (
            <div
              key={msg.id}
              style={{
                backgroundColor: tokens.bgTertiary,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: tokens.textPrimary, marginBottom: 4 }}>
                  {msg.ciphertext}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: tokens.textMuted }}>
                  <Calendar size={13} />
                  <span>
                    Scheduled for: {new Date(msg.scheduledFor).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCancel(msg.id)}
                title="Cancel Message"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tokens.danger,
                  cursor: 'pointer',
                  padding: 6,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
