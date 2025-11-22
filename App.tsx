
import React, { useState, useEffect, useRef } from 'react';
import { generateImage, analyzeImage, generateRecipe, translateText, generateSpeech, createWavBlobFromBase64, generateProductShot, generateBlogPostFromLink, generateRecipeCardFromLink, GeminiUserInputError } from './services/geminiService';
import type { ImageData, HistoryItem, AppMode, ModeState } from './types';
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
import { HistoryPanel } from './components/HistoryPanel';

const PERSON_ACTIONS = [
  "caminando",
  "leyendo un libro",
  "mirando el cielo",
  "sentado en un banco",
  "bailando",
  "tomando una foto",
];

const initialModeState: ModeState = {
  prompt: '',
  similarity: null,
  removeText: false,
  singleImageData: null,
  productImages: [],
  inspirationImageData: null,
  assetUrls: [],
  assetType: null,
  error: null,
  addPerson: false,
  contextualPersonSuggestion: null,
  targetLanguage: 'German',
  stylizeAndCorrect: false,
  selectedVoice: 'Kore',
  sources: null,
  recipeImageUrl: null,
  selectedImageIndex: null,
  textToTranslate: '',
  translationResult: null,
  primaryKeyword: '',
  blogPostLanguage: 'Spanish',
  blogPostImageUrl: null,
  imageFromBlogPrompt: '',
  generatedImageFromBlog: null,
  isGeneratingImageFromBlog: false,
};


