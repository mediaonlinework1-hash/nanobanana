import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageData } from '../types';

// Always create a new client to ensure the latest API key from the environment is used.
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This error will be caught by the calling function and trigger the key selection prompt.
    throw new Error("API key not found. Please select an API key.");
  }
  return new GoogleGenAI({ apiKey });
}

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


export const analyzeImage = async (imageData: ImageData): Promise<string> => {
  const ai = getAiClient();
  const prompt = `Analyze this image and describe the setting. Based on the setting, suggest a short, simple phrase in Spanish describing a person doing something that would naturally fit in this scene. For example, if it's a beach, suggest 'una persona tomando el sol'. If it's a library, suggest 'una persona leyendo un libro'. Only return the phrase for the person.`;

  const parts = [
    {
      inlineData: {
        data: imageData.imageBytes,
        mimeType: imageData.mimeType,
      },
    },
    { text: prompt },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
  });

  const analysisText = response.text.trim();
  if (!analysisText) {
    throw new Error('Analysis failed to produce a suggestion.');
  }

  return analysisText;
};

export const generateVideo = async (prompt: string, imageData: ImageData | null): Promise<Blob> => {
  const ai = getAiClient();
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API key not found. Please select an API key.");
  }
  
  const request: {
    model: string;
    prompt: string;
    image?: { imageBytes: string; mimeType: string; };
    config: { numberOfVideos: number; };
  } = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1
    }
  };

  if (imageData) {
    request.image = {
      imageBytes: imageData.imageBytes,
      mimeType: imageData.mimeType,
    };
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
    const ai = getAiClient();
    const fullPrompt = `Generate a recipe based on this prompt: "${prompt}". Your response must be a JSON object with the following schema: { "title": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"] }. Make sure the description is brief.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the recipe." },
            description: { type: Type.STRING, description: "A short, enticing description of the recipe." },
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of ingredients."
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Step-by-step instructions."
            },
          },
          required: ['title', 'ingredients', 'instructions'],
        },
      },
    });

    const recipeJsonString = response.text;
    if (!recipeJsonString) {
      throw new Error("Recipe generation failed to produce a result.");
    }
    
    try {
        const recipe = JSON.parse(recipeJsonString);
        
        let formattedRecipe = `## ${recipe.title}\n\n`;
        if (recipe.description) {
          formattedRecipe += `${recipe.description}\n\n`;
        }
        formattedRecipe += `### Ingredients\n`;
        recipe.ingredients.forEach((ingredient: string) => {
          formattedRecipe += `- ${ingredient}\n`;
        });
        
        formattedRecipe += `\n### Instructions\n`;
        recipe.instructions.forEach((instruction: string, index: number) => {
          formattedRecipe += `${index + 1}. ${instruction}\n`;
        });

        return formattedRecipe;
    } catch (e) {
        console.error("Failed to parse recipe JSON:", recipeJsonString);
        return recipeJsonString;
    }
  };
  
export const translateText = async (text: string, targetLanguage: string, stylize: boolean): Promise<string> => {
  const ai = getAiClient();
  let prompt: string;

  if (stylize) {
    prompt = `
      Follow these steps carefully:
      1. First, read and fact-check the following text for any inaccuracies.
      2. Correct any factual errors you find.
      3. Rewrite the corrected text in an engaging, enthusiastic, and friendly style. Use symbols and emojis to make it visually appealing.
      4. Finally, translate the stylized and corrected text into ${targetLanguage}.
      5. Your final output MUST BE ONLY the translated text. Do not include any of the intermediate steps, original text, comments, or explanations.

      Text to process:
      """
      ${text}
      """
    `;
  } else {
    prompt = `
      Translate the following text to ${targetLanguage}. 
      Provide only the translated text, without any additional comments, labels, or explanations.

      Text to translate:
      """
      ${text}
      """
    `;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const translatedText = response.text.trim();
  if (!translatedText) {
    throw new Error("Translation failed to produce a result.");
  }

  return translatedText;
};