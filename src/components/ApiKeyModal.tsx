import React, { useState, useEffect } from 'react';
import { CloseIcon, KeyIcon } from './Icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-panel rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative border border-dark-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-secondary hover:text-dark-text-primary transition-colors"
          aria-label="Закрыть"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-slate-700 rounded-full mb-4">
            <KeyIcon className="w-8 h-8 text-yellow-400" />
          </div>

          <h2 className="text-2xl font-bold text-dark-text-primary mb-2">Требуется API ключ Gemini</h2>
          <p className="text-dark-text-secondary mb-6">
            Для использования функций на базе ИИ, пожалуйста, укажите ваш API ключ от Google AI Studio. Он будет сохранен локально в вашем браузере.
          </p>

          <div className="w-full mb-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-dark-border rounded-md text-dark-text-primary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue transition-all"
              placeholder="Введите ваш API ключ..."
              autoFocus
            />
          </div>
          <p className="text-xs text-dark-text-secondary mb-6">
            Нет ключа? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline font-semibold">Получите его здесь.</a>
          </p>

          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="w-full px-8 py-3 bg-accent-blue text-white rounded-lg shadow-lg hover:bg-accent-blue-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Сохранить и продолжить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
