
import React, { useEffect, useRef, useState } from 'react';
import ShakaPlayer from './ShakaPlayer';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface UniversalPlayerProps {
    videoUrl: string;
    serverType: 'uploadcare' | 'streamtape';
    title?: string;
    autoPlay?: boolean;
    onTimeUpdate?: (time: number) => void;
    onDurationChange?: (duration: number) => void;
    videoRef?: React.RefObject<HTMLVideoElement>;
}

const UniversalPlayer: React.FC<UniversalPlayerProps> = ({ 
    videoUrl, 
    serverType, 
    title,
    autoPlay = true,
    onTimeUpdate,
    onDurationChange,
    videoRef
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasError, setHasError] = useState(false);

    // Streamtape URL processing: ensures it's an embed link and adds a cache buster
    const getProcessedUrl = (url: string) => {
        if (!url) return '';
        let cleanUrl = url.trim();
        
        if (serverType === 'streamtape') {
            // Transform to embed format
            if (cleanUrl.includes('streamtape.com/v/')) {
                cleanUrl = cleanUrl.replace('streamtape.com/v/', 'streamtape.com/e/');
            }
            
            // Add a timestamp to bypass simple cache/IP session blocks
            const connector = cleanUrl.includes('?') ? '&' : '?';
            cleanUrl = `${cleanUrl}${connector}t=${Date.now()}`;
            
            if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
        }
        return cleanUrl;
    };

    const processedUrl = getProcessedUrl(videoUrl);

    if (serverType === 'streamtape') {
        return (
            <div className="relative w-full aspect-video rounded-[15px] overflow-hidden shadow-[0_0_20px_rgba(255,0,0,0.5)] bg-black group">
                <iframe
                    ref={iframeRef}
                    src={processedUrl}
                    className="w-full h-full border-none"
                    allowFullScreen
                    // CRITICAL: no-referrer prevents Streamtape from seeing we are on a dev/preview domain
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation"
                    allow="autoplay; encrypted-media; fullscreen"
                    title={title || "Streamtape Player"}
                    onError={() => setHasError(true)}
                />

                {/* Manual Fallback Overlay: Since we can't read iframe content, we provide a quick action button */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                    <a 
                        href={processedUrl}
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-red-600/90 hover:bg-red-600 text-[10px] text-white font-black uppercase px-3 py-1.5 rounded-lg border border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.5)] flex items-center gap-2 backdrop-blur-sm transition-all pointer-events-auto"
                    >
                        Abrir Original
                    </a>
                </div>
                
                {hasError && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20">
                        <AlertCircle className="text-red-600 mb-4" size={48} />
                        <h3 className="text-white font-bold mb-2">Error de Conexión</h3>
                        <p className="text-gray-400 text-sm max-w-xs mb-6">
                            Streamtape está bloqueando la conexión. Por favor, desactiva tu AdBlock o intenta recargar la página.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Recargar Página
                        </button>
                    </div>
                )}

                {/* Troubleshooting hint in case of "Client blocked" message which doesn't trigger onError */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded">
                        ¿Error de bloqueo? Prueba desactivando extensiones de privacidad.
                    </p>
                </div>

                <div className="absolute inset-0 pointer-events-none border border-red-600/20 rounded-[15px]" />
            </div>
        );
    }

    // Default: uploadcare / internal
    return (
        <div className="relative w-full aspect-video rounded-[15px] overflow-hidden shadow-[0_0_20px_rgba(255,0,0,0.5)] bg-black">
            <ShakaPlayer 
                src={videoUrl} 
                className="w-full h-full"
                videoRef={videoRef || { current: null } as any}
            />
            <div className="absolute inset-0 pointer-events-none border border-red-600/20 rounded-[15px]" />
        </div>
    );
};

export default UniversalPlayer;

