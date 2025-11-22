import type { ReactNode } from 'react';

export interface ImageData {
  imageBytes: string;
  mimeType: string;
}

export type AppMode = 'image' | 'recipe' | 'speech' | 'productShot' | 'blogPost' | 'recipeCard';

export interface HistoryItem {
  id: string;
  mode: AppMode;
  prompt: string;
  assetUrls: string[];
  assetType: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | null;
  translationResult?: string | null;
  recipeImageUrl?: string | null;
  blogPostImageUrl?: string | null;
  timestamp: number;
  sources?: any[] | null;
}

export interface ModeState {
  prompt: string;
  similarity: number | null;
  removeText: boolean;
  singleImageData: ImageData | null;
  productImages: ImageData[];
  inspirationImageData: ImageData | null;
  assetUrls: string[];
  assetType: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | null;
  // Fix: Use imported ReactNode type to resolve namespace error.
  error: ReactNode | null;
  addPerson: boolean;
  contextualPersonSuggestion: string | null;
  targetLanguage: string;
  stylizeAndCorrect: boolean;
  selectedVoice: string;
  sources: any[] | null;
  recipeImageUrl: string | null;
  selectedImageIndex: number | null;
  textToTranslate: string;
  translationResult: string | null;
  primaryKeyword: string;
  blogPostLanguage: string;
  blogPostImageUrl: string | null;
  imageFromBlogPrompt: string;
  generatedImageFromBlog: string | null;
  isGeneratingImageFromBlog: boolean;
}