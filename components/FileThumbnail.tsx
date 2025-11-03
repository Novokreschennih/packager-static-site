import React from 'react';
import { AppFile } from '../types';
import { StarIcon } from './Icons';

interface FileThumbnailProps {
  file: AppFile;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onSetIndex: (id: string) => void;
  onNameChange: (id: string, newName: string) => void;
}

const FileThumbnail: React.FC<FileThumbnailProps> = ({ file, isSelected, onSelect, onSetIndex, onNameChange }) => {
  const handleSetIndexClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetIndex(file.id);
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <div
        onClick={() => onSelect(file.id)}
        className={`relative group rounded-lg overflow-hidden border-4 transition-all duration-300 cursor-pointer ${
          isSelected ? 'border-accent-blue shadow-2xl' : 'border-dark-panel hover:border-dark-border'
        }`}
      >
        {file.isIndex && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white p-2 rounded-full z-10 shadow-lg">
            <StarIcon className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
          </div>
        )}
        <iframe
          src={file.objectURL}
          title={file.originalName}
          className="w-full h-48 md:h-64 object-cover transform scale-100 group-hover:scale-105 transition-transform duration-300 pointer-events-none bg-white"
          sandbox="allow-scripts" // Allow scripts for styling (e.g., Tailwind CDN)
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-0 transition-all duration-300" />

        {isSelected && !file.isIndex && (
           <button
             onClick={handleSetIndexClick}
             className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-accent-blue text-white rounded-lg shadow-lg hover:bg-accent-blue-hover transition-transform transform hover:scale-105 flex items-center space-x-2"
           >
             <StarIcon className="w-5 h-5"/>
             <span>Сделать главной страницей</span>
           </button>
        )}
      </div>

      <div className="flex flex-col space-y-1">
        <label htmlFor={`filename-${file.id}`} className="text-xs text-dark-text-secondary truncate">{file.originalName}</label>
        <input
          id={`filename-${file.id}`}
          type="text"
          value={file.newName}
          onChange={(e) => onNameChange(file.id, e.target.value)}
          disabled={file.isIndex}
          className="bg-dark-panel border border-dark-border text-dark-text-primary text-sm rounded-md focus:ring-accent-blue focus:border-accent-blue block w-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Новое имя файла"
        />
      </div>
    </div>
  );
};

export default FileThumbnail;