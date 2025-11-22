import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageData } from '../types';

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
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  const textResponse = response.text;
  if (textResponse) {
    throw new Error(`Image generation failed: ${textResponse}`);
  }

  throw new Error("Image generation failed to produce an image.");
};

export const generateProductShot = async (prompt: string, productImages: ImageData[], inspirationImageData: ImageData | null, apiKey: string): Promise<string[] | undefined> => {
    const ai = getAiClient(apiKey);
    
    let finalPrompt = `You are an expert AI product photographer. The user has provided one or more images of a SINGLE product, likely from different angles. Your task is to use all these images to get a complete understanding of the product's shape, texture, and details. Then, create professional, high-quality product shots suitable for an e-commerce website.

Analyze the product images to identify all distinct products (there should only be one main product, but it might come in multiple pieces). For EACH product, generate a separate, individual image. If there is only one product, generate one image.

For each generated image, follow these rules:
- Place the product on a clean, neutral, solid-color background (e.g., white, light gray, or a complementary pastel color).
- Ensure the lighting is professional and even, highlighting the product's features without harsh shadows.
- The product should be in sharp focus.
- The composition should be centered and aesthetically pleasing.
- Do NOT add any props, text, logos, or other objects unless explicitly asked for in the user's prompt.
- If the user provides a specific request in the prompt, prioritize it while still following the general guidelines. For example, if they ask for a 'lifestyle' shot, you can add a relevant, subtle background.

The final output should be a collection of professional product images.`;
    
    const parts: any[] = [{ text: finalPrompt }];

    if (prompt) {
        parts.push({ text: `User's specific request: ${prompt}`});
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
        parts.push({ text: "Use this image for style inspiration:" });
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
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    const base64Images: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Images.push(part.inlineData.data);
            }
        }
    }

    if (base64Images.length > 0) {
        return base64Images;
    }
    
    const textResponse = response.text;
    if (textResponse) {
        throw new Error(`Product shot generation failed: ${textResponse}`);
    }

    throw new Error("Product shot generation failed to produce images.");
};

export const analyzeImage = async (imageData: ImageData, apiKey: string): Promise<string | null> => {
  const ai = getAiClient(apiKey);
  const prompt = `Analyze the provided image and suggest a specific type of person to add to it that would make contextual sense. For example, if it's a beach, suggest 'a surfer walking on the sand'. If it's a library, suggest 'a student reading a book'. The suggestion should be a concise phrase.`;
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
    model: 'gemini-2.5-flash',
    contents: { parts },
  });

  return response.text.trim();
};


export const generateRecipe = async (prompt: string, apiKey: string): Promise<string | undefined> => {
  const ai = getAiClient(apiKey);
  const fullPrompt = `Generate a recipe based on the following description: "${prompt}". 
  Format the recipe clearly with a title, a brief introduction, a list of ingredients with quantities, and step-by-step instructions.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
  });

  return response.text;
};

export const translateText = async (text: string, targetLanguage: string, stylize: boolean, apiKey: string): Promise<string | undefined> => {
    const ai = getAiClient(apiKey);
    let prompt = `Translate the following text to ${targetLanguage}:\n\n---\n${text}\n---`;
    if (stylize) {
        prompt += `\n\nAfter translating, review and correct any grammatical errors. Also, adjust the style and tone to sound natural and fluent, as a native speaker would write it.`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
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
      speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
      },
    },
  });
  
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (audioData) {
    return audioData;
  }
  
  throw new Error("Speech generation failed to produce audio.");
};

export const generateRecipeCardFromLink = async (url: string, apiKey: string): Promise<any | undefined> => {
    const ai = getAiClient(apiKey);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze the recipe from the URL: ${url}. Extract the following information and return it as a JSON object: title, description (a short, one-sentence summary), the absolute URL of the main recipe image (imageUrl), prep time (prepTime), cook time (cookTime), total number of servings (servings), a list of ingredients (ingredients, as an array of strings), a list of instructions (instructions, as an array of strings), and any additional notes or tips (notes, as an array of strings).`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    try {
        let jsonString = response.text.trim();
        // The model might return the JSON in a markdown code block, so we clean it up.
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonString = jsonString.substring(startIndex, endIndex + 1);
        } else {
            // If we can't find JSON, throw an error.
            throw new Error("No valid JSON object found in the response.");
        }
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini", e, "Raw text:", response.text);
        throw new Error("The API returned an invalid data format for the recipe card.");
    }
};


