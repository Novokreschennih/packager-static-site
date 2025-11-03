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