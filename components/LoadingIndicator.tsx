import React, { useState, useEffect } from 'react';

const imageLoadingMessages = [
  "Warming up the AI artists...",
  "Gathering pixels from the digital ether...",
  "Teaching the AI about composition and color theory...",
  "Rendering your image...",
  "Applying digital brushstrokes...",
  "Almost there, adding the final touches...",
];

const recipeLoadingMessages = [
  "Consulting with our AI chef...",
  "Preheating the virtual oven...",
  "Gathering the freshest digital ingredients...",
  "Simmering the prompt...",
  "Plating the recipe...",
  "Your recipe is almost ready to serve!",
];

const recipeCardLoadingMessages = [
    "Analizando la página de la receta...",
    "Extrayendo la imagen principal y los detalles...",
    "Organizando los ingredientes y las instrucciones...",
    "Diseñando tu tarjeta de receta...",
    "¡Casi lista para guardar y compartir!",
];

const blogPostLoadingMessages = [
    "Analizando el contenido de la URL fuente...",
    "Extrayendo el texto principal del artículo...",
    "Activando el modo 'BlogBot SEO Pro'...",
    "Identificando palabras clave secundarias desde el contenido...",
    "Generando un borrador 100% original...",
    "Aplicando reglas de SEO y legibilidad...",
    "Estructurando el post con H1, H2s y párrafos cortos...",
    "¡Tu post optimizado está casi listo para publicar!",
];

const translationLoadingMessages = [
  "Consulting with our AI linguists...",
  "Looking up words in a digital dictionary...",
  "Considering grammar and context...",
  "Translating your text...",
  "Proofreading the translation...",
  "Your translation is almost ready!",
];

const speechLoadingMessages = [
  "Warming up the AI's vocal cords...",
  "Consulting the pronunciation guide...",
  "Converting text to sound waves...",
  "Synthesizing speech...",
  "Adding natural intonation...",
  "Your audio is almost ready!",
];

const productShotLoadingMessages = [
  "Consultando al fotógrafo de productos IA...",
  "Montando el estudio virtual...",
  "Ajustando la iluminación...",
  "Capturando la toma perfecta...",
  "Retocando la imagen...",
  "¡Tus fotos de producto están casi listas!",
];


interface LoadingIndicatorProps {
  mode: 'image' | 'recipe' | 'translation' | 'speech' | 'productShot' | 'blogPost' | 'recipeCard';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ mode }) => {
  let messages: string[];
  let title: string;

  switch (mode) {
    case 'recipe':
      messages = recipeLoadingMessages;
      title = 'Preparing Your Recipe';
      break;
    case 'recipeCard':
      messages = recipeCardLoadingMessages;
      title = 'Creando tu Tarjeta de Receta';
      break;
    case 'blogPost':
        messages = blogPostLoadingMessages;
        title = 'Generando tu Blog Post';
        break;
    case 'translation':
        messages = translationLoadingMessages;
        title = 'Translating Your Text';
        break;
    case 'speech':
      messages = speechLoadingMessages;
      title = 'Generating Your Audio';
      break;
    case 'productShot':
      messages = productShotLoadingMessages;
      title = 'Creando tu Foto de Producto';
      break;
    case 'image':
    default:
      messages = imageLoadingMessages;
      title = 'Generating Your Masterpiece';
      break;
  }
  
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    setMessage(messages[0]); // Reset message on mode change
    
    const intervalId = setInterval(() => {
      setMessage(prevMessage => {
        const currentIndex = messages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 4000);

    return () => clearInterval(intervalId);
  }, [messages]);

  return (
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-pink-500 mx-auto"></div>
      <p className="text-gray-300 mt-4 text-lg">{title}</p>
      <p className="text-gray-400 mt-2 text-sm transition-opacity duration-500">{message}</p>
    </div>
  );
};