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
  
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isStudioEnvironment, setIsStudioEnvironment] = useState<boolean>(false);
  
  const previousAssetUrl = useRef<string | null>(null);

  useEffect(() => {
    // Check for AI Studio environment and if a key is already stored.
    const isStudio = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
    setIsStudioEnvironment(isStudio);
    
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setHasApiKey(true);
    } else if (isStudio) {
      // If in studio, check if a key has been selected via the native dialog
      window.aistudio.hasSelectedApiKey().then(keySelected => {
        if (keySelected) {
           // We'll use a placeholder to signify a key is managed by the environment
           localStorage.setItem('gemini-api-key', 'aistudio_managed_key');
           setHasApiKey(true);
        }
      });
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
    if (mode !== 'image' || !hasApiKey) {
      setContextualPersonSuggestion(null);
      setIsAnalyzing(false);
      return;
    };
    const analyze = async () => {
      if (imageData) {
        setIsAnalyzing(true);
        setContextualPersonSuggestion(null);
        setError(null);
        try {
          const apiKey = localStorage.getItem('gemini-api-key');
          if (!apiKey) throw new Error("API Key not found in storage.");
          const suggestion = await analyzeImage(apiKey, imageData);
          setContextualPersonSuggestion(suggestion);
        } catch (e) {
          console.error("Image analysis failed:", e);
          if (e instanceof Error) {
            if (e.message.includes("API key not found") || e.message.includes("API key is invalid")) {
                setError("Your API key is invalid or missing permissions. Please enter a valid key.");
                handleClearKey();
            }
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
  }, [imageData, mode, hasApiKey]);
  
  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini-api-key', apiKeyInput.trim());
      setHasApiKey(true);
      setError(null);
    } else {
      setError("Please enter a valid API key.");
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini-api-key');
    setHasApiKey(false);
    setApiKeyInput('');
  };

  const handleSelectKeyFromStudio = async () => {
    setError(null);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Use a placeholder to signify a key is managed by the environment
      localStorage.setItem('gemini-api-key', 'aistudio_managed_key');
      setHasApiKey(true);
    } else {
      setError("API Key selection is unavailable in this environment.");
    }
  };

  const callGeminiService = async <T,>(
    serviceCall: (apiKey: string, ...args: any[]) => Promise<T>, 
    ...args: any[]
  ): Promise<T | null> => {
    const apiKey = localStorage.getItem('gemini-api-key');
    if (!apiKey) {
      setError("Please provide an API key to proceed.");
      setHasApiKey(false);
      return null;
    }
    setError(null);
    try {
      return await serviceCall(apiKey, ...args);
    } catch (err: unknown) {
      let errorMessage = 'An unknown error occurred during the API call.';
      if (err instanceof Error) {
        const errText = err.message.toLowerCase();
        if (
          errText.includes("api key not found") ||
          errText.includes("api key is invalid") ||
          errText.includes("requested entity was not found") ||
          errText.includes("permission") ||
          errText.includes("quota") ||
          errText.includes("resource_exhausted")
        ) {
          errorMessage = "The provided API key has exceeded its quota or is invalid. Please clear it and enter a different key from a project with billing enabled.";
          handleClearKey();
        } else {
           errorMessage = err.message;
        }
      }
      setError(errorMessage);
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

    const base64ImageData = await callGeminiService(generateImage, finalPrompt, imageData);
    
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
    const videoBlob = await callGeminiService(generateVideo, prompt, imageData);
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
    const recipeText = await callGeminiService(generateRecipe, prompt);
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
    const translatedText = await callGeminiService(translateText, prompt, targetLanguage, stylizeAndCorrect);
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

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-gray-800/50 p-8 rounded-2xl shadow-2xl border border-gray-700/50">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
            Welcome to Nano Banana
          </h2>
          <p className="text-gray-300 mb-6">
            To use this application, please enter your Gemini API key.
          </p>
          <ApiKeyInput
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            onSave={handleSaveKey}
            onClear={handleClearKey}
            disabled={false}
          />
          <div className="my-4">
            <ErrorDisplay message={error} />
          </div>
          {isStudioEnvironment && (
            <>
              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative px-2 bg-gray-800 text-sm text-gray-400">OR</div>
              </div>
              <button
                onClick={handleSelectKeyFromStudio}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300"
              >
                Select API Key from AI Studio
              </button>
            </>
          )}
           <a
              href="https://ai.google.dev/gemini-api/docs/api-key"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-sm text-pink-400 hover:text-pink-300 transition-colors"
            >
              Get an API Key
            </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Header />
        
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
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                    <GenerateButton onClick={handleGenerate} disabled={isLoading || !canGenerate} mode={mode} />
                </div>
                <button 
                    onClick={handleClearKey} 
                    className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-200"
                >
                    Clear API Key
                </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;