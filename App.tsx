
import React, { useState, useEffect, useRef } from 'react';
import { generateImage, generateVideo, analyzeImage, generateRecipe, translateText, generateSpeech, createWavBlobFromBase64, generateRecipeFromLink, generateProductShot, ProviderConfig } from './services/geminiService';
import type { ImageData } from './types';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AssetDisplay } from './components/AssetDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { GenerateButton, DownloadButton } from './components/GenerateButton';
import { LanguageSelector, VoiceSelector } from './components/VideoPlayer';
import { ApiKeyInput } from './components/ApiKeyInput';
import { Modal } from './components/Modal';

const PERSON_ACTIONS = [
  "caminando",
  "leyendo un libro",
  "mirando el cielo",
  "sentado en un banco",
  "bailando",
  "tomando una foto",
];

const OPENROUTER_MODELS = [
    { id: 'google/gemini-flash-1.5', name: 'Google: Gemini Flash 1.5' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini' },
    { id: 'anthropic/claude-3-haiku', name: 'Anthropic: Claude 3 Haiku' },
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B Instruct' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'Meta: Llama 3 8B Instruct' },
];

type AppMode = 'image' | 'video' | 'recipe' | 'linkRecipe' | 'speech' | 'productShot';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('image');
  const [prompt, setPrompt] = useState<string>('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [removeText, setRemoveText] = useState<boolean>(false);
  const [singleImageData, setSingleImageData] = useState<ImageData | null>(null);
  const [productImages, setProductImages] = useState<ImageData[]>([]);
  const [inspirationImageData, setInspirationImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [assetUrls, setAssetUrls] = useState<string[]>([]);
  const [assetType, setAssetType] = useState<'image' | 'video' | 'recipe' | 'audio' | 'productShot' | null>(null);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [addPerson, setAddPerson] = useState<boolean>(false);
  const [contextualPersonSuggestion, setContextualPersonSuggestion] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish');
  const [stylizeAndCorrect, setStylizeAndCorrect] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [sources, setSources] = useState<any[] | null>(null);
  const [recipeImageUrl, setRecipeImageUrl] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  // State for integrated translation
  const [textToTranslate, setTextToTranslate] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // API Key Management
  const [apiProvider, setApiProvider] = useState('gemini');
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>('');
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState<boolean>(false);
  const [openRouterApiKeyInput, setOpenRouterApiKeyInput] = useState<string>('');
  const [hasOpenRouterApiKey, setHasOpenRouterApiKey] = useState<boolean>(false);
  const [selectedOpenRouterModel, setSelectedOpenRouterModel] = useState(OPENROUTER_MODELS[0].id);
  const [isStudioEnvironment, setIsStudioEnvironment] = useState<boolean>(false);

  const previousAssetUrls = useRef<string[]>([]);

  const hasActiveApiKey = (apiProvider === 'gemini' && hasGeminiApiKey) || (apiProvider === 'openrouter' && hasOpenRouterApiKey);

  useEffect(() => {
    const isStudio = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
    setIsStudioEnvironment(isStudio);
    
    const storedGeminiKey = localStorage.getItem('gemini-api-key');
    if (storedGeminiKey) {
      setHasGeminiApiKey(true);
    } else if (isStudio) {
      window.aistudio.hasSelectedApiKey().then(keySelected => {
        if (keySelected) {
           localStorage.setItem('gemini-api-key', 'aistudio_managed_key');
           setHasGeminiApiKey(true);
        }
      });
    }

    const storedOpenRouterKey = localStorage.getItem('openrouter-api-key');
    if (storedOpenRouterKey) {
        setHasOpenRouterApiKey(true);
    }
  }, []);

  useEffect(() => {
    previousAssetUrls.current.forEach(url => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    previousAssetUrls.current = assetUrls;

    return () => {
        assetUrls.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    }
  }, [assetUrls]);

  useEffect(() => {
    if (mode !== 'image' || !hasActiveApiKey) {
      setContextualPersonSuggestion(null);
      setIsAnalyzing(false);
      return;
    };
    const analyze = async () => {
      if (singleImageData) {
        setIsAnalyzing(true);
        setContextualPersonSuggestion(null);
        setError(null);
        try {
          const suggestion = await callApiService(analyzeImage, singleImageData);
          if (suggestion) {
              setContextualPersonSuggestion(suggestion);
          }
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
  }, [singleImageData, mode, hasActiveApiKey, apiProvider, selectedOpenRouterModel]);
  
  const handleSaveGeminiKey = () => {
    if (geminiApiKeyInput.trim()) {
      localStorage.setItem('gemini-api-key', geminiApiKeyInput.trim());
      setHasGeminiApiKey(true);
      setError(null);
    } else {
      setError("Please enter a valid API key.");
    }
  };

  const handleSaveOpenRouterKey = () => {
    if (openRouterApiKeyInput.trim()) {
      localStorage.setItem('openrouter-api-key', openRouterApiKeyInput.trim());
      setHasOpenRouterApiKey(true);
      setError(null);
    } else {
      setError("Please enter a valid API key.");
    }
  };

  const handleClearKey = () => {
    if (apiProvider === 'gemini') {
        localStorage.removeItem('gemini-api-key');
        setHasGeminiApiKey(false);
        setGeminiApiKeyInput('');
    } else {
        localStorage.removeItem('openrouter-api-key');
        setHasOpenRouterApiKey(false);
        setOpenRouterApiKeyInput('');
    }
  };

  const handleSelectKeyFromStudio = async () => {
    setError(null);
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      localStorage.setItem('gemini-api-key', 'aistudio_managed_key');
      setHasGeminiApiKey(true);
    } else {
      setError("API Key selection is unavailable in this environment.");
    }
  };

  const callApiService = async <T,>(
    serviceCall: (providerConfig: ProviderConfig, ...args: any[]) => Promise<T>, 
    ...args: any[]
  ): Promise<T | null> => {
    let providerConfig: ProviderConfig;

    if (apiProvider === 'gemini') {
        const apiKey = localStorage.getItem('gemini-api-key');
        if (!apiKey) {
            setError("Please provide a Gemini API key to proceed.");
            setHasGeminiApiKey(false);
            return null;
        }
        providerConfig = { provider: 'gemini', apiKey };
    } else { // openrouter
        const apiKey = localStorage.getItem('openrouter-api-key');
        if (!apiKey) {
            setError("Please provide an OpenRouter API key to proceed.");
            setHasOpenRouterApiKey(false);
            return null;
        }
        providerConfig = { provider: 'openrouter', apiKey, model: selectedOpenRouterModel };
    }

    setError(null);
    try {
      return await serviceCall(providerConfig, ...args);
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errText = err.message.toLowerCase();
        if (
          errText.includes("api key not found") ||
          errText.includes("api key is invalid") ||
          errText.includes("requested entity was not found") ||
          errText.includes("permission") ||
          errText.includes("quota") ||
          errText.includes("resource_exhausted") ||
          errText.includes("invalid api key")
        ) {
          setError(
            <>
              The provided API key has exceeded its quota, is invalid, or lacks permissions. Please clear it and try another. For Gemini video, a key from a project with{' '}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-red-200">
                billing enabled
              </a> is required.
            </>
          );
          handleClearKey();
        } else {
           setError(err.message);
        }
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

    if (singleImageData && similarity !== null) {
      let similarityPrompt = '';
      switch (similarity) {
        case 25:
          similarityPrompt = "use the original image as a loose inspiration for the new image";
          break;
        case 50:
          similarityPrompt = "apply the changes described, but feel free to creatively reinterpret the original image";
          break;
        case 75:
          similarityPrompt = "apply the changes described while maintaining a strong resemblance to the original image's style and composition";
          break;
        case 100:
          similarityPrompt = "make only the changes described and keep the rest of the image identical to the original";
          break;
      }
      if (similarityPrompt) {
        finalPrompt = finalPrompt ? `${finalPrompt}, ${similarityPrompt}` : similarityPrompt;
      }
    }

    if (!finalPrompt.trim() && !singleImageData) {
      setError('Please enter a prompt or upload an image to edit.');
      return;
    }

    setIsLoading(true);
    setAssetUrls([]);
    setAssetType(null);

    const base64ImageData = await callApiService(generateImage, finalPrompt, singleImageData);
    
    if (base64ImageData) {
      const objectUrl = `data:image/png;base64,${base64ImageData}`;
      setAssetUrls([objectUrl]);
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
    setAssetUrls([]);
    setAssetType(null);
    const videoBlob = await callApiService(generateVideo, prompt, singleImageData);
    if(videoBlob) {
      const objectUrl = URL.createObjectURL(videoBlob);
      setAssetUrls([objectUrl]);
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
    setAssetUrls([]);
    setAssetType(null);
    const recipeText = await callApiService(generateRecipe, prompt);
    if(recipeText) {
      setAssetUrls([recipeText]);
      setAssetType('recipe');
    }
    setIsLoading(false);
  };
  
  const handleRecipeFromLinkGeneration = async () => {
    const url = prompt.trim();
    if (!url) {
      setError('Por favor, introduce una URL para extraer una receta.');
      return;
    }
    try {
      new URL(url);
    } catch (_) {
      setError('Por favor, introduce una URL válida.');
      return;
    }

    setIsLoading(true);
    setAssetUrls([]);
    setAssetType(null);
    setSources(null);
    setRecipeImageUrl(null);
    const result = await callApiService(generateRecipeFromLink, url);
    if(result) {
      setAssetUrls([result.formattedRecipe]);
      setAssetType('recipe');
      setSources(result.sources || null);
      setRecipeImageUrl(result.imageUrl || null);
    }
    setIsLoading(false);
  };

  const handleTranslateClick = async () => {
    if (!textToTranslate.trim()) {
      setError('Please enter text to translate.');
      return;
    }
    setIsTranslating(true);
    setTranslationResult(null);
    const translatedText = await callApiService(translateText, textToTranslate, targetLanguage, stylizeAndCorrect);
    if(translatedText) {
      setTranslationResult(translatedText);
    }
    setIsTranslating(false);
  };

  const handleSpeechGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter text to generate speech.');
      return;
    }
    setIsLoading(true);
    setAssetUrls([]);
    setAssetType(null);
    const base64Audio = await callApiService(generateSpeech, prompt, selectedVoice);
    if(base64Audio) {
      const audioBlob = createWavBlobFromBase64(base64Audio);
      const objectUrl = URL.createObjectURL(audioBlob);
      setAssetUrls([objectUrl]);
      setAssetType('audio');
    }
    setIsLoading(false);
  };
  
  const handleProductShotGeneration = async () => {
    if (productImages.length === 0) {
      setError('Por favor, sube una o más imágenes de producto.');
      return;
    }

    setIsLoading(true);
    setAssetUrls([]);
    setAssetType(null);

    const result = await callApiService(generateProductShot, prompt, productImages, inspirationImageData);
    
    if (result && result.length > 0) {
      const objectUrls = result.map(base64 => `data:image/png;base64,${base64}`);
      setAssetUrls(objectUrls);
      setAssetType('productShot');
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
    } else if (mode === 'linkRecipe') {
      handleRecipeFromLinkGeneration();
    } else if (mode === 'speech') {
      handleSpeechGeneration();
    } else if (mode === 'productShot') {
      handleProductShotGeneration();
    }
  };
  
  const handleModeChange = (newMode: AppMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      setPrompt('');
      setSimilarity(null);
      setRemoveText(false);
      setSingleImageData(null);
      setProductImages([]);
      setInspirationImageData(null);
      setAssetUrls([]);
      setAssetType(null);
      setError(null);
      setAddPerson(false);
      setContextualPersonSuggestion(null);
      setTargetLanguage('Spanish');
      setStylizeAndCorrect(false);
      setSelectedVoice('Kore');
      setSources(null);
      setRecipeImageUrl(null);
      setTextToTranslate('');
      setTranslationResult(null);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
        const text = await navigator.clipboard.readText();
        setTextToTranslate(text);
    } catch (err) {
        console.error('Failed to paste text: ', err);
    }
  };

  const handleClearTranslationInput = () => {
      setTextToTranslate('');
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  const handleModalPrev = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prevIndex) => 
        prevIndex !== null ? (prevIndex - 1 + assetUrls.length) % assetUrls.length : null
      );
    }
  };

  const handleModalNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prevIndex) => 
        prevIndex !== null ? (prevIndex + 1) % assetUrls.length : null
      );
    }
  };


  const baseCanGenerate = prompt.trim().length > 0;
  
  const isTextOnlyMode = mode === 'recipe' || mode === 'linkRecipe';
  
  const isProviderCompatibleWithMode = () => {
    if (apiProvider === 'gemini') return true;
    // OpenRouter is only compatible with text-based generation/translation
    const compatibleModes: AppMode[] = ['recipe'];
    if (mode === 'image') return true; // Image mode has translation which is text-based
    return compatibleModes.includes(mode);
  }

  const imageGenCanGenerate = mode === 'image' && (prompt.trim().length > 0 || (!!singleImageData && (removeText || addPerson || similarity !== null)));
  const productShotCanGenerate = mode === 'productShot' && productImages.length > 0;
  const linkRecipeCanGenerate = mode === 'linkRecipe' && prompt.trim().length > 0;

  const canGenerate = hasActiveApiKey && isProviderCompatibleWithMode() && (
      (mode === 'image' && apiProvider === 'gemini' && imageGenCanGenerate) ||
      (mode === 'recipe' && baseCanGenerate) ||
      (mode === 'video' && apiProvider === 'gemini' && baseCanGenerate) ||
      (mode === 'productShot' && apiProvider === 'gemini' && productShotCanGenerate) ||
      (mode === 'linkRecipe' && apiProvider === 'gemini' && linkRecipeCanGenerate) ||
      (mode === 'speech' && apiProvider === 'gemini' && baseCanGenerate)
  );

  const getPlaceholderText = () => {
    switch (mode) {
      case 'image': return 'Your generated image will appear here.';
      case 'video': return 'Your generated video will appear here.';
      case 'recipe': return 'Your generated recipe will appear here.';
      case 'linkRecipe': return 'Your recipe extracted from the URL will appear here.';
      case 'speech': return 'Your generated audio will appear here.';
      case 'productShot': return 'Tus fotos de producto profesionales aparecerán aquí.';
      default: return 'Your generated asset will appear here.';
    }
  };

  if (!hasActiveApiKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-gray-800/50 p-8 rounded-2xl shadow-2xl border border-gray-700/50">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
            Welcome to Nano Banana
          </h2>
          <p className="text-gray-300 mb-6">
            To use this application, please provide an API key from your preferred provider.
          </p>
          
          <div className="my-6">
              <div className="flex bg-gray-900/50 p-1 rounded-full border border-gray-700">
                  <button 
                      onClick={() => setApiProvider('gemini')}
                      className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${apiProvider === 'gemini' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                  >
                      Google Gemini
                  </button>
                  <button 
                      onClick={() => setApiProvider('openrouter')}
                      className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${apiProvider === 'openrouter' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                  >
                      OpenRouter
                  </button>
              </div>
          </div>

          {apiProvider === 'gemini' ? (
            <>
              <p className="text-sm text-yellow-400/80 mb-6 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <strong>Important:</strong> For full functionality, especially for video generation, please use an API key from a Google Cloud project with{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-yellow-300">
                  billing enabled
                </a>. Free-tier keys may have limited access and quotas.
              </p>
              <ApiKeyInput
                providerName="Gemini"
                getKeyUrl="https://ai.google.dev/gemini-api/docs/api-key"
                apiKeyInput={geminiApiKeyInput}
                setApiKeyInput={setGeminiApiKeyInput}
                onSave={handleSaveGeminiKey}
                onClear={handleClearKey}
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
            </>
          ) : (
             <>
              <ApiKeyInput
                providerName="OpenRouter"
                getKeyUrl="https://openrouter.ai/keys"
                apiKeyInput={openRouterApiKeyInput}
                setApiKeyInput={setOpenRouterApiKeyInput}
                onSave={handleSaveOpenRouterKey}
                onClear={handleClearKey}
              />
                <div className="my-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-2">
                        Select a Model
                    </label>
                    <select
                        id="model-select"
                        value={selectedOpenRouterModel}
                        onChange={(e) => setSelectedOpenRouterModel(e.target.value)}
                        className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-200"
                    >
                        {OPENROUTER_MODELS.map(model => (
                            <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                    </select>
                </div>
               <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg text-center">
                 <p className="text-blue-300 text-sm">
                   OpenRouter can be used for text-based tasks like Recipe Generation and Translation.
                   <br/><br/>
                   For Image/Video/Audio features, please select the <strong>Google Gemini</strong> provider.
                 </p>
               </div>
                <div className="my-4">
                    <ErrorDisplay message={error} />
                </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const isCurrentModeIncompatibleWithProvider = !isProviderCompatibleWithMode();
  
  const ModeButton = ({ targetMode, label, disabled = false }: { targetMode: AppMode; label: string, disabled?: boolean }) => {
    const isIncompatible = disabled || (apiProvider === 'openrouter' && (targetMode === 'video' || targetMode === 'speech' || targetMode === 'productShot' || targetMode === 'linkRecipe'));
    const title = isIncompatible ? `This mode is only available with the Gemini API` : `Switch to ${label} mode`;
    return (
        <button 
            onClick={() => handleModeChange(targetMode)} 
            disabled={isIncompatible}
            title={title}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === targetMode ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'} ${isIncompatible ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {label}
        </button>
    );
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Header />
        
        <div className="my-6 flex justify-center items-center bg-gray-800 p-1 rounded-full shadow-lg w-fit mx-auto flex-wrap">
          <ModeButton targetMode="image" label="Image & Translation" />
          <ModeButton targetMode="productShot" label="Foto de Producto" />
          <ModeButton targetMode="video" label="Video Generation" />
          <ModeButton targetMode="recipe" label="Recipe Generation" />
          <ModeButton targetMode="linkRecipe" label="Receta desde URL" />
          <ModeButton targetMode="speech" label="Text-to-Speech" />
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
                mode={mode}
              />
              {(mode === 'image' || mode === 'video') && (
                <ImageUploader 
                  label={mode === 'image' ? "2. Add a base image (Optional)" : "2. Upload an image (Optional for video)"}
                  setImageData={setSingleImageData} 
                  disabled={isLoading || isTranslating || isCurrentModeIncompatibleWithProvider}
                  key={`${mode}-main`} 
                />
              )}
              {mode === 'productShot' && (
                <>
                  <ImageUploader
                    label="2. Sube una o más imágenes del producto"
                    onImagesChange={setProductImages}
                    images={productImages}
                    multiple={true}
                    disabled={isLoading || isCurrentModeIncompatibleWithProvider}
                    key="productShot-main"
                  />
                  <ImageUploader 
                    label="3. Sube una imagen de inspiración (Opcional)"
                    setImageData={setInspirationImageData} 
                    disabled={isLoading || isCurrentModeIncompatibleWithProvider}
                    key="productShot-inspiration" 
                  />
                </>
              )}
              {mode === 'image' && (
                <>
                  <div className="pt-6 border-t border-gray-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-200">Translate Text</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handlePasteFromClipboard}
                          disabled={isLoading || isTranslating}
                          className="flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Paste text from clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Paste
                        </button>
                        <button
                          onClick={handleClearTranslationInput}
                          disabled={isLoading || isTranslating || !textToTranslate.trim()}
                          className="flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Clear text"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear
                        </button>
                      </div>
                    </div>
                     <textarea
                      id="translate-prompt"
                      rows={4}
                      value={textToTranslate}
                      onChange={(e) => setTextToTranslate(e.target.value)}
                      disabled={isLoading || isTranslating}
                      placeholder="Enter text to translate here..."
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="mt-4 space-y-4">
                      <LanguageSelector 
                        targetLanguage={targetLanguage}
                        setTargetLanguage={setTargetLanguage}
                        disabled={isLoading || isTranslating}
                      />
                      <div className="flex items-center p-3 rounded-lg bg-gray-700/30">
                        <input
                          id="stylize-checkbox"
                          type="checkbox"
                          checked={stylizeAndCorrect}
                          onChange={(e) => setStylizeAndCorrect(e.target.checked)}
                          disabled={isLoading || isTranslating}
                          className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-pink-600 focus:ring-pink-500 cursor-pointer"
                        />
                        <label htmlFor="stylize-checkbox" className="ml-3 block text-sm font-medium text-gray-300 cursor-pointer">
                          Correct &amp; Stylize before translating ✨
                        </label>
                      </div>
                      <button
                        onClick={handleTranslateClick}
                        disabled={isTranslating || isLoading || !textToTranslate.trim()}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTranslating ? 'Translating...' : 'Translate Text'}
                      </button>
                    </div>
                  </div>
                </>
              )}
               {mode === 'speech' && (
                <div className="space-y-4">
                  <VoiceSelector
                    selectedVoice={selectedVoice}
                    setSelectedVoice={setSelectedVoice}
                    disabled={isLoading || isCurrentModeIncompatibleWithProvider}
                  />
                </div>
               )}
            </div>
            
            <div className="flex flex-col gap-6">
              {/* Main Asset Output */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-900/50 rounded-xl border border-dashed border-gray-600 min-h-[300px]">
                {isLoading ? (
                  <LoadingIndicator mode={mode} />
                ) : assetUrls.length > 0 ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <AssetDisplay 
                      srcs={assetUrls} 
                      alt={prompt} 
                      assetType={assetType} 
                      imageUrl={recipeImageUrl} 
                      onImageClick={assetType === 'productShot' ? handleImageClick : undefined}
                    />
                    {sources && sources.length > 0 && (
                      <div className="w-full text-left p-2 bg-gray-900/50 rounded-md">
                        <h4 className="text-sm font-semibold text-gray-300 mb-1">Sources:</h4>
                        <ul className="space-y-1">
                          {sources.filter(source => source.web && source.web.uri).map((source, index) => (
                            <li key={index} className="text-xs text-pink-400 truncate">
                              <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="hover:underline" title={source.web.title || source.web.uri}>
                                - {source.web.title || source.web.uri}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {assetUrls.length === 1 && assetType !== 'productShot' && (
                      <DownloadButton assetUrl={assetUrls[0]} assetType={assetType} />
                    )}
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

              {/* Translation Output - only in image mode */}
              {mode === 'image' && (
                <div className="flex flex-col items-center justify-center p-4 bg-gray-900/50 rounded-xl border border-dashed border-gray-600 min-h-[200px]">
                  {isTranslating ? (
                    <LoadingIndicator mode={'translation'} />
                  ) : translationResult ? (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <AssetDisplay translationResult={translationResult} />
                      <DownloadButton assetUrl={translationResult} assetType={'translation'} />
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.06 11.06L12 12.06l1.06-1.06M12 12.06l1.06 1.06M12 12.06L10.94 13.12M12 21a9 9 0 110-18 9 9 0 010 18z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6" />
                      </svg>
                      <p className="mt-2">Your translation will appear here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8">
            <ErrorDisplay message={error} />
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-grow w-full">
                  <GenerateButton onClick={handleGenerate} disabled={isLoading || isTranslating || !canGenerate} mode={mode} />
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
        {selectedImageIndex !== null && (
          <Modal
            src={assetUrls[selectedImageIndex]}
            alt={`Product shot ${selectedImageIndex + 1}`}
            onClose={handleCloseModal}
            onPrev={handleModalPrev}
            onNext={handleModalNext}
            showPrev={assetUrls.length > 1}
            showNext={assetUrls.length > 1}
          />
        )}
      </div>
    </div>
  );
};

export default App;
