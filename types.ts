
import React from 'react';

export interface Episode {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string; // e.g., "24m"
  introStart?: number;
  introEnd?: number;
}

export interface Season {
  id: string;
  seasonNumber: number;
  title?: string; // Optional custom title for season
  episodes: Episode[];
}

export interface DrmConfig {
  widevine?: {
    licenseUrl: string;
  };
  playready?: {
    licenseUrl: string;
  };
  fairplay?: {
    licenseUrl: string;
    certificateUrl: string;
  };
}

export interface Content {
  id: string;
  type: 'movie' | 'series'; // Differentiator
  title: string;
  description: string;
  thumbnailUrl: string;
  backdropUrl: string;
  genre: string[];
  rating: string;
  releaseYear: number;
  featured?: boolean;
 
  // Movie specific (or default fallback)
  videoUrl?: string;
  introStart?: number;
  introEnd?: number;
 
  // Series specific
  seasons?: Season[];

  trailerUrl?: string;
  
  // DRM Configuration
  drm?: DrmConfig;
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

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  isKid?: boolean;
}
