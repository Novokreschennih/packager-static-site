
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
        <p className="text-dark-text-secondary mb-6">Следуйте этим шагам, чтобы опубликовать ваш сайт бесплатно. GitHub Pages - отличный выбор.</p>

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
              Распакуйте и загрузите файлы
            </h3>
            <p className="pl-11 text-dark-text-secondary">
              Сначала **распакуйте скачанный ZIP-архив** на вашем компьютере. Затем в репозитории нажмите "Add file" → "Upload files". **Перетащите все файлы и папки из распакованного архива** (не сам ZIP-файл!) в область загрузки.
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
        
        <div className="mt-8 pt-6 border-t border-dark-border">
            <h3 className="text-lg font-semibold mb-2 text-center">Альтернатива: Развертывание на Vercel</h3>
            <p className="text-sm text-center text-dark-text-secondary mb-4">
                Vercel - еще одна отличная платформа для хостинга статичных сайтов. Процесс очень похож:
            </p>
            <ol className="list-decimal list-inside text-sm text-dark-text-secondary space-y-2 max-w-lg mx-auto text-left">
                <li>Загрузите распакованные файлы в новый репозиторий GitHub (как в шагах 1 и 2 выше).</li>
                <li>Зарегистрируйтесь на <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">Vercel</a> с помощью вашего аккаунта GitHub.</li>
                <li>Нажмите "Add New... → Project" и импортируйте ваш репозиторий с сайтом.</li>
                <li>Vercel автоматически определит, что это статичный сайт (благодаря файлу `vercel.json` в архиве) и развернет его. Никаких настроек сборки не требуется.</li>
                <li>Ваш сайт будет доступен по ссылке, которую предоставит Vercel.</li>
            </ol>
        </div>


        <div className="mt-8 pt-6 border-t border-dark-border">
          <h4 className="font-semibold text-center text-dark-text-primary mb-2">Как вносить изменения в будущем?</h4>
          <p className="text-sm text-center text-dark-text-secondary">
            Этот инструмент "собирает" ваш сайт. Если вы захотите обновить данные из <code className="bg-slate-900 text-xs px-1 py-0.5 rounded">_config.json</code>, вам нужно будет снова загрузить сюда файлы проекта, чтобы сгенерировать и выгрузить на GitHub новую версию сайта.
          </p>
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