export const generateBlogPostFromLink = async (url: string, keyword: string, language: string, apiKey: string): Promise<{ blogPostContent: string, imageUrl: string | null } | undefined> => {
  const ai = getAiClient(apiKey);

  // --- Step 1: Fetch content from the URL using the googleSearch tool ---
  const fetchContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Please extract the main article content from the provided URL. Focus on the body of the text, ignoring navigation, ads, and footers. The URL is: ${url}`,
    config: {
      tools: [{googleSearch: {}}],
    }
  });
  
  const sourceContent = fetchContentResponse.text;
  if (!sourceContent.trim()) {
    throw new Error("Could not extract content from the provided URL.");
  }

  // --- Step 1.5: Extract Image URL ---
  const imageResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `From the content of the URL ${url}, what is the absolute URL of the primary, main product or article image? Return only the URL and nothing else.`,
      config: {
          tools: [{googleSearch: {}}],
      },
  });
  
  let imageUrl: string | null = null;
  try {
    const urlText = imageResponse.text.trim();
    if (urlText.startsWith('http')) {
      new URL(urlText); 
      imageUrl = urlText;
    }
  } catch (e) {
    console.warn("Could not parse image URL from response:", imageResponse.text);
  }

  // --- Step 2: Generate the blog post using the fetched content ---
  const systemInstruction = `
Rol y Objetivo (Comportamiento del Sistema):
Eres "BlogBot SEO Pro". Tu única función es recibir una [PALABRA_CLAVE] y un [CONTENIDO_FUENTE].
Tu Proceso Obligatorio es:
1. Analizar: Leer y comprender completamente el [CONTENIDO_FUENTE] proporcionado.
2. Planificar: Usar la [PALABRA_CLAVE] como la nueva palabra clave principal para el post que vas a crear. Identificarás palabras clave secundarias basándote en el [CONTENIDO_FUENTE].
3. Generar: Escribir un post de blog 100% original y nuevo, inspirado en la información del [CONTENIDO_FUENTE], pero re-enfocado y optimizado para la [PALABRA_CLAVE]. Nunca debes plagiar ni copiar texto directo.
4. Aplicar Reglas: Durante la generación, debes seguir de forma estricta las siguientes "Instrucciones Base de SEO y Legibilidad".

INSTRUCCIONES BASE DE SEO Y LEGIBILIDAD (Reglas Permanentes):
Idioma: Debes escribir el post del blog exclusivamente en ${language}. Todo el contenido (título, metadescripción, cuerpo) debe estar en ${language}.

Meta-Elementos (Obligatorios):
• Título SEO: Menos de 60 caracteres. Debe incluir la [PALABRA_CLAVE].
• Metadescripción: Menos de 160 caracteres. Persuasiva, incluye la [PALABRA_CLAVE] y un CTA.
• URL Slug: Corta, en minúsculas, separada por guiones, basada en la [PALABRA_CLAVE].

Estructura y Contenido (Obligatorios):
• H1: Un solo H1 (título del post), debe incluir la [PALABRA_CLAVE].
• Longitud: El contenido HTML del post (la parte de 'blogPostHtml') debe tener un mínimo de 1500 caracteres para ser exhaustivo y aportar valor.
• Jerarquía: Usa H2 para secciones principales y H3 para sub-secciones.
• Introducción: El primer párrafo debe ser corto e incluir la [PALABRA_CLAVE] de forma natural.
• Legibilidad: Párrafos muy cortos (máx. 3-4 líneas).
• Voz: Usa la voz activa.
• Formato: Usa <strong> para ideas clave y listas (<ul><li>...</li></ul>) cuando sea apropiado.
• Enlaces (Sugeridos): Incluye placeholders para [Enlace Interno: describir tema] y [Enlace Externo: describir fuente de autoridad].
• Conclusión: Un resumen final y una Llamada a la Acción (CTA) clara.

Formato de Salida:
Debes entregar tu respuesta siempre en formato JSON, siguiendo el schema proporcionado.
  `;

  const userPrompt = `
PALABRA CLAVE: "${keyword}"

CONTENIDO FUENTE:
---
${sourceContent}
---
  `;

  const generationResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: userPrompt,
    config: {
      systemInstruction: systemInstruction,
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
          blogPostHtml: {
            type: Type.STRING,
            description: "El contenido completo del post del blog en formato HTML, comenzando con una etiqueta <h1>."
          },
        },
      },
    }
  });
  
  return {
    blogPostContent: generationResponse.text,
    imageUrl,
  };
};