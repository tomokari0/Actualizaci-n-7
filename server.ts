import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ImageKit from "imagekit";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
