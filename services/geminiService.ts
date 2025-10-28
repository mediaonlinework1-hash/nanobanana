
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageData } from '../types';

// The client is initialized just-in-time before an API call.
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API key is not configured. Please select one in Google AI Studio.");
  }
  return new GoogleGenAI({ apiKey });
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

export const generateImage = async (prompt: string, imageData: ImageData | null): Promise<string | undefined> => {
  const ai = getAiClient();
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

export const generateProductShot = async (prompt: string, productImages: ImageData[], inspirationImageData: ImageData | null): Promise<string[] | undefined> => {
    const ai = getAiClient();
    
    let finalPrompt = `You are an expert AI product photographer. The user has provided one or more images of a SINGLE product, likely from different angles. Your task is to use all these images to get a complete understanding of the product's shape, texture, and details. Then, create professional, high-quality product shots suitable for an e-commerce website.

Analyze the product images to identify all distinct products (there should only be one main product, but it might come in multiple pieces). For EACH product, generate a separate, individual image. If there is only one product, generate one image.

For each generated image, follow these rules:
1.  Isolate the product completely from its original background.
2.  Place the product on a clean, seamless, neutral background (e.g., pure white #FFFFFF).
3.  Ensure professional studio lighting that highlights details without harsh shadows.
4.  Add a soft, realistic shadow or subtle reflection beneath the product.
5.  The final output image(s) should be high-resolution, photorealistic, and well-composed.
6.  Do not add any text, watermarks, or other elements.`;
    
    const parts: any[] = [];
    productImages.forEach(img => parts.push({ inlineData: { data: img.imageBytes, mimeType: img.mimeType } }));
    if (inspirationImageData) {
      finalPrompt += `\n\nIMPORTANT INSTRUCTION: A separate image has been provided as an INSPIRATION image. You MUST use this inspiration image as a strong reference for the mood, lighting, style, and composition of the final product shot(s). The goal is to make the new product shots look like they belong in the same photoshoot as the inspiration image.`;
      parts.push({ inlineData: { data: inspirationImageData.imageBytes, mimeType: inspirationImageData.mimeType } });
    }
    
    finalPrompt += `
${prompt ? `
The user has also provided these specific instructions: "${prompt}". Incorporate these into your generation. For example, if they ask for a "closer image", provide a detailed close-up shot of the product.
` : ''}
Your output must contain ONLY the generated image(s).`;

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const imageDatas: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
            imageDatas.push(part.inlineData.data);
        }
    }

    if (imageDatas.length > 0) return imageDatas;
    const textResponse = response.text;
    if (textResponse) throw new Error(`Product shot generation failed: ${textResponse}`);
    throw new Error("Product shot generation failed to produce any images.");
};


export const analyzeImage = async (imageData: ImageData): Promise<string> => {
  const prompt = `Analyze this image and describe the setting. Based on the setting, suggest a short, simple phrase in Spanish describing a person doing something that would naturally fit in this scene. For example, if it's a beach, suggest 'una persona tomando el sol'. If it's a library, suggest 'una persona leyendo un libro'. Only return the phrase for the person.`;
  
  const ai = getAiClient();
  const parts = [
    { inlineData: { data: imageData.imageBytes, mimeType: imageData.mimeType } },
    { text: prompt },
  ];

  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts } });
  const analysisText = response.text.trim();
  if (!analysisText) throw new Error('Analysis failed to produce a suggestion.');
  return analysisText;
};

export const generateVideo = async (prompt: string, imageData: ImageData | null): Promise<Blob> => {
  const ai = getAiClient();
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API key not found.");
  
  const request: { model: string; prompt: string; image?: { imageBytes: string; mimeType: string; }; config: { numberOfVideos: number; }; } = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: { numberOfVideos: 1 }
  };

  if (imageData) {
    request.image = { imageBytes: imageData.imageBytes, mimeType: imageData.mimeType };
  }

  let operation = await ai.models.generateVideos(request);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    const errorText = operation.error?.message || "Video generation failed to produce a download link.";
    throw new Error(errorText);
  }

  const response = await fetch(`${downloadLink}&key=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Failed to download video. Status: ${response.status} ${response.statusText}`);
  }

  return response.blob();
};


