
import React, { useState, useEffect, useRef } from 'react';
import { generateImage, generateVideo, analyzeImage, generateRecipe, translateText, generateSpeech, createWavBlobFromBase64, generateRecipeFromLink, generateProductShot } from './services/geminiService';
import type { ImageData } from './types';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { ImageUploader } from './components/ImageUploader';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AssetDisplay } from './components/AssetDisplay';
import { ErrorDisplay } from './components/ErrorDisplay';
import { GenerateButton, DownloadButton } from './components/GenerateButton';
import { LanguageSelector, VoiceSelector } from './components/VideoPlayer';
import { Modal } from './components/Modal';
import { ApiKeyInput } from './components/ApiKeyInput';

const PERSON_ACTIONS = [
  "caminando",
  "leyendo un libro",
  "mirando el cielo",
  "sentado en un banco",
  "bailando",
  "tomando una foto",
];

type AppMode = 'image' | 'video' | 'recipe' | 'linkRecipe' | 'speech' | 'productShot';

const App: React.FC = () => {
  const [isAiStudio, setIsAiStudio] = useState<boolean>(false);
  const [hasSelectedKey, setHasSelectedKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState<string>('');

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
  
  const [textToTranslate, setTextToTranslate] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  const previousAssetUrls = useRef<string[]>([]);

  useEffect(() => {
    // @ts-ignore
    const runningInAiStudio = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
    setIsAiStudio(runningInAiStudio);

    const checkApiKey = async () => {
      if (runningInAiStudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasSelectedKey(hasKey);
      } else {
        // Running on Vercel or other external host
        const storedApiKey = localStorage.getItem('gemini-api-key');
        if (storedApiKey) {
          setApiKey(storedApiKey);
          setHasSelectedKey(true); // Treat stored key as a "selected" key
        } else {
          setHasSelectedKey(false);
        }
      }
    };
    checkApiKey();
  }, []);
  
  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini-api-key', key);
    setApiKey(key);
    setHasSelectedKey(true);
  };

  const handleConnectClick = async () => {
    // @ts-ignore
    if (isAiStudio && window.aistudio.openSelectKey) {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasSelectedKey(true);
      } catch (e) {
        console.error("Error opening API key selection:", e);
        setError("Could not open the API key selection dialog.");
      }
    }
  };

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
    if (mode !== 'image') {
      setContextualPersonSuggestion(null);
      setIsAnalyzing(false);
      return;
    };
    const analyze = async () => {
      if (singleImageData) {
        setIsAnalyzing(true);
        setContextualPersonSuggestion(null);
        const suggestion = await callApiService(analyzeImage, singleImageData, apiKey);
        if (suggestion) {
            setContextualPersonSuggestion(suggestion);
        }
        setIsAnalyzing(false);
      } else {
        setContextualPersonSuggestion(null);
        setIsAnalyzing(false);
      }
    };
    analyze();
  }, [singleImageData, mode, apiKey]);
  
  const callApiService = async <T,>(
    serviceCall: (...args: any[]) => Promise<T>, 
    ...args: any[]
  ): Promise<T | null> => {
    setError(null);
    try {
      const currentApiKey = isAiStudio ? process.env.API_KEY! : apiKey;
      if (!currentApiKey) {
        setError("API key is not set.");
        setHasSelectedKey(false);
        return null;
      }
      return await serviceCall(...args, currentApiKey);
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
          setHasSelectedKey(false); // Force re-authentication/re-entry
          const changeKeyAction = isAiStudio 
            ? <button onClick={handleConnectClick} className="font-bold underline hover:text-red-200 ml-2">Selecciona una clave diferente.</button>
            : <button onClick={() => setHasSelectedKey(false)} className="font-bold underline hover:text-red-200 ml-2">Ingresa una clave diferente.</button>;

          setError(
            <>
              La clave de API ha excedido su cuota, no es válida o no tiene permisos. Para el video de Gemini, se requiere una clave de un proyecto con{' '}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-red-200">
                facturación habilitada
              </a>{' '}
              requerida. Por favor, verifica la configuración de tu proyecto. {changeKeyAction}
            </>
          );
        } else {
           setError(err.message);
        }
      } else {
        setError('Ocurrió un error desconocido durante la llamada a la API.');
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
  
  const imageGenCanGenerate = mode === 'image' && (prompt.trim().length > 0 || (!!singleImageData && (removeText || addPerson || similarity !== null)));
  const productShotCanGenerate = mode === 'productShot' && productImages.length > 0;
  const linkRecipeCanGenerate = mode === 'linkRecipe' && prompt.trim().length > 0;

  const canGenerate = (
      (mode === 'image' && imageGenCanGenerate) ||
      (mode === 'recipe' && baseCanGenerate) ||
      (mode === 'video' && baseCanGenerate) ||
      (mode === 'productShot' && productShotCanGenerate) ||
      (mode === 'linkRecipe' && linkRecipeCanGenerate) ||
      (mode === 'speech' && baseCanGenerate)
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

  const ModeButton = ({ targetMode, label }: { targetMode: AppMode; label: string }) => {
    return (
        <button 
            onClick={() => handleModeChange(targetMode)} 
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 ${mode === targetMode ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
            {label}
        </button>
    );
  };

  if (hasSelectedKey === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-pink-500"></div>
        <p className="mt-4 text-lg">Initializing...</p>
      </div>
    );
  }

  if (!hasSelectedKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <Header />
          {isAiStudio ? (
             <>
              <div className="mt-8 text-gray-300 space-y-4">
                <p>
                  Para usar esta aplicación, por favor conecta tu cuenta de Google AI Studio.
                </p>
                <p>
                  Funciones avanzadas como la generación de video requieren una clave de API de un proyecto con{' '}
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-pink-400">
                    facturación habilitada
                  </a>.
                </p>
              </div>
              <div className="mt-8">
                <button
                  onClick={handleConnectClick}
                  className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300 shadow-lg"
                >
                  Conectar con Google AI Studio
                </button>
              </div>
            </>
          ) : (
            <ApiKeyInput onSave={handleSaveApiKey} />
          )}
          <div className="mt-6">
            <ErrorDisplay message={error} />
          </div>
        </div>
      </div>
    );
  }


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
                  disabled={isLoading || isTranslating}
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
                    disabled={isLoading}
                    key="productShot-main"
                  />
                  <ImageUploader 
                    label="3. Sube una imagen de inspiración (Opcional)"
                    setImageData={setInspirationImageData} 
                    disabled={isLoading}
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
                    disabled={isLoading}
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
