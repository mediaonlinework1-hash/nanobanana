
import React, { useState, useRef, useCallback } from 'react';
import type { ImageData } from '../types';

interface ImageUploaderProps {
  setImageData: (imageData: ImageData | null) => void;
  disabled: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ setImageData, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        if (base64String) {
          setImageData({
            imageBytes: base64String,
            mimeType: file.type,
          });
          setPreview(URL.createObjectURL(file));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = useCallback(() => {
    setImageData(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setImageData]);


  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        2. Add a base image (Optional)
      </label>
      <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          {preview ? (
            <div>
              <img src={preview} alt="Image preview" className="mx-auto h-32 w-auto rounded-lg" />
              <button onClick={handleRemoveImage} className="mt-4 text-sm text-red-400 hover:text-red-300 transition-colors" disabled={disabled}>Remove Image</button>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L22.05 14.05a2 2 0 01-2.83 0L14 8m14 0l-2.05 2.05a2 2 0 00-2.83 0L14 8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                 <path d="M40 32.01V20a4 4 0 00-4-4H12a4 4 0 00-4 4v12.01a4 4 0 004 4H36a4 4 0 004-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-400 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-pink-400 hover:text-pink-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-pink-500 px-1">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" ref={fileInputRef} disabled={disabled} />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
