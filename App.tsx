
import React, { useState, useEffect } from 'react';
import { generateImage, analyzeImage, generateRecipe, translateText, generateSpeech, generateProductShot, generateBlogPostFromLink, generateRecipeCardFromLink, generateAltText, generateSocialMediaPost, analyzeProductInfo, GeminiUserInputError } from './services/geminiService';
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
  translateImageText: false,
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
  altText: '',
  socialMediaText: '',
  socialMediaLanguage: 'German',
  productInfoResult: null,
};


const App: React.FC = () => {
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
    productAnalyst: { ...initialModeState, targetLanguage: 'German', selectedVoice: 'Kore' },
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
        const suggestion = await callApiService(analyzeImage, currentModeState.singleImageData);
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
  }, [currentModeState.singleImageData, mode]);

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
      // Use process.env.API_KEY directly
      const currentApiKey = process.env.API_KEY;

      if (!currentApiKey) {
        updateCurrentModeState({ error: "API key is not configured in environment." });
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
          errorNode = (
            <>
              La clave de API ha excedido su cuota, no es válida o no tiene permisos. Para el video de Gemini, se requiere una clave de un proyecto con{' '}
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-red-200">
                facturación habilitada
              </a>{' '}
              requerida. Por favor, verifica la configuración de tu proyecto.
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
      prompt, singleImageData, removeText, translateImageText, addPerson, similarity, contextualPersonSuggestion,
      textToTranslate, targetLanguage, stylizeAndCorrect 
    } = currentModeState;

    const imageGenPossible = prompt.trim().length > 0 || (!!singleImageData && (removeText || translateImageText || addPerson || similarity !== null));
    const translationPossible = textToTranslate.trim().length > 0;

    if (!imageGenPossible && !translationPossible) {
      updateCurrentModeState({ error: 'Please enter a prompt to generate an image or text to translate.' });
      return;
    }

    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], translationResult: null, assetType: null, socialMediaText: '' });

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
      if (translateImageText) {
        const translatePrompt = `Make everything written in the image a literal translation into ${targetLanguage}`;
        finalImagePrompt = finalImagePrompt ? `${finalImagePrompt}, ${translatePrompt}` : translatePrompt;
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

  const handleProductAnalysis = async () => {
      const { singleImageData } = currentModeState;
      if (!singleImageData) {
          updateCurrentModeState({ error: "Please upload a product image first." });
          return;
      }
      setIsLoading(true);
      updateCurrentModeState({ assetUrls: [], assetType: null, productInfoResult: null });

      const result = await callApiService(analyzeProductInfo, singleImageData);
      if (result) {
          const dataUrl = `data:${singleImageData.mimeType};base64,${singleImageData.imageBytes}`;
          updateCurrentModeState({
              assetUrls: [dataUrl],
              assetType: 'productInfo',
              productInfoResult: result
          });
          addToHistory({
              mode: 'productAnalyst',
              prompt: `Analyze Product: ${result.nameFrench || 'Image'}`,
              assetUrls: [dataUrl],
              assetType: 'productInfo',
              productInfo: result
          });
      }
      setIsLoading(false);
  };

  const handleGenerateAltText = async () => {
    const { singleImageData } = currentModeState;
    if (!singleImageData) {
      updateCurrentModeState({ error: "Please upload an image first to generate Alt Text." });
      return;
    }
    setIsLoading(true);
    updateCurrentModeState({ error: null });
    
    const altText = await callApiService(generateAltText, singleImageData);
    if (altText) {
      updateCurrentModeState({ altText });
    }
    setIsLoading(false);
  };

  const handleGenerateSocialMediaPost = async () => {
    const { singleImageData, socialMediaLanguage } = currentModeState;
    if (!singleImageData) {
      updateCurrentModeState({ error: "Please upload an image first to generate a social media post." });
      return;
    }
    setIsLoading(true);
    updateCurrentModeState({ error: null, assetUrls: [], assetType: null });
    
    const postText = await callApiService(generateSocialMediaPost, singleImageData, socialMediaLanguage || 'German');
    if (postText) {
      const dataUrl = `data:${singleImageData.mimeType};base64,${singleImageData.imageBytes}`;
      
      updateCurrentModeState({ 
          socialMediaText: postText,
          assetUrls: [dataUrl],
          assetType: 'image'
      });
      
      addToHistory({ 
        mode: 'image', 
        prompt: `Social Media Post (${socialMediaLanguage || 'German'})`,
        assetUrls: [dataUrl], 
        assetType: 'image', 
        socialMediaText: postText,
        translationResult: null
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
        blogPostImageUrl: result.imageUrl,
        imageFromBlogPrompt: result.imageDescription || `Una imagen representativa para un artículo sobre ${primaryKeyword}`
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

  const handleGenerateImageFromBlogPost = async () => {
    const { blogPostImageUrl, imageFromBlogPrompt } = currentModeState;

    if (!imageFromBlogPrompt || !imageFromBlogPrompt.trim()) return;

    updateCurrentModeState({ isGeneratingImageFromBlog: true, generatedImageFromBlog: null, error: null });

    try {
      let imageData: ImageData | null = null;
      let usedPrompt = imageFromBlogPrompt;
      
      // Attempt to fetch image if URL exists
      if (blogPostImageUrl) {
        try {
            const response = await fetch(blogPostImageUrl);
            if(response.ok) {
                const blob = await response.blob();
                const base64 = await blobToDataUrl(blob);
                imageData = {
                    imageBytes: base64.split(',')[1],
                    mimeType: blob.type
                };
            }
        } catch (e) {
            console.warn("Failed to fetch source image (CORS likely). Falling back to Text-to-Image.", e);
            imageData = null;
            if (!usedPrompt.toLowerCase().includes("generate") && !usedPrompt.toLowerCase().includes("create")) {
                usedPrompt = "Create a high quality image of " + usedPrompt;
            }
        }
      }

      const generatedBase64 = await callApiService(generateImage, usedPrompt, imageData);

      if (generatedBase64) {
        const dataUrl = `data:image/png;base64,${generatedBase64}`;
        updateCurrentModeState({ generatedImageFromBlog: dataUrl });
      }

    } catch (e) {
        console.error(e);
        updateCurrentModeState({ error: "Failed to generate image. Try modifying the prompt." });
    } finally {
      updateCurrentModeState({ isGeneratingImageFromBlog: false });
    }
  };

  const handleSpeechGeneration = async () => {
    const { prompt, selectedVoice } = currentModeState;
    if (!prompt.trim()) return;
    setIsLoading(true);
    updateCurrentModeState({ assetUrls: [], assetType: null });
    const audioBase64 = await callApiService(generateSpeech, prompt, selectedVoice);
    if (audioBase64) {
        const dataUrl = `data:audio/wav;base64,${audioBase64}`;
        updateCurrentModeState({ assetUrls: [dataUrl], assetType: 'audio' });
        addToHistory({ mode: 'speech', prompt, assetUrls: [dataUrl], assetType: 'audio' });
    }
    setIsLoading(false);
  };

  const handleProductShotGeneration = async () => {
      const { prompt, productImages, inspirationImageData } = currentModeState;
      if (productImages.length === 0) {
          updateCurrentModeState({ error: "Please upload at least one product image." });
          return;
      }
      setIsLoading(true);
      updateCurrentModeState({ assetUrls: [], assetType: null });
      const images = await callApiService(generateProductShot, prompt, productImages, inspirationImageData);
      if (images) {
          const urls = images.map(b64 => `data:image/png;base64,${b64}`);
          updateCurrentModeState({ assetUrls: urls, assetType: 'productShot' });
          addToHistory({ mode: 'productShot', prompt: prompt || 'Product Shot', assetUrls: urls, assetType: 'productShot' });
      }
      setIsLoading(false);
  };

  const handleTransferText = (text: string) => {
    setMode('image');
    setModeStates(prev => ({
        ...prev,
        image: {
            ...prev.image,
            textToTranslate: text,
            targetLanguage: prev.image.targetLanguage || 'Spanish', 
        }
    }));
  };
  
  const handleRemoveMainAsset = () => {
       updateCurrentModeState({ assetUrls: [], assetType: null, productInfoResult: null });
  };
  
  const handleRemoveTranslation = () => {
       updateCurrentModeState({ translationResult: null });
  };
  
  const handleRemoveSocialMedia = () => {
       updateCurrentModeState({ socialMediaText: null });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const openModal = (index: number) => {
    setModalImageIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const nextModalImage = () => {
    if (currentModeState.assetUrls.length > 0) {
      setModalImageIndex((prev) => (prev + 1) % currentModeState.assetUrls.length);
    }
  };

  const prevModalImage = () => {
    if (currentModeState.assetUrls.length > 0) {
      setModalImageIndex((prev) => (prev - 1 + currentModeState.assetUrls.length) % currentModeState.assetUrls.length);
    }
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(true);
  };

  const handleHistoryClose = () => {
    setIsHistoryOpen(false);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setMode(item.mode);
    setModeStates(prev => ({
      ...prev,
      [item.mode]: {
        ...prev[item.mode],
        prompt: item.prompt,
        assetUrls: item.assetUrls,
        assetType: item.assetType,
        translationResult: item.translationResult || null,
        blogPostImageUrl: item.blogPostImageUrl || null,
        recipeImageUrl: item.recipeImageUrl || null,
        socialMediaText: item.socialMediaText || null,
        productInfoResult: item.productInfo || null,
      }
    }));
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('nano-banana-history');
    } catch (error) {
      console.error("Failed to clear history from localStorage", error);
    }
  };

  return (
    <div className="min-h-screen text-gray-100 font-sans selection:bg-pink-500 selection:text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Header onHistoryClick={handleHistoryClick} />
        
        {/* Navigation Tabs */}
        <div className="flex justify-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {(['image', 'recipe', 'speech', 'productShot', 'productAnalyst', 'blogPost', 'recipeCard'] as AppMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                mode === m
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {m === 'image' ? 'Image & Translate' : 
               m === 'recipe' ? 'Recipe Chef' : 
               m === 'speech' ? 'Text to Speech' : 
               m === 'productShot' ? 'Product Studio' : 
               m === 'productAnalyst' ? 'Análisis Inteligente de Productos' :
               m === 'blogPost' ? 'Blog Post desde URL' : 
               'Recipe Card'}
            </button>
          ))}
        </div>

        <main className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-700 space-y-8">
            <ErrorDisplay message={currentModeState.error} />
            
            {/* Input Section */}
            <div className="space-y-6">
                 {/* Mode Specific Inputs */}
                 {mode === 'blogPost' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Palabra Clave Principal
                            </label>
                            <input 
                                type="text"
                                value={currentModeState.primaryKeyword}
                                onChange={(e) => updateCurrentModeState({ primaryKeyword: e.target.value })}
                                disabled={isLoading}
                                placeholder="Ej: Inteligencia Artificial"
                                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                            />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300 mb-2">
                                Idioma del Blog Post
                            </label>
                             <select
                                value={currentModeState.blogPostLanguage}
                                onChange={(e) => updateCurrentModeState({ blogPostLanguage: e.target.value })}
                                disabled={isLoading}
                                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                            >
                                <option value="Spanish">Español</option>
                                <option value="English">English</option>
                                <option value="German">German</option>
                                <option value="French">French</option>
                                <option value="Portuguese">Portuguese</option>
                            </select>
                        </div>
                    </div>
                 )}

                 <PromptInput 
                    prompt={currentModeState.prompt} 
                    setPrompt={(val) => updateCurrentModeState({ prompt: typeof val === 'function' ? val(currentModeState.prompt) : val })}
                    disabled={isLoading}
                    similarity={currentModeState.similarity}
                    setSimilarity={(val) => updateCurrentModeState({ similarity: val })}
                    removeText={currentModeState.removeText}
                    setRemoveText={(val) => updateCurrentModeState({ removeText: val })}
                    translateImageText={currentModeState.translateImageText}
                    setTranslateImageText={(val) => updateCurrentModeState({ translateImageText: val })}
                    isAnalyzing={isAnalyzing}
                    contextualPersonSuggestion={currentModeState.contextualPersonSuggestion}
                    addPerson={currentModeState.addPerson}
                    setAddPerson={(val) => updateCurrentModeState({ addPerson: val })}
                    mode={mode}
                />

                {(mode === 'image' || mode === 'productAnalyst') && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        <div className="h-full">
                          <ImageUploader 
                              label={mode === 'productAnalyst' ? "Upload product image to analyze" : "2. Upload an image to edit (optional)"}
                              disabled={isLoading}
                              setImageData={(data) => updateCurrentModeState({ singleImageData: data })}
                          />
                        </div>
                         {mode === 'image' && (
                           <div className="space-y-4">
                              <div>
                                  <div className="flex justify-between items-center mb-2">
                                      <label className="block text-sm font-medium text-gray-300">
                                          3. Translate text (optional)
                                      </label>
                                      {currentModeState.textToTranslate && (
                                          <button
                                              onClick={() => updateCurrentModeState({ textToTranslate: '' })}
                                              className="p-1 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-colors"
                                              title="Clear text"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                          </button>
                                      )}
                                  </div>
                                  <textarea
                                      rows={4}
                                      value={currentModeState.textToTranslate}
                                      onChange={(e) => updateCurrentModeState({ textToTranslate: e.target.value })}
                                      disabled={isLoading}
                                      placeholder="Enter text to translate..."
                                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none"
                                  />
                              </div>
                              <div className="flex gap-4 items-end">
                                  <div className="flex-grow">
                                      <LanguageSelector 
                                          targetLanguage={currentModeState.targetLanguage}
                                          setTargetLanguage={(lang) => updateCurrentModeState({ targetLanguage: lang })}
                                          disabled={isLoading}
                                      />
                                  </div>
                                  <div className="flex items-center h-full pb-3">
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                          <input 
                                              type="checkbox" 
                                              checked={currentModeState.stylizeAndCorrect}
                                              onChange={(e) => updateCurrentModeState({ stylizeAndCorrect: e.target.checked })}
                                              className="form-checkbox h-5 w-5 text-pink-500 rounded border-gray-600 bg-gray-700 focus:ring-pink-500"
                                              disabled={isLoading}
                                          />
                                          <span className="text-sm text-gray-300">Stylize & Correct</span>
                                      </label>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-2">
                                      4. Alternative Text (optional)
                                  </label>
                                  <div className="flex flex-col space-y-2">
                                      <textarea
                                          rows={2}
                                          value={currentModeState.altText || ''}
                                          readOnly
                                          placeholder="Alt text will appear here..."
                                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none text-sm text-gray-300"
                                      />
                                      <button
                                          onClick={handleGenerateAltText}
                                          disabled={isLoading || !currentModeState.singleImageData}
                                          className="self-end px-4 py-2 text-xs font-semibold rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                      >
                                          Generate Alt Text
                                      </button>
                                  </div>
                              </div>

                              <div>
                                  <div className="flex justify-between items-center mb-2">
                                      <label className="block text-sm font-medium text-gray-300">
                                          5. Social Media Post (optional)
                                      </label>
                                      {currentModeState.socialMediaText && (
                                          <button
                                              onClick={() => updateCurrentModeState({ socialMediaText: '' })}
                                              className="p-1 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-colors"
                                              title="Clear text"
                                          >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                          </button>
                                      )}
                                  </div>
                                  <div className="flex flex-col space-y-2">
                                      <select
                                          value={currentModeState.socialMediaLanguage || 'German'}
                                          onChange={(e) => updateCurrentModeState({ socialMediaLanguage: e.target.value })}
                                          disabled={isLoading}
                                          className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                                      >
                                          <option value="German">German</option>
                                          <option value="English">English</option>
                                          <option value="Spanish">Spanish</option>
                                          <option value="French">French</option>
                                          <option value="Italian">Italian</option>
                                          <option value="Portuguese">Portuguese</option>
                                          <option value="Japanese">Japanese</option>
                                          <option value="Chinese">Chinese</option>
                                      </select>
                                      
                                      <textarea
                                          rows={4}
                                          value={currentModeState.socialMediaText || ''}
                                          readOnly
                                          placeholder="Pinterest/Facebook post description will appear here..."
                                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none text-sm text-gray-300"
                                      />
                                      <button
                                          onClick={handleGenerateSocialMediaPost}
                                          disabled={isLoading || !currentModeState.singleImageData}
                                          className="self-end px-4 py-2 text-xs font-semibold rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                      >
                                          Generate Post
                                      </button>
                                  </div>
                              </div>
                           </div>
                         )}
                         {mode === 'productAnalyst' && (
                             <div className="flex flex-col justify-center text-center p-8 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                                 <h3 className="text-xl font-bold text-pink-400 mb-4">Análisis Inteligente de Productos</h3>
                                 <p className="text-gray-400 text-sm mb-6">
                                     Sube una imagen de tu producto y extraeremos automáticamente:<br/>
                                     • Descripción Profesional<br/>
                                     • Método de Aplicación<br/>
                                     • Nombre en Árabe y Francés
                                 </p>
                                 <div className="flex justify-center">
                                    <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                 </div>
                             </div>
                         )}
                   </div>
                )}
                
                {mode === 'productShot' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        <div className="h-full">
                          <ImageUploader 
                              label="2. Upload product images (Required, max 5)"
                              disabled={isLoading}
                              multiple
                              images={currentModeState.productImages}
                              onImagesChange={(images) => updateCurrentModeState({ productImages: images })}
                          />
                        </div>
                         <div className="space-y-4">
                            <ImageUploader 
                                label="3. Upload inspiration style image (Optional)"
                                disabled={isLoading}
                                setImageData={(data) => updateCurrentModeState({ inspirationImageData: data })}
                            />
                         </div>
                     </div>
                )}

                {mode === 'speech' && (
                    <VoiceSelector 
                        selectedVoice={currentModeState.selectedVoice}
                        setSelectedVoice={(voice) => updateCurrentModeState({ selectedVoice: voice })}
                        disabled={isLoading}
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-6 border-t border-gray-700">
              <div className="w-full sm:w-2/3">
                <GenerateButton 
                  onClick={
                    mode === 'image' ? handleImageAndTextGeneration :
                    mode === 'recipe' ? handleRecipeGeneration :
                    mode === 'recipeCard' ? handleRecipeCardGeneration :
                    mode === 'speech' ? handleSpeechGeneration :
                    mode === 'productShot' ? handleProductShotGeneration :
                    mode === 'productAnalyst' ? handleProductAnalysis :
                    handleBlogPostGeneration
                  }
                  disabled={isLoading || !!currentModeState.error}
                  mode={mode}
                />
              </div>
            </div>
            
            {/* Results Display */}
            {isLoading && <LoadingIndicator mode={mode === 'image' && currentModeState.textToTranslate && !currentModeState.prompt ? 'translation' : mode} />}
            
            {!isLoading && (currentModeState.assetUrls.length > 0 || currentModeState.translationResult || currentModeState.socialMediaText || currentModeState.productInfoResult) && (
              <div className="space-y-6 pt-6 border-t border-gray-700 animate-fade-in-up">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                      Generated Result
                    </h2>
                     <DownloadButton 
                        assetUrl={currentModeState.assetUrls.length > 0 ? currentModeState.assetUrls[0] : (currentModeState.translationResult ? currentModeState.translationResult : null)} 
                        assetType={currentModeState.assetType || (currentModeState.translationResult ? 'translation' : (currentModeState.productInfoResult ? 'productInfo' : null))} 
                      />
                 </div>
                 
                 <div className="bg-gray-900/30 rounded-2xl p-4 border border-gray-700/50">
                   <AssetDisplay 
                      srcs={currentModeState.assetUrls} 
                      assetType={currentModeState.assetType}
                      translationResult={currentModeState.translationResult}
                      socialMediaText={currentModeState.socialMediaText}
                      productInfo={currentModeState.productInfoResult}
                      onImageClick={openModal}
                      imageUrl={currentModeState.recipeImageUrl}
                      blogPostImageUrl={currentModeState.blogPostImageUrl}
                      imageFromBlogPrompt={currentModeState.imageFromBlogPrompt}
                      setImageFromBlogPrompt={(val) => updateCurrentModeState({ imageFromBlogPrompt: val })}
                      onGenerateImageFromBlog={handleGenerateImageFromBlogPost}
                      isGeneratingImageFromBlog={currentModeState.isGeneratingImageFromBlog}
                      generatedImageFromBlog={currentModeState.generatedImageFromBlog}
                      onTransferText={handleTransferText}
                      onRemoveMainAsset={handleRemoveMainAsset}
                      onRemoveTranslation={handleRemoveTranslation}
                      onRemoveSocialMedia={handleRemoveSocialMedia}
                   />
                 </div>
              </div>
            )}
        </main>
      </div>
      
      {modalOpen && currentModeState.assetUrls.length > 0 && (
        <Modal 
            src={currentModeState.assetUrls[modalImageIndex]} 
            alt={`Result ${modalImageIndex + 1}`} 
            onClose={closeModal}
            onPrev={prevModalImage}
            onNext={nextModalImage}
            showPrev={currentModeState.assetUrls.length > 1}
            showNext={currentModeState.assetUrls.length > 1}
        />
      )}

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={handleHistoryClose} 
        history={history} 
        onSelect={handleHistorySelect}
        onClear={handleClearHistory}
      />
    </div>
  );
};

export default App;
