import React from 'react';

interface AvatarProps {
  name?: string;
  url?: string | null;
  size?: number;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '?',
  url,
  size = 40,
  isOnline,
}) => {
  const initial = name.charAt(0).toUpperCase();

  // Consistent background color based on name string
  const colors = [
    '#4f46e5',
    '#06b6d4',
    '#059669',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#db2777',
  ];
  const colorIndex =
    Math.abs(
      name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: bgColor,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: Math.round(size * 0.42),
            userSelect: 'none',
          }}
        >
          {initial}
        </div>
      )}

      {isOnline !== undefined && (
        <div
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: Math.max(8, Math.round(size * 0.24)),
            height: Math.max(8, Math.round(size * 0.24)),
            borderRadius: '50%',
            backgroundColor: isOnline ? '#10b981' : '#94a3b8',
            border: '2px solid #ffffff',
          }}
        />
      )}
    </div>
  );
};
