import { GoogleGenAI, Modality, GenerateContentResponse, Chat } from '@google/genai';
import { GroundingChunk } from './types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const chatModel: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: 'You are SeikoBot, a helpful assistant for the SeikoYT video platform. You know about movies, TV shows, and can help users navigate the platform. Your tone is friendly and cinematic.',
  },
});

export const sendMessageToChatbot = async (message: string): Promise<string> => {
  try {
    const response = await chatModel.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to chatbot:", error);
    return "I'm having trouble connecting to my circuits right now. Please try again later.";
  }
};

export const editImageWithPrompt = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
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
        config: {
            responseModalities: [Modality.IMAGE],
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

export const generateProfilePicture = async (prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A vibrant, abstract, circular avatar representing a user named "${prompt}". Minimalist, modern, vector style, cinematic lighting.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        return null;
    } catch (error) {
        console.error("Error generating profile picture:", error);
        return null;
    }
};

export const searchWithGrounding = async (query: string): Promise<{ text: string; sources: GroundingChunk[] }> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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