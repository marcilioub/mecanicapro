import React from 'react';
import defaultAvatar from '../assets/default-avatar.svg';

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  alt?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, className = '', alt = 'Avatar' }) => {
  const cleaned = src?.toString().trim();
  const hasImage = !!cleaned && !cleaned.includes('default-avatar');
  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  if (hasImage) {
    return (
      <div
        className={className}
        role="img"
        aria-label={alt}
        style={{ backgroundImage: `url(${cleaned})` }}
      />
    );
  }

  // fallback: show initial letter
  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold`}
      aria-hidden
      title={name || 'Usuário'}
    >
      <span className="text-lg select-none">{initial}</span>
    </div>
  );
};

export default Avatar;
