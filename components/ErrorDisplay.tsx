
import React from 'react';

interface ErrorDisplayProps {
  message: string | null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-900/50 text-red-300 border border-red-700 p-3 rounded-lg text-sm mb-4" role="alert">
      <span className="font-bold">Error:</span> {message}
    </div>
  );
};
