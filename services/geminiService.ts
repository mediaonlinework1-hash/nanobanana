import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageData } from '../types';

// The client is initialized just-in-time before an API call.
function getAiClient(apiKey: string): GoogleGenAI {
  if (!apiKey) {
    throw new Error("API key is not configured.");
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


export const analyzeImage = async (imageData: ImageData, apiKey: string): Promise<string> => {
  const prompt = `Analyze this image and describe the setting. Based on the setting, suggest a short, simple phrase in Spanish describing a person doing something that would naturally fit in this scene. For example, if it's a beach, suggest 'una persona tomando el sol'. If it's a library, suggest 'una persona leyendo un libro'. Only return the phrase for the person.`;
  
  const ai = getAiClient(apiKey);
  const parts = [
    { inlineData: { data: imageData.imageBytes, mimeType: imageData.mimeType } },
    { text: prompt },
  ];

  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts } });
  const analysisText = response.text.trim();
  if (!analysisText) throw new Error('Analysis failed to produce a suggestion.');
  return analysisText;
};

export const generateVideo = async (prompt: string, imageData: ImageData | null, apiKey:string): Promise<Blob> => {
  const ai = getAiClient(apiKey);
  
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


export const generateRecipe = async (prompt: string, apiKey: string): Promise<string> => {
    const fullPrompt = `Generate a recipe based on this prompt: "${prompt}". Your response must be a JSON object with the following schema: { "title": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"] }. Make sure the description is brief.`;

    const ai = getAiClient(apiKey);
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

  export const generateRecipeFromLink = async (url: string, apiKey: string): Promise<{ formattedRecipe: string; sources: any[] | undefined; imageUrl: string | undefined; }> => {
    const fullPrompt = `Access your knowledge of the recipe at the following URL and extract its details: "${url}".
    Find the main image associated with the recipe and include its public URL.
    Format your response as a single, clean JSON object with the following structure: { "title": "string", "description": "string", "imageUrl": "string", "ingredients": ["string"], "instructions": ["string"] }.
    Ensure the description is brief. If you cannot find a recipe, return a JSON object with an "error" field.
    Your response must contain ONLY the JSON object.`;

    const ai = getAiClient(apiKey);
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
  
export const generateRecipeCardFromLink = async (url: string, apiKey: string): Promise<any> => {
    const fullPrompt = `Analyze the recipe at the provided URL: "${url}". Extract the following information and structure it as a clean JSON object.
    
    Your response MUST be ONLY a single JSON object with this exact schema:
    {
      "title": "string",
      "description": "string (a brief, one-sentence summary)",
      "imageUrl": "string (the full, direct URL to the main recipe image)",
      "prepTime": "string (e.g., '15 mins')",
      "cookTime": "string (e.g., '30 mins')",
      "servings": "string (e.g., '4 people')",
      "ingredients": ["string", "string", ...],
      "instructions": ["string", "string", ...],
      "notes": ["string", "string", ...]
    }

    If any field is not available on the page (e.g., 'notes'), return it as an empty string or an empty array as appropriate for the schema. Do not invent data. If no recipe is found, return a JSON object with an "error" field.`;

    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: { tools: [{googleSearch: {}}] },
    });

    let jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("Recipe card generation failed to produce a result.");
    }

    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7, -3).trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3, -3).trim();
    }
    
    try {
        const data = JSON.parse(jsonString);
        if (data.error) {
            throw new Error(`Could not get recipe from URL: ${data.error}`);
        }
        return data;
    } catch (e) {
        console.error("Failed to parse recipe card JSON:", jsonString, e);
        throw new Error("The AI returned an invalid format for the recipe card. Please try a different URL.");
    }
};

export const translateText = async (text: string, targetLanguage: string, stylize: boolean, apiKey: string): Promise<string> => {
  let prompt: string;
  if (stylize) {
    prompt = `First, fact-check and correct the following text. Then, rewrite it in an engaging, friendly style with emojis. Finally, translate the stylized text into ${targetLanguage}. Your final output MUST BE ONLY the translated text. Text: """${text}"""`;
  } else {
    prompt = `Translate the following text to ${targetLanguage}. Provide only the translated text. Text: """${text}"""`;
  }

  const ai = getAiClient(apiKey);
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const translatedText = response.text.trim();

  if (!translatedText) throw new Error("Translation failed to produce a result.");
  return translatedText;
};

