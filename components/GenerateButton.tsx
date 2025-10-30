
import React from 'react';

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  mode: 'image' | 'video' | 'recipe' | 'linkRecipe' | 'speech' | 'productShot' | 'blogPost' | 'recipeCard';
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, disabled, mode }) => {
  let loadingText = 'Generating...';
  let buttonText = 'Generate';

  if (mode === 'image') {
    loadingText = 'Generating...';
    buttonText = 'Generate Image';
  } else if (mode === 'video') {
    loadingText = 'Rendering...';
    buttonText = 'Generate Video';
  } else if (mode === 'recipe') {
    loadingText = 'Generating...';
    buttonText = 'Generate Recipe';
  } else if (mode === 'linkRecipe') {
    loadingText = 'Extrayendo...';
    buttonText = 'Extraer Receta';
  } else if (mode === 'recipeCard') {
    loadingText = 'Generando Tarjeta...';
    buttonText = 'Generar Tarjeta de Receta';
  } else if (mode === 'speech') {
    loadingText = 'Generating...';
    buttonText = 'Generate Speech';
  } else if (mode === 'productShot') {
    loadingText = 'Generando...';
    buttonText = 'Generar Foto de Producto';
  } else if (mode === 'blogPost') {
    loadingText = 'Generando Post...';
    buttonText = 'Generar Blog Post';
  }


  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-bold rounded-full shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
    >
      {disabled ? loadingText : buttonText}
    </button>
  );
};

interface DownloadButtonProps {
  assetUrl: string | null;
  assetType: 'image' | 'video' | 'recipe' | 'translation' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | null;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ assetUrl, assetType }) => {
  if (!assetUrl) {
    return null;
  }

  let downloadName: string;
  let buttonText: string;
  let finalUrl = assetUrl;

  if (assetType === 'recipe' || assetType === 'translation') {
      const blob = new Blob([assetUrl], { type: 'text/plain;charset=utf-8' });
      finalUrl = URL.createObjectURL(blob);
      downloadName = `nano-banana-${assetType}.txt`;
      buttonText = `Download ${assetType.charAt(0).toUpperCase() + assetType.slice(1)}`;
  } else if (assetType === 'video') {
      downloadName = 'nano-banana-video.mp4';
      buttonText = 'Download Video';
  } else if (assetType === 'audio') {
      downloadName = 'nano-banana-speech.wav';
      buttonText = 'Download Audio';
  } else { // image is default
      downloadName = 'nano-banana-art.png';
      buttonText = 'Download Image';
  }

  return (
    <a
      href={finalUrl}
      download={downloadName}
      className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 border border-gray-600 text-base font-medium rounded-full text-gray-300 bg-gray-700/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {buttonText}
    </a>
  );
};
