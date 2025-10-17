import React from 'react';

interface AssetDisplayProps {
  src: string;
  alt: string;
  assetType: 'image' | 'video' | 'recipe' | 'translation' | null;
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

  if (assetType === 'recipe' || assetType === 'translation') {
    return (
      <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
        <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{src}</pre>
      </div>
    );
  }

  return null;
};