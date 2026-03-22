import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import shaka from 'shaka-player';

interface ShakaPlayerProps {
  manifestUri: string;
  className?: string;
}

const ShakaPlayer = forwardRef<HTMLVideoElement, ShakaPlayerProps>(({ manifestUri, className = "" }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<shaka.Player | null>(null);

  useImperativeHandle(ref, () => videoRef.current!);

  useEffect(() => {
    // Install polyfills
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      console.error('Browser not supported for Shaka Player');
      return;
    }

    const initPlayer = async () => {
      if (!videoRef.current) return;

      const player = new shaka.Player(videoRef.current);
      playerRef.current = player;

      // Aggressive buffering configuration
      player.configure({
        streaming: {
          bufferingGoal: 60, // 60 seconds of buffer
          rebufferingGoal: 15, // Start rebuffering if we have less than 15s
          bufferBehind: 30, // Keep 30s behind
          retryParameters: {
            maxAttempts: 5,
            baseDelay: 1000,
            backoffFactor: 2,
          },
        },
        manifest: {
          retryParameters: {
            maxAttempts: 5,
            baseDelay: 1000,
            backoffFactor: 2,
          },
        },
      });

      // Listen for errors
      player.addEventListener('error', (event: any) => {
        console.error('Shaka Player Error:', event.detail);
      });

      try {
        // Check if it's a direct mp4 or a manifest
        const isManifest = manifestUri.includes('.m3u8') || manifestUri.includes('.mpd');
        
        if (isManifest) {
          await player.load(manifestUri);
        } else {
          // Fallback for direct video files if needed, though Shaka can handle some
          videoRef.current.src = manifestUri;
        }
        console.log('Video loaded successfully');
      } catch (e) {
        console.error('Error loading video:', e);
        // Fallback to native video if Shaka fails
        if (videoRef.current) {
          videoRef.current.src = manifestUri;
        }
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [manifestUri]);

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden shadow-2xl ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full"
        poster="https://picsum.photos/seed/seikoyt/1920/1080"
        controls
        autoPlay
      />
    </div>
  );
});

export default ShakaPlayer;
