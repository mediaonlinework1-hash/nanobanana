import React, { useState, useRef, useCallback } from 'react';
import type { ImageData } from '../types';

interface ImageUploaderProps {
  label: string;
  disabled: boolean;
  // Single image mode props
  setImageData?: (imageData: ImageData | null) => void;
  // Multiple image mode props
  multiple?: boolean;
  images?: ImageData[];
  onImagesChange?: (images: ImageData[]) => void;
}


export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  disabled, 
  setImageData,
  multiple,
  images,
  onImagesChange 
}) => {
  const [preview, setPreview] = useState<string | null>(null); // For single mode preview
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMultiple = !!multiple;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (isMultiple && onImagesChange && images) {
        // FIX: Add type `File` to the `file` parameter to resolve type errors on lines 40 and 46.
        const filePromises = Array.from(files).map((file: File) => 
            new Promise<ImageData>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = (reader.result as string)?.split(',')[1];
                    if (base64String) {
                        resolve({ imageBytes: base64String, mimeType: file.type });
                    } else {
                        reject(new Error('Failed to read file as base64.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })
        );
        
        Promise.all(filePromises)
          .then(newImages => {
              onImagesChange([...images, ...newImages]);
          })
          .catch(error => {
              console.error("Error reading files:", error);
          })
          .finally(() => {
            // Reset file input to allow re-uploading the same file
            if(fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          });

    } else if (setImageData) {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            if (base64String) {
                setImageData({ imageBytes: base64String, mimeType: file.type });
                // Clean up previous blob URL if it exists
                if (preview) URL.revokeObjectURL(preview);
                setPreview(URL.createObjectURL(file));
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveSingleImage = useCallback(() => {
    if(setImageData) {
      setImageData(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [setImageData, preview]);

  const handleRemoveMultipleImage = (indexToRemove: number) => {
    if (isMultiple && onImagesChange && images) {
      onImagesChange(images.filter((_, index) => index !== indexToRemove));
    }
  };


  const renderPreviews = () => {
    if (isMultiple && images && images.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img src={`data:${img.mimeType};base64,${img.imageBytes}`} alt={`Product preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <button 
                onClick={() => handleRemoveMultipleImage(index)} 
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 disabled:opacity-50"
                disabled={disabled}
                aria-label={`Remove image ${index + 1}`}
              >
                X
              </button>
            </div>
          ))}
        </div>
      );
    }
    if (!isMultiple && preview) {
      return (
        <div>
          <img src={preview} alt="Image preview" className="mx-auto h-32 w-auto rounded-lg" />
          <button onClick={handleRemoveSingleImage} className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors" disabled={disabled}>Remove Image</button>
        </div>
      );
    }
    return null;
  };

  const hasPreviews = (isMultiple && images && images.length > 0) || (!isMultiple && preview);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md ${hasPreviews ? 'border-solid' : ''}`}>
        <div className="space-y-4 text-center w-full">
          {renderPreviews()}
          
          <div className="space-y-1">
            {!hasPreviews && (
               <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L22.05 14.05a2 2 0 01-2.83 0L14 8m14 0l-2.05 2.05a2 2 0 00-2.83 0L14 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                 <path d="M40 32.01V20a4 4 0 00-4-4H12a4 4 0 00-4 4v12.01a4 4 0 004 4H36a4 4 0 004-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
             <div className="flex text-sm text-gray-400 justify-center">
                <label htmlFor={label} className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-pink-400 hover:text-pink-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-pink-500 px-1">
                  <span>{hasPreviews && isMultiple ? 'Add more files' : 'Upload a file'}</span>
                  <input id={label} name={label} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" ref={fileInputRef} disabled={disabled} multiple={isMultiple} />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP, GIF, etc. up to 100MB</p>
          </div>

        </div>
      </div>
    </div>
  );
};