export const generateRecipe = async (prompt: string): Promise<string> => {
    const fullPrompt = `Generate a recipe based on this prompt: "${prompt}". Your response must be a JSON object with the following schema: { "title": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"] }. Make sure the description is brief.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT, properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'ingredients', 'instructions'],
        },
      },
    });
    const recipeJsonString = response.text;

    if (!recipeJsonString) throw new Error("Recipe generation failed to produce a result.");
    
    try {
        const recipe = JSON.parse(recipeJsonString);
        let formattedRecipe = `## ${recipe.title}\n\n`;
        if (recipe.description) formattedRecipe += `${recipe.description}\n\n`;
        formattedRecipe += `### Ingredients\n`;
        recipe.ingredients.forEach((ingredient: string) => { formattedRecipe += `- ${ingredient}\n`; });
        formattedRecipe += `\n### Instructions\n`;
        recipe.instructions.forEach((instruction: string, index: number) => { formattedRecipe += `${index + 1}. ${instruction}\n`; });
        return formattedRecipe;
    } catch (e) {
        console.error("Failed to parse recipe JSON:", recipeJsonString);
        return recipeJsonString;
    }
  };

  export const generateRecipeFromLink = async (url: string): Promise<{ formattedRecipe: string; sources: any[] | undefined; imageUrl: string | undefined; }> => {
    const fullPrompt = `Access your knowledge of the recipe at the following URL and extract its details: "${url}".
    Find the main image associated with the recipe and include its public URL.
    Format your response as a single, clean JSON object with the following structure: { "title": "string", "description": "string", "imageUrl": "string", "ingredients": ["string"], "instructions": ["string"] }.
    Ensure the description is brief. If you cannot find a recipe, return a JSON object with an "error" field.
    Your response must contain ONLY the JSON object.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: { tools: [{googleSearch: {}}] },
    });
    let recipeJsonString = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (!recipeJsonString) throw new Error("Recipe extraction failed to produce a result.");
    
    if (recipeJsonString.startsWith('```json')) recipeJsonString = recipeJsonString.slice(7, -3).trim();
    else if (recipeJsonString.startsWith('```')) recipeJsonString = recipeJsonString.slice(3, -3).trim();
    
    try {
        const recipe = JSON.parse(recipeJsonString);
        if (recipe.error) throw new Error(`Could not get recipe from URL: ${recipe.error}`);
        if (!recipe.title || !recipe.ingredients || !recipe.instructions) throw new Error("Extracted data is not a valid recipe. Please try another URL.");
        
        const imageUrl = recipe.imageUrl;
        let formattedRecipe = `## ${recipe.title}\n\n`;
        if (recipe.description) formattedRecipe += `${recipe.description}\n\n`;
        formattedRecipe += `### Ingredients\n`;
        recipe.ingredients.forEach((ingredient: string) => { formattedRecipe += `- ${ingredient}\n`; });
        formattedRecipe += `\n### Instructions\n`;
        recipe.instructions.forEach((instruction: string, index: number) => { formattedRecipe += `${index + 1}. ${instruction}\n`; });
        return { formattedRecipe, sources, imageUrl };
    } catch (e) {
        console.error("Failed to parse recipe JSON from link:", recipeJsonString, e);
        if (e instanceof Error && (e.message.startsWith("Could not get recipe") || e.message.startsWith("Extracted data is not"))) throw e; 
        return { formattedRecipe: `Could not format the recipe, but here is the raw text:\n\n${recipeJsonString}`, sources, imageUrl: undefined };
    }
  };
  
export const translateText = async (text: string, targetLanguage: string, stylize: boolean): Promise<string> => {
  let prompt: string;
  if (stylize) {
    prompt = `First, fact-check and correct the following text. Then, rewrite it in an engaging, friendly style with emojis. Finally, translate the stylized text into ${targetLanguage}. Your final output MUST BE ONLY the translated text. Text: """${text}"""`;
  } else {
    prompt = `Translate the following text to ${targetLanguage}. Provide only the translated text. Text: """${text}"""`;
  }

  const ai = getAiClient();
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const translatedText = response.text.trim();

  if (!translatedText) throw new Error("Translation failed to produce a result.");
  return translatedText;
};

export const generateSpeech = async (text: string, voice: string): Promise<string | undefined> => {
    const ai = getAiClient();

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) return base64Audio;
    const textResponse = response.text;
    if (textResponse) throw new Error(`Speech generation failed: ${textResponse}`);
    throw new Error("Speech generation failed to produce audio.");
};
