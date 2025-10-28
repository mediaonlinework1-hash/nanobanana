
import React, { useState } from 'react';

interface ApiKeyInputProps {
  onSave: (apiKey: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSaveClick = () => {
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="mt-8 w-full max-w-md mx-auto">
      <div className="text-gray-300 space-y-4 mb-6">
        <p>
          Para usar esta aplicación, por favor ingresa tu clave de API de Google Gemini.
        </p>
        <p>
          Puedes obtener una clave de API desde{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-pink-400">
            Google AI Studio
          </a>.
        </p>
         <p>
            Funciones avanzadas como la generación de video requieren una clave de API de un proyecto con{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-pink-400">
            facturación habilitada
            </a>.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Ingresa tu Clave de API de Gemini"
          className="flex-grow w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-full focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
        />
        <button
          onClick={handleSaveClick}
          disabled={!key.trim()}
          className="px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar Clave
        </button>
      </div>
    </div>
  );
};
