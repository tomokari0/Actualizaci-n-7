export interface Content {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  backdropUrl: string;
  genre: string[];
  rating: string;
  releaseYear: number;
  featured?: boolean;
  videoUrl?: string;
  trailerUrl?: string;
}

// ChatMessage and GroundingChunk interfaces removed as they were only used by deactivated Gemini features.
