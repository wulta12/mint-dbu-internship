import React, { useState } from 'react';
import { User } from 'lucide-react';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-24 h-24 text-3xl'
  };

  const sizeClass = sizes[size] || sizes.md;
  const [imgError, setImgError] = useState(false);

  const profileImage = user?.profile_image && !imgError
    ? (/^(https?:|data:|blob:)/i.test(user.profile_image)
        ? user.profile_image
        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/profiles/${user.profile_image}`)
    : null;

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={user?.full_name || 'User'}
        className={`${sizeClass} ${className} rounded-full object-cover border-2 border-mint-gold/40`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${className} rounded-full flex items-center justify-center text-white bg-gradient-to-br from-mint-primary to-mint-secondary select-none`}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  );
};

export default Avatar;
