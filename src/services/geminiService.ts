import { GoogleGenAI } from "@google/genai";

export const suggestFileName = async (htmlContent: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        return "ошибка-ключ-api-не-установлен.html";
    }
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Analyze the following HTML content and suggest a concise, semantic, and SEO-friendly filename. The filename should be in lowercase, use hyphens instead of spaces, and end with the .html extension. Only return the filename itself, with no other text.

HTML Content:
\`\`\`html
${htmlContent.substring(0, 4000)}
\`\`\`
`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Use regex to extract a valid filename to be more robust against chatty responses
        const textResponse = response.text.trim();
        const match = textResponse.match(/([\w-]+\.html)/);
        const suggestedName = match ? match[0] : textResponse.toLowerCase().replace(/\s+/g, '-');


        // Basic validation
        if (suggestedName.endsWith('.html') && suggestedName.length > 5 && !suggestedName.includes('`')) {
            return suggestedName;
        }

        return "не-удалось-предложить-имя.html";

    } catch (error) {
        console.error("Ошибка при предложении имени файла:", error);
        return "ошибка-связи-с-ии.html";
    }
};

export const generateConfigFromHtml = async (htmlContent: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("Ключ API не установлен.");
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
        const prompt = `Проанализируй следующий HTML-код и найди все плейсхолдеры для динамических данных. Плейсхолдеры могут быть фразами на русском или английском, например: "здесь ссылка на вашего бота", "[YOUR-LINK-HERE]", "your-analytics-id", "ссылка на телеграм", "twitter-url", {{ some_variable }}.

На основе этих плейсхолдеров создай структурированный JSON-объект.
- Ключи должны быть семантическими, на английском языке, в нижнем регистре, и использовать snake_case (например, 'social_links', 'analytics_id').
- Сгруппируй связанные ключи во вложенные объекты (например, 'social_links': { 'telegram': '...' }).
- Значения для этих ключей должны быть информативными плейсхолдерами на русском языке, которые объясняют, что нужно ввести (например, "укажите ссылку на ваш Telegram-канал", "вставьте ваш ID Google Analytics"). НЕ используй пустые строки "".
- Ответ ДОЛЖЕН быть только валидным JSON-объектом без какого-либо дополнительного текста, объяснений или markdown-оберток.

HTML-содержимое:
\`\`\`html
${htmlContent.substring(0, 10000)}
\`\`\`
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
            },
        });

        const jsonString = response.text.trim();

        // The model is now forced to return JSON, so we just need to parse it.
        JSON.parse(jsonString);

        return jsonString;
        
    } catch (error) {
        console.error("Ошибка при генерации конфига:", error);
        throw new Error("Не удалось сгенерировать JSON-конфиг. Убедитесь, что ИИ смог вернуть валидный JSON.");
    }
};