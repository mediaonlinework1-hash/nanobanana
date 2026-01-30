
import React, { useState } from 'react';
import type { ProductInfo } from '../types';

interface AssetDisplayProps {
  srcs?: string[];
  alt?: string;
  assetType?: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | 'productInfo' | null;
  imageUrl?: string | null;
  translationResult?: string | null;
  socialMediaText?: string | null;
  productInfo?: ProductInfo | null;
  onImageClick?: (index: number) => void;
  blogPostImageUrl?: string | null;
  imageFromBlogPrompt?: string;
  setImageFromBlogPrompt?: (value: string) => void;
  onGenerateImageFromBlog?: () => void;
  isGeneratingImageFromBlog?: boolean;
  generatedImageFromBlog?: string | null;
  onTransferText?: (text: string) => void;
  onRemoveMainAsset?: () => void;
  onRemoveTranslation?: () => void;
  onRemoveSocialMedia?: () => void;
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

const DeleteButton = ({ onClick }: { onClick?: () => void }) => {
    if (!onClick) return null;
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center p-1.5 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-200 transition-colors ml-2"
            title="Eliminar sección"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    );
};


export const AssetDisplay: React.FC<AssetDisplayProps> = ({ 
    srcs, 
    alt, 
    assetType, 
    imageUrl, 
    translationResult, 
    socialMediaText,
    productInfo,
    onImageClick,
    blogPostImageUrl,
    imageFromBlogPrompt,
    setImageFromBlogPrompt,
    onGenerateImageFromBlog,
    isGeneratingImageFromBlog,
    generatedImageFromBlog,
    onTransferText,
    onRemoveMainAsset,
    onRemoveTranslation,
    onRemoveSocialMedia
}) => {
  const hasMainAsset = !!(assetType && srcs && srcs.length > 0);
  const hasTranslation = !!translationResult;
  const hasSocialMediaText = !!socialMediaText;

  const MainAsset = () => {
    if (!hasMainAsset) return null;

    if (assetType === 'productInfo' && productInfo) {
        return (
            <div className="w-full space-y-8 max-w-4xl mx-auto">
                {/* Clean Header Section */}
                <div className="flex flex-col md:flex-row gap-6 items-start border-b border-gray-700 pb-8">
                    <div className="w-full md:w-1/2 relative bg-white/5 p-4 rounded-3xl group shadow-inner">
                        <img 
                            src={srcs![0]} 
                            alt="Analyzed Product" 
                            className="w-full h-auto object-contain rounded-2xl shadow-2xl" 
                            style={{ maxHeight: '400px' }}
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DeleteButton onClick={onRemoveMainAsset} />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-2">
                                    Análisis Inteligente
                                </h2>
                                <p className="text-pink-500 font-mono text-sm uppercase tracking-widest font-bold">Product Intelligence Center</p>
                            </div>
                            <CopyButton textToCopy={`${productInfo.nameFrench}\n\n${productInfo.description}`} label="Copy" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                             <div className="px-3 py-1 bg-gray-800 rounded-lg text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                FR: {productInfo.nameFrench}
                             </div>
                             <div className="px-3 py-1 bg-gray-800 rounded-lg text-xs font-semibold text-gray-400 flex items-center gap-1 dir-rtl" dir="rtl">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                AR: {productInfo.nameArabic}
                             </div>
                        </div>

                        {/* Screenshot-inspired Features Card */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">Essential Features</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {productInfo.features && productInfo.features.slice(0, 4).map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {idx % 2 === 0 ? (
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                 </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-200">{feature.name}</p>
                                            <p className="text-[11px] text-gray-400 leading-tight">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Sections with clean Screenshot-inspired layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Description Card */}
                    <div className="bg-gray-800/30 backdrop-blur-sm p-8 rounded-[40px] border border-gray-700/50 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white">Descripción</h3>
                            <span className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                            </span>
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed space-y-4">
                            {productInfo.description.split('\n').map((para, i) => para.trim() && <p key={i}>{para}</p>)}
                        </div>
                    </div>

                    {/* Application Method Card */}
                    <div className="bg-white/95 p-8 rounded-[40px] border border-white shadow-2xl text-gray-900">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-black tracking-tight">Application method</h3>
                            <button className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 hover:text-black transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Close
                            </button>
                        </div>
                        <div className="space-y-4 text-sm leading-relaxed text-gray-700">
                             {productInfo.applicationMethod.split('\n').map((step, i) => {
                                 const trimmed = step.trim();
                                 if (!trimmed) return null;
                                 return (
                                     <div key={i} className="flex gap-3">
                                         <span className="flex-shrink-0 w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                         <p>{trimmed}</p>
                                     </div>
                                 );
                             })}
                        </div>
                    </div>
                </div>

                {/* Grounding Sources (Google Search) */}
                {productInfo.sources && productInfo.sources.length > 0 && (
                    <div className="flex flex-col items-center pt-10 border-t border-gray-800">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            Verified Sources & Insights
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {productInfo.sources.map((source, idx) => (
                                <a 
                                    key={idx} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-full text-xs text-gray-400 hover:text-white hover:border-pink-500 transition-all duration-300 flex items-center gap-2"
                                >
                                    <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                                    {source.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (assetType === 'recipeCard') {
        const rawContent = srcs![0];
        let data: RecipeCardData | null = null;
        
        try {
            data = JSON.parse(rawContent);
        } catch (e) {
            console.error("Failed to parse recipe card JSON:", e);
        }

        if (!data) {
            return (
                <div className="w-full bg-gray-800/75 p-6 rounded-xl text-left space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-red-400">Error: Formato de Datos Inválido</h2>
                        <DeleteButton onClick={onRemoveMainAsset} />
                    </div>
                    <p className="text-gray-300 text-sm">No pudimos estructurar la receta automáticamente. Aquí tienes el contenido extraído:</p>
                    <pre className="text-gray-400 whitespace-pre-wrap font-mono text-xs bg-black/30 p-4 rounded-lg border border-gray-700">
                        {rawContent}
                    </pre>
                </div>
            );
        }

        const recipeToMarkdown = (recipe: RecipeCardData) => {
            let md = `## ${recipe.title}\n\n`;
            if (recipe.description) md += `_${recipe.description}_\n\n`;
            if (recipe.prepTime) md += `**Prep Time:** ${recipe.prepTime}\n`;
            if (recipe.cookTime) md += `**Cook Time:** ${recipe.cookTime}\n`;
            if (recipe.servings) md += `**Servings:** ${recipe.servings}\n\n`;

            md += `### Ingredients\n`;
            (recipe.ingredients || []).forEach(i => md += `- ${i}\n`);
            md += `\n`;

            md += `### Instructions\n`;
            (recipe.instructions || []).forEach((i, idx) => md += `${idx + 1}. ${i}\n`);
            md += `\n`;
            
            if (recipe.notes && recipe.notes.length > 0) {
                md += `### Notes\n`;
                recipe.notes.forEach(n => md += `- ${n}\n`);
            }
            return md;
        };

        const markdownText = recipeToMarkdown(data);

        return (
            <div className="w-full bg-gray-800/75 p-6 rounded-[40px] text-left overflow-y-auto max-h-[80vh] space-y-6 border border-white/5 shadow-2xl">
                {data.imageUrl && (
                    <img src={data.imageUrl} alt={data.title} className="w-full h-64 object-cover rounded-3xl shadow-xl" />
                )}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <h2 className="text-3xl font-black text-white leading-tight">{data.title}</h2>
                    <div className="flex gap-2 items-center">
                        <CopyButton textToCopy={markdownText} label="Markdown" />
                        {onTransferText && (
                            <button 
                                onClick={() => onTransferText(markdownText)}
                                className="flex items-center px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-200 bg-pink-600 text-white hover:bg-pink-700 shadow-lg"
                            >
                                Traducir
                            </button>
                        )}
                        <DeleteButton onClick={onRemoveMainAsset} />
                    </div>
                </div>

                {data.description && <p className="text-gray-400 italic text-lg leading-relaxed">{data.description}</p>}

                <div className="grid grid-cols-3 gap-2 text-center p-4 bg-white/5 rounded-3xl border border-white/5">
                    <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">PREP</p><p className="font-bold text-white">{data.prepTime || 'N/A'}</p></div>
                    <div className="border-x border-white/5"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">COOK</p><p className="font-bold text-white">{data.cookTime || 'N/A'}</p></div>
                    <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">SERVINGS</p><p className="font-bold text-white">{data.servings || 'N/A'}</p></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                        <h3 className="font-black text-xl mb-4 text-pink-500 uppercase tracking-tighter">Ingredients</h3>
                        <ul className="space-y-3 text-gray-300 text-sm">
                            {(data.ingredients || []).map((item, i) => (
                                <li key={i} className="flex gap-3 items-start">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 flex-shrink-0"></span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                        <h3 className="font-black text-xl mb-4 text-blue-400 uppercase tracking-tighter">Instructions</h3>
                        <ol className="space-y-4 text-gray-300 text-sm">
                            {(data.instructions || []).map((item, i) => (
                                <li key={i} className="flex gap-4">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center font-bold text-xs text-white">{i + 1}</span>
                                    <p className="leading-relaxed">{item}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {data.notes && data.notes.length > 0 && (
                    <div className="bg-gray-900/40 p-6 rounded-3xl border border-dashed border-gray-700">
                        <h3 className="font-bold text-lg mb-3 text-gray-400 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             Cook's Notes
                        </h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            {data.notes.map((item, i) => <li key={i} className="italic">• {item}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        );
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
                    return html.replace(/<[^>]+>/g, '');
                }
            };
            
            const characterCount = getTextContent(data.blogPostHtml).length;

            return (
              <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[70vh] space-y-6">
                 <div className="flex justify-end mb-2">
                     <DeleteButton onClick={onRemoveMainAsset} />
                 </div>
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
                {blogPostImageUrl && onGenerateImageFromBlog && setImageFromBlogPrompt && (
                  <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-pink-400 mb-4">Generar Imagen del Producto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-2">Imagen Original</p>
                        <img src={blogPostImageUrl} alt="Imagen del producto extraída" className="w-full h-auto rounded-lg object-contain bg-gray-800 p-1" />
                      </div>
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
            <div className="w-full relative">
                <div className="absolute top-0 right-0 z-10 p-2">
                     <DeleteButton onClick={onRemoveMainAsset} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
        );
    }

    const src = srcs![0];

    switch (assetType) {
      case 'image':
        return (
          <div className="w-full bg-gray-900/50 p-2 rounded-xl relative">
             <div className="absolute top-4 right-4 z-10">
                <DeleteButton onClick={onRemoveMainAsset} />
             </div>
            <img
              src={src}
              alt={alt}
              className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-lg"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full bg-gray-900/50 p-4 rounded-xl flex items-center gap-2">
            <audio
              src={src}
              controls
              autoPlay
              className="w-full rounded-lg shadow-lg"
              aria-label={alt || 'Generated audio'}
            />
            <DeleteButton onClick={onRemoveMainAsset} />
          </div>
        );
      case 'recipe':
        return (
          <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            <div className="flex justify-end mb-2">
                <DeleteButton onClick={onRemoveMainAsset} />
            </div>
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
              <div className="flex items-center gap-2">
                <CopyButton textToCopy={translationResult!} label="Copy"/>
                <DeleteButton onClick={onRemoveTranslation} />
              </div>
            </div>
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{translationResult}</pre>
        </div>
      );
  }

  const SocialMediaAsset = () => {
      if (!hasSocialMediaText) return null;
      return (
        <div className="w-full bg-gray-900/75 p-4 rounded-lg text-left overflow-y-auto max-h-[60vh]">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold text-pink-400">Social Media Post</h3>
                <div className="flex items-center gap-2">
                    <CopyButton textToCopy={socialMediaText!} label="Copy"/>
                    <DeleteButton onClick={onRemoveSocialMedia} />
                </div>
            </div>
            <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{socialMediaText}</pre>
        </div>
      );
  }

  return (
      <div className="flex flex-col gap-6 w-full">
          <MainAsset />
          <TranslationAsset />
          <SocialMediaAsset />
      </div>
  );
};
