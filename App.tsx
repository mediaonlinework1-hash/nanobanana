import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateImage, generateVideo, analyzeImage } from './services/geminiService';
import type { ImageData } from './types';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AssetDisplay } from './components/AssetDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { GenerateButton, DownloadButton } from './components/GenerateButton';

const PERSON_ACTIONS = [
  "caminando",
  "leyendo un libro",
  "mirando el cielo",
  "sentado en un banco",
  "bailando",
  "tomando una foto",
];

const App: React.FC = () => {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState<string>('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [removeText, setRemoveText] = useState<boolean>(false);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [addPerson, setAddPerson] = useState<boolean>(false);
  const [contextualPersonSuggestion, setContextualPersonSuggestion] = useState<string | null>(null);
  
  const previousAssetUrl = useRef<string | null>(null);

  useEffect(() => {
    // Clean up old object URLs to prevent memory leaks
    if (previousAssetUrl.current && previousAssetUrl.current.startsWith('blob:')) {
      URL.revokeObjectURL(previousAssetUrl.current);
    }
    previousAssetUrl.current = assetUrl;

    // Cleanup on component unmount
    return () => {
      if (assetUrl && assetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(assetUrl);
      }
    }
  }, [assetUrl]);

  useEffect(() => {
    if (mode !== 'image') return;
    const analyze = async () => {
      if (imageData) {
        setIsAnalyzing(true);
        setContextualPersonSuggestion(null);
        try {
          const suggestion = await analyzeImage(imageData);
          setContextualPersonSuggestion(suggestion);
        } catch (e) {
          console.error("Image analysis failed:", e);
          setContextualPersonSuggestion(null); 
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        setContextualPersonSuggestion(null);
        setIsAnalyzing(false);
      }
    };
    analyze();
  }, [imageData, mode]);

  const handleImageGeneration = async () => {
    let finalPrompt = prompt.trim();

    if (addPerson) {
      const personToAdd = contextualPersonSuggestion || `una persona ${PERSON_ACTIONS[Math.floor(Math.random() * PERSON_ACTIONS.length)]}`;
      finalPrompt = finalPrompt ? `${finalPrompt}, ${personToAdd}` : personToAdd;
    }

    if (removeText) {
      const removeTextPrompt = "remove any text from the image";
      finalPrompt = finalPrompt ? `${finalPrompt}, ${removeTextPrompt}` : removeTextPrompt;
    }

    if (similarity !== null) {
      finalPrompt += ` *similar (${similarity}%)*`;
    }

    if (!finalPrompt.trim() && !imageData) {
      setError('Please enter a prompt or upload an image to edit.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAssetUrl(null);
    setAssetType(null);

    try {
      const base64ImageData = await generateImage(finalPrompt, imageData);
      
      if (!base64ImageData) {
        throw new Error('Failed to get image data from the API.');
      }

      const objectUrl = `data:image/png;base64,${base64ImageData}`;
      setAssetUrl(objectUrl);
      setAssetType('image');

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during image generation.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a video.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAssetUrl(null);
    setAssetType(null);

    try {
      const videoBlob = await generateVideo(prompt, imageData);
      const objectUrl = URL.createObjectURL(videoBlob);
      setAssetUrl(objectUrl);
      setAssetType('video');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during video generation.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (mode === 'image') {
      handleImageGeneration();
    } else {
      handleVideoGeneration();
    }
  };
  
  const handleModeChange = (newMode: 'image' | 'video') => {
    if (newMode !== mode) {
      setMode(newMode);
      setPrompt('');
      setSimilarity(null);
      setRemoveText(false);
      setImageData(null); 
      setAssetUrl(null);
      setAssetType(null);
      setError(null);
      setAddPerson(false);
      setContextualPersonSuggestion(null);
    }
  };

  const canGenerate = mode === 'image'
    ? prompt.trim().length > 0 || (imageData && (removeText || addPerson))
    : prompt.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Header />

        <div className="my-6 flex justify-center items-center bg-gray-800 p-1 rounded-full shadow-lg w-fit mx-auto">
          <button onClick={() => handleModeChange('image')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'image' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Image Generation
          </button>
          <button onClick={() => handleModeChange('video')} className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'video' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Video Generation
          </button>
        </div>

        <main className="p-6 bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col space-y-6">
              <PromptInput 
                prompt={prompt} 
                setPrompt={setPrompt} 
                similarity={similarity}
                setSimilarity={setSimilarity}
                removeText={removeText}
                setRemoveText={setRemoveText}
                disabled={isLoading}
                isAnalyzing={isAnalyzing}
                addPerson={addPerson}
                setAddPerson={setAddPerson}
                contextualPersonSuggestion={contextualPersonSuggestion}
                mode={mode}
              />
              <ImageUploader setImageData={setImageData} disabled={isLoading} key={mode} />
            </div>
            
            <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-xl border border-dashed border-gray-600 min-h-[250px] lg:min-h-full">
              {isLoading ? (
                <LoadingIndicator mode={mode} />
              ) : assetUrl ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <AssetDisplay src={assetUrl} alt={prompt} assetType={assetType} />
                  <DownloadButton assetUrl={assetUrl} assetType={assetType} />
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Your generated {mode} will appear here.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8">
            <ErrorDisplay message={error} />
            <GenerateButton onClick={handleGenerate} disabled={isLoading || !canGenerate} mode={mode} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
