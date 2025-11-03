import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AppFile } from './types';
import { suggestFileName, generateConfigFromHtml } from './services/geminiService';
import FileThumbnail from './components/FileThumbnail';
import InstructionsModal from './components/InstructionsModal';
import { UploadIcon, SparklesIcon, DownloadIcon, SpinnerIcon, CogIcon } from './components/Icons';

// This is required because we are loading JSZip from a CDN.
declare const JSZip: any;

interface StoredFile {
    name: string;
    content: string | ArrayBuffer;
    type: string;
}

// Helper to resolve nested keys from a string path (e.g., 'social.twitter')
const getNestedValue = (obj: any, path: string): string | undefined => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper for replacing placeholders with config values
const processHtmlWithConfig = (htmlContent: string, configData: Record<string, any> | null): string => {
    if (!configData) return htmlContent;
    return htmlContent.replace(/\{\{\s*([\w\d._-]+)\s*\}\}/g, (match, key) => {
        const value = getNestedValue(configData, key);
        if (value !== undefined && value !== null) {
            return String(value);
        }
        console.warn(`[Config] Ключ "${key}" не найден в _config.json.`);
        return ''; // Replace with empty string if not found
    });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const App: React.FC = () => {
    const [files, setFiles] = useState<AppFile[]>([]);
    const [allUploadedFiles, setAllUploadedFiles] = useState<Map<string, StoredFile>>(new Map());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<false | 'optimizing' | 'zipping' | 'generatingConfig'>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInstructionsVisible, setIsInstructionsVisible] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [config, setConfig] = useState<Record<string, any> | null>(null);
    const [configString, setConfigString] = useState('');
    const [configError, setConfigError] = useState<string | null>(null);
    
    const [highlightedItems, setHighlightedItems] = useState<Record<string, boolean>>({});
    const [configHighlighted, setConfigHighlighted] = useState(false);


    // Creates a preview-ready object URL by templating and inlining assets
    const createPreviewableObjectUrl = useCallback((
        originalHtml: string,
        currentConfig: Record<string, any> | null,
        allFilesMap: Map<string, StoredFile>
    ): string => {
        const templatedHtml = processHtmlWithConfig(originalHtml, currentConfig);
        const doc = new DOMParser().parseFromString(templatedHtml, 'text/html');
        const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

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
        
        // Inline Scripts
        doc.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src')!;
            const fileName = src.split('/').pop()!;
            if (!src.startsWith('http') && allFilesMap.has(fileName)) {
                const jsFile = allFilesMap.get(fileName)!;
                const newScript = doc.createElement('script');
                newScript.textContent = jsFile.content as string;
                script.removeAttribute('src'); // remove src to prevent external request
                script.replaceWith(newScript);
            }
        });


        const finalHtmlForPreview = doc.documentElement.outerHTML;
        return URL.createObjectURL(new Blob([finalHtmlForPreview], { type: 'text/html' }));
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFiles = event.target.files;
        if (!uploadedFiles) return;

        // Clean up previous file URLs to prevent memory leaks
        files.forEach(file => URL.revokeObjectURL(file.objectURL));

        setError(null);
        setFiles([]);
        setSelectedId(null);
        setAllUploadedFiles(new Map());
        setConfig(null);
        setConfigString('');
        setConfigError(null);

        const filePromises = Array.from(uploadedFiles).map(file => {
            return new Promise<StoredFile>((resolve, reject) => {
                const reader = new FileReader();
                const isText = file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.json') || file.name.endsWith('.css');
                reader.onload = () => resolve({ name: file.name, content: reader.result!, type: file.type });
                reader.onerror = reject;
                if (isText) reader.readAsText(file);
                else reader.readAsArrayBuffer(file);
            });
        });

        Promise.all(filePromises).then(allFilesArray => {
            const allFilesMap = new Map(allFilesArray.map(f => [f.name, f]));
            setAllUploadedFiles(allFilesMap);

            let newConfig: Record<string, any> | null = null;
            const configFile = allFilesArray.find(f => f.name === '_config.json');
            if (configFile) {
                try {
                    newConfig = JSON.parse(configFile.content as string);
                    setConfig(newConfig);
                    setConfigString(JSON.stringify(newConfig, null, 2));
                } catch (e) {
                    setError("Ошибка в файле _config.json: неверный формат JSON.");
                    setConfigString(configFile.content as string);
                    setConfigError('Неверный формат JSON');
                }
            }

            const htmlFiles = allFilesArray.filter(f => f.type === 'text/html' && f.name !== '_config.json');

            const appFiles: AppFile[] = htmlFiles.map(htmlFile => {
                const objectURL = createPreviewableObjectUrl(htmlFile.content as string, newConfig, allFilesMap);
                const id = `${htmlFile.name}-${Date.now()}`;

                return {
                    id,
                    originalName: htmlFile.name,
                    content: htmlFile.content as string,
                    objectURL,
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
    
    const handleConfigChange = (newConfigString: string) => {
        setConfigString(newConfigString);
        try {
            const newConfig = JSON.parse(newConfigString);
            setConfig(newConfig);
            setConfigError(null);
            // Update previews with new config
            setFiles(currentFiles => {
                 currentFiles.forEach(f => URL.revokeObjectURL(f.objectURL));
                 return currentFiles.map(file => ({
                     ...file,
                     objectURL: createPreviewableObjectUrl(file.content, newConfig, allUploadedFiles)
                 }));
            });
        } catch (e) {
            setConfigError('Ошибка: неверный формат JSON.');
        }
    };

    const handleGenerateConfig = async () => {
        setIsLoading('generatingConfig');
        setError(null);
    
        const allHtmlContent = files.map(f => f.content).join('\n\n---\n\n');
    
        try {
            const configJsonString = await generateConfigFromHtml(allHtmlContent);
            const newConfig = JSON.parse(configJsonString);
            const prettyJson = JSON.stringify(newConfig, null, 2);
    
            setConfig(newConfig);
            setConfigString(prettyJson);
            setConfigError(null);
    
            // Update previews with the newly generated config
            setFiles(currentFiles => {
                currentFiles.forEach(f => URL.revokeObjectURL(f.objectURL));
                return currentFiles.map(file => ({
                    ...file,
                    objectURL: createPreviewableObjectUrl(file.content, newConfig, allUploadedFiles)
                }));
            });
    
            // Add virtual _config.json to the file list for consistency
            const newConfigFile: StoredFile = {
                name: '_config.json',
                content: prettyJson,
                type: 'application/json'
            };
            setAllUploadedFiles(prevMap => {
                const newMap = new Map(prevMap);
                newMap.set('_config.json', newConfigFile);
                return newMap;
            });
            
            // Highlight for user feedback
            setConfigHighlighted(true);
            setTimeout(() => setConfigHighlighted(false), 1500);
    
        } catch (e) {
            console.error("Failed to generate or parse config:", e);
            setError("Не удалось сгенерировать файл конфигурации. Убедитесь, что в ваших HTML-файлах есть явные плейсхолдеры, или попробуйте снова.");
            setConfigError("Ошибка генерации ИИ.");
        } finally {
            setIsLoading(false);
        }
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
            
            // Highlight for user feedback
            const highlights = newNames.reduce((acc, n) => ({...acc, [n.id]: true }), {});
            setHighlightedItems(highlights);
            setTimeout(() => setHighlightedItems({}), 1500);

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

2.  **Распакуйте и загрузите файлы:**
    *   **Распакуйте скачанный ZIP-архив** на вашем компьютере.
    *   В вашем новом репозитории на GitHub нажмите "Add file" и выберите "Upload files".
    *   **Перетащите все файлы и папки из распакованного архива** (не сам ZIP-файл!) в область загрузки.
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

---

## Как вносить изменения

Этот инструмент работает как "сборщик" — он подготавливает ваши файлы для публикации. GitHub Pages только отображает уже готовые файлы.

**Важно:** Если вы захотите изменить какие-либо данные из вашего файла \`_config.json\` (например, поменять ссылки в соцсетях или ID счетчика аналитики), вы не сможете сделать это напрямую на GitHub.

Вам нужно будет:
1. Внести изменения в ваши файлы локально на компьютере.
2. **Снова использовать этот инструмент**, чтобы заново собрать ваш сайт.
3. Загрузить содержимое нового ZIP-архива на GitHub, **заменив старые файлы**.

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
                if (file.name === '_config.json') return; // Do not include config file in final zip

                const newName = nameMap.get(file.name) ?? file.name;
                
                let finalContent = file.content;
                // Process HTML files with config before zipping
                if (file.type === 'text/html') {
                    finalContent = processHtmlWithConfig(file.content as string, config);
                }

                zip.file(newName, finalContent);
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
                        <p className="text-dark-text-secondary mb-6">Загрузите все файлы вашего сайта (HTML, CSS, JS, изображения, и опционально <code className="bg-slate-900 text-xs px-1.5 py-1 rounded">_config.json</code>), чтобы начать.</p>
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
                                        isHighlighted={!!highlightedItems[file.id]}
                                        onSelect={setSelectedId}
                                        onSetIndex={handleSetIndex}
                                        onNameChange={handleNameChange}
                                    />
                                ))}
                            </div>
                        </div>

                        {config === null ? (
                            <div className="bg-dark-panel border border-dark-border p-6 rounded-lg shadow-lg text-center">
                                <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center">
                                    <CogIcon className="mr-3 h-6 w-6 text-dark-text-secondary"/> 2. (Опционально) Настройки сайта
                                </h2>
                                <p className="text-dark-text-secondary mb-6 max-w-xl mx-auto">
                                    Файл <code className="bg-slate-900 text-xs px-1.5 py-1 rounded">_config.json</code> не найден. ИИ может проанализировать ваш HTML и создать его для вас.
                                </p>
                                <button
                                    onClick={handleGenerateConfig}
                                    disabled={isLoading === 'generatingConfig'}
                                    className="inline-flex items-center justify-center px-5 py-3 border border-dark-border text-base font-medium rounded-md text-dark-text-primary bg-button-secondary hover:bg-button-secondary-hover transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isLoading === 'generatingConfig' ? <SpinnerIcon className="mr-2" /> : <SparklesIcon className="mr-2 h-5 w-5" />}
                                    {isLoading === 'generatingConfig' ? 'Анализ...' : 'Сгенерировать конфиг с помощью ИИ'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-dark-panel border border-dark-border p-6 rounded-lg shadow-lg">
                                <h2 className="text-2xl font-semibold mb-2 flex items-center">
                                    <CogIcon className="mr-3 h-6 w-6 text-dark-text-secondary"/> 2. (Опционально) Настройки сайта (<code className="text-lg">_config.json</code>)
                                </h2>
                                <p className="text-dark-text-secondary mb-4">
                                    Редактируйте глобальные переменные, которые будут вставлены в ваши HTML-файлы. Используйте синтаксис <code>{"{{ ключ.вложенный_ключ }}"}</code>. Изменения применятся к превью мгновенно.
                                </p>
                                <textarea
                                    value={configString}
                                    onChange={(e) => handleConfigChange(e.target.value)}
                                    className={`w-full h-48 p-4 font-mono text-sm bg-slate-900 border rounded-md focus:ring-accent-blue focus:border-accent-blue transition-all duration-300 ${configError ? 'border-red-500' : 'border-dark-border'} ${configHighlighted ? 'border-green-500 ring-2 ring-green-500/50' : ''}`}
                                    spellCheck="false"
                                />
                                {configError && <p className="mt-2 text-sm text-red-400">{configError}</p>}
                            </div>
                        )}


                        <div className="bg-dark-panel border border-dark-border p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-grow">
                                <h2 className="text-2xl font-semibold">3. Финальные шаги</h2>
                                <p className="text-dark-text-secondary mt-1">Оптимизируйте имена файлов (по желанию) и упакуйте все для GitHub.</p>
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