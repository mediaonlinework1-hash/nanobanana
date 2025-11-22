import React, { useState } from 'react';

interface AssetDisplayProps {
  srcs?: string[];
  alt?: string;
  assetType?: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | null;
  imageUrl?: string | null;
  translationResult?: string | null;
  onImageClick?: (index: number) => void;
  blogPostImageUrl?: string | null;
  imageFromBlogPrompt?: string;
  setImageFromBlogPrompt?: (value: string) => void;
  onGenerateImageFromBlog?: () => void;
  isGeneratingImageFromBlog?: boolean;
  generatedImageFromBlog?: string | null;
}

interface SeoBlogPostData {
  metaElements: {
    titleSEO: string;
    metaDescription: string;
    urlSlug: string;
  };
  blogPostHtml: string;
}

interface RecipeCardData {
    title: string;
    description: string;
    imageUrl: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    instructions: string[];
    notes: string[];
}

const CopyButton = ({ textToCopy, label }: { textToCopy: string, label: string }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            disabled={isCopied}
            className="flex items-center px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isCopied ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {label}
                </>
            )}
        </button>
    );
};


export const AssetDisplay: React.FC<AssetDisplayProps> = ({ 
    srcs, 
    alt, 
    assetType, 
    imageUrl, 
    translationResult, 
    onImageClick,
    blogPostImageUrl,
    imageFromBlogPrompt,
    setImageFromBlogPrompt,
    onGenerateImageFromBlog,
    isGeneratingImageFromBlog,
    generatedImageFromBlog 
}) => {
  const hasMainAsset = !!(assetType && srcs && srcs.length > 0);
  const hasTranslation = !!translationResult;

  const MainAsset = () => {
    if (!hasMainAsset) return null;

    if (assetType === 'recipeCard') {
        try {
            const data: RecipeCardData = JSON.parse(srcs![0]);

            const recipeToMarkdown = (recipe: RecipeCardData) => {
                let md = `## ${recipe.title}\n\n`;
                if (recipe.description) md += `_${recipe.description}_\n\n`;
                if (recipe.prepTime) md += `**Prep Time:** ${recipe.prepTime}\n`;
                if (recipe.cookTime) md += `**Cook Time:** ${recipe.cookTime}\n`;
                if (recipe.servings) md += `**Servings:** ${recipe.servings}\n\n`;

                md += `### Ingredients\n`;
                recipe.ingredients.forEach(i => md += `- ${i}\n`);
                md += `\n`;

                md += `### Instructions\n`;
                recipe.instructions.forEach((i, idx) => md += `${idx + 1}. ${i}\n`);
                md += `\n`;
                
                if (recipe.notes && recipe.notes.length > 0) {
                    md += `### Notes\n`;
                    recipe.notes.forEach(n => md += `- ${n}\n`);
                }
                return md;
            };

            return (
                <div className="w-full bg-gray-800/75 p-4 rounded-lg text-left overflow-y-auto max-h-[70vh] space-y-4">
                    {data.imageUrl && (
                        <img src={data.imageUrl} alt={data.title} className="w-full h-48 object-cover rounded-md" />
                    )}
                    <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-pink-400">{data.title}</h2>
                         <CopyButton textToCopy={recipeToMarkdown(data)} label="Copy Markdown" />
                    </div>

                    {data.description && <p className="text-gray-300 italic">{data.description}</p>}

                    <div className="flex justify-around items-center text-center p-2 bg-gray-900/50 rounded-md">
                        {data.prepTime && <div><p className="text-xs text-gray-400">PREP</p><p className="font-bold">{data.prepTime}</p></div>}
                        {data.cookTime && <div><p className="text-xs text-gray-400">COOK</p><p className="font-bold">{data.cookTime}</p></div>}
                        {data.servings && <div><p className="text-xs text-gray-400">SERVINGS</p><p className="font-bold">{data.servings}</p></div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-gray-200 border-b border-gray-600 pb-1">Ingredients</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                                {data.ingredients.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-gray-200 border-b border-gray-600 pb-1">Instructions</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-300">
                                {data.instructions.map((item, i) => <li key={i}>{item}</li>)}
                            </ol>
                        </div>
                    </div>

                    {data.notes && data.notes.length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-gray-200 border-b border-gray-600 pb-1">Notes</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                                {data.notes.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            console.error("Failed to parse recipe card data:", e);
            return <div className="text-red-400">Error displaying recipe card. Invalid data format.</div>;
        }
    }


    if (assetType === 'blogPost') {
        try {
            const data: SeoBlogPostData = JSON.parse(srcs![0]);

            const getTextContent = (html: string): string => {
                try {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    return tempDiv.textContent || tempDiv.innerText || '';
                } catch (e) {
                    // Fallback for non-browser environments or other errors
                    return html.replace(/<[^>]+>/g, '');
                }
            };
            
            const characterCount = getTextContent(data.blogPostHtml).length;

            return (
              <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[70vh] space-y-6">
                {/* PARTE 1: META-ELEMENTOS SEO */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-pink-400">PARTE 1: META-ELEMENTOS SEO</h3>
                  <div className="p-3 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-300">Título SEO</p>
                      <CopyButton textToCopy={data.metaElements.titleSEO} label="Copy" />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{data.metaElements.titleSEO}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-300">Metadescripción</p>
                      <CopyButton textToCopy={data.metaElements.metaDescription} label="Copy" />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{data.metaElements.metaDescription}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-300">URL Slug</p>
                      <CopyButton textToCopy={data.metaElements.urlSlug} label="Copy" />
                    </div>
                    <p className="mt-1 text-xs text-gray-400 font-mono">{data.metaElements.urlSlug}</p>
                  </div>
                </div>
        
                {/* PARTE 2: CONTENIDO DEL BLOG POST */}
                <div className="prose prose-invert prose-pink max-w-none">
                  <div className="flex justify-between items-center mb-4 border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-pink-400">PARTE 2: CONTENIDO DEL BLOG POST</h3>
                    <CopyButton textToCopy={data.blogPostHtml} label="Copy HTML" />
                  </div>
                  <div
                    className="p-4 bg-gray-800 rounded-md border border-gray-700"
                    dangerouslySetInnerHTML={{ __html: data.blogPostHtml }}
                  />
                   <div className="text-right mt-4 pr-4">
                      <p className="text-sm text-gray-400 font-mono">
                          Total de Caracteres: {characterCount}
                      </p>
                  </div>
                </div>
                 {/* PARTE 3: GENERADOR DE IMÁGENES */}
                {blogPostImageUrl && onGenerateImageFromBlog && setImageFromBlogPrompt && (
                  <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-pink-400 mb-4">Generar Imagen del Producto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Original Image */}
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Imagen Original</p>
                        <img src={blogPostImageUrl} alt="Imagen del producto extraída" className="w-full h-auto rounded-lg object-contain bg-gray-800 p-1" />
                      </div>
                      {/* Image Generation */}
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-gray-300">Generar una nueva imagen basada en la original</p>
                        <textarea
                          rows={3}
                          value={imageFromBlogPrompt}
                          onChange={(e) => setImageFromBlogPrompt(e.target.value)}
                          disabled={isGeneratingImageFromBlog}
                          placeholder="Ej: una foto del producto en una playa al atardecer"
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500"
                        />
                        <button
                          onClick={onGenerateImageFromBlog}
                          disabled={isGeneratingImageFromBlog || !imageFromBlogPrompt?.trim()}
                          className="w-full px-4 py-2 font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingImageFromBlog ? 'Generando...' : 'Generar Imagen'}
                        </button>
                        <div className="min-h-[10rem] flex items-center justify-center bg-gray-800 rounded-lg">
                            {isGeneratingImageFromBlog ? (
                                <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-pink-500"></div>
                            ) : generatedImageFromBlog ? (
                                <div className="p-2">
                                    <img src={generatedImageFromBlog} alt="Imagen generada" className="w-full h-auto rounded-lg object-contain" />
                                    <a
                                    href={generatedImageFromBlog}
                                    download="nano-banana-generated-image.png"
                                    className="mt-2 inline-block text-sm text-pink-400 hover:underline"
                                    >
                                    Descargar Imagen
                                    </a>
                                </div>
                            ) : <p className="text-xs text-gray-500">Tu imagen generada aparecerá aquí.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          } catch (e) {
            console.error("Failed to parse blog post data:", e);
            return <div className="text-red-400">Error al mostrar los datos del post. Formato de datos no válido.</div>;
          }
    }

    if (assetType === 'productShot' || (assetType === 'image' && srcs!.length > 1)) {
        return (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                {srcs!.map((src, index) => (
                    <div key={index} className="relative group bg-gray-900/50 p-2 rounded-xl">
                        <button onClick={() => onImageClick && onImageClick(index)} className="w-full h-full aspect-square block cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg">
                            <img src={src} alt={`${alt || 'Product shot'} ${index + 1}`} className="w-full h-full object-contain rounded-lg shadow-lg" />
                        </button>
                        <a
                            href={src}
                            download={`nano-banana-product-${index + 1}.png`}
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-pink-600 text-white p-2 rounded-full shadow-lg hover:bg-pink-700"
                            title="Download Image"
                            aria-label="Download Image"
                            onClick={(e) => e.stopPropagation()} 
                        >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                        </a>
                    </div>
                ))}
            </div>
        );
    }

    const src = srcs![0];

    switch (assetType) {
      case 'image':
        return (
          <div className="w-full bg-gray-900/50 p-2 rounded-xl">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full bg-gray-900/50 p-4 rounded-xl">
            <audio
              src={src}
              controls
              autoPlay
              className="w-full rounded-lg shadow-lg"
              aria-label={alt || 'Generated audio'}
            />
          </div>
        );
      case 'recipe':
        return (
          <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={alt || 'Imagen de la receta'} 
                className="w-full h-auto object-cover rounded-md shadow-md mb-4 max-h-[30vh]" 
              />
            )}
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{src}</pre>
          </div>
        );
      default:
        return null;
    }
  };
  
  const TranslationAsset = () => {
      if (!hasTranslation) return null;
      return (
        <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-pink-400">Translation Result</h3>
              <CopyButton textToCopy={translationResult!} label="Copy"/>
            </div>
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{translationResult}</pre>
        </div>
      );
  }

  if (hasMainAsset) {
    return <MainAsset />;
  }

  if (hasTranslation) {
    return <TranslationAsset />;
  }

  return null;
};