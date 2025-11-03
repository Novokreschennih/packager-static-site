
import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-panel rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative border border-dark-border"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-secondary hover:text-dark-text-primary transition-colors"
          aria-label="Закрыть инструкцию"
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl md:text-3xl font-bold text-dark-text-primary mb-4">Ваш сайт готов к развертыванию!</h2>
        <p className="text-dark-text-secondary mb-6">Следуйте этим простым шагам, чтобы опубликовать ваш сайт с помощью GitHub Pages.</p>

        <div className="space-y-6 text-dark-text-primary">
          {/* Step 1 */}
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span className="bg-accent-blue text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-3">1</span>
              Создайте новый репозиторий на GitHub
            </h3>
            <p className="pl-11 text-dark-text-secondary">
              Перейдите по ссылке, чтобы создать новый **публичный** репозиторий. Дайте ему любое имя.
            </p>
            <div className="pl-11 mt-3">
              <a href="https://github.com/new" target="_blank" rel="noopener noreferrer" className="inline-block bg-button-secondary hover:bg-button-secondary-hover px-4 py-2 rounded-md font-semibold transition-colors">
                Создать репозиторий
              </a>
            </div>
          </div>
          
          {/* Step 2 */}
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span className="bg-accent-blue text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-3">2</span>
              Загрузите ZIP-архив
            </h3>
            <p className="pl-11 text-dark-text-secondary">
              В вашем новом репозитории нажмите "Add file" → "Upload files". Просто **перетащите скачанный ZIP-файл** (`github-pages-site.zip`) в область загрузки. GitHub автоматически распакует его.
            </p>
          </div>

          {/* Step 3 */}
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span className="bg-accent-blue text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-3">3</span>
              Активируйте GitHub Pages
            </h3>
            <p className="pl-11 text-dark-text-secondary">
              Перейдите в "Settings" → "Pages". В разделе "Branch" выберите ветку `main` и папку `/(root)`, затем нажмите "Save".
            </p>
          </div>

          {/* Step 4 */}
          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span className="bg-accent-blue text-white rounded-full h-8 w-8 flex items-center justify-center font-bold mr-3">4</span>
              Готово! Посетите ваш сайт
            </h3>
            <p className="pl-11 text-dark-text-secondary">
              Публикация может занять пару минут. Ссылка на ваш сайт появится вверху страницы настроек Pages.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-accent-blue text-white rounded-lg shadow-lg hover:bg-accent-blue-hover transition-transform transform hover:scale-105 font-semibold"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionsModal;
