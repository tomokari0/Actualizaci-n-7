
// FIX: Import GroundingChunk from @google/genai instead of the local types file.
import { GoogleGenAI, Modality, GenerateContentResponse, Chat, GroundingChunk, Type } from '@google/genai';

// FIX: Per coding guidelines, the API key must come from `process.env.API_KEY`, which also resolves the 'ImportMeta' error.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
let chatModel: Chat | null = null;

if (!API_KEY) {
  // This error will be visible in the browser's developer console.
  console.error("API_KEY not found. Please ensure it is set as an environment variable in your hosting provider (e.g., Netlify).");
} else {
    ai = new GoogleGenAI({ apiKey: API_KEY });
    chatModel = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: 'You are SeikoBot, a helpful assistant for the SeikoTV video platform. You know about movies, TV shows, and can help users navigate the platform. Your tone is friendly and cinematic.',
      },
    });
}


export const sendMessageToChatbot = async (message: string): Promise<string> => {
  if (!chatModel) return "AI service is not configured. Missing API Key.";
  try {
    const response = await chatModel.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to chatbot:", error);
    return "I'm having trouble connecting to my circuits right now. Please try again later.";
  }
};

/**
 * FIX: Removed Modality.IMAGE from config for gemini-2.5-flash-image as per nano banana series guidelines.
 * Iterating through parts to find the generated image data.
 */
export const editImageWithPrompt = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
  if (!ai) {
    console.error("AI service is not configured. Missing API Key.");
    return null;
  }
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    return null;
  }
};

export const generateImageWithPrompt = async (prompt: string): Promise<string | null> => {
    if (!ai) {
      console.error("AI service is not configured. Missing API Key.");
      return null;
    }
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A high-quality, cinematic movie poster for a film with the following theme: ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '9:16',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

export const searchWithGrounding = async (query: string): Promise<{ text: string; sources: GroundingChunk[] }> => {
    if (!ai) {
      console.error("AI service is not configured. Missing API Key.");
      return { text: "AI service is not configured. Missing API Key.", sources: [] };
    }
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Based on up-to-date information, answer the following question about movies, tv shows, actors, or directors: "${query}"`,
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        const text = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text, sources };
    } catch (error) {
        console.error("Error with grounded search:", error);
        return { text: "Sorry, I couldn't find an answer to that. Please try another question.", sources: [] };
    }
};

export const getPersonalizedRecommendations = async (
  watchedTitles: string[],
  likedTitles: string[],
  searchQueries: string[],
  availableContent: { id: string; title: string; description: string; genre: string[] }[]
): Promise<string[]> => {
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are a content recommendation engine.
        User Profile:
        - Watched: ${watchedTitles.join(', ')}
        - Liked: ${likedTitles.join(', ')}
        - Recent Searches: ${searchQueries.join(', ')}

        Available Content Catalog:
        ${availableContent.map(c => `${c.title} (${c.genre.join(', ')}): ${c.description}`).join('\n')}

        Task: Select the top 8 content IDs from the catalog that match the user's preferences based on their history and likes. 
        Prioritize items similar to what they liked and searched for. Do not include items they have likely already watched if they are not re-watchable types.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          propertyOrdering: ["recommendedIds"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.recommendedIds || [];
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return [];
  }
};
