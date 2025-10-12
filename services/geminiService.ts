import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImage = async (prompt: string, imageData: ImageData | null): Promise<string | undefined> => {
  const parts: any[] = [{ text: prompt }];

  if (imageData) {
    // The image part should come before the text prompt for editing.
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
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  // Extract the image data from the response.
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  // If no image is returned, the model may have responded with text explaining why.
  const textResponse = response.text;
  if (textResponse) {
    throw new Error(`Image generation failed: ${textResponse}`);
  }

  throw new Error("Image generation failed to produce an image.");
};


export const analyzeImage = async (imageData: ImageData): Promise<string> => {
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
  const request: {
    model: string;
    prompt: string;
    image?: { imageBytes: string; mimeType: string; };
    config: { numberOfVideos: number; };
  } = {
    model: 'veo-2.0-generate-001',
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

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to download video. Status: ${response.status} ${response.statusText}`);
  }

  return response.blob();
};
