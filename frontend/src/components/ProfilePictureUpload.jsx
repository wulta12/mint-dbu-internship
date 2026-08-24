import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import Avatar from './Avatar';
import { authService } from '../services/api';

const ProfilePictureUpload = ({ user, onUpdate }) => {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError(null);

    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      setError('Please select an image file (JPG, PNG, GIF)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_image', file);

      const res = await authService.updateProfile(formData);
      const updated = res.data?.user;
      if (updated) {
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('user-updated'));
        if (onUpdate) onUpdate(updated);
      }
      setPreview(null);
    } catch (err) {
      setPreview(null);
      setError(err.response?.data?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className={`overflow-hidden rounded-full ${uploading ? 'opacity-60' : ''}`}>
          <Avatar user={preview ? { ...user, profile_image: preview } : user} size="xl" />
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={uploading}
          title="Change profile picture"
          className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-mint-primary text-white flex items-center justify-center border-2 border-white hover:bg-opacity-90 transition disabled:opacity-50"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>

        {preview && !uploading && (
          <button
            type="button"
            onClick={cancelPreview}
            title="Cancel"
            className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-white hover:bg-red-600 transition"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading && <p className="text-xs text-gray-500">Uploading photo...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && !uploading && (
        <p className="text-xs text-gray-400">Click the camera icon to change your photo</p>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
