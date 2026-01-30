
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageData, ProductInfo, ProductSource } from '../types';

// The client is initialized just-in-time before an API call.
function getAiClient(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw new Error("API key is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

// Custom error for user-facing feedback from Gemini
export class GeminiUserInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiUserInputError';
  }
}


// Helper to decode base64
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to create a WAV file blob from raw PCM data
const createWavBlob = (pcmData: Int16Array, sampleRate: number, numChannels: number): Blob => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    const dataSize = pcmData.length * 2;
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    return new Blob([view, pcmData], { type: 'audio/wav' });
};

export const createWavBlobFromBase64 = (base64Audio: string): Blob => {
  const pcmBytes = decode(base64Audio);
  const pcmData = new Int16Array(pcmBytes.buffer);
  // Gemini TTS uses 24000Hz sample rate, mono channel.
  return createWavBlob(pcmData, 24000, 1);
};

// --- Main Service Functions ---

export const generateImage = async (prompt: string, imageData: ImageData | null, apiKey: string): Promise<string | undefined> => {
  const ai = getAiClient(apiKey);
  const parts: any[] = [{ text: prompt }];

  if (imageData) {
    parts.unshift({
      inlineData: {
        data: imageData.imageBytes,
        mimeType: imageData.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
  });

  const candidate = response.candidates?.[0];

  for (const part of candidate?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  const textResponse = response.text;
  if (textResponse) {
    throw new Error(`${textResponse}`);
  }

  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`La generación se detuvo. Razón: ${candidate.finishReason}. Por favor intenta con un prompt diferente o una imagen más clara.`);
  }

  throw new Error("La generación de imagen falló.");
};

export const analyzeProductInfo = async (imageData: ImageData, apiKey: string): Promise<ProductInfo> => {
    const ai = getAiClient(apiKey);
    
    const model = 'gemini-3-flash-preview';
    
    const systemInstruction = `You are an elite Product Intelligence Expert. 
Your goal is to identify and provide deep analysis for the product in the image.
1. USE GOOGLE SEARCH to verify the specific brand and model.
2. Provide a "description": professional, covering purpose and key benefits.
3. Provide "applicationMethod": clear, bulleted steps on how to use it.
4. Provide "nameArabic" and "nameFrench" as used in those specific markets.
5. Provide "features": A list of 4-6 specific attributes (e.g., "Non-comedogenic", "SPF 50", "Nordic ingredients").

The output MUST be a raw JSON object with keys: "description", "applicationMethod", "nameArabic", "nameFrench", "features" (array of {name, description}). 
Focus on accuracy and official manufacturer information.`;

    const parts = [
        {
            inlineData: {
                data: imageData.imageBytes,
                mimeType: imageData.mimeType,
            },
        },
        { text: "Realiza un Análisis Inteligente de este Producto usando búsqueda web. Devuelve solo el JSON." }
    ];

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    });

    try {
        const textResponse = response.text || "";
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const productInfo: ProductInfo = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
        
        const sources: ProductSource[] = [];
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web && chunk.web.uri) {
                    sources.push({ uri: chunk.web.uri, title: chunk.web.title || "Fuente oficial" });
                }
            });
        }
        productInfo.sources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
        
        return productInfo;
    } catch (e) {
        console.error("Failed to parse product info JSON", e);
        throw new Error("No se pudo extraer la información del producto. Verifica que el logo o nombre sea visible.");
    }
};

