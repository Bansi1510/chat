import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useWebStore } from '../../store/useWebStore';
import { lightTokens, darkTokens } from '../../theme/theme';
import { api } from '../../services/api';

export const StarredMessagesModal: React.FC = () => {
  const { activeModal, setActiveModal, theme, conversations, setActiveConvo } = useWebStore();
  const tokens = theme === 'dark' ? darkTokens : lightTokens;
  const [starredList, setStarredList] = useState<any[]>([]);

  const fetchStarred = async () => {
    try {
      const res = await api.get('/messages/starred');
      setStarredList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeModal === 'starred') {
      fetchStarred();
    }
  }, [activeModal]);

  const handleJumpToChat = (conversationId: string) => {
    const convo = conversations.find((c) => c.id === conversationId);
    if (convo) {
      setActiveConvo(convo);
      setActiveModal('none');
    }
  };

  return (
    <Modal
      isOpen={activeModal === 'starred'}
      onClose={() => setActiveModal('none')}
      title="Starred Messages"
      maxWidth={500}
    >
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {starredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: tokens.textMuted }}>
            No starred messages yet. Bookmark important messages to find them here.
          </div>
        ) : (
          starredList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleJumpToChat(item.conversationId)}
              style={{
                backgroundColor: tokens.bgTertiary,
                border: `1px solid ${tokens.border}`,
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 10,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: tokens.textMuted }}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
                <Star size={14} fill="#eab308" color="#eab308" />
              </div>
              <div style={{ fontSize: 14, color: tokens.textPrimary, lineHeight: 1.45 }}>
                {item.ciphertext}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
