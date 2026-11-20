import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
}

export const UserAvatar: React.FC<AvatarProps> = ({ name, size = 48, online }) => {
  const { theme } = useAppStore();

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.primaryLight,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: online ? theme.success : theme.tickSingle,
              borderColor: theme.surface,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
