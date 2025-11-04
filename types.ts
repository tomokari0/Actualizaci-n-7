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

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface UserProfile {
  username: string;
  profilePictureUrl: string; // base64 data URL
}
