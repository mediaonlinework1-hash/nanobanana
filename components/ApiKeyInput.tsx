import React, { useState } from 'react';

interface ApiKeyInputProps {
    apiKeyInput: string;
    setApiKeyInput: (value: string) => void;
    onSave: () => void;
    onClear: () => void;
    disabled: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKeyInput, setApiKeyInput, onSave, onClear, disabled }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
        <div className="my-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm">
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300 mb-2">
                Your Gemini API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <input
                        id="api-key-input"
                        type={isVisible ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your API key here"
                        disabled={disabled}
                        className="w-full p-2 pr-10 bg-gray-700/50 border border-gray-600 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors duration-200"
                        aria-label="Gemini API Key Input"
                    />
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-200"
                        aria-label={isVisible ? "Hide API key" : "Show API key"}
                    >
                        {isVisible ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m-2.201-1.209A3 3 0 0012 15a3 3 0 00-1.025-.207" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.543 7-4.477 0-8.268-2.943-9.543-7z" />
                            </svg>
                        )}
                    </button>
                </div>
                <button 
                    onClick={onSave} 
                    disabled={disabled} 
                    className="px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-colors duration-200 disabled:opacity-50"
                >
                    Save Key
                </button>
                <button 
                    onClick={onClear} 
                    disabled={disabled} 
                    className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};
