import React, { useState } from 'react';

interface AssetDisplayProps {
  srcs?: string[];
  alt?: string;
  assetType?: 'image' | 'video' | 'recipe' | 'audio' | 'productShot' | null;
  imageUrl?: string | null;
  translationResult?: string | null;
  onImageClick?: (index: number) => void;
}

export const AssetDisplay: React.FC<AssetDisplayProps> = ({ srcs, alt, assetType, imageUrl, translationResult, onImageClick }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const hasMainAsset = !!(assetType && srcs && srcs.length > 0);
  const hasTranslation = !!translationResult;

  const handleCopy = () => {
    if (translationResult) {
      navigator.clipboard.writeText(translationResult);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const MainAsset = () => {
    if (!hasMainAsset) return null;

    if (assetType === 'productShot' || (assetType === 'image' && srcs!.length > 1)) {
        return (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                {srcs!.map((src, index) => (
                    <div key={index} className="relative group bg-gray-900/50 p-2 rounded-xl">
                        <button onClick={() => onImageClick && onImageClick(index)} className="w-full h-full aspect-square block cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg">
                            <img src={src} alt={`${alt || 'Product shot'} ${index + 1}`} className="w-full h-full object-contain rounded-lg shadow-lg" />
                        </button>
                        <a
                            href={src}
                            download={`nano-banana-product-${index + 1}.png`}
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-pink-600 text-white p-2 rounded-full shadow-lg hover:bg-pink-700"
                            title="Download Image"
                            aria-label="Download Image"
                            onClick={(e) => e.stopPropagation()} 
                        >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                        </a>
                    </div>
                ))}
            </div>
        );
    }

    const src = srcs![0];

    switch (assetType) {
      case 'image':
        return (
          <div className="w-full bg-gray-900/50 p-2 rounded-xl">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
            />
          </div>
        );
      case 'video':
        return (
          <div className="w-full bg-gray-900/50 p-2 rounded-xl">
            <video
              src={src}
              controls
              autoPlay
              loop
              muted
              className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
              aria-label={alt || 'Generated video'}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full bg-gray-900/50 p-4 rounded-xl">
            <audio
              src={src}
              controls
              autoPlay
              className="w-full rounded-lg shadow-lg"
              aria-label={alt || 'Generated audio'}
            />
          </div>
        );
      case 'recipe':
        return (
          <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={alt || 'Imagen de la receta'} 
                className="w-full h-auto object-cover rounded-md shadow-md mb-4 max-h-[30vh]" 
              />
            )}
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{src}</pre>
          </div>
        );
      default:
        return null;
    }
  };
  
  const TranslationAsset = () => {
      if (!hasTranslation) return null;
      return (
        <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-pink-400">Translation Result</h3>
              <button
                onClick={handleCopy}
                disabled={isCopied}
                className="flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{translationResult}</pre>
        </div>
      );
  }

  if (hasMainAsset) {
    return <MainAsset />;
  }

  if (hasTranslation) {
    return <TranslationAsset />;
  }

  return null;
};