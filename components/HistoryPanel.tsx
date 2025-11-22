import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const HistoryItemCard: React.FC<{item: HistoryItem, onSelect: (item: HistoryItem) => void}> = ({ item, onSelect }) => {
  
  const getThumbnail = () => {
    const commonClasses = "w-16 h-16 object-cover rounded-md bg-gray-700 flex-shrink-0";
    if (item.assetUrls && item.assetUrls.length > 0) {
      switch(item.assetType) {
        case 'image':
        case 'productShot':
          return <img src={item.assetUrls[0]} alt="thumbnail" className={commonClasses} />;
        // Fix: Removed invalid 'case "video":' which was causing a type error.
        case 'audio':
          return (
            <div className={`${commonClasses} flex items-center justify-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 5.858a3 3 0 000 4.243m12.728 0a3 3 0 000-4.243M9 12l2 2 4-4" /></svg>
            </div>
          );
        case 'recipeCard':
        case 'blogPost':
        case 'recipe':
            return (
                <div className={`${commonClasses} flex items-center justify-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
            );
      }
    }
    
    if(item.translationResult) {
       return (
        <div className={`${commonClasses} flex items-center justify-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m4 13-4-4-4 4M19 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2z" /></svg>
        </div>
       );
    }

    return <div className={`${commonClasses} flex items-center justify-center`}></div>
  }

  const getTitle = () => {
    if (item.translationResult) return "Text Translation";
    const truncatedPrompt = item.prompt.length > 50 ? `${item.prompt.substring(0, 50)}...` : item.prompt;
    return truncatedPrompt || `Generated ${item.mode}`;
  }

  return (
    <button onClick={() => onSelect(item)} className="w-full text-left p-3 flex items-center gap-4 rounded-lg hover:bg-gray-700/50 transition-colors duration-200">
      {getThumbnail()}
      <div className="overflow-hidden">
        <p className="font-semibold text-gray-200 text-sm truncate">{getTitle()}</p>
        <p className="text-xs text-gray-400 capitalize">{item.mode} &bull; {new Date(item.timestamp).toLocaleDateString()}</p>
      </div>
    </button>
  );
};


export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelect, onClear, isOpen, onClose }) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside 
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-heading"
      >
        <div className="h-full flex flex-col">
          <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
            <h2 id="history-heading" className="text-xl font-bold text-white">Generation History</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close history panel">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          
          <div className="flex-grow overflow-y-auto p-2 space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 pt-10 px-4">
                <p>Your generation history will appear here.</p>
                <p className="text-xs mt-2">Any images, videos, or text you create will be automatically archived for you to revisit later.</p>
              </div>
            ) : (
              history.map(item => <HistoryItemCard key={item.id} item={item} onSelect={onSelect} />)
            )}
          </div>

          {history.length > 0 && (
            <footer className="p-4 border-t border-gray-700 flex-shrink-0">
              <button 
                onClick={onClear} 
                className="w-full px-4 py-2 text-sm font-semibold text-red-400 bg-red-900/50 rounded-lg hover:bg-red-900/80 transition-colors"
              >
                Clear History
              </button>
            </footer>
          )}
        </div>
      </aside>
    </>
  );
};
