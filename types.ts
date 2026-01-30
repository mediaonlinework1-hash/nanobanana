
import type { ReactNode } from 'react';

export interface ImageData {
  imageBytes: string;
  mimeType: string;
}

export type AppMode = 'image' | 'recipe' | 'speech' | 'productShot' | 'blogPost' | 'recipeCard' | 'productAnalyst';

export interface ProductSource {
  uri: string;
  title: string;
}

export interface ProductFeature {
  name: string;
  description: string;
}

export interface ProductInfo {
  description: string;
  applicationMethod: string;
  nameArabic: string;
  nameFrench: string;
  features: ProductFeature[];
  sources?: ProductSource[];
}

export interface HistoryItem {
  id: string;
  mode: AppMode;
  prompt: string;
  assetUrls: string[];
  assetType: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | 'productInfo' | null;
  translationResult?: string | null;
  recipeImageUrl?: string | null;
  blogPostImageUrl?: string | null;
  socialMediaText?: string | null;
  productInfo?: ProductInfo | null;
  timestamp: number;
  sources?: any[] | null;
}

export interface ModeState {
  prompt: string;
  similarity: number | null;
  removeText: boolean;
  translateImageText: boolean;
  singleImageData: ImageData | null;
  productImages: ImageData[];
  inspirationImageData: ImageData | null;
  assetUrls: string[];
  assetType: 'image' | 'recipe' | 'audio' | 'productShot' | 'blogPost' | 'recipeCard' | 'productInfo' | null;
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
  altText?: string;
  socialMediaText?: string;
  socialMediaLanguage?: string;
  productInfoResult?: ProductInfo | null;
}
