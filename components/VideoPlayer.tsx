
import React from 'react';

interface LanguageSelectorProps {
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  disabled: boolean;
  label?: string;
}

// A curated list of common languages for translation
const LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ko', name: 'Korean' },
];


export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ targetLanguage, setTargetLanguage, disabled, label }) => (
  <div className="w-full">
    <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-2">
      {label || 'Selecciona el idioma de destino'}
    </label>
    <select
      id="language-select"
      value={targetLanguage}
      onChange={(e) => setTargetLanguage(e.target.value)}
      disabled={disabled}
      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 disabled:opacity-50"
      aria-label="Select target language for translation"
    >
      {LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.name}>{lang.name}</option>
      ))}
    </select>
  </div>
);

interface VoiceSelectorProps {
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  disabled: boolean;
}

const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore (Female)' },
  { id: 'Puck', name: 'Puck (Male)' },
  { id: 'Charon', name: 'Charon (Male)' },
  { id: 'Fenrir', name: 'Fenrir (Male)' },
  { id: 'Zephyr', name: 'Zephyr (Female)' },
];

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, setSelectedVoice, disabled }) => {
  const voices = GEMINI_VOICES;
  
  return (
    <div className="w-full">
      <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
        2. Select a voice
      </label>
      <select
        id="voice-select"
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
        disabled={disabled}
        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 disabled:opacity-50"
        aria-label="Select voice for text-to-speech"
      >
        {voices.map(voice => (
          <option key={voice.id} value={voice.id}>{voice.name}</option>
        ))}
      </select>
    </div>
  );
};
