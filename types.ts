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

export interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  userInteraction?: 'like' | 'dislike';
}

// ChatMessage and GroundingChunk interfaces removed as they were only used by deactivated Gemini features.