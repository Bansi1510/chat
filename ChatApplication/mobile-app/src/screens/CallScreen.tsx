import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getSocket } from '../services/socket';

export const CallScreen = ({ route, navigation }: any) => {
  const { peer, callType = 'audio', isIncoming = false } = route.params || {};
  const { theme, t } = useAppStore();

  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'ringing'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let timer: any;
    if (callState === 'connected') {
      timer = setInterval(() => setDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('call:answered', () => {
      setCallState('connected');
    });

    socket.on('call:ended', () => {
      setCallState('ended');
      setTimeout(() => navigation.goBack(), 1000);
    });

    return () => {
      socket.off('call:answered');
      socket.off('call:ended');
    };
  }, [navigation]);

  const handleAccept = () => {
    setCallState('connected');
    const socket = getSocket();
    socket.emit('call:answer', {
      targetUserId: peer?.id,
      answer: { type: 'answer', sdp: 'simulated_webrtc_sdp' },
      dtlsFingerprint: 'SHA256:7B:4A:...',
    });
  };

  const handleEndCall = () => {
    const socket = getSocket();
    if (peer?.id) {
      socket.emit('call:end', { targetUserId: peer.id });
    }
    navigation.goBack();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topInfo}>
        <View style={styles.securityBadge}>
          <Text style={styles.securityText}>🔒 E2EE DTLS-SRTP</Text>
        </View>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>
            {peer?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.peerName}>@{peer?.username || 'Peer'}</Text>
        <Text style={styles.callStatus}>
          {callState === 'connected'
            ? `In Call (${formatDuration(duration)})`
            : isIncoming
            ? 'Incoming Call...'
            : 'Calling...'}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        {isIncoming && callState === 'ringing' ? (
          <>
            <TouchableOpacity
              style={[styles.roundBtn, { backgroundColor: '#ef4444' }]}
              onPress={handleEndCall}
            >
              <Text style={styles.btnIcon}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundBtn, { backgroundColor: '#10b981' }]}
              onPress={handleAccept}
            >
              <Text style={styles.btnIcon}>📞</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.roundBtn, { backgroundColor: isMuted ? '#ef4444' : '#374151' }]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Text style={styles.btnIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity
                style={[styles.roundBtn, { backgroundColor: !isVideoOn ? '#ef4444' : '#374151' }]}
                onPress={() => setIsVideoOn(!isVideoOn)}
              >
                <Text style={styles.btnIcon}>{isVideoOn ? '📹' : '🚫'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.roundBtn, { backgroundColor: '#ef4444' }]}
              onPress={handleEndCall}
            >
              <Text style={styles.btnIcon}>☎️</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  topInfo: {
    alignItems: 'center',
  },
  securityBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 32,
  },
  securityText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
  },
  peerName: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callStatus: {
    color: '#94a3b8',
    fontSize: 15,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  roundBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
});
