import React, { useState, useEffect, useRef } from 'react';
import { generateImage, generateVideo, analyzeImage, generateRecipe, translateText } from './services/geminiService';
import type { ImageData } from './types';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AssetDisplay } from './components/AssetDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { GenerateButton, DownloadButton } from './components/GenerateButton';
import { LanguageSelector } from './components/VideoPlayer';
import { ApiKeyInput } from './components/ApiKeyInput';

const PERSON_ACTIONS = [
  "caminando",
  "leyendo un libro",
  "mirando el cielo",
  "sentado en un banco",
  "bailando",
  "tomando una foto",
];

const App: React.FC = () => {
  const [mode, setMode] = useState<'image' | 'video' | 'recipe' | 'translation'>('image');
  const [prompt, setPrompt] = useState<string>('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [removeText, setRemoveText] = useState<boolean>(false);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<'image' | 'video' | 'recipe' | 'translation' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [addPerson, setAddPerson] = useState<boolean>(false);
  const [contextualPersonSuggestion, setContextualPersonSuggestion] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish');
  const [stylizeAndCorrect, setStylizeAndCorrect] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  
  const previousAssetUrl = useRef<string | null>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        setApiKey(savedKey);
        setApiKeyInput(savedKey);
    }
  }, []);

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
      const activeApiKey = apiKey;
      if (imageData && activeApiKey.trim()) {
        setIsAnalyzing(true);
        setContextualPersonSuggestion(null);
        try {
          const suggestion = await analyzeImage(activeApiKey, imageData);
          setContextualPersonSuggestion(suggestion);
        } catch (e) {
          console.error("Image analysis failed:", e);
          if (e instanceof Error) {
            setError(e.message);
          }
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
  }, [imageData, mode, apiKey]);

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
        localStorage.setItem('gemini_api_key', apiKeyInput);
        setApiKey(apiKeyInput);
        setError(null);
    } else {
        setError("API Key cannot be empty.");
    }
  };

  const handleClearKey = () => {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setApiKeyInput('');
  };

  const runWithApiKey = async <T,>(
    serviceCall: (apiKey: string, ...args: any[]) => Promise<T>, 
    ...args: any[]
  ): Promise<T | null> => {
    const activeApiKey = apiKey;
    if (!activeApiKey.trim()) {
        setError("Please save your Gemini API key in the input field above.");
        return null;
    }
    setError(null);
    try {
      return await serviceCall(activeApiKey, ...args);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during the API call.');
      }
      return null;
    }
  };

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
    setAssetUrl(null);
    setAssetType(null);

    const base64ImageData = await runWithApiKey(generateImage, finalPrompt, imageData);
    
    if (base64ImageData) {
      const objectUrl = `data:image/png;base64,${base64ImageData}`;
      setAssetUrl(objectUrl);
      setAssetType('image');
    }
    setIsLoading(false);
  };

  const handleVideoGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a video.');
      return;
    }
    setIsLoading(true);
    setAssetUrl(null);
    setAssetType(null);
    const videoBlob = await runWithApiKey(generateVideo, prompt, imageData);
    if(videoBlob) {
      const objectUrl = URL.createObjectURL(videoBlob);
      setAssetUrl(objectUrl);
      setAssetType('video');
    }
    setIsLoading(false);
  };

  const handleRecipeGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a recipe.');
      return;
    }
    setIsLoading(true);
    setAssetUrl(null);
    setAssetType(null);
    const recipeText = await runWithApiKey(generateRecipe, prompt);
    if(recipeText) {
      setAssetUrl(recipeText);
      setAssetType('recipe');
    }
    setIsLoading(false);
  };

  const handleTranslation = async () => {
    if (!prompt.trim()) {
      setError('Please enter text to translate.');
      return;
    }
    setIsLoading(true);
    setAssetUrl(null);
    setAssetType(null);
    const translatedText = await runWithApiKey(translateText, prompt, targetLanguage, stylizeAndCorrect);
    if(translatedText) {
      setAssetUrl(translatedText);
      setAssetType('translation');
    }
    setIsLoading(false);
  };

  const handleGenerate = () => {
    if (mode === 'image') {
      handleImageGeneration();
    } else if (mode === 'video') {
      handleVideoGeneration();
    } else if (mode === 'recipe') {
      handleRecipeGeneration();
    } else if (mode === 'translation') {
      handleTranslation();
    }
  };
  
  const handleModeChange = (newMode: 'image' | 'video' | 'recipe' | 'translation') => {
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
      setTargetLanguage('Spanish');
      setStylizeAndCorrect(false);
    }
  };

  const hasApiKey = !!apiKey.trim();
  const canGenerate = hasApiKey && (prompt.trim().length > 0 || (mode === 'image' && !!imageData && (removeText || addPerson)));

  const getPlaceholderText = () => {
    switch (mode) {
      case 'image': return 'Your generated image will appear here.';
      case 'video': return 'Your generated video will appear here.';
      case 'recipe': return 'Your generated recipe will appear here.';
      case 'translation': return 'Your translation will appear here.';
      default: return 'Your generated asset will appear here.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Header />
        
        <ApiKeyInput 
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          onSave={handleSaveKey}
          onClear={handleClearKey}
          disabled={isLoading}
        />

        <div className="my-6 flex justify-center items-center bg-gray-800 p-1 rounded-full shadow-lg w-fit mx-auto flex-wrap">
          <button onClick={() => handleModeChange('image')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'image' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Image Generation
          </button>
          <button onClick={() => handleModeChange('video')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'video' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Video Generation
          </button>
          <button onClick={() => handleModeChange('recipe')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'recipe' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Recipe Generation
          </button>
          <button onClick={() => handleModeChange('translation')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === 'translation' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            Translation
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
              {mode === 'image' && (
                <ImageUploader setImageData={setImageData} disabled={isLoading} key={mode} />
              )}
               {mode === 'translation' && (
                <div className="space-y-4">
                  <LanguageSelector 
                    targetLanguage={targetLanguage}
                    setTargetLanguage={setTargetLanguage}
                    disabled={isLoading}
                  />
                  <div className="flex items-center p-3 rounded-lg bg-gray-700/30">
                    <input
                      id="stylize-checkbox"
                      type="checkbox"
                      checked={stylizeAndCorrect}
                      onChange={(e) => setStylizeAndCorrect(e.target.checked)}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <label htmlFor="stylize-checkbox" className="ml-3 block text-sm font-medium text-gray-300 cursor-pointer">
                      Correct &amp; Stylize before translating ✨
                    </label>
                  </div>
                </div>
              )}
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
                  <p className="mt-2">{getPlaceholderText()}</p>
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