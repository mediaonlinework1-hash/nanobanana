import React from 'react';

interface AssetDisplayProps {
  src: string;
  alt: string;
  assetType: 'image' | 'video' | null;
}

export const AssetDisplay: React.FC<AssetDisplayProps> = ({ src, alt, assetType }) => {
  if (assetType === 'image') {
    return (
      <div className="w-full">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
        />
      </div>
    );
  }
  
  if (assetType === 'video') {
    return (
      <div className="w-full">
        <video
          src={src}
          controls
          autoPlay
          loop
          muted // Good practice for autoplay
          className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
          aria-label={alt || 'Generated video'}
        />
      </div>
    );
  }

  return null;
};