export const generateProductShot = async (prompt: string, productImages: ImageData[], inspirationImageData: ImageData | null, apiKey: string): Promise<string[] | undefined> => {
    const ai = getAiClient(apiKey);
    
    // Improved prompt to prevent IMAGE_OTHER by being more descriptive and photographic
    let finalPrompt = `High-end professional commercial photography of the product shown. 
Set in a clean, minimalist studio environment with soft-box lighting. 
The product should be centered, perfectly sharp, and looking its best for a premium brand catalog. 
Solid neutral background. 8k resolution, cinematic lighting, ultra-detailed textures.`;
    
    const parts: any[] = [{ text: finalPrompt }];

    if (prompt) {
        parts.push({ text: `Custom instructions: ${prompt}`});
    }

    productImages.forEach(img => {
        parts.push({
            inlineData: {
                data: img.imageBytes,
                mimeType: img.mimeType,
            },
        });
    });

    if (inspirationImageData) {
        parts.push({ text: "Reference visual style from this image:" });
        parts.push({
             inlineData: {
                data: inspirationImageData.imageBytes,
                mimeType: inspirationImageData.mimeType,
            },
        });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
    });
    
    const base64Images: string[] = [];
    const candidate = response.candidates?.[0];

    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                base64Images.push(part.inlineData.data);
            }
        }
    }

    if (base64Images.length > 0) {
        return base64Images;
    }
    
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Error de generación: ${candidate.finishReason}. Intenta con una descripción más específica.`);
    }

    throw new Error("No se pudieron generar las fotos de producto.");
};

export const analyzeImage = async (imageData: ImageData, apiKey: string): Promise<string | null> => {
  const ai = getAiClient(apiKey);
  const prompt = `Analiza la imagen y sugiere una persona para añadir contextualmente.`;
  const parts = [
    { text: prompt },
    {
      inlineData: {
        data: imageData.imageBytes,
        mimeType: imageData.mimeType,
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
  });

  return response.text.trim();
};

export const generateAltText = async (imageData: ImageData, apiKey: string): Promise<string | undefined> => {
  const ai = getAiClient(apiKey);
  const prompt = "Genera un texto alternativo descriptivo.";
  const parts = [
      { text: prompt },
      {
          inlineData: {
              data: imageData.imageBytes,
              mimeType: imageData.mimeType,
          },
      },
  ];

  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
  });

  return response.text.trim();
};

export const generateSocialMediaPost = async (imageData: ImageData, language: string, apiKey: string): Promise<string | undefined> => {
    const ai = getAiClient(apiKey);
    const prompt = `Escribe un post para redes sociales en ${language}.`;
    
    const parts = [
        { text: prompt },
        {
            inlineData: {
                data: imageData.imageBytes,
                mimeType: imageData.mimeType,
            },
        },
    ];
  
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
    });
  
    return response.text.trim();
  };

export const generateRecipe = async (prompt: string, apiKey: string): Promise<string | undefined> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera una receta: ${prompt}`,
  });
  return response.text;
};

export const translateText = async (text: string, targetLanguage: string, stylize: boolean, apiKey: string): Promise<string | undefined> => {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Traduce a ${targetLanguage}:\n\n${text}`,
    });
    return response.text;
};

export const generateSpeech = async (prompt: string, voiceName: string, apiKey: string): Promise<string | undefined> => {
  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateRecipeCardFromLink = async (url: string, apiKey: string): Promise<any | undefined> => {
    const ai = getAiClient(apiKey);
    const systemInstruction = `You are a professional Recipe Curator. 
Extract detailed recipe information from the provided URL using Google Search.
Return a valid JSON object with the following keys:
"title": (string)
"description": (string, brief summary)
"imageUrl": (string, direct URL to main image if found)
"prepTime": (string)
"cookTime": (string)
"servings": (string)
"ingredients": (array of strings)
"instructions": (array of strings)
"notes": (array of strings)

If a field is missing, provide an empty string or empty array. 
The output MUST be a clean JSON object within triple backticks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Extrae los detalles de la receta desde esta URL: ${url}`,
      config: { 
        systemInstruction,
        tools: [{ googleSearch: {} }] 
      },
    });
    
    try {
        const textResponse = response.text || "";
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("No JSON block found in response:", textResponse);
            throw new Error("No se encontró el formato JSON en la respuesta de la IA.");
        }
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.error("Parse error in generateRecipeCardFromLink:", e);
        throw new Error("Error al procesar los datos de la receta. La IA no pudo estructurar la información correctamente.");
    }
};

export const generateBlogPostFromLink = async (url: string, keyword: string, language: string, apiKey: string): Promise<{ blogPostContent: string, imageUrl: string | null, imageDescription: string | null } | undefined> => {
  const ai = getAiClient(apiKey);
  const fetchContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extrae contenido de ${url}`,
    config: { tools: [{googleSearch: {}}], }
  });
  const sourceContent = fetchContentResponse.text;
  
  const imageResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identifica imagen destacada para ${url}. Solo JSON.`,
      config: { tools: [{googleSearch: {}}], },
  });
  
  let imageUrl: string | null = null;
  let imageDescription: string | null = null;

  try {
    const jsonMatch = imageResponse.text.match(/\{[\s\S]*\}/);
    const imageData = JSON.parse(jsonMatch ? jsonMatch[0] : imageResponse.text);
    imageUrl = imageData.imageUrl;
    imageDescription = imageData.visualDescription;
  } catch (e) {}

  const generationResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Escribe blog post SEO sobre ${keyword} en ${language} basado en: ${sourceContent}. Solo JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metaElements: {
            type: Type.OBJECT,
            properties: {
              titleSEO: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
              urlSlug: { type: Type.STRING },
            },
          },
          blogPostHtml: { type: Type.STRING },
        },
      },
    }
  });
  
  return {
    blogPostContent: generationResponse.text,
    imageUrl,
    imageDescription,
  };
};
