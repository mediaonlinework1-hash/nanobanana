
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
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
        <div className="flex flex-col items-center justify-center w-full h-full space-y-4">
          <div className="relative group w-full flex-grow flex items-center justify-center min-h-[300px]">
            <img 
              src={preview} 
              alt="Image preview" 
              className="max-w-full max-h-[600px] object-contain rounded-xl shadow-2xl border border-gray-700" 
            />
          </div>
          <button 
            onClick={handleRemoveSingleImage} 
            className="px-6 py-2 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors text-sm font-semibold border border-red-800/30" 
            disabled={disabled}
          >
            Remove Image
          </button>
        </div>
      );
    }
    return null;
  };

  const hasPreviews = (isMultiple && images && images.length > 0) || (!isMultiple && preview);

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className={`flex-grow flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-xl transition-all duration-300 bg-gray-900/20 ${hasPreviews ? 'border-solid bg-gray-900/40' : 'hover:border-pink-500/50 hover:bg-gray-900/30'}`}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center w-full h-full">
          {hasPreviews ? (
            renderPreviews()
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
               <div className="p-4 bg-gray-800 rounded-full">
                <svg className="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L22.05 14.05a2 2 0 01-2.83 0L14 8m14 0l-2.05 2.05a2 2 0 00-2.83 0L14 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M40 32.01V20a4 4 0 00-4-4H12a4 4 0 00-4 4v12.01a4 4 0 004 4H36a4 4 0 004-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
               </div>
               <div className="space-y-2">
                 <div className="flex text-sm text-gray-400 justify-center">
                    <label htmlFor={label} className="relative cursor-pointer bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 px-6 py-2 transition-all shadow-lg focus-within:ring-2 focus-within:ring-pink-500">
                      <span>{isMultiple ? 'Add Files' : 'Upload a file'}</span>
                      <input id={label} name={label} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" ref={fileInputRef} disabled={disabled} multiple={isMultiple} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP, GIF, etc. up to 100MB</p>
               </div>
            </div>
          )}
          
          {hasPreviews && isMultiple && (
             <div className="flex text-sm text-gray-400 justify-center mt-4">
                <label htmlFor={label + "-more"} className="relative cursor-pointer bg-gray-700 text-gray-200 font-semibold rounded-lg hover:bg-gray-600 px-4 py-2 transition-all border border-gray-600">
                  <span>Add more files</span>
                  <input id={label + "-more"} name={label} type="file" className="sr-only" onChange={handleFileChange} accept="image/*" disabled={disabled} multiple={true} />
                </label>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
