import React from 'react';

interface HeaderProps {
  onHistoryClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHistoryClick }) => (
  <header className="text-center relative">
    <h1 className="text-5xl md:text-6xl font-extrabold">
      <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
        Nano Banana
      </span>
    </h1>
    <p className="mt-4 text-lg text-gray-300">
      Bring your ideas to life with AI-powered image, video, and text generation tools.
    </p>
     <button 
      onClick={onHistoryClick}
      className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700 text-gray-300 hover:bg-gray-600"
      aria-label="View generation history"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      History
    </button>
  </header>
);
