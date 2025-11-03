
import React, { useState, useCallback, useRef } from 'react';
import type { AppFile } from './types';
import { suggestFileName } from './services/geminiService';
import FileThumbnail from './components/FileThumbnail';
import InstructionsModal from './components/InstructionsModal';
import { UploadIcon, SparklesIcon, DownloadIcon, SpinnerIcon } from './components/Icons';

// This is required because we are loading JSZip from a CDN.
declare const JSZip: any;

interface StoredFile {
    name: string;
    content: string | ArrayBuffer;
    type: string;
}

const App: React.FC = () => {
    const [files, setFiles] = useState<AppFile[]>([]);
    const [allUploadedFiles, setAllUploadedFiles] = useState<Map<string, StoredFile>>(new Map());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<false | 'optimizing' | 'zipping'>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInstructionsVisible, setIsInstructionsVisible] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;

        setError(null);
        setFiles([]);
        setSelectedId(null);
        setAllUploadedFiles(new Map());

        const filePromises = Array.from(uploadedFiles).map(file => {
            return new Promise<StoredFile>((resolve, reject) => {
                const reader = new FileReader();
                const isText = file.type.startsWith('text/') || file.type.endsWith('javascript') || file.type === 'application/json';

                reader.onload = () => resolve({
                    name: file.name,
                    content: reader.result!,
                    type: file.type
                });
                reader.onerror = reject;

                if (isText) reader.readAsText(file);
                else reader.readAsArrayBuffer(file);
            });
        });

        Promise.all(filePromises).then(allFilesArray => {
            const allFilesMap = new Map(allFilesArray.map(f => [f.name, f]));
            setAllUploadedFiles(allFilesMap);

            const htmlFiles = allFilesArray.filter(f => f.type === 'text/html');

            const appFiles: AppFile[] = htmlFiles.map(htmlFile => {
                const doc = new DOMParser().parseFromString(htmlFile.content as string, 'text/html');

                // Inline CSS
                doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
                    const href = link.getAttribute('href')!;
                    const fileName = href.split('/').pop()!;
                    if (!href.startsWith('http') && allFilesMap.has(fileName)) {
                        const cssFile = allFilesMap.get(fileName)!;
                        const style = doc.createElement('style');
                        style.textContent = cssFile.content as string;
                        link.replaceWith(style);
                    }
                });

                // Inline Images
                const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    return window.btoa(binary);
                };

                doc.querySelectorAll('img[src]').forEach(img => {
                    const src = img.getAttribute('src')!;
                    const fileName = src.split('/').pop()!;
                    if (!src.startsWith('http') && !src.startsWith('data:') && allFilesMap.has(fileName)) {
                        const imgFile = allFilesMap.get(fileName)!;
                        if (imgFile.content instanceof ArrayBuffer) {
                            const base64 = arrayBufferToBase64(imgFile.content);
                            img.setAttribute('src', `data:${imgFile.type};base64,${base64}`);
                        }
                    }
                });
                
                const finalHtml = doc.documentElement.outerHTML;
                const objectURL = URL.createObjectURL(new Blob([finalHtml], { type: 'text/html' }));
                const id = `${htmlFile.name}-${Date.now()}`;

                return {
                    id,
                    originalName: htmlFile.name,
                    content: htmlFile.content as string, // Store original content for zipping
                    objectURL, // Use inlined version for preview
                    newName: htmlFile.name,
                    isIndex: false,
                };
            });

            setFiles(appFiles);
            if (appFiles.length > 0) {
                setSelectedId(appFiles[0].id);
            }
        }).catch(err => {
            console.error("Error reading files:", err);
            setError("Не удалось прочитать один или несколько файлов. Пожалуйста, попробуйте снова.");
        });
    };

    const handleSetIndex = useCallback((id: string) => {
        setFiles(prevFiles =>
            prevFiles.map(f => ({
                ...f,
                isIndex: f.id === id,
                newName: f.id === id ? 'index.html' : f.newName,
            }))
        );
    }, []);

    const handleNameChange = useCallback((id: string, newName: string) => {
        setFiles(prevFiles =>
            prevFiles.map(f => (f.id === id ? { ...f, newName } : f))
        );
    }, []);

    const handleOptimizeNames = async () => {
        setIsLoading('optimizing');
        setError(null);
        const promises = files.map(async (file) => {
            if (file.isIndex) {
                return { id: file.id, newName: 'index.html' };
            }
            try {
                const suggestedName = await suggestFileName(file.content);
                return { id: file.id, newName: suggestedName };
            } catch (err) {
                console.error(`Failed to get suggestion for ${file.originalName}`, err);
                return { id: file.id, newName: file.newName }; // keep old name on error
            }
        });

        try {
            const newNames = await Promise.all(promises);
            setFiles(prevFiles =>
                prevFiles.map(file => {
                    const update = newNames.find(n => n.id === file.id);
                    return update ? { ...file, newName: update.newName } : file;
                })
            );
        } catch (err) {
            setError("Произошла ошибка при оптимизации имен файлов.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const generateReadmeContent = (): string => {
        return `# Ваш статичный сайт - Готов к GitHub Pages

Этот ZIP-архив содержит файлы вашего статичного сайта, подготовленные для легкого развертывания с помощью GitHub Pages.

## Как развернуть

1.  **Создайте новый репозиторий на GitHub:**
    *   Перейдите на [github.com/new](https://github.com/new).
    *   Дайте вашему репозиторию имя (например, \`moy-super-sait\`).
    *   Убедитесь, что репозиторий **Публичный**.
    *   Нажмите "Создать репозиторий".

2.  **Загрузите ваши файлы:**
    *   В вашем новом репозитории нажмите кнопку "Add file" и выберите "Upload files".
    *   **Перетащите скачанный ZIP-файл** в область загрузки. GitHub автоматически распакует архив за вас.
    *   Подождите, пока файлы загрузятся, затем нажмите "Commit changes".

3.  **Активируйте GitHub Pages:**
    *   В вашем репозитории перейдите на вкладку "Settings".
    *   В левой боковой панели нажмите на "Pages".
    *   В разделе "Build and deployment" для "Source" выберите "Deploy from a branch".
    *   В разделе "Branch" выберите ветку \`main\` (или \`master\`) и папку \`/ (root)\`.
    *   Нажмите "Save".

4.  **Посетите ваш опубликованный сайт!**
    *   Публикация сайта может занять несколько минут.
    *   Как только он будет опубликован, GitHub отобразит URL-адрес в верхней части экрана настроек "Pages". Он будет выглядеть примерно так: \`https://<ваш-логин>.github.io/<имя-вашего-репозитория>/\`

Вот и все! Ваш сайт теперь доступен в интернете.
`;
    };

    const handlePrepareZip = async () => {
        if (!files.some(f => f.isIndex)) {
            setError("Пожалуйста, выберите главную страницу (index.html) перед подготовкой ZIP-файла.");
            return;
        }

        setIsLoading('zipping');
        setError(null);

        try {
            const zip = new JSZip();
            const nameMap = new Map(files.map(f => [f.originalName, f.newName]));
            
            allUploadedFiles.forEach(file => {
                const newName = nameMap.get(file.name) ?? file.name;
                zip.file(newName, file.content);
            });

            zip.file("README.md", generateReadmeContent());

            const blob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "github-pages-site.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setIsInstructionsVisible(true);

        } catch (err) {
            console.error("Ошибка при создании ZIP-файла:", err);
            setError("Не удалось создать ZIP-файл. Пожалуйста, попробуйте снова.");
        } finally {
            setIsLoading(false);
        }
    };

    const hasIndexFile = files.some(f => f.isIndex);
    
    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-8 md:py-12">
                <header className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-dark-text-primary">Упаковщик статичных сайтов</h1>
                    <p className="mt-4 text-lg text-dark-text-secondary max-w-2xl mx-auto">
                        Легко подготовьте ваши статичные HTML-файлы для развертывания на GitHub Pages.
                    </p>
                </header>

                {files.length === 0 ? (
                    <div className="text-center max-w-md mx-auto p-8 border-2 border-dashed border-dark-border rounded-xl bg-dark-panel">
                        <h2 className="text-2xl font-semibold mb-4">Начните здесь</h2>
                        <p className="text-dark-text-secondary mb-6">Загрузите все файлы вашего сайта (HTML, CSS, JS, изображения), чтобы начать.</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-accent-blue hover:bg-accent-blue-hover transition-all transform hover:scale-105"
                        >
                            <UploadIcon className="mr-3 -ml-1 h-5 w-5" />
                            Загрузить файлы сайта
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold mb-2">1. Ваша панель управления</h2>
                            <p className="text-dark-text-secondary mb-6">Кликните на превью, чтобы выбрать его, затем установите главную страницу как <code className="bg-dark-panel px-1.5 py-0.5 rounded-md text-sm text-dark-text-primary">index.html</code>.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {files.map(file => (
                                    <FileThumbnail
                                        key={file.id}
                                        file={file}
                                        isSelected={selectedId === file.id}
                                        onSelect={setSelectedId}
                                        onSetIndex={handleSetIndex}
                                        onNameChange={handleNameChange}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-dark-panel border border-dark-border p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-grow">
                                <h2 className="text-2xl font-semibold">2. Финальные шаги</h2>
                                <p className="text-dark-text-secondary mt-1">Оптимизируйте имена файлов и упакуйте все для GitHub.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <button
                                    onClick={handleOptimizeNames}
                                    disabled={isLoading !== false}
                                    className="inline-flex items-center justify-center px-5 py-3 border border-dark-border text-base font-medium rounded-md text-dark-text-primary bg-button-secondary hover:bg-button-secondary-hover transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isLoading === 'optimizing' ? <SpinnerIcon className="mr-2" /> : <SparklesIcon className="mr-2 h-5 w-5" />}
                                    {isLoading === 'optimizing' ? 'Оптимизация...' : 'Оптимизировать имена'}
                                </button>
                                <button
                                    onClick={handlePrepareZip}
                                    disabled={!hasIndexFile || isLoading !== false}
                                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                    {isLoading === 'zipping' ? <SpinnerIcon className="mr-2" /> : <DownloadIcon className="mr-2 h-5 w-5" />}
                                    {isLoading === 'zipping' ? 'Подготовка...' : 'Подготовить для GitHub'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-6 p-4 bg-red-900 border border-red-700 text-white rounded-md text-center">
                        {error}
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                />
            </main>
            
            <InstructionsModal 
              isOpen={isInstructionsVisible} 
              onClose={() => setIsInstructionsVisible(false)} 
            />
        </div>
    );
};

export default App;
