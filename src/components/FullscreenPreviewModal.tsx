import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface FullscreenPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
}

const FullscreenPreviewModal: React.FC<FullscreenPreviewModalProps> = ({ isOpen, onClose, fileUrl }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
        aria-label="Закрыть полноэкранный режим"
      >
        <CloseIcon className="w-8 h-8" />
      </button>

      <div 
        className="bg-dark-panel w-full h-full rounded-lg shadow-2xl flex"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={fileUrl}
          title="Fullscreen Preview"
          className="w-full h-full border-0 rounded-lg bg-white"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};

export default FullscreenPreviewModal;
