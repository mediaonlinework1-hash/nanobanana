import React from 'react';

interface PromptInputProps {
  prompt: string;
  setPrompt: (value: React.SetStateAction<string>) => void;
  disabled: boolean;
  similarity: number | null;
  setSimilarity: (similarity: number | null) => void;
  removeText: boolean;
  setRemoveText: (removeText: boolean) => void;
  isAnalyzing: boolean;
  contextualPersonSuggestion: string | null;
  addPerson: boolean;
  setAddPerson: (addPerson: boolean) => void;
  mode: 'image' | 'video';
}

const SIMILARITY_SUGGESTIONS = [25, 50, 75, 100];
const BACKGROUND_SUGGESTIONS = [
  "en una casa",
  "en una ciudad futurista",
  "en un bosque mágico",
  "en una playa al atardecer",
];


export const PromptInput: React.FC<PromptInputProps> = ({ 
  prompt, 
  setPrompt, 
  disabled, 
  similarity, 
  setSimilarity,
  removeText,
  setRemoveText,
  isAnalyzing,
  contextualPersonSuggestion,
  addPerson,
  setAddPerson,
  mode
}) => {
  const handleSuggestionClick = (percentage: number) => {
    if (similarity === percentage) {
      setSimilarity(null);
    } else {
      setSimilarity(percentage);
    }
  };

  const handleTextSuggestionClick = (suggestion: string) => {
    setPrompt(currentPrompt => {
        const trimmedPrompt = currentPrompt.trim();
        if (trimmedPrompt === '') {
            return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        }
        return `${trimmedPrompt}, ${suggestion}`;
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
          1. Describe the {mode} you want to create or edit
        </label>
        {mode === 'image' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Similarity:</span>
            {SIMILARITY_SUGGESTIONS.map((percentage) => {
              const isActive = similarity === percentage;
              return (
                <button
                  key={percentage}
                  onClick={() => handleSuggestionClick(percentage)}
                  disabled={disabled}
                  className={`px-2 py-1 text-xs font-medium rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  aria-pressed={isActive}
                  aria-label={`Set similarity to ${percentage} percent`}
                >
                  {percentage}%
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {mode === 'image' && (
        <>
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="text-xs text-gray-400 font-medium">Sugerencias de fondo:</span>
            {BACKGROUND_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleTextSuggestionClick(suggestion)}
                disabled={disabled}
                className="px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Añadir fondo: ${suggestion}`}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="text-xs text-gray-400 font-medium">Acciones rápidas:</span>
            <button
              onClick={() => setRemoveText(!removeText)}
              disabled={disabled}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                removeText
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              aria-pressed={removeText}
              aria-label="Toggle remove text from image"
            >
              Eliminar texto
            </button>
            <button
              onClick={() => setAddPerson(!addPerson)}
              disabled={disabled || isAnalyzing}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                addPerson
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              aria-pressed={addPerson}
              aria-label="Toggle adding a person to the image"
            >
              {isAnalyzing ? 'Analizando...' : 'Añadir persona'}
            </button>
          </div>
        </>
      )}

      <textarea
        id="prompt"
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={disabled}
        placeholder={
          mode === 'image'
            ? "e.g., A majestic lion wearing a crown, sitting on a throne"
            : "e.g., A cinematic shot of a futuristic city at night, rain-slicked streets reflecting neon signs"
        }
        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};