export const generateSpeech = async (text: string, voice: string, apiKey: string): Promise<string | undefined> => {
    const ai = getAiClient(apiKey);

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

export const generateBlogPostFromLink = async (url: string, primaryKeyword: string, secondaryKeywords: string, internalLinks: string, faqs: string, apiKey: string): Promise<any> => {
  const ai = getAiClient(apiKey);

  // Step 1: Extract ingredients and instructions from the URL
  const extractionPrompt = `You are an expert recipe data extractor. Your task is to visit the provided URL, find the main recipe, and extract ONLY the ingredients and instructions.

URL: "${url}"

Your response MUST be a single, clean JSON object with this exact schema:
{
  "ingredients": ["string", "string", ...],
  "instructions": ["string", "string", ...]
}

- Do not add any extra text, explanations, or markdown formatting around the JSON.
- If you cannot access the URL, or if the page does not contain a recipe, you MUST return a JSON object with a descriptive error message like this: { "error": "Could not retrieve recipe content from the provided URL. The site may be blocking access or the page does not contain a valid recipe." }`;

  const extractionResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: extractionPrompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  let extractedJsonString = extractionResponse.text;
  if (!extractedJsonString) {
      throw new Error("Failed to extract recipe data from the URL.");
  }
  if (extractedJsonString.startsWith('```json')) extractedJsonString = extractedJsonString.slice(7, -3).trim();
  else if (extractedJsonString.startsWith('```')) extractedJsonString = extractedJsonString.slice(3, -3).trim();

  const { ingredients, instructions, error } = JSON.parse(extractedJsonString);

  if (error) {
      throw new Error(`Could not extract recipe from URL: ${error}`);
  }
  if (!ingredients || !instructions) {
      throw new Error("Extraction from URL failed to return ingredients or instructions.");
  }
  
  // Step 2: Generate the blog post using the detailed template
  const blogPostPromptTemplate = `You are Müller from Recipes by Müller, a friendly kitchen guide who believes every meal can spark connection and joy. You’re not just sharing recipes—you’re sharing stories, flavors, and traditions that make everyday cooking special.

Brand Voice Guidelines

Core Personality:
Authentic & Uplifting: Recipes feel like they’re coming from a trusted friend
Story-Driven & Relatable: Blend culinary tips with personal anecdotes
Inclusive & Inspiring: Celebrate cooks of all skill levels and cultural backgrounds
Practical but Warm: Share real, doable recipes without losing heart

Writing Style:
Conversational and vivid, like talking at a kitchen table
Use contractions often (it’s, you’ll, we’re)
Direct and encouraging (“you can make this in no time”)
Sprinkle in sensory details: aromas, textures, tastes
Share short personal stories, cultural memories, or ingredient moments

Signature Expressions:
“This one’s always worth sharing.”
“You’ll taste the love in every bite.”
“It’s a simple dish, but it carries big memories.”
“Cook with curiosity, not just instructions.”
“Every recipe tells a story.”

Content Requirements

Target Length: 1200 words exactly
Focus: Complete, SEO-optimized recipe blog post with Müller’s warm tone

Required Input Variables:
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}
Recipe Ingredients: {ingredients}
Recipe Instructions: {instructions}
Internal Links: {internal_links}
FAQs: {faqs}

SEO Requirements

Keyword Implementation:
Primary keyword in first 100 words (make it bold)
Primary keyword in H1 title
Secondary keywords appear naturally in H2/H3s
Maintain natural keyword density (2–3%)
Use bolding to highlight key terms for skimmability

Meta Description:
150–160 characters
Must include primary keyword and cooking time
Warm, friendly call-to-action at the end

Header Hierarchy:
H1: Recipe name with primary keyword
H2: Main sections (why you’ll love it, what you’ll need, etc.)
H3: Subsections for variations, FAQs, tips

Complete Blog Post Structure
1. H1 Title
<h1>{primary_keyword}</h1>

2. Introduction (150–200 words)
Start with a storytelling hook from Müller
Share memory, tradition, or cultural inspiration behind the dish
Mention primary keyword in first 100 words
Include 1 internal link naturally from {internal_links}
End with warm transition: “Let’s get cooking.”

3. Why You’ll Love This {Primary Keyword} (H2)
3–4 benefits: taste, ease, tradition, versatility
Blend practical and emotional reasons
Naturally add secondary keywords

4. What You’ll Need (H2)
Transform {ingredients}:
No measurements—focus on ingredient stories and purposes
Personal notes like “I always choose fresh basil over dried”
Include substitution tips and cultural alternatives
Format with <ul> and <li>
Bold important ingredient keywords

5. Let’s Make It Step by Step (H2)
Rewrite {instructions} with Müller’s guidance:
Start steps with strong verbs
Explain why techniques matter
Add reassurance: “Don’t stress if it looks rustic”
Format with <ol> and <li>
Bold key cooking terms

6. Serving Suggestions (H2)
Creative, modern, and traditional serving ideas
Occasion-based (holidays, quick dinner, date night)
Highlight plating, sides, or drink pairings
Bold serving-related keywords

7. Make It Your Own (H2)
3–4 flexible adaptations (dietary swaps, local ingredient twists)
Cultural spin ideas to personalize
Use <ul> formatting
Bold adaptation keywords

8. Kitchen Tips & Tricks (H2)
Share 3–4 common pitfalls with solutions
Include personal anecdote about a “cooking fail”
Teach practical lessons warmly
Bold technique keywords

9. Storage & Make-Ahead Tips (H2)
How to refrigerate, freeze, and reheat
Make-ahead notes for busy cooks
Bold storage-related keywords

10. More Recipes from My Kitchen (H2)
Include 3 internal links from {internal_links}
Write as Müller’s friendly recommendations
Connect them with flavor, theme, or occasion

11. Frequently Asked Questions (H2)
Rewrite {faqs} with Müller’s approachable tone:
Keep answers short, clear, and supportive
Bold key terms
Address practical concerns and troubleshooting

12. Final Thoughts (H2)
Recap why the recipe is worth making
Use primary keyword naturally one last time
Encourage personalization and sharing
Warm sign-off: “Thanks for cooking with me today – Müller”

Yoast SEO Readability Requirements
Sentences under 20 words when possible
Active voice (90%+)
Add transition words for flow
Short paragraphs (max 3–4 sentences)
Subheadings every ~300 words
Use bullet points/lists to break up content

Final Deliverables
1. Complete Blog Post (1200 words)
2. Meta Description (150–160 characters, optimized)
3. Focus Keyphrase Summary
4. Two Pinterest-Optimized Titles & Descriptions:
Title 1: Nostalgic/emotional angle
Title 2: Practical/benefit-focused angle
Descriptions: 100–200 characters each + hashtags

Quality Checklist
 Primary keyword in first 100 words & H1
 4 internal links included
 Bolded important keywords
 Brand voice consistent with Müller
 FAQs rewritten in approachable style
 1200 words exactly
 Meta description optimized
 Pinterest content ready`;

  let finalPrompt = blogPostPromptTemplate;
  finalPrompt = finalPrompt.replace(/{primary_keyword}/g, primaryKeyword);
  finalPrompt = finalPrompt.replace('{secondary_keywords}', secondaryKeywords);
  finalPrompt = finalPrompt.replace('{ingredients}', JSON.stringify(ingredients));
  finalPrompt = finalPrompt.replace('{instructions}', JSON.stringify(instructions));
  finalPrompt = finalPrompt.replace(/{internal_links}/g, internalLinks);
  finalPrompt = finalPrompt.replace(/{faqs}/g, faqs);

  const finalInstruction = `\n\nYour final response MUST be a single, clean JSON object with the following structure: { "blogPostHtml": "string (the full HTML of the blog post, including all h1, h2, ul, ol, li, and p tags)", "metaDescription": "string", "focusKeyphrase": "string", "pinterest": { "title1": "string", "desc1": "string", "title2": "string", "desc2": "string" } }. Do not include any other text or markdown formatting like \`\`\`json around the JSON object.`;

  const blogPostResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro', // Using a more powerful model for this complex task
    contents: finalPrompt + finalInstruction,
  });

  let blogPostJsonString = blogPostResponse.text;
  if (!blogPostJsonString) {
    throw new Error("Failed to generate blog post.");
  }

  try {
    return JSON.parse(blogPostJsonString);
  } catch(e) {
    console.error("Failed to parse blog post JSON response:", blogPostJsonString, e);
    throw new Error("The AI returned an invalid format. Please try again.");
  }
};