const App: React.FC = () => {
  const [isAiStudio, setIsAiStudio] = useState<boolean>(false);
  const [hasSelectedKey, setHasSelectedKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [mode, setMode] = useState<AppMode>('image');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [modeStates, setModeStates] = useState<Record<AppMode, ModeState>>({
    image: initialModeState,
    recipe: { ...initialModeState, targetLanguage: 'German', selectedVoice: 'Kore' },
    speech: { ...initialModeState, targetLanguage: 'German', selectedVoice: 'Kore' },
    productShot: { ...initialModeState, targetLanguage: 'German', selectedVoice: 'Kore' },
    blogPost: { ...initialModeState, blogPostLanguage: 'Spanish', targetLanguage: 'German', selectedVoice: 'Kore' },
    recipeCard: { ...initialModeState, targetLanguage: 'German', selectedVoice: 'Kore' },
  });

  const currentModeState = modeStates[mode];

  const updateCurrentModeState = (updates: Partial<ModeState>) => {
    setModeStates(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        ...updates,
      }
    }));
  };
  
  // State for History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

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
        const storedApiKey = process.env.GEMINI_API_KEY;
        if (storedApiKey) {
          setApiKey(storedApiKey);
          setHasSelectedKey(true);
        } else {
          setHasSelectedKey(false);
        }
      }
    };
    checkApiKey();
  }, []);
  
  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('nano-banana-history');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nano-banana-history', JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [history]);

  
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
        updateCurrentModeState({ error: "Could not open the API key selection dialog." });
      }
    }
  };

  useEffect(() => {
    if (mode !== 'image') {
      updateCurrentModeState({ contextualPersonSuggestion: null });
      setIsAnalyzing(false);
      return;
    };
    const analyze = async () => {
      if (currentModeState.singleImageData) {
        setIsAnalyzing(true);
        updateCurrentModeState({ contextualPersonSuggestion: null });
        const suggestion = await callApiService(analyzeImage, currentModeState.singleImageData, apiKey);
        if (suggestion) {
            updateCurrentModeState({ contextualPersonSuggestion: suggestion });
        }
        setIsAnalyzing(false);
      } else {
        updateCurrentModeState({ contextualPersonSuggestion: null });
        setIsAnalyzing(false);
      }
    };
    analyze();
  }, [currentModeState.singleImageData, mode, apiKey]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: new Date().toISOString() + Math.random(),
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Limit history to 50 items
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const callApiService = async <T,>(
    serviceCall: (...args: any[]) => Promise<T>, 
    ...args: any[]
  ): Promise<T | null> => {
    updateCurrentModeState({ error: null });
    try {
      const currentApiKey = isAiStudio ? process.env.API_KEY! : apiKey;
      if (!currentApiKey) {
        updateCurrentModeState({ error: "API key is not set." });
        setHasSelectedKey(false);
        return null;
      }
      return await serviceCall(...args, currentApiKey);
    } catch (err: unknown) {
      let errorNode: React.ReactNode;
      if (err instanceof GeminiUserInputError) {
        errorNode = <span>{err.message}</span>;
      } else if (err instanceof Error) {
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
          setHasSelectedKey(false); 
          const changeKeyAction = isAiStudio 
            ? <button onClick={handleConnectClick} className="font-bold underline hover:text-red-200 ml-2">Selecciona una clave diferente.</button>
            : <button onClick={() => setHasSelectedKey(false)} className="font-bold underline hover:text-red-200 ml-2">Ingresa una clave diferente.</button>;

          errorNode = (
            <>
              La clave de API ha excedido su cuota, no es válida o no tiene permisos. Para el video de Gemini, se requiere una clave de un proyecto con{' '}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-red-200">
                facturación habilitada
              </a>{' '}
              requerida. Por favor, verifica la configuración de tu proyecto. {changeKeyAction}
            </>
          );
        } else {
           errorNode = err.message;
        }
      } else {
        errorNode = 'Ocurrió un error desconocido durante la llamada a la API.';
      }
      updateCurrentModeState({ error: errorNode });
      return null;
    }
  };

  const handleImageAndTextGeneration = async () => {
    const { 
      prompt, singleImageData, removeText, addPerson, similarity, contextualPersonSuggestion,
      textToTranslate, targetLanguage, stylizeAndCorrect 
    } = currentModeState;

    const imageGenPossible = prompt.trim().length > 0 || (!!singleImageData && (removeText || addPerson || similarity !== null));
    const translationPossible = textToTranslate.trim().length > 0;

    if (!imageGenPossible && !translationPossible) {
      updateCurrentModeState({ error: 'Please enter a prompt to generate an image or text to translate.' });
      return;
    }

    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], translationResult: null, assetType: null });

    // --- Image Generation Logic ---
    let imagePromise: Promise<string | undefined | null> = Promise.resolve(null);
    let finalImagePrompt = '';
    if (imageGenPossible) {
      finalImagePrompt = prompt.trim();
      if (addPerson) {
        const personToAdd = contextualPersonSuggestion || `una persona ${PERSON_ACTIONS[Math.floor(Math.random() * PERSON_ACTIONS.length)]}`;
        finalImagePrompt = finalImagePrompt ? `${finalImagePrompt}, ${personToAdd}` : personToAdd;
      }
      if (removeText) {
        const removeTextPrompt = "remove any text from the image";
        finalImagePrompt = finalImagePrompt ? `${finalImagePrompt}, ${removeTextPrompt}` : removeTextPrompt;
      }
      if (singleImageData && similarity !== null) {
        let similarityPrompt = '';
        switch (similarity) {
          case 25: similarityPrompt = "use the original image as a loose inspiration for the new image"; break;
          case 50: similarityPrompt = "apply the changes described, but feel free to creatively reinterpret the original image"; break;
          case 75: similarityPrompt = "apply the changes described while maintaining a strong resemblance to the original image's style and composition"; break;
          case 100: similarityPrompt = "make only the changes described and keep the rest of the image identical to the original"; break;
        }
        if (similarityPrompt) {
          finalImagePrompt = finalImagePrompt ? `${finalImagePrompt}, ${similarityPrompt}` : similarityPrompt;
        }
      }
      imagePromise = callApiService(generateImage, finalImagePrompt, singleImageData);
    }
    
    // --- Text Translation Logic ---
    let translationPromise: Promise<string | undefined | null> = Promise.resolve(null);
    if (translationPossible) {
        translationPromise = callApiService(translateText, textToTranslate, targetLanguage, stylizeAndCorrect);
    }
    
    // --- Execute in Parallel ---
    const [imageData, translatedText] = await Promise.all([imagePromise, translationPromise]);
    
    const newAssetUrls: string[] = [];
    let newAssetType: 'image' | null = null;
    
    if (imageData) {
      const dataUrl = `data:image/png;base64,${imageData}`;
      newAssetUrls.push(dataUrl);
      newAssetType = 'image';
    }

    updateCurrentModeState({ 
        assetUrls: newAssetUrls, 
        assetType: newAssetType,
        translationResult: translatedText || null 
    });

    if (imageData || translatedText) {
        addToHistory({ 
            mode: 'image', 
            prompt: finalImagePrompt || textToTranslate,
            assetUrls: newAssetUrls, 
            assetType: newAssetType, 
            translationResult: translatedText || null, 
            recipeImageUrl: null, 
            sources: null 
        });
    }

    setIsLoading(false);
  };

  const handleRecipeGeneration = async () => {
    const { prompt } = currentModeState;
    if (!prompt.trim()) {
      updateCurrentModeState({ error: 'Please enter a prompt to generate a recipe.' });
      return;
    }
    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null });
    const recipeText = await callApiService(generateRecipe, prompt);
    if(recipeText) {
      updateCurrentModeState({ assetUrls: [recipeText], assetType: 'recipe' });
      addToHistory({ mode: 'recipe', prompt, assetUrls: [recipeText], assetType: 'recipe' });
    }
    setIsLoading(false);
  };
  
  const handleRecipeCardGeneration = async () => {
    const url = currentModeState.prompt.trim();
    if (!url) {
      updateCurrentModeState({ error: 'Por favor, introduce una URL para crear una tarjeta de receta.' });
      return;
    }
     try {
      new URL(url);
    } catch (_) {
      updateCurrentModeState({ error: 'Por favor, introduce una URL válida.' });
      return;
    }
    
    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null });
    const result = await callApiService(generateRecipeCardFromLink, url);
    if (result) {
      const resultString = JSON.stringify(result);
      updateCurrentModeState({ assetUrls: [resultString], assetType: 'recipeCard' });
      addToHistory({ mode: 'recipeCard', prompt: url, assetUrls: [resultString], assetType: 'recipeCard' });
    }
    setIsLoading(false);
  };

  const handleBlogPostGeneration = async () => {
    const { prompt, primaryKeyword, blogPostLanguage } = currentModeState;
    const url = prompt.trim();
    if (!url) {
      updateCurrentModeState({ error: 'Por favor, introduce una URL para generar el post.' });
      return;
    }
    try {
      new URL(url);
    } catch (_) {
      updateCurrentModeState({ error: 'Por favor, introduce una URL válida.' });
      return;
    }
    if (!primaryKeyword.trim()) {
      updateCurrentModeState({ error: 'Por favor, introduce una palabra clave.' });
      return;
    }

    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null, blogPostImageUrl: null, generatedImageFromBlog: null, imageFromBlogPrompt: '' });

    const result = await callApiService(generateBlogPostFromLink, url, primaryKeyword, blogPostLanguage);
    if (result) {
      updateCurrentModeState({
        assetUrls: [result.blogPostContent],
        assetType: 'blogPost',
        blogPostImageUrl: result.imageUrl
      });
      addToHistory({ 
        mode: 'blogPost', 
        prompt: `${url} | ${primaryKeyword}`, 
        assetUrls: [result.blogPostContent], 
        assetType: 'blogPost',
        blogPostImageUrl: result.imageUrl
      });
    }
    setIsLoading(false);
  };

  const urlToImageData = async (url: string): Promise<ImageData | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        updateCurrentModeState({ error: `Failed to fetch image from URL. Status: ${response.status}. This might be a CORS issue.` });
        return null;
      }
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string)?.split(',')[1];
          if (base64String) {
            resolve({ imageBytes: base64String, mimeType: blob.type });
          } else {
            reject(new Error('Failed to read blob as base64.'));
          }
        };
        reader.onerror = (err) => {
          updateCurrentModeState({ error: "Error reading image data." });
          reject(err);
        }
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting URL to ImageData:', error);
      updateCurrentModeState({ error: "Could not load the product image. This may be due to network or security (CORS) restrictions." });
      return null;
    }
  };

  const handleGenerateImageFromBlogPost = async () => {
    const { blogPostImageUrl, imageFromBlogPrompt } = currentModeState;
    if (!blogPostImageUrl || !imageFromBlogPrompt.trim()) {
      updateCurrentModeState({ error: "Please provide a prompt and ensure an image was extracted." });
      return;
    }
    updateCurrentModeState({ isGeneratingImageFromBlog: true, generatedImageFromBlog: null, error: null });

    const sourceImageData = await urlToImageData(blogPostImageUrl);
    
    if (!sourceImageData) {
      // urlToImageData will set a specific error
      updateCurrentModeState({ isGeneratingImageFromBlog: false });
      return;
    }
    
    const newImageBase64 = await callApiService(generateImage, imageFromBlogPrompt, sourceImageData);

    if (newImageBase64) {
      updateCurrentModeState({ generatedImageFromBlog: `data:image/png;base64,${newImageBase64}` });
    }
    updateCurrentModeState({ isGeneratingImageFromBlog: false });
  };


  const handleSpeechGeneration = async () => {
    const { prompt, selectedVoice } = currentModeState;
    if (!prompt.trim()) {
      updateCurrentModeState({ error: 'Please enter text to generate speech.' });
      return;
    }
    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null });
    const base64Audio = await callApiService(generateSpeech, prompt, selectedVoice);
    if(base64Audio) {
      const audioBlob = createWavBlobFromBase64(base64Audio);
      const dataUrl = await blobToDataUrl(audioBlob);
      updateCurrentModeState({ assetUrls: [dataUrl], assetType: 'audio' });
      addToHistory({ mode: 'speech', prompt, assetUrls: [dataUrl], assetType: 'audio' });
    }
    setIsLoading(false);
  };
  
  const handleProductShotGeneration = async () => {
    const { prompt, productImages, inspirationImageData } = currentModeState;
    if (productImages.length === 0) {
      updateCurrentModeState({ error: 'Por favor, sube una o más imágenes de producto.' });
      return;
    }

    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null });

    const result = await callApiService(generateProductShot, prompt, productImages, inspirationImageData);
    
    if (result && result.length > 0) {
      const dataUrls = result.map(base64 => `data:image/png;base64,${base64}`);
      updateCurrentModeState({ assetUrls: dataUrls, assetType: 'productShot' });
      addToHistory({ mode: 'productShot', prompt, assetUrls: dataUrls, assetType: 'productShot' });
    }
    setIsLoading(false);
  };

  const handleGenerate = () => {
    if (mode === 'image') {
      handleImageAndTextGeneration();
    } else if (mode === 'recipe') {
      handleRecipeGeneration();
    } else if (mode === 'speech') {
      handleSpeechGeneration();
    } else if (mode === 'productShot') {
      handleProductShotGeneration();
    } else if (mode === 'blogPost') {
      handleBlogPostGeneration();
    } else if (mode === 'recipeCard') {
      handleRecipeCardGeneration();
    }
  };
  
  const handleModeChange = (newMode: AppMode) => {
    if (newMode !== mode) {
      setMode(newMode);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
        const text = await navigator.clipboard.readText();
        updateCurrentModeState({ textToTranslate: text });
    } catch (err) {
        console.error('Failed to paste text: ', err);
    }
  };

  const handleClearTranslationInput = () => {
      updateCurrentModeState({ textToTranslate: '' });
  };

  const handleImageClick = (index: number) => {
    updateCurrentModeState({ selectedImageIndex: index });
  };

  const handleCloseModal = () => {
    updateCurrentModeState({ selectedImageIndex: null });
  };

  const handleModalPrev = () => {
    const { selectedImageIndex, assetUrls } = currentModeState;
    if (selectedImageIndex !== null) {
      updateCurrentModeState({
        selectedImageIndex: (selectedImageIndex - 1 + assetUrls.length) % assetUrls.length
      });
    }
  };

  const handleModalNext = () => {
    const { selectedImageIndex, assetUrls } = currentModeState;
    if (selectedImageIndex !== null) {
      updateCurrentModeState({
        selectedImageIndex: (selectedImageIndex + 1) % assetUrls.length
      });
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const { mode, prompt, assetUrls, assetType, translationResult, recipeImageUrl, blogPostImageUrl, sources } = item;
    
    setModeStates(prev => ({
      ...prev,
      [mode]: {
        ...initialModeState, // Reset the mode to a clean state
        ...prev[mode],     // Re-apply any non-resettable state if needed in future
        prompt: prompt,
        assetUrls: assetUrls,
        assetType: assetType,
        translationResult: translationResult || null,
        recipeImageUrl: recipeImageUrl || null,
        blogPostImageUrl: blogPostImageUrl || null,
        sources: sources || null,
        error: null,
      }
    }));

    setMode(mode);
    setIsLoading(false);
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire generation history? This action cannot be undone.')) {
      setHistory([]);
    }
  };

  const { prompt, singleImageData, removeText, addPerson, similarity, productImages, textToTranslate, primaryKeyword } = currentModeState;
  const baseCanGenerate = prompt.trim().length > 0;
  
  const imageGenCanGenerate = prompt.trim().length > 0 || (!!singleImageData && (removeText || addPerson || similarity !== null));
  const productShotCanGenerate = mode === 'productShot' && productImages.length > 0;
  const blogPostCanGenerate = mode === 'blogPost' && prompt.trim().length > 0 && primaryKeyword.trim().length > 0;
  const recipeCardCanGenerate = mode === 'recipeCard' && prompt.trim().length > 0;
  const canTranslate = textToTranslate.trim().length > 0;

  const canGenerate = (
      (mode === 'image' && (imageGenCanGenerate || canTranslate)) ||
      (mode === 'recipe' && baseCanGenerate) ||
      (mode === 'productShot' && productShotCanGenerate) ||
      (mode === 'blogPost' && blogPostCanGenerate) ||
      (mode === 'recipeCard' && recipeCardCanGenerate) ||
      (mode === 'speech' && baseCanGenerate)
  );


  const getPlaceholderText = () => {
    switch (mode) {
      case 'image': return 'Your generated image will appear here.';
      case 'recipe': return 'Your generated recipe will appear here.';
      case 'recipeCard': return 'Your generated recipe card will appear here.';
      case 'speech': return 'Your generated audio will appear here.';
      case 'productShot': return 'Tus fotos de producto profesionales aparecerán aquí.';
      case 'blogPost': return 'Your generated blog post will appear here.';
      default: return 'Your generated asset will appear here.';
    }
  };

  const ModeButton = ({ targetMode, label }: { targetMode: AppMode; label: string }) => {
    return (
        <button 
            onClick={() => handleModeChange(targetMode)} 
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                mode === targetMode 
                ? 'bg-pink-600 text-white shadow-lg' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );
  };
  
  const mainContent = () => {
    if (hasSelectedKey === false) {
      if (isAiStudio) {
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Conecta tu clave de API para empezar</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Para usar las funciones de generación de video de Gemini, necesitarás una clave de API de un proyecto con{' '}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-pink-400">
                facturación habilitada
              </a>.
            </p>
            <button
              onClick={handleConnectClick}
              className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300 shadow-lg"
            >
              Conectar Clave de API
            </button>
          </div>
        );
      }
      return <ApiKeyInput onSave={handleSaveApiKey} />;
    }
    
    if (hasSelectedKey === null) {
      return <LoadingIndicator mode="image" />;
    }
    
    const { 
      prompt, similarity, removeText, addPerson, contextualPersonSuggestion, 
      primaryKeyword, blogPostLanguage, 
      selectedVoice, 
      productImages, inspirationImageData, 
      textToTranslate, targetLanguage, stylizeAndCorrect,
      error, assetUrls, translationResult, assetType, recipeImageUrl,
      blogPostImageUrl, imageFromBlogPrompt, isGeneratingImageFromBlog, generatedImageFromBlog,
      selectedImageIndex
    } = currentModeState;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
              <div className="flex flex-wrap gap-2 mb-6">
                <ModeButton targetMode="image" label="Image & Translation" />
                <ModeButton targetMode="productShot" label="Foto de Producto" />
                <ModeButton targetMode="speech" label="Text-to-Speech" />
                <ModeButton targetMode="blogPost" label="Blog Post desde URL" />
                <ModeButton targetMode="recipeCard" label="Tarjeta de Receta" />
              </div>

              { (mode === 'image' || mode === 'recipe' || mode === 'speech' || mode === 'productShot' || mode === 'blogPost' || mode === 'recipeCard') && (
                <PromptInput
                  prompt={prompt}
                  setPrompt={(value) => updateCurrentModeState({ prompt: typeof value === 'function' ? value(prompt) : value })}
                  disabled={isLoading}
                  similarity={similarity}
                  setSimilarity={(value) => updateCurrentModeState({ similarity: value })}
                  removeText={removeText}
                  setRemoveText={(value) => updateCurrentModeState({ removeText: value })}
                  isAnalyzing={isAnalyzing}
                  contextualPersonSuggestion={contextualPersonSuggestion}
                  addPerson={addPerson}
                  setAddPerson={(value) => updateCurrentModeState({ addPerson: value })}
                  mode={mode}
                />
              )}
              {mode === 'blogPost' && (
                <>
                  <div className="w-full mt-4">
                    <label htmlFor="primaryKeyword" className="block text-sm font-medium text-gray-300 mb-2">
                      2. Ingresa tu PALABRA CLAVE
                    </label>
                    <input
                      id="primaryKeyword"
                      type="text"
                      value={primaryKeyword}
                      onChange={(e) => updateCurrentModeState({ primaryKeyword: e.target.value })}
                      disabled={isLoading}
                      placeholder="ej., mejores alternativas a ChatGPT para marketing"
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                   <div className="w-full mt-4">
                    <LanguageSelector 
                        targetLanguage={blogPostLanguage}
                        setTargetLanguage={(value) => updateCurrentModeState({ blogPostLanguage: value })}
                        disabled={isLoading}
                        label="3. Selecciona el idioma del post"
                    />
                  </div>
                </>
              )}
            </div>

            {mode === 'speech' && (
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                <VoiceSelector selectedVoice={selectedVoice} setSelectedVoice={(value) => updateCurrentModeState({ selectedVoice: value })} disabled={isLoading} />
              </div>
            )}
            
            { (mode === 'image') && (
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                <ImageUploader label="2. Add a base image (Optional)" disabled={isLoading} setImageData={(value) => updateCurrentModeState({ singleImageData: value })} />
              </div>
            )}

            { mode === 'productShot' && (
              <>
                <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                  <ImageUploader 
                    label="2. Sube tus imágenes de producto" 
                    disabled={isLoading} 
                    multiple 
                    images={productImages}
                    onImagesChange={(value) => updateCurrentModeState({ productImages: value })}
                  />
                </div>
                 <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                  <ImageUploader 
                    label="3. Sube una imagen de inspiración (opcional)" 
                    disabled={isLoading}
                    setImageData={(value) => updateCurrentModeState({ inspirationImageData: value })}
                  />
                </div>
              </>
            )}

            {mode === 'image' && (
              <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg">
                <h2 className="text-sm font-medium text-gray-300 mb-2">Translate Text</h2>
                 <div className="flex items-center justify-end gap-2 mb-2">
                    <button
                        onClick={handlePasteFromClipboard}
                        disabled={isLoading}
                        className="text-xs px-2 py-1 border border-gray-600 rounded-md text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50"
                    >
                        Paste
                    </button>
                     <button
                        onClick={handleClearTranslationInput}
                        disabled={isLoading || !textToTranslate}
                        className="text-xs px-2 py-1 border border-gray-600 rounded-md text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50"
                    >
                        Clear
                    </button>
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={textToTranslate}
                    onChange={(e) => updateCurrentModeState({ textToTranslate: e.target.value })}
                    disabled={isLoading}
                    placeholder="Enter text to translate here..."
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none disabled:opacity-50"
                  />
                </div>
                 <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center">
                    <LanguageSelector 
                      targetLanguage={targetLanguage} 
                      setTargetLanguage={(value) => updateCurrentModeState({ targetLanguage: value })}
                      disabled={isLoading} 
                      label="2. Select target language"
                    />
                </div>
                <div className="mt-4 flex items-center justify-start gap-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={stylizeAndCorrect}
                            onChange={(e) => updateCurrentModeState({ stylizeAndCorrect: e.target.checked })}
                            disabled={isLoading}
                            className="h-4 w-4 rounded border-gray-300 bg-gray-700 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="ml-2 text-sm text-gray-300">Correct & Stylize before translating ✨</span>
                    </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col gap-4">
              <ErrorDisplay message={error} />
              
              {mode === 'image' ? (
                <>
                  {/* Image Generation Output */}
                  <div className="bg-gray-800/50 p-4 rounded-2xl flex items-center justify-center min-h-[300px] shadow-lg">
                    {isLoading && imageGenCanGenerate ? (
                      <LoadingIndicator mode="image" />
                    ) : assetUrls.length > 0 ? (
                      <AssetDisplay 
                        srcs={assetUrls} 
                        alt={prompt} 
                        assetType={assetType}
                        onImageClick={handleImageClick}
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="mt-2">Your generated image will appear here.</p>
                      </div>
                    )}
                  </div>
                  {/* Text Translation Output */}
                  <div className="bg-gray-800/50 p-4 rounded-2xl flex items-center justify-center min-h-[150px] shadow-lg">
                    {isLoading && canTranslate ? (
                      <LoadingIndicator mode="translation" />
                    ) : translationResult ? (
                      <AssetDisplay 
                        translationResult={translationResult}
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m4 13-4-4-4 4M19 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2z" /></svg>
                        <p className="mt-2">Your translation will appear here.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Original single pane for other modes */
                <div className="flex-grow bg-gray-800/50 p-4 rounded-2xl flex items-center justify-center min-h-[300px] lg:min-h-0 shadow-lg">
                  {isLoading ? (
                    <LoadingIndicator mode={mode} />
                  ) : assetUrls.length > 0 ? (
                    <AssetDisplay 
                      srcs={assetUrls} 
                      alt={prompt} 
                      assetType={assetType}
                      imageUrl={recipeImageUrl}
                      onImageClick={handleImageClick}
                      blogPostImageUrl={blogPostImageUrl}
                      imageFromBlogPrompt={imageFromBlogPrompt}
                      setImageFromBlogPrompt={(value) => updateCurrentModeState({ imageFromBlogPrompt: value })}
                      onGenerateImageFromBlog={handleGenerateImageFromBlogPost}
                      isGeneratingImageFromBlog={isGeneratingImageFromBlog}
                      generatedImageFromBlog={generatedImageFromBlog}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <p>{getPlaceholderText()}</p>
                    </div>
                  )}
                </div>
              )}
              
              <GenerateButton onClick={handleGenerate} disabled={isLoading || !canGenerate} mode={mode} />
              <div className="flex items-center justify-center gap-4">
                {assetUrls.length > 0 && assetType !== 'productShot' && !isLoading && <DownloadButton assetUrl={assetUrls[0]} assetType={assetType} />}
                {translationResult && !isLoading && <DownloadButton assetUrl={translationResult} assetType={'translation'} />}
              </div>
          </div>
      </div>
    );
  };


  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Header onHistoryClick={() => setIsHistoryOpen(true)} />
        <div className="mt-12 flex justify-center">
          {mainContent()}
        </div>
      </main>
      <HistoryPanel
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      {currentModeState.selectedImageIndex !== null && currentModeState.assetUrls.length > 0 && (
        <Modal 
          src={currentModeState.assetUrls[currentModeState.selectedImageIndex]}
          alt={`Generated asset ${currentModeState.selectedImageIndex + 1}`}
          onClose={handleCloseModal}
          onPrev={handleModalPrev}
          onNext={handleModalNext}
          showPrev={currentModeState.assetUrls.length > 1}
          showNext={currentModeState.assetUrls.length > 1}
        />
      )}
    </div>
  );
};

export default App;
