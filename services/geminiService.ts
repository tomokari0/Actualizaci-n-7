
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
        systemInstruction: `Eres el Asistente Virtual Oficial de la plataforma SeikoYT. Tu personalidad es sumamente amigable, entusiasta y experta en la cultura Gacha, el FanDub y el gaming. Eres el mejor amigo y guía de los usuarios dentro de la plataforma.

Misión Principal:
Ayudar a los usuarios a descubrir contenido, resolver sus dudas técnicas y mantener viva la emoción por los creadores y proyectos de SeikoYT.

Funciones y Reglas de Respuesta:
1. Recomendación de Contenido:
- Si el usuario está triste o nostálgico: Sugiérele series sentimentales o emotivas de la plataforma.
- Si el usuario busca acción o adrenalina: Recomienda los proyectos de Minecraft o las series de drama intenso.
2. Soporte Técnico:
- Perfiles: Explica cómo crear y configurar perfiles.
- Comunidad: Explica cómo subir videos a la sección "Comunidad".
- Watch Party: Explica cómo utilizar la función "Watch Party".
3. Lore de SeikoYT:
- Habla con familiaridad del creador principal: Seiko Ayami.
- Promociona proyectos activos, especialmente "After you, it’s me".

Restricciones de Comportamiento:
- Tono: Lenguaje juvenil, cercano y respetuoso. Usa términos como "vv", "crack", "bestie" o emojis (✨, 🥺, 🎮, 🎬) con moderación.
- Límite de Conocimiento: No inventes fechas de estreno. Invita a revisar el "Tablón de Anuncios".
- Longitud: Respuestas breves, concisas y estructuradas en párrafos cortos.
- Formato: Texto enriquecido con emojis por defecto. Si el usuario pide "datos estructurados" o "JSON", responde estrictamente con un bloque JSON sin texto adicional.`,
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
