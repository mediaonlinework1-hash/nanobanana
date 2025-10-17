import React from 'react';

export const Header: React.FC = () => (
  <header className="text-center">
    <h1 className="text-5xl md:text-6xl font-extrabold">
      <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
        Nano Banana
      </span>
    </h1>
    <p className="mt-4 text-lg text-gray-300">
      Bring your ideas to life with AI-powered tools. Enter your own API key to get started.
    </p>
  </header>
);