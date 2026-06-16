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
