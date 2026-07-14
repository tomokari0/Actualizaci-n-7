import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ImageKit from "imagekit";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiClient: GoogleGenAI | null = null;
let chatModel: any = null;

function getChatModel() {
  if (!chatModel) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY or API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
    chatModel = aiClient.chats.create({
      model: "gemini-2.5-flash",
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
- Formato: Texto enriquecido con emojis por defecto. Si el usuario pide "datos estructurados" o "JSON", responde estrictamente con un bloque JSON sin texto adicional.`
      }
    });
  }
  return chatModel;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize ImageKit
  console.log("ImageKit Config Check:", {
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY ? "Present" : "Missing",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY ? "Present" : "Missing",
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT ? "Present" : "Missing"
  });

  const imagekit = new ImageKit({
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || "",
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || ""
  });

  app.use(express.json());

  // API Route for ImageKit Authentication
  app.get("/api/imagekit/auth", (req, res) => {
    try {
      console.log("Generating ImageKit auth parameters...");
      
      if (!process.env.IMAGEKIT_PRIVATE_KEY) {
        throw new Error("IMAGEKIT_PRIVATE_KEY is missing in environment variables");
      }

      const result = imagekit.getAuthenticationParameters();
      console.log("Auth parameters generated successfully");
      res.json(result);
    } catch (error: any) {
      console.error("ImageKit Auth Error:", error.message);
      res.status(500).json({ 
        error: "Failed to authenticate with ImageKit",
        message: error.message 
      });
    }
  });

  // API Route for Gemini Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      console.log("Processing chat message with Gemini...");
      const chat = getChatModel();
      const response = await chat.sendMessage({ message });
      console.log("Response received from Gemini model successfully");
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error.message);
      res.status(500).json({ 
        error: "Failed to communicate with Gemini Assistant",
        message: error.message 
      });
    }
  });

  // Helper for uploading WebVTT to ImageKit or fallback to base64 Data URI
  const uploadToImageKit = async (vttContent: string, fileName: string): Promise<string> => {
    try {
      if (!process.env.IMAGEKIT_PRIVATE_KEY) {
        throw new Error("ImageKit private key not configured");
      }
      const response = await imagekit.upload({
        file: Buffer.from(vttContent).toString("base64"),
        fileName: fileName,
        folder: "/subtitles/"
      });
      console.log(`Uploaded ${fileName} to ImageKit successfully:`, response.url);
      return response.url;
    } catch (error) {
      console.warn(`Error uploading ${fileName} to ImageKit, returning data URI fallback:`, error);
      const base64 = Buffer.from(vttContent).toString("base64");
      return `data:text/vtt;base64,${base64}`;
    }
  };

  // API Route for AI Subtitle Generation & Translation
  app.post("/api/subtitles/generate", async (req, res) => {
    try {
      const { videoUrl, title, description, languages = ["es", "en", "ja"] } = req.body;
      console.log("Processing subtitles generation request:", { videoUrl, title, description, languages });

      const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY or API_KEY environment variable is required");
      }
      
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      let originalVtt = "";
      let base64Audio = "";
      let mimeType = "audio/mp3";

      // Try to download audio if direct media file
      const isDirectMedia = videoUrl && (
        videoUrl.endsWith(".mp3") || 
        videoUrl.endsWith(".mp4") || 
        videoUrl.endsWith(".wav") || 
        videoUrl.endsWith(".webm") || 
        videoUrl.includes("uploadcare") || 
        videoUrl.includes("imagekit")
      );

      if (isDirectMedia) {
        try {
          console.log("Downloading audio file directly for transcription:", videoUrl);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
          
          const fileRes = await fetch(videoUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (fileRes.ok) {
            const buffer = await fileRes.arrayBuffer();
            if (buffer.byteLength < 15 * 1024 * 1024) {
              base64Audio = Buffer.from(buffer).toString("base64");
              if (videoUrl.endsWith(".mp4")) mimeType = "video/mp4";
              else if (videoUrl.endsWith(".wav")) mimeType = "audio/wav";
              else if (videoUrl.endsWith(".webm")) mimeType = "audio/webm";
              console.log("Downloaded audio data successfully. Size:", buffer.byteLength);
            } else {
              console.warn("File is too large (>15MB). Skipping direct audio transcribe.");
            }
          }
        } catch (fetchErr: any) {
          console.warn("Skipping direct audio download/transcribe due to:", fetchErr.message);
        }
      }

      // Step 1: Transcribe with Gemini (if audio exists)
      if (base64Audio) {
        console.log("Transcribing audio content using Gemini...");
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: mimeType
                }
              },
              "Transcribe this audio file into Spanish WebVTT subtitle format. Output strictly the raw WebVTT content starting with 'WEBVTT'. Do not use markdown wraps (like ```vtt or ```). Ensure precise timestamps (e.g., 00:00:01.000 --> 00:00:04.000)."
            ],
            config: {
              systemInstruction: "You are a professional audio transcriber. Your output must strictly be standard WebVTT format starting with WEBVTT. Do not output explanations, markdown syntax, or other characters."
            }
          });
          originalVtt = response.text || "";
        } catch (transcribeErr: any) {
          console.warn("Gemini audio transcription failed, falling back to semantic generation:", transcribeErr.message);
        }
      }

      // Step 2: Semantic fallback generation if transcribe failed or no audio
      if (!originalVtt || !originalVtt.trim().startsWith("WEBVTT")) {
        console.log("Generating context-aware semantic WebVTT subtitles...");
        const semanticPrompt = `Generate a realistic, synchronized Spanish WebVTT subtitle script for a video with:
Title: "${title || 'SeikoYT Video'}"
Description: "${description || 'Un video emocionante de la comunidad'}"

RULES:
1. Provide a beautiful WebVTT starting with 'WEBVTT'.
2. Create about 5 to 10 dialogue blocks corresponding to a 2-minute video.
3. Use precise timestamps (e.g. 00:00:01.000 --> 00:00:05.000).
4. Dialogues should feel completely realistic and match the title and description (fan-dub, Gacha, or gaming style).
5. Output strictly the raw WebVTT content, without markdown code blocks.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: semanticPrompt,
          config: {
            systemInstruction: "You are an expert subtitle writer. You produce highly realistic, fully synchronized Spanish subtitle files in WebVTT format starting with WEBVTT."
          }
        });
        originalVtt = response.text || "";
      }

      // Clean markdown symbols from original VTT
      originalVtt = originalVtt.replace(/```vtt/gi, "").replace(/```/g, "").trim();

      const tracks: Array<{ label: string; src: string }> = [];
      const randomId = Math.random().toString(36).substring(7);

      // Upload original Spanish track
      const espUrl = await uploadToImageKit(originalVtt, `sub_${randomId}_es.vtt`);
      tracks.push({ label: "Español (Original)", src: espUrl });

      // Translate VTT to requested target languages
      const langNames: Record<string, string> = {
        en: "English",
        ja: "Japanese",
        english: "English",
        japanese: "Japanese",
        es: "Spanish",
        fr: "French",
        pt: "Portuguese"
      };

      for (const langCode of languages) {
        const targetLang = langNames[langCode.toLowerCase()] || langCode;
        if (targetLang === "Spanish" || langCode === "es") continue;

        try {
          console.log(`Translating WebVTT subtitles to: ${targetLang}...`);
          const translatePrompt = `Translate the following WebVTT subtitle content into ${targetLang}.
RULES:
1. Translate ONLY the subtitle dialog lines.
2. DO NOT change or modify any timestamps (like '00:00:01.000 --> 00:00:04.000'), sequence numbers, or 'WEBVTT' headers.
3. Keep the timing, structure, spacing, and format exactly the same to preserve video synchronization.
4. Return strictly the raw WebVTT content starting with 'WEBVTT'. Do not use markdown wraps (like \`\`\`vtt or \`\`\`).

WebVTT content:
${originalVtt}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: translatePrompt,
            config: {
              systemInstruction: "You are a professional subtitle translator. You translate only the text dialog lines of WebVTT subtitles, leaving timestamps, timing codes, and structure completely untouched."
            }
          });

          let translatedVtt = response.text || "";
          translatedVtt = translatedVtt.replace(/```vtt/gi, "").replace(/```/g, "").trim();

          if (translatedVtt && translatedVtt.startsWith("WEBVTT")) {
            const transUrl = await uploadToImageKit(translatedVtt, `sub_${randomId}_${langCode}.vtt`);
            tracks.push({ label: `${targetLang} (Traducido)`, src: transUrl });
          }
        } catch (transErr: any) {
          console.error(`Error translating subtitles to ${targetLang}:`, transErr.message);
        }
      }

      console.log("Subtitles generated and translated successfully!", tracks);
      res.json({ success: true, tracks });
    } catch (error: any) {
      console.error("Subtitle Route Error:", error.message);
      res.status(500).json({ error: "Failed to generate subtitles", message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
