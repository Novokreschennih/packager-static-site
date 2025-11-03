import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("Ключ API не установлен. Функции ИИ не будут работать.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const suggestFileName = async (htmlContent: string): Promise<string> => {
    if (!API_KEY) {
        return "ошибка-ключ-api-не-установлен.html";
    }
    try {
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

        const suggestedName = response.text.trim().toLowerCase().replace(/\s+/g, '-');

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

export const generateConfigFromHtml = async (htmlContent: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error("Ключ API не установлен.");
    }

    try {
        const prompt = `Проанализируй следующий HTML-код и найди все плейсхолдеры для динамических данных. Плейсхолдеры могут быть фразами на русском или английском, например: "здесь ссылка на вашего бота", "[YOUR-LINK-HERE]", "your-analytics-id", "ссылка на телеграм", "twitter-url", {{ some_variable }}.

На основе этих плейсхолдеров создай структурированный JSON-объект.
- Ключи должны быть семантическими, на английском языке, в нижнем регистре, и использовать snake_case (например, 'social_links', 'analytics_id').
- Сгруппируй связанные ключи во вложенные объекты (например, 'social_links': { 'telegram': '...' }).
- Значения для этих ключей должны быть информативными плейсхолдерами на русском языке, которые объясняют, что нужно ввести (например, "укажите ссылку на ваш Telegram-канал", "вставьте ваш ID Google Analytics"). НЕ используй пустые строки "".
- Ответ ДОЛЖЕН быть только валидным JSON-объектом без какого-либо дополнительного текста, объяснений или markdown-оберток (\`\`\`json ... \`\`\`).

HTML-содержимое:
\`\`\`html
${htmlContent.substring(0, 10000)}
\`\`\`
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1, // Lower temperature for more deterministic JSON output
            },
        });

        let jsonString = response.text.trim();

        // Clean up markdown backticks just in case
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7);
        }
        if (jsonString.startsWith('```')) {
            jsonString = jsonString.substring(3);
        }
        if (jsonString.endsWith('```')) {
            jsonString = jsonString.slice(0, -3);
        }

        // Basic validation that will throw an error if the string is not valid JSON
        JSON.parse(jsonString);

        return jsonString;
        
    } catch (error) {
        console.error("Ошибка при генерации конфига:", error);
        throw new Error("Не удалось сгенерировать JSON-конфиг. Убедитесь, что ИИ смог вернуть валидный JSON.");
    }
};