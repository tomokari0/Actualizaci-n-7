
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season, UserProfile } from './types';
import { LANGUAGES, TRANSLATIONS, MOCK_CONTENT } from './constants';
import { db, isConfigured } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import AdminPanel from './AdminPanel';
import ContentUploadForm from './ContentUploadForm';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import ProfileEdit from './ProfileEdit';
import Footer from './src/components/Footer';
import SeikoMediaEngine from './src/components/SeikoMediaEngine';
import PosterImage from './src/components/PosterImage';
import ShakaPlayer from './src/components/ShakaPlayer';
import ProfileSelector from './ProfileSelector';
import AiAssistant from './src/components/AiAssistant';
import { useMemoryCleanup } from './src/hooks/useMemoryCleanup';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    shaka: any;
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    seikotv_current_time: number;
  }
}

// --- HELPER & UTILITY ---
const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- LANGUAGE CONTEXT ---
type LanguageContextType = {
    currentLanguage: string;
    t: (key: string) => string;
};
const LanguageContext = createContext<LanguageContextType>({
    currentLanguage: 'en',
    t: (key) => key,
});
export const useLanguage = () => useContext(LanguageContext);
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLanguage] = useState('es-419');
    const translations = useMemo(() => TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'], [currentLanguage]);
    
    const t = useCallback((key: string): string => {
        const val = translations[key] || TRANSLATIONS['en'][key] || key;
        return typeof val === 'string' ? val : String(val);
    }, [translations]);

    return <LanguageContext.Provider value={{ currentLanguage, t }}>{children}</LanguageContext.Provider>;
};

// --- HISTORY CONTEXT ---
type WatchProgress = { currentTime: number; duration: number; lastWatched: number; };
type UserHistoryContextType = {
    watchProgress: Record<string, WatchProgress>;
    updateProgress: (id: string, currentTime: number, duration: number) => void;
};
const UserHistoryContext = createContext<UserHistoryContextType>({
    watchProgress: {},
    updateProgress: () => {},
});
export const useUserHistory = () => useContext(UserHistoryContext);
export const UserHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile: currentProfile } = useAuth();
    const profileId = currentProfile?.id || 'global';
    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>({});

    useEffect(() => {
        const key = `seikotv_watch_progress_${profileId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setWatchProgress(JSON.parse(saved));
            } catch {
                setWatchProgress({});
            }
        } else {
            setWatchProgress({});
        }
    }, [profileId]);

    const updateProgress = (id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => {
            const next = { ...prev, [id]: { currentTime, duration, lastWatched: Date.now() } };
            const key = `seikotv_watch_progress_${profileId}`;
            localStorage.setItem(key, JSON.stringify(next));
            return next;
        });
    };
    return <UserHistoryContext.Provider value={{ watchProgress, updateProgress }}>{children}</UserHistoryContext.Provider>;
};

// --- ICONS ---
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const NextIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const ListIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const AudioIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const SearchIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const DownloadIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="9" x2="12" y2="15"/></svg>;
const VolumeIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const MuteIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const FullscreenIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
const ZoomInIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
const SpeedIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const RotateCcw = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const RotateCw = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>;

// --- HOOK DE DESCARGAS OFFLINE ---
const useOfflineDownloads = () => {
    const [downloadedUrls, setDownloadedUrls] = useState<string[]>([]);
    const [downloading, setDownloading] = useState<Record<string, number>>({});

    useEffect(() => {
        const checkDownloads = async () => {
            try {
                const cache = await caches.open('seikotv-downloads');
                const keys = await cache.keys();
                setDownloadedUrls(keys.map(req => req.url));
            } catch (e) {
                console.warn("Caches not available:", e);
            }
        };
        checkDownloads();
    }, []);

    const downloadVideo = async (url: string, metadata?: any) => {
        if (!url || downloading[url] !== undefined || downloadedUrls.includes(url)) return;
        
        setDownloading(prev => ({ ...prev, [url]: 0 }));
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch video for download");

            const reader = response.body?.getReader();
            const contentLength = +(response.headers.get('Content-Length') || 0);

            if (!reader) {
                const cache = await caches.open('seikotv-downloads');
                await cache.put(url, response.clone());
                setDownloadedUrls(prev => [...prev, url]);
                return;
            }

            let receivedLength = 0;
            const chunks = [];

            while(true) {
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                if (contentLength) {
                    setDownloading(prev => ({ ...prev, [url]: Math.round((receivedLength / contentLength) * 100) }));
                }
            }

            const blob = new Blob(chunks);
            const cache = await caches.open('seikotv-downloads');
            await cache.put(url, new Response(blob, {
                headers: response.headers
            }));
            
            setDownloadedUrls(prev => [...prev, url]);

            // Persistir metadata para modo offline
            if (metadata) {
                const savedMetadata = JSON.parse(localStorage.getItem('seikotv_downloads_metadata') || '{}');
                savedMetadata[url] = metadata;
                localStorage.setItem('seikotv_downloads_metadata', JSON.stringify(savedMetadata));
            }
            
            // Avisar sobre persistencia
            if (!localStorage.getItem('seikotv_persistence_warning_shown')) {
                alert("¡Descarga completa! Recuerda que si borras el caché de tu navegador, tus descargas desaparecerán.");
                localStorage.setItem('seikotv_persistence_warning_shown', 'true');
            }
        } catch (error) {
            console.error("Download error:", error);
            alert("La descarga falló. Verifique su espacio en disco o conexión.");
        } finally {
            setDownloading(prev => {
                const n = { ...prev };
                delete n[url];
                return n;
            });
        }
    };

    const removeDownload = async (url: string) => {
        const cache = await caches.open('seikotv-downloads');
        await cache.delete(url);
        setDownloadedUrls(prev => prev.filter(u => u !== url));
        
        const savedMetadata = JSON.parse(localStorage.getItem('seikotv_downloads_metadata') || '{}');
        delete savedMetadata[url];
        localStorage.setItem('seikotv_downloads_metadata', JSON.stringify(savedMetadata));
    };

    return { downloadedUrls, downloading, downloadVideo, removeDownload };
};

// --- FEEDBACK TOAST COMPONENT ---
const FeedbackToast: React.FC<{ 
    onClose: () => void; 
    userId: string;
}> = ({ onClose, userId }) => {
    const [submitted, setSubmitted] = useState(false);
    const [rating, setRating] = useState<number | null>(null);

    const options = [
        { emoji: '😠', label: 'Muy Mal', value: 1 },
        { emoji: '🙁', label: 'Mal', value: 2 },
        { emoji: '😐', label: 'Regular', value: 3 },
        { emoji: '🙂', label: 'Bien', value: 4 },
        { emoji: '😍', label: 'Excelente', value: 5 },
    ];

    const handleSubmit = async (val: number) => {
        setRating(val);
        try {
            await addDoc(collection(db, "feedback"), {
                userId,
                rating: val,
                timestamp: serverTimestamp(),
                date: new Date().toISOString()
            });
            setSubmitted(true);
            localStorage.setItem('seikotv_feedback_last_shown', Date.now().toString());
            setTimeout(onClose, 3000);
        } catch (error) {
            console.error("Error sending feedback:", error);
        }
    };

    const handleClose = () => {
        localStorage.setItem('seikotv_feedback_last_shown', Date.now().toString());
        onClose();
    };

    return (
        <div className="fixed bottom-6 right-6 z-[300] w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-6 animate-fade-in-up overflow-hidden">
            <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>

            {!submitted ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">¿Qué te parece SeikoTV?</h3>
                    <div className="flex justify-between gap-2">
                        {options.map((opt) => (
                            <button 
                                key={opt.value}
                                onClick={() => handleSubmit(opt.value)}
                                className="flex flex-col items-center gap-1 group"
                            >
                                <span className="text-3xl group-hover:scale-125 transition-transform duration-200">{opt.emoji}</span>
                                <span className="text-[8px] text-gray-500 group-hover:text-white uppercase font-bold">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 animate-scale-in">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <p className="text-white font-bold text-center">¡Gracias por tu opinión!</p>
                    <p className="text-gray-500 text-xs text-center">Nos ayuda a mejorar cada día.</p>
                </div>
            )}
        </div>
    );
};

// --- REPRODUCTOR DINÁMICO DE SERIES ---
const VideoPlayer: React.FC<{ 
    item: Content; 
    onClose: () => void;
    autoSkipIntro: boolean;
    setAutoSkipIntro: (val: boolean) => void;
    downloadedUrls: string[];
    downloadVideo: (url: string, metadata?: any) => void;
    downloading: Record<string, number>;
    removeDownload: (url: string) => void;
}> = ({ item, onClose, autoSkipIntro, setAutoSkipIntro, downloadedUrls, downloadVideo, downloading, removeDownload }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const ytContainerId = useMemo(() => `yt-player-${Math.random().toString(36).substr(2, 9)}`, []);
    
    const { updateProgress, watchProgress } = useUserHistory();
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [currentEpIndex, setCurrentEpIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [currentAudio, setCurrentAudio] = useState('en');
    const [loading, setLoading] = useState(true);
    const [lastTime, setLastTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [duration, setDuration] = useState(0);
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [showSkipNotification, setShowSkipNotification] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1);
    const hasAutoSkippedRef = useRef<string | null>(null);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showScreensaver, setShowScreensaver] = useState(false);
    const screensaverTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [activeTab, setActiveTab] = useState<'episodes' | 'cast' | 'info'>('episodes');
    const [cast, setCast] = useState<{ id: string; name: string; role: string; character?: string; avatar?: string; }[]>([]);
    const [loadingCast, setLoadingCast] = useState(false);

    // Default active tab based on item type
    useEffect(() => {
        if (item.type === 'movie') {
            setActiveTab('info');
        } else {
            setActiveTab('episodes');
        }
    }, [item.type]);

    // Fetch Cast & Crew from Firestore
    useEffect(() => {
        let isSubscribed = true;
        setLoadingCast(true);
        const fetchCast = async () => {
            try {
                const castRef = collection(db, "content", item.id, "cast");
                const querySnapshot = await getDocs(castRef);
                if (!isSubscribed) return;
                
                const castData: any[] = [];
                querySnapshot.forEach((doc) => {
                    castData.push({ id: doc.id, ...doc.data() });
                });
                setCast(castData);
            } catch (err) {
                console.error("Error fetching cast:", err);
            } finally {
                if (isSubscribed) setLoadingCast(false);
            }
        };

        fetchCast();
        return () => {
            isSubscribed = false;
        };
    }, [item.id]);

    const getPlaceholderCast = (title: string, type: 'movie' | 'series') => {
        return [
            {
                id: 'p1',
                name: 'Yuki Dobladora 🎙️',
                role: 'Voz Principal (Protagonista)',
                character: 'Yumi',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
            },
            {
                id: 'p2',
                name: 'Ken Gacha-Voice 🎙️',
                role: 'Voz Co-Estelar',
                character: 'Ren',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
            },
            {
                id: 'p3',
                name: 'Miyuki Chann ✨',
                role: 'Voz de Reparto',
                character: 'Ami',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
            },
            {
                id: 'p4',
                name: 'Seiko Creator 🎬',
                role: 'Director, Guionista y Animación Gacha',
                avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'
            },
            {
                id: 'p5',
                name: 'Sora Edits 💻',
                role: 'Edición y Efectos Visuales',
                avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200'
            }
        ];
    };

    const [showResumeToast, setShowResumeToast] = useState(false);
    const [resumeTime, setResumeTime] = useState(0);
    const lastActiveVideoIdRef = useRef<string | null>(null);

    const activeVideo = useMemo(() => {
        const getData = (data: any) => {
            let url = data.videoUrl || '';
            if (data.audioTracks && data.audioTracks[currentAudio]) {
                url = data.audioTracks[currentAudio];
            }
            
            // Auto-detection as a fallback
            let serverType = data.serverType;
            if (!serverType) {
                if (url.includes('streamtape.com')) serverType = 'streamtape';
                else if (url.includes('ucarecdn.com')) serverType = 'uploadcare';
                else serverType = 'uploadcare'; // Default
            }

            return { 
                url, 
                serverType: data.serverType || 'uploadcare',
                embedCode: data.embedCode
            };
        };

        if (item.type === 'movie') {
            const data = getData(item);
            return { ...data, id: item.id };
        }
        const ep = episodes[currentEpIndex];
        if (ep) {
            const data = getData(ep);
            return { ...data, id: `${item.id}_${ep.id}` };
        }
        return { url: '', serverType: 'uploadcare', id: '', embedCode: '' };
    }, [item, episodes, currentEpIndex, currentAudio]);

    // Track active video and prompt resume if watched before
    useEffect(() => {
        if (!activeVideo.id) return;
        if (lastActiveVideoIdRef.current !== activeVideo.id) {
            lastActiveVideoIdRef.current = activeVideo.id;
            const progress = watchProgress[activeVideo.id];
            if (progress && progress.currentTime > 10 && (progress.duration === 0 || progress.duration - progress.currentTime > 15)) {
                setResumeTime(progress.currentTime);
                setShowResumeToast(true);
                const timer = setTimeout(() => {
                    setShowResumeToast(false);
                }, 10000); // 10s auto-dismiss
                return () => clearTimeout(timer);
            } else {
                setShowResumeToast(false);
                setResumeTime(0);
            }
        }
    }, [activeVideo.id, watchProgress]);

    const handleResume = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = resumeTime;
        } else if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
            ytPlayerRef.current.seekTo(resumeTime, true);
        }
        setShowResumeToast(false);
    }, [resumeTime]);

    const handleRestart = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
        } else if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
            ytPlayerRef.current.seekTo(0, true);
        }
        updateProgress(activeVideo.id, 0, duration || 1);
        setShowResumeToast(false);
    }, [activeVideo.id, duration, updateProgress]);

    // Refs for outside click detection
    const audioMenuRef = useRef<HTMLDivElement>(null);
    const settingsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (audioMenuRef.current && !audioMenuRef.current.contains(event.target as Node)) {
                setIsAudioMenuOpen(false);
            }
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        };

        if (isAudioMenuOpen || isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAudioMenuOpen, isSettingsOpen]);

    // Detector de links de Uqload para conversión automática a Embed
    const processedUrl = useMemo(() => {
        const url = activeVideo.url;
        if (url.includes('uqload.com') && !url.includes('embed-')) {
            // Convierte https://uqload.com/xyz a https://uqload.com/embed-xyz.html
            const idMatch = url.match(/uqload\.com\/([a-zA-Z0-9]+)/);
            if (idMatch) return `https://uqload.com/embed-${idMatch[1]}.html`;
        }
        return url;
    }, [activeVideo.url]);

    // --- LÓGICA DE SKIP INTRO ---
    const skipIntroTime = useMemo(() => {
        const data = item.type === 'movie' ? item : episodes[currentEpIndex];
        return data?.skipIntro || 0;
    }, [item, episodes, currentEpIndex]);

    const handleSkipIntro = useCallback(() => {
        if (skipIntroTime > 0) {
            let skipped = false;
            if (videoRef.current) {
                videoRef.current.currentTime = skipIntroTime;
                skipped = true;
            } else if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
                ytPlayerRef.current.seekTo(skipIntroTime, true);
                skipped = true;
            }
            
            if (skipped) {
                setShowSkipButton(false);
                setShowSkipNotification(true);
                setTimeout(() => setShowSkipNotification(false), 3000);
                hasAutoSkippedRef.current = activeVideo.id;
            }
        }
    }, [skipIntroTime, activeVideo.id]);

    // Monitor de tiempo y skip automático
    useEffect(() => {
        const interval = setInterval(() => {
            let current = 0;
            let dur = 0;

            if (videoRef.current) {
                current = videoRef.current.currentTime;
                dur = videoRef.current.duration;
            } else if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                current = ytPlayerRef.current.getCurrentTime();
                dur = ytPlayerRef.current.getDuration();
            }

            if (current > 0) {
                setCurrentTime(current);
                setDuration(dur);
                (window as any).seikotv_current_time = current;

                // Lógica de botón Skip Intro
                if (skipIntroTime > 0 && current >= 2 && current < skipIntroTime) {
                    if (autoSkipIntro && hasAutoSkippedRef.current !== activeVideo.id) {
                        handleSkipIntro();
                    } else if (!autoSkipIntro) {
                        setShowSkipButton(true);
                    }
                } else {
                    setShowSkipButton(false);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [skipIntroTime, autoSkipIntro, handleSkipIntro]);

    // Inicialización de YouTube Player
    useEffect(() => {
        if (item.source === 'youtube' && item.youtubeId) {
            const initYT = () => {
                if ((window as any).YT && (window as any).YT.Player) {
                    ytPlayerRef.current = new (window as any).YT.Player(ytContainerId, {
                        videoId: item.youtubeId,
                        playerVars: {
                            autoplay: 1,
                            controls: 0,
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0,
                            enablejsapi: 1
                        },
                        events: {
                            onReady: (event: any) => {
                                event.target.playVideo();
                                if (lastTime > 0) {
                                    event.target.seekTo(lastTime, true);
                                } else if (watchProgress[activeVideo.id]) {
                                    const progress = watchProgress[activeVideo.id];
                                    const shouldPrompt = progress && progress.currentTime > 10 && (progress.duration === 0 || progress.duration - progress.currentTime > 15);
                                    if (!shouldPrompt) {
                                        event.target.seekTo(progress.currentTime, true);
                                    }
                                }
                            },
                            onStateChange: (event: any) => {
                                if (event.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
                                else if (event.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
                            }
                        }
                    });
                } else {
                    setTimeout(initYT, 500);
                }
            };
            initYT();
        }
        return () => {
            if (ytPlayerRef.current) {
                ytPlayerRef.current.destroy();
            }
        };
    }, [item.youtubeId, ytContainerId, activeVideo.id, lastTime, watchProgress]);

    const resetIdleTimer = useCallback(() => {
        setShowControls(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setShowControls(false);
            setIsAudioMenuOpen(false);
        }, 3000);
    }, []);

    const resetScreensaver = useCallback(() => {
        setShowScreensaver(false);
        if (screensaverTimerRef.current) {
            clearTimeout(screensaverTimerRef.current);
            screensaverTimerRef.current = null;
        }

        if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
            screensaverTimerRef.current = setTimeout(() => {
                setShowScreensaver(true);
            }, 5000);
        }
    }, [videoRef]);

    useEffect(() => {
        const handleActivity = () => {
            resetIdleTimer();
            resetScreensaver();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('mousedown', handleActivity);

        handleActivity();

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current);
        };
    }, [resetIdleTimer, resetScreensaver]);

    // 1. Lógica de Firebase: Consultar sub-colección de episodios
    useEffect(() => {
        if (item.type === 'series') {
            const fetchEpisodes = async () => {
                setLoading(true);
                try {
                    // Consultamos la sub-colección "episodes" del documento de la serie
                    const episodesRef = collection(db, "content", item.id, "episodes");
                    const q = query(episodesRef, orderBy("episodeNumber", "asc"));
                    const querySnapshot = await getDocs(q);
                    
                    const episodesData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Episode));

                    if (episodesData.length > 0) {
                        setEpisodes(episodesData);
                    } else if (item.seasons?.[0]?.episodes) {
                        // Fallback a mock data si no hay en Firebase
                        setEpisodes(item.seasons[0].episodes);
                    }
                } catch (error) {
                    console.error("Error fetching episodes:", error);
                    if (item.seasons?.[0]?.episodes) setEpisodes(item.seasons[0].episodes);
                } finally {
                    setLoading(false);
                }
            };
            fetchEpisodes();
        } else {
            setLoading(false);
        }
    }, [item]);

    const isEmbed = processedUrl.includes('iframe') || processedUrl.includes('uqload.com') || processedUrl.includes('youtube.com') || item.source === 'youtube';

    const playerContainerRef = useRef<HTMLDivElement>(null);

    const togglePlay = useCallback(() => {
        if (isEmbed) {
            if (ytPlayerRef.current) {
                const state = ytPlayerRef.current.getPlayerState();
                if (state === 1) ytPlayerRef.current.pauseVideo();
                else ytPlayerRef.current.playVideo();
            }
            return;
        }

        if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
        }
    }, [isEmbed]);

    const toggleMute = useCallback(() => {
        if (isEmbed) {
            if (ytPlayerRef.current) {
                if (ytPlayerRef.current.isMuted()) ytPlayerRef.current.unMute();
                else ytPlayerRef.current.mute();
                setIsMuted(ytPlayerRef.current.isMuted());
            }
            return;
        }

        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    }, [isEmbed]);

    const jump = useCallback((seconds: number) => {
        if (isEmbed) {
            if (ytPlayerRef.current) {
                const current = ytPlayerRef.current.getCurrentTime();
                ytPlayerRef.current.seekTo(current + seconds, true);
            }
            return;
        }

        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    }, [isEmbed]);

    const toggleFullscreen = useCallback(() => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showControls) setShowControls(true);
            resetIdleTimer();

            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'KeyM':
                    toggleMute();
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'ArrowRight':
                    jump(10);
                    break;
                case 'ArrowLeft':
                    jump(-10);
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleMute, toggleFullscreen, jump, showControls, resetIdleTimer]);

    const youtubeUrl = useMemo(() => {
        if (item.source === 'youtube' && item.youtubeId) {
            return `https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=0&enablejsapi=1`;
        }
        return null;
    }, [item]);

    useEffect(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.setPlaybackRate) {
            ytPlayerRef.current.setPlaybackRate(playbackSpeed);
        }
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v || isEmbed) return;
        
        const onTime = () => { 
            if(v.duration) {
                updateProgress(activeVideo.id, v.currentTime, v.duration);
                setLastTime(v.currentTime);
                setCurrentTime(v.currentTime);
                setDuration(v.duration);
            }
        };
        const onLoaded = () => { 
            if (lastTime > 0) {
                v.currentTime = lastTime;
            } else if (watchProgress[activeVideo.id]) {
                const progress = watchProgress[activeVideo.id];
                const shouldPrompt = progress && progress.currentTime > 10 && (progress.duration === 0 || progress.duration - progress.currentTime > 15);
                if (!shouldPrompt) {
                    v.currentTime = progress.currentTime;
                }
            }
            setDuration(v.duration);
        };
        
        const handlePlayEvent = () => {
            setIsPlaying(true);
            setShowScreensaver(false);
            if (screensaverTimerRef.current) {
                clearTimeout(screensaverTimerRef.current);
                screensaverTimerRef.current = null;
            }
        };

        const handlePauseEvent = () => {
            setIsPlaying(false);
            if (screensaverTimerRef.current) clearTimeout(screensaverTimerRef.current);
            screensaverTimerRef.current = setTimeout(() => {
                setShowScreensaver(true);
            }, 5000);
        };

        v.addEventListener('timeupdate', onTime);
        v.addEventListener('loadedmetadata', onLoaded);
        v.addEventListener('play', handlePlayEvent);
        v.addEventListener('pause', handlePauseEvent);
        v.addEventListener('loadedmetadata', () => {
            v.playbackRate = playbackSpeed;
        });
        v.addEventListener('volumechange', () => {
            setIsMuted(v.muted);
            setVolume(v.volume);
        });
        
        return () => { 
            v.removeEventListener('timeupdate', onTime); 
            v.removeEventListener('loadedmetadata', onLoaded); 
            v.removeEventListener('play', handlePlayEvent);
            v.removeEventListener('pause', handlePauseEvent);
        };
    }, [activeVideo.id, isEmbed, lastTime]);

    const handleNext = () => {
        if (currentEpIndex < episodes.length - 1) {
            setLastTime(0); // Reset time for next episode
            setCurrentEpIndex(prev => prev + 1);
        }
    };

    const handleMarkAsWatched = () => {
        // Mark as 100% watched
        updateProgress(activeVideo.id, duration || 100, duration || 100);
        onClose();
        // Trigger feedback when marking as watched
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('seikotv_trigger_feedback'));
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
        setCurrentTime(time);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const handleAudioChange = (lang: string) => {
        if (videoRef.current && !isEmbed) {
            setLastTime(videoRef.current.currentTime);
        }
        setCurrentAudio(lang);
        setIsAudioMenuOpen(false);
    };

    const availableTracks = useMemo(() => {
        const data = item.type === 'movie' ? item : episodes[currentEpIndex];
        if (!data || !data.audioTracks) return [];
        return Object.keys(data.audioTracks);
    }, [item, episodes, currentEpIndex]);

    return (
        <div ref={playerContainerRef} className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center animate-fade-in overflow-hidden cursor-none" style={{ cursor: showControls ? 'default' : 'none' }}>
            {/* Cabecera del reproductor */}
            <div className={`absolute top-0 inset-x-0 h-16 md:h-20 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-4 md:px-8 z-10 transition-all duration-700 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                <div className="flex flex-col min-w-0">
                    <span className="text-red-500 font-bebas text-sm md:text-xl tracking-widest uppercase">Reproduciendo</span>
                    <h2 className="text-white font-bold text-sm md:text-2xl truncate max-w-[150px] sm:max-w-md">
                        {item.title} {item.type === 'series' && episodes[currentEpIndex] ? ` - Cap. ${currentEpIndex + 1}: ${episodes[currentEpIndex].title}` : ''}
                    </h2>
                </div>
                    <div className="flex gap-2 md:gap-4">
                        <div ref={settingsMenuRef} className="relative">
                            <button 
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all"
                                title="Configuración"
                            >
                                <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            
                            {isSettingsOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 md:w-64 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-scale-in p-4 z-50">
                                    <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3">Ajustes del Reproductor</h4>
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <span className="text-xs font-bold text-white">Omitir intros automáticamente</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={autoSkipIntro}
                                                onChange={(e) => setAutoSkipIntro(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <SpeedIcon className="w-4 h-4 text-gray-500" />
                                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Velocidad</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[0.5, 1, 1.5, 2].map(speed => (
                                                <button
                                                    key={speed}
                                                    onClick={() => {
                                                        setPlaybackSpeed(speed);
                                                        if (videoRef.current) videoRef.current.playbackRate = speed;
                                                        if (ytPlayerRef.current) ytPlayerRef.current.setPlaybackRate(speed);
                                                    }}
                                                    className={`py-1 text-[10px] font-bold rounded-md transition-all ${playbackSpeed === speed ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ZoomInIcon className="w-4 h-4 text-gray-500" />
                                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Zoom</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 1.25, 1.5, 2].map(zoom => (
                                                <button
                                                    key={zoom}
                                                    onClick={() => setZoomLevel(zoom)}
                                                    className={`py-1 text-[10px] font-bold rounded-md transition-all ${zoomLevel === zoom ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                >
                                                    {zoom === 1 ? 'Reset' : zoom + 'x'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    <button 
                        onClick={handleMarkAsWatched}
                        className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-green-600/30 hidden sm:block"
                    >
                        Visto
                    </button>
                    {availableTracks.length > 1 && (
                        <div ref={audioMenuRef} className="relative">
                            <button 
                                onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all flex items-center gap-2"
                                title="Idioma de Audio"
                            >
                                <AudioIcon className="w-5 h-5 md:w-6 md:h-6" />
                                <span className="text-[10px] md:text-xs font-bold hidden md:block uppercase tracking-tighter">
                                    {LANGUAGES.find(t => t.code === currentAudio)?.name || currentAudio}
                                </span>
                            </button>
                            
                            {isAudioMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-40 md:w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-scale-in">
                                    {LANGUAGES.filter(t => availableTracks.includes(t.code)).map(track => (
                                        <button
                                            key={track.code}
                                            onClick={() => handleAudioChange(track.code)}
                                            className={`w-full text-left px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold transition-all flex items-center justify-between ${currentAudio === track.code ? 'text-red-500 bg-red-500/10' : 'text-white hover:bg-white/5'}`}
                                        >
                                            {track.name}
                                            {currentAudio === track.code && <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            setIsMenuOpen(!isMenuOpen);
                            if (!isMenuOpen) {
                                if (item.type === 'movie') {
                                    setActiveTab('info');
                                } else {
                                    setActiveTab('episodes');
                                }
                            }
                        }}
                        className={`bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all flex items-center justify-center ${isMenuOpen ? 'ring-2 ring-red-600' : ''}`}
                        title={item.type === 'series' ? "Episodios y Detalles" : "Información y Reparto"}
                    >
                        {item.type === 'series' ? <ListIcon className="w-5 h-5 md:w-6 md:h-6" /> : (
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        )}
                    </button>
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white p-2 md:p-3 rounded-full transition-all">
                        <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
            </div>

            {/* Contenedor de Video Dinámico */}
            <div 
                className="w-full h-full relative flex items-center justify-center transition-transform duration-300 ease-out origin-center overflow-hidden" 
                style={{ transform: `scale(${zoomLevel})` }}
            >
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bebas text-white tracking-widest">Cargando Episodios...</span>
                    </div>
                ) : youtubeUrl ? (
                    <div className="w-full h-full relative">
                        <div id={ytContainerId} className="w-full h-full" />
                        {/* Overlay to block YouTube interactions and show custom controls */}
                        <div className="absolute inset-0 pointer-events-none" />
                    </div>
                ) : (
                    <SeikoMediaEngine 
                        videoUrl={activeVideo.url} 
                        serverType={activeVideo.serverType as any}
                        embedCode={activeVideo.embedCode}
                        videoRef={videoRef}
                        title={item.title}
                    />
                )}

                {/* Botón Siguiente (Overlay al final o manual) */}
                {item.type === 'series' && currentEpIndex < episodes.length - 1 && (
                    <button 
                        onClick={handleNext}
                        className={`absolute bottom-24 md:bottom-32 right-4 md:right-8 bg-white text-black px-4 md:px-6 py-2 md:py-3 rounded-full font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all duration-700 ease-in-out shadow-2xl z-20 group ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    >
                        <span className="text-xs md:text-sm">SIGUIENTE</span>
                        <NextIcon className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}

                {/* Botón Omitir Intro */}
                {showSkipButton && (
                    <button 
                        onClick={handleSkipIntro}
                        className="absolute bottom-24 md:bottom-32 left-4 md:left-8 bg-black/80 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-black text-xs md:text-sm tracking-[0.2em] border-2 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-fade-in hover:scale-105 transition-all z-30 uppercase"
                    >
                        Omitir Intro
                    </button>
                )}

                {/* Notificación Intro Omitida */}
                {showSkipNotification && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase animate-slide-up z-40">
                        Intro omitida
                    </div>
                )}

                {/* Notificación para Reanudar o Reiniciar Reproducción */}
                {showResumeToast && (
                    <div className="absolute top-24 right-4 md:right-8 bg-[#0c0c0c]/95 backdrop-blur-md border border-[#ef4444]/40 rounded-xl p-4 md:p-5 shadow-[0_0_25px_rgba(239,68,68,0.25)] z-40 max-w-sm animate-fade-in flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500 shrink-0">
                                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-grow min-w-0">
                                <h4 className="text-white font-bebas text-lg tracking-wider uppercase">¿Continuar viendo?</h4>
                                <p className="text-xs text-gray-400 leading-relaxed font-semibold">
                                    Te quedaste en <span className="text-red-500 font-extrabold">{formatTime(resumeTime)}</span>. ¿Quieres reanudar desde ahí o reiniciar?
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowResumeToast(false)}
                                className="text-gray-500 hover:text-white transition-colors p-0.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex gap-2.5">
                            <button
                                onClick={handleResume}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-[1.02] active:scale-95"
                            >
                                Reanudar ({formatTime(resumeTime)})
                            </button>
                            <button
                                onClick={handleRestart}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border border-white/10 hover:border-white/25 active:scale-95"
                            >
                                Reiniciar
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Controls Bar */}
                <div className={`absolute bottom-0 inset-x-0 h-32 md:h-40 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end px-4 md:px-12 pb-6 md:pb-10 transition-all duration-700 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    {/* Progress Bar */}
                    <div className="group/progress relative h-1.5 md:h-2 mb-6 md:mb-8 flex items-center cursor-pointer">
                        <input 
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                        />
                        <div className="absolute inset-0 bg-white/20 rounded-full"></div>
                        <div 
                            className="absolute inset-y-0 left-0 bg-red-600 rounded-full shadow-[0_0_10px_#ef4444] transition-all duration-150"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-2xl scale-0 group-hover/progress:scale-100 transition-transform duration-200 z-10"
                            style={{ left: `${(currentTime / (duration || 1)) * 100}%`, marginLeft: '-10px' }}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4 md:gap-10">
                        <div className="flex items-center gap-4 md:gap-8 min-w-0">
                            <button onClick={togglePlay} className="text-white hover:text-red-500 transition-all p-1">
                                {isPlaying ? <PauseIcon className="w-8 h-8 md:w-10 md:h-10" /> : <PlayIcon className="w-8 h-8 md:w-10 md:h-10" />}
                            </button>

                            <div className="flex items-center gap-2 md:gap-4">
                                <button onClick={() => jump(-10)} className="text-gray-400 hover:text-white transition-all" title="Retroceder 10s">
                                    <RotateCcw className="w-6 h-6 md:w-8 md:h-8" />
                                </button>
                                <button onClick={() => jump(10)} className="text-gray-400 hover:text-white transition-all" title="Adelantar 10s">
                                    <RotateCw className="w-6 h-6 md:w-8 md:h-8" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-white font-mono text-xs md:text-lg font-bold drop-shadow-md">
                                    {formatTime(currentTime)}
                                </span>
                                <span className="text-gray-500 font-mono text-xs md:text-lg font-medium">/</span>
                                <span className="text-gray-400 font-mono text-xs md:text-lg font-medium">
                                    {formatTime(duration)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 md:gap-6">
                            <div className="flex items-center gap-2 group/volume">
                                <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-all">
                                    {isMuted || volume === 0 ? <MuteIcon className="w-6 h-6 md:w-8 md:h-8" /> : <VolumeIcon className="w-6 h-6 md:w-8 md:h-8" />}
                                </button>
                                <div className="w-0 overflow-hidden group-hover/volume:w-24 md:group-hover/volume:w-32 transition-all duration-300">
                                    <input 
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => {
                                            const v = parseFloat(e.target.value);
                                            setVolume(v);
                                            if (videoRef.current) videoRef.current.volume = v;
                                            if (ytPlayerRef.current) ytPlayerRef.current.setVolume(v * 100);
                                            setIsMuted(v === 0);
                                        }}
                                        className="w-full h-1 bg-white/20 rounded-full appearance-none accent-red-600 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {item.type === 'series' && currentEpIndex < episodes.length - 1 && (
                                <button 
                                    onClick={handleNext}
                                    className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 md:px-8 py-2 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-xl backdrop-blur-md"
                                >
                                    <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em]">Siguiente</span>
                                    <NextIcon className="w-4 h-4 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            
                            {youtubeUrl && (
                                <button 
                                    onClick={handleMarkAsWatched}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-2 md:py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-xl text-xs md:text-sm"
                                >
                                    Terminar
                                </button>
                            )}

                            <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition-all" title="Pantalla Completa">
                                <FullscreenIcon className="w-6 h-6 md:w-8 md:h-8" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Informative Screensaver Overlay */}
                {showScreensaver && (
                    <div className="absolute inset-0 z-[150] bg-black/95 flex items-center p-8 md:p-24 select-none animate-fade-in pointer-events-none transition-all duration-700">
                        {/* Neon aesthetic accents */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-black/40 to-transparent pointer-events-none" />

                        <div className="max-w-xl text-left space-y-4 md:space-y-6 z-10 p-4">
                            {/* Dynamic fade-in indicator */}
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                <span className="text-red-500 font-sans font-black text-[10px] md:text-xs uppercase tracking-[0.3em] block">
                                    Estás viendo...
                                </span>
                            </div>

                            {/* Title Logo (Required <img>) or elegant text fallback */}
                            <div className="flex items-center">
                                {((item.type === 'series' && episodes[currentEpIndex]?.titleLogoUrl) || item.titleLogoUrl) ? (
                                    <img 
                                        src={(item.type === 'series' && episodes[currentEpIndex]?.titleLogoUrl) || item.titleLogoUrl} 
                                        alt={item.title} 
                                        className="max-h-20 sm:max-h-24 md:max-h-32 object-contain filter drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-fade-in" 
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-wider font-sans border-b-2 border-red-600 pb-2 shadow-[0_0_25px_rgba(220,38,38,0.3)]">
                                        {item.title}
                                    </h1>
                                )}
                            </div>

                            {/* Metadatos (Año, Temporada, Episodio) */}
                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs md:text-sm font-bold text-gray-400 tracking-wider">
                                <span className="bg-white/10 px-2.5 py-0.5 rounded text-white text-[9px] md:text-xs">{item.releaseYear}</span>
                                <span>•</span>
                                {item.type === 'series' && episodes[currentEpIndex] ? (
                                    <>
                                        <span className="text-red-500">Temporada 1</span>
                                        <span>•</span>
                                        <span>Ep. {(episodes[currentEpIndex] as any).episodeNumber || (currentEpIndex + 1)}</span>
                                    </>
                                ) : (
                                    <span className="text-red-500 font-bold uppercase tracking-widest text-[9px] md:text-xs">Película</span>
                                )}
                                <span>•</span>
                                <span className="text-gray-500 uppercase tracking-widest text-[9px] md:text-xs font-sans">SeikoYT Premium</span>
                            </div>

                            {/* Sinopsis with subtle fade-out effect */}
                            <div className="relative">
                                <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-sans line-clamp-3 select-none">
                                    {(item.type === 'series' && episodes[currentEpIndex]?.description) || item.description}
                                </p>
                                {/* Linear-gradient overlay creating a blur/fade-out at the bottom of the description */}
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/0 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MENÚ DE DETALLES Y EPISODIOS (Lateral deslizable) */}
            <div className={`fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 z-[210] transition-transform duration-500 shadow-2xl p-6 overflow-y-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                    <h3 className="font-bebas text-2xl text-red-500 tracking-wider">
                        {item.type === 'series' ? 'Detalles & Episodios' : 'Detalles & Reparto'}
                    </h3>
                    <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>

                {/* Selector de pestañas */}
                <div className="flex border-b border-white/10 mb-6 select-none font-semibold text-xs">
                    {item.type === 'series' && (
                        <button 
                            onClick={() => setActiveTab('episodes')}
                            className={`flex-1 py-2 text-center tracking-wider uppercase transition-all border-b-2 font-black ${activeTab === 'episodes' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            Episodios
                        </button>
                    )}
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 py-2 text-center tracking-wider uppercase transition-all border-b-2 font-black ${activeTab === 'info' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Sinopsis
                    </button>
                    <button 
                        onClick={() => setActiveTab('cast')}
                        className={`flex-1 py-2 text-center tracking-wider uppercase transition-all border-b-2 font-black ${activeTab === 'cast' ? 'border-red-600 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Reparto
                    </button>
                </div>
                
                {/* Episodes List Tab */}
                {activeTab === 'episodes' && item.type === 'series' && (
                    <div className="space-y-4 animate-fade-in animate-duration-150">
                        {episodes.map((ep, idx) => {
                            const progress = watchProgress[`${item.id}_${ep.id}`];
                            const percent = progress ? (progress.currentTime / progress.duration) * 100 : 0;

                            return (
                                <div 
                                    key={`${ep.id}-${idx}`}
                                    onClick={() => { setCurrentEpIndex(idx); setIsMenuOpen(false); }}
                                    className={`group cursor-pointer p-3 rounded-lg border transition-all ${currentEpIndex === idx ? 'bg-red-600/20 border-red-600' : 'bg-white/5 border-transparent hover:border-white/20'}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="relative w-24 aspect-video flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                                            <img src={ep.thumbnailUrl || item.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            {currentEpIndex === idx && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-red-600/40">
                                                    <PlayIcon className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                            {/* Barra de progreso miniatura */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                <div className="h-full bg-red-500" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 flex-grow">
                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Capítulo {idx + 1}</span>
                                            <h4 className="text-sm font-bold text-white truncate">{ep.title}</h4>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500">{ep.duration}</span>
                                                {/* Download Button */}
                                                {ep.videoUrl && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (downloadedUrls.includes(ep.videoUrl)) {
                                                                removeDownload(ep.videoUrl);
                                                            } else {
                                                                downloadVideo(ep.videoUrl, {
                                                                    id: `${item.id}_${ep.id}`,
                                                                    title: `${item.title} - ${ep.title}`,
                                                                    thumbnailUrl: ep.thumbnailUrl || item.thumbnailUrl,
                                                                    type: 'episode',
                                                                    parentContent: item
                                                                });
                                                            }
                                                        }}
                                                        className="p-1 hover:bg-white/10 rounded-full transition-all relative"
                                                    >
                                                        {downloading[ep.videoUrl] !== undefined ? (
                                                            <div className="relative w-4 h-4">
                                                                <svg className="w-full h-full animate-spin text-red-500" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                {/* Neon effect */}
                                                                <div className="absolute inset-0 bg-red-500 blur-sm rounded-full opacity-50 animate-pulse"></div>
                                                            </div>
                                                        ) : downloadedUrls.includes(ep.videoUrl) ? (
                                                            <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                        ) : (
                                                            <DownloadIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info (Sinopsis) Tab */}
                {activeTab === 'info' && (
                    <div className="space-y-6 text-gray-300 animate-fade-in animate-duration-150">
                        <div className="relative aspect-video w-full bg-gray-900 rounded-lg overflow-hidden border border-white/5">
                            <img src={item.backdropUrl || item.thumbnailUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-base font-black text-white">{item.title}</h4>
                            <div className="flex flex-wrap gap-2 items-center text-[10px]">
                                <span className="bg-red-600/20 text-red-500 px-2 py-0.5 rounded border border-red-600/30 font-black uppercase tracking-wider">
                                    {item.type === 'series' ? 'Serie' : 'Película'}
                                </span>
                                <span className="text-gray-400 font-bold">{item.releaseYear}</span>
                                <span className="px-1.5 py-0.2 border border-gray-600 text-gray-400 rounded uppercase font-bold">{item.rating}</span>
                                {item.status && (
                                    <span className={`px-2 py-0.5 rounded font-bold ${item.status === 'ongoing' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'}`}>
                                        {item.status === 'ongoing' ? 'En emisión' : item.status === 'completed' ? 'Terminado' : 'Cancelado'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.genre.map((g, idx) => (
                                    <span key={idx} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2 py-0.5 rounded border border-white/5 text-[10px] transition-colors font-semibold">
                                        {g}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <div className="border-t border-white/10 pt-4 space-y-2">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">Sinopsis</span>
                            <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-semibold">
                                {item.description || "No hay una descripción disponible."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Cast (Reparto) Tab */}
                {activeTab === 'cast' && (
                    <div className="space-y-4 animate-fade-in animate-duration-150 text-gray-300">
                        {loadingCast ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs text-gray-400 font-bold">Cargando reparto...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Actores y Creadores</span>
                                    {cast.length > 0 ? (
                                        <span className="text-[9px] bg-red-600/10 text-red-500 px-1.5 py-0.5 rounded border border-red-600/20 font-black tracking-wider uppercase">Firestore</span>
                                    ) : (
                                        <span className="text-[9px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded border border-white/10 font-bold tracking-wider uppercase">Predeterminado</span>
                                    )}
                                </div>
                                
                                {(cast.length > 0 ? cast : getPlaceholderCast(item.title, item.type)).map((actor) => (
                                    <div key={actor.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-2.5 rounded-lg border border-transparent hover:border-white/5 transition-all">
                                        {actor.avatar ? (
                                            <img src={actor.avatar} alt={actor.name} className="w-10 h-10 rounded-full object-cover bg-gray-800 border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-red-700/20 border border-red-600/30 flex items-center justify-center text-red-500 font-black shrink-0 text-sm">
                                                {actor.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-grow">
                                            <h5 className="text-white text-xs font-black truncate">{actor.name}</h5>
                                            <p className="text-[10px] text-gray-400 truncate font-semibold">
                                                {actor.role}
                                                {actor.character && <span className="text-red-500 font-bold"> · {actor.character}</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- STATUS BADGE COMPONENT ---
const StatusBadge: React.FC<{ status?: 'ongoing' | 'completed' | 'cancelled' }> = ({ status }) => {
    if (!status) return null;

    const styles = {
        ongoing: "bg-[#39ff14]/80 text-black border-[#39ff14]", // Neon green
        completed: "bg-blue-900/80 text-white border-blue-500", // Dark blue
        cancelled: "bg-red-600/80 text-white border-red-500" // Red
    };

    const labels = {
        ongoing: "En emisión",
        completed: "Terminado",
        cancelled: "Cancelado"
    };

    return (
        <div className={`absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[8px] md:text-[10px] font-black uppercase tracking-widest border backdrop-blur-sm shadow-lg ${styles[status]}`}>
            {labels[status]}
        </div>
    );
};

// --- COMPONENTE DE TARJETA DE CONTENIDO ---
/**
 * FIX: Added missing ContentCard component to fix compilation error.
 * This component provides a Netflix-style hoverable card with progress tracking.
 */
const ContentCard: React.FC<{ 
    item: Content; 
    onPlay: () => void; 
    progress?: number; 
}> = ({ item, onPlay, progress }) => {
    return (
        <div 
            onClick={onPlay}
            className="group relative aspect-[2/3] bg-gray-900 rounded-lg md:rounded-xl overflow-hidden cursor-pointer transition-all duration-500 md:hover:scale-110 md:hover:z-10 shadow-xl border border-white/5 md:hover:border-red-600/50"
        >
            <StatusBadge status={item.status} />
            <PosterImage 
                src={item.thumbnailUrl} 
                alt={item.title}
                className="w-full h-full"
            />
            
            {/* Overlay Info (Desktop) */}
            <div className="absolute inset-0 flex flex-col justify-end p-2 md:p-4 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/40 to-transparent">
                <div className="flex flex-col gap-0.5 md:gap-1 translate-y-4 md:group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {item.type === 'series' ? 'Serie' : 'Película'}
                    </span>
                    <h4 className="text-xs md:text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] md:text-[10px] text-gray-400">{item.releaseYear}</span>
                        <span className="text-[8px] md:text-[10px] px-1 border border-gray-600 text-gray-400 rounded uppercase">{item.rating}</span>
                    </div>
                </div>
            </div>

            {/* Mobile Info (Always visible or subtle) */}
            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black to-transparent md:hidden">
                <h4 className="text-[10px] font-bold text-white truncate">{item.title}</h4>
            </div>

            {/* Play Button Center Overlay (Desktop) */}
            <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-red-600 rounded-full p-3 shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    <PlayIcon className="w-6 h-6 text-white" />
                </div>
            </div>

            {/* Progress Bar */}
            {progress !== undefined && progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
type Page = 'home' | 'movies' | 'series' | 'downloads' | 'comunidad';
type Filter = 'all' | 'recent' | 'popular' | 'following' | 'ongoing';

const MainApp: React.FC = () => {
    const { profile: currentProfile, isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const { watchProgress } = useUserHistory();
    const { downloadedUrls, downloading, downloadVideo, removeDownload } = useOfflineDownloads();

    const [currentPage, setCurrentPage] = useState<Page>('home');
    
    // RAM Cleanup on page change
    useMemoryCleanup(currentPage);
    const [activeFilter, setActiveFilter] = useState<Filter>('all');
    const [contentList, setContentList] = useState<Content[]>(MOCK_CONTENT);
    const [selectedVideo, setSelectedVideo] = useState<Content | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const [isAdminModeActive, setIsAdminModeActive] = useState(false);
    const [logoClicks, setLogoClicks] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Content[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    
    // Search history and input focus states
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    const [autoSkipIntro, setAutoSkipIntro] = useState(() => {
        return localStorage.getItem('seikotv_auto_skip_intro') === 'true';
    });

    const [activeProfile, setActiveProfile] = useState<UserProfile | null>(() => {
        const saved = sessionStorage.getItem('seikoyt_active_profile');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const handleProfileSelect = (profile: UserProfile) => {
        setActiveProfile(profile);
        sessionStorage.setItem('seikoyt_active_profile', JSON.stringify(profile));
    };

    const handleSwitchProfile = () => {
        setActiveProfile(null);
        sessionStorage.removeItem('seikoyt_active_profile');
    };

    // Load and sync Search History per Profile
    useEffect(() => {
        const key = `seikotv_search_history_${activeProfile?.id || 'global'}`;
        const saved = localStorage.getItem(key);
        try {
            setSearchHistory(saved ? JSON.parse(saved) : []);
        } catch {
            setSearchHistory([]);
        }
    }, [activeProfile]);

    const addToSearchHistory = useCallback((queryText: string) => {
        const trimmed = queryText.trim();
        if (!trimmed || trimmed.length < 2) return;
        setSearchHistory(prev => {
            const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, 5);
            const key = `seikotv_search_history_${activeProfile?.id || 'global'}`;
            localStorage.setItem(key, JSON.stringify(updated));
            return updated;
        });
    }, [activeProfile]);

    const deleteHistoryItem = useCallback((queryText: string) => {
        setSearchHistory(prev => {
            const updated = prev.filter(q => q !== queryText);
            const key = `seikotv_search_history_${activeProfile?.id || 'global'}`;
            localStorage.setItem(key, JSON.stringify(updated));
            return updated;
        });
    }, [activeProfile]);

    const clearSearchHistory = useCallback(() => {
        setSearchHistory([]);
        const key = `seikotv_search_history_${activeProfile?.id || 'global'}`;
        localStorage.removeItem(key);
    }, [activeProfile]);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    // Comunidad (Community) Feed Local States
    const [communityPosts, setCommunityPosts] = useState([
        {
            id: 1,
            authorName: 'Seiko Gacha Studio 🎬',
            authorAvatar: 'https://59m37zkauy.ucarecd.net/6449ac81-e76b-4b61-bddb-52b4d8f8a27f/AirbrushIMAGEENHANCER177165941446117716594144612.jpg',
            time: 'Hace 2 horas',
            content: '🔥 ¡NUEVO ESTRENO GACHA! Se viene el capitulo piloto de nuestra serie animada "La Leyenda del Prisma". ¿Quién está listo para el FanDub en español? Dejen sus expectativas y sugerencias de dobladores en los comentarios. 👇✨',
            image: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=500&auto=format&fit=crop&q=80',
            likes: 124,
            hasLiked: false,
            commentsCount: 32,
            category: 'Anuncio'
        },
        {
            id: 2,
            authorName: 'Yuki_Fandub24 🎙️',
            authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
            time: 'Hace 5 horas',
            content: '🎙️ ¡Hola a todos! He re-doblado el trailer de la película de Seiko Gacha con voz en español latino utilizando micrófonos profesionales. ¿Les gustaría que suba el detrás de escenas de cómo edito mis audios y masterizo en SeikoYT?',
            likes: 76,
            hasLiked: false,
            commentsCount: 15,
            category: 'FanDub'
        },
        {
            id: 3,
            authorName: 'Gacha_Creator_Pro 🌸',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            time: 'Hace 1 día',
            content: '🎨 Compartiendo algunos de estos hermosos fanart recolor de Seiko hechos en Clip Studio Paint. ¡Espero que les gusten mucho!',
            image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80',
            likes: 215,
            hasLiked: false,
            commentsCount: 43,
            category: 'FanArt'
        }
    ]);
    const [newPostText, setNewPostText] = useState('');
    const [communityFilter, setCommunityFilter] = useState('Todos');

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallButton(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallButton(false);
        }
        setDeferredPrompt(null);
    };

    const logout = () => {
        import('./firebaseConfig').then(({ auth }) => auth.signOut());
    };

    useEffect(() => {
        localStorage.setItem('seikotv_auto_skip_intro', autoSkipIntro.toString());
    }, [autoSkipIntro]);

    const triggerFeedback = useCallback(() => {
        const lastShown = localStorage.getItem('seikotv_feedback_last_shown');
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        if (!lastShown || (now - parseInt(lastShown)) > oneWeek) {
            setShowFeedback(true);
        }
    }, []);

    useEffect(() => {
        // Trigger feedback after 5 minutes (300,000 ms)
        const timer = setTimeout(triggerFeedback, 300000);
        return () => clearTimeout(timer);
    }, [triggerFeedback]);

    const performSearch = useCallback(async (queryText: string) => {
        if (!queryText.trim()) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        addToSearchHistory(queryText);
        try {
            const apiKey = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
            if (!apiKey) {
                console.warn("YouTube API Key not found in environment variables.");
                return;
            }

            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(queryText)}&type=video&key=${apiKey}`);
            const data = await response.json();
            
            if (data.items) {
                const results: Content[] = data.items.map((item: any) => ({
                    id: item.id.videoId,
                    source: 'youtube',
                    type: 'movie',
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnailUrl: item.snippet.thumbnails.high.url,
                    backdropUrl: item.snippet.thumbnails.high.url,
                    genre: ['YouTube'],
                    rating: 'G',
                    releaseYear: new Date(item.snippet.publishedAt).getFullYear(),
                    youtubeId: item.id.videoId
                }));
                setSearchResults(results);
                setCurrentPage('home');
            }
        } catch (error) {
            console.error("YouTube Search Error:", error);
        } finally {
            setIsSearching(false);
        }
    }, [addToSearchHistory]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(searchQuery);
    };

    useEffect(() => {
        if (!isConfigured) return;
        const q = query(collection(db, "content"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Content));
            setContentList([...data, ...MOCK_CONTENT.filter(m => !data.find(d => d.id === m.id))]);
        });
        return () => unsub();
    }, []);

    const handleLogoClick = () => {
        const nextClicks = logoClicks + 1;
        setLogoClicks(nextClicks);
        if (nextClicks === 5) {
            setIsAdminModeActive(true);
            setLogoClicks(0);
        }
        setTimeout(() => setLogoClicks(0), 2000);
    };

    useEffect(() => {
        const handleTrigger = () => triggerFeedback();
        window.addEventListener('seikotv_trigger_feedback', handleTrigger);
        return () => window.removeEventListener('seikotv_trigger_feedback', handleTrigger);
    }, [triggerFeedback]);

    const featured = contentList.find(c => c.featured) || contentList[0];
    
    const filteredContent = useMemo(() => {
        let list = [...contentList];

        // Page filtering
        if (currentPage === 'movies') list = list.filter(item => item.type === 'movie');
        if (currentPage === 'series') list = list.filter(item => item.type === 'series');

        // Tag filtering
        if (activeFilter === 'recent') {
            list = list.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
        } else if (activeFilter === 'popular') {
            // Mocking popularity with rating or just a different sort
            list = list.sort((a, b) => b.title.localeCompare(a.title));
        } else if (activeFilter === 'following') {
            list = list.filter(item => {
                const progressKey = item.type === 'movie' ? item.id : `${item.id}_${item.seasons?.[0]?.episodes?.[0]?.id || ''}`;
                return watchProgress[progressKey] !== undefined;
            });
        } else if (activeFilter === 'ongoing') {
            list = list.filter(item => item.status === 'ongoing');
        }

        return list;
    }, [contentList, currentPage, activeFilter, watchProgress]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!currentProfile) {
        return <Login />;
    }

    if (!activeProfile) {
        return <ProfileSelector onProfileSelect={handleProfileSelect} />;
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen flex flex-col text-white font-montserrat">
            <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent h-16 md:h-24 px-4 md:px-16 flex items-center justify-between transition-all backdrop-blur-sm">
                <div className="flex items-center gap-4 md:gap-12">
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden text-white p-2"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                    <h1 
                        onClick={() => { setCurrentPage('home'); handleLogoClick(); }} 
                        className={`text-3xl md:text-5xl font-bebas tracking-widest cursor-pointer transition-all duration-300 select-none ${isAdminModeActive ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'text-red-600'}`}
                    >
                        SEIKOTV
                    </h1>
                    <nav className="hidden md:flex gap-6 lg:gap-8">
                        {['home', 'movies', 'series', 'comunidad', 'downloads'].map(p => (
                            <button 
                                key={p} 
                                onClick={() => { setCurrentPage(p as Page); setSearchResults([]); }} 
                                className={`text-[11px] lg:text-[12px] font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em] transition-all hover:text-red-500 ${currentPage === p && searchResults.length === 0 ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
                            >
                                {p === 'home' ? 'Inicio' : p === 'movies' ? 'Películas' : p === 'series' ? 'Series' : p === 'comunidad' ? 'Comunidad' : 'Descargas'}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="flex-grow max-w-md mx-8 hidden lg:block relative">
                    <form onSubmit={handleSearch} className="relative group">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                            placeholder="Buscar en YouTube..."
                            className="w-full bg-white/5 border border-white/10 px-12 py-2.5 rounded-full text-sm focus:bg-white/10 focus:border-red-600 outline-none transition-all placeholder:text-gray-500"
                        />
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </form>

                    {/* Búsquedas Recientes Dropdown */}
                    {searchHistory.length > 0 && isSearchFocused && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c0c]/98 backdrop-blur-md border border-red-600/30 rounded-2xl p-4 shadow-[0_10px_35px_rgba(239,68,68,0.2)] z-[60] animate-fade-in space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-[10px] font-black tracking-widest text-[#ef4444] uppercase flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Búsquedas Recientes
                                </span>
                                <button 
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        clearSearchHistory();
                                    }}
                                    className="text-[9px] font-black text-gray-500 hover:text-red-500 uppercase tracking-wider transition-colors"
                                >
                                    Borrar Todo
                                </button>
                            </div>
                            <div className="flex flex-col gap-1">
                                {searchHistory.map((query, index) => (
                                    <div 
                                        key={index}
                                        className="flex justify-between items-center group/item hover:bg-white/5 rounded-lg px-2.5 py-1.5 transition-all duration-200"
                                    >
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(query);
                                                performSearch(query);
                                                setIsSearchFocused(false);
                                            }}
                                            className="flex-grow text-left text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2 font-medium"
                                        >
                                            {query}
                                        </button>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                deleteHistoryItem(query);
                                            }}
                                            className="opacity-0 group-hover/item:opacity-100 text-gray-500 hover:text-red-500 p-1 rounded-md hover:bg-white/5 transition-all duration-150"
                                            title="Eliminar de mi historial"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-6">
                    <button 
                        onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        className="lg:hidden text-white p-2"
                    >
                        <SearchIcon className="w-6 h-6" />
                    </button>

                    <button 
                        onClick={() => setIsUploadFormOpen(true)}
                        className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:border-red-600/50 transition-all group"
                    >
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Subir</span>
                    </button>
                    {isAdminModeActive && isAdmin && (
                        <button onClick={() => setIsAdminOpen(true)} className="text-white hover:text-red-500 transition-all">
                            <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59-.24 1.13.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        </button>
                    )}
                    {showInstallButton && (
                        <button 
                            onClick={handleInstallClick}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-2"
                        >
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span className="hidden sm:inline">Instalar App</span>
                            <span className="sm:hidden">Instalar</span>
                        </button>
                    )}
                    <div className="relative group">
                        <div className="flex items-center gap-2 cursor-pointer">
                            <img src={activeProfile.avatar} className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl border-2 border-transparent hover:border-red-600 transition-all shadow-xl" />
                            <span className="hidden sm:block text-xs font-bold text-gray-400 group-hover:text-white transition-colors">{activeProfile.name}</span>
                        </div>
                        <div className="absolute top-full right-0 mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all p-2 z-50">
                            <button onClick={handleSwitchProfile} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                Cambiar Perfil
                            </button>
                            <button onClick={() => setIsProfileEditOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 rounded-lg transition-colors">Ajustes de Cuenta</button>
                            <button onClick={logout} className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Cerrar Sesión</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Search Overlay */}
            <div className={`fixed inset-x-0 top-16 bg-black/95 z-[55] p-4 transition-all duration-300 lg:hidden ${isMobileSearchOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
                <form onSubmit={(e) => { handleSearch(e); setIsMobileSearchOpen(false); }} className="relative">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsMobileSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsMobileSearchFocused(false), 250)}
                        placeholder="Buscar en YouTube..."
                        className="w-full bg-white/10 border border-white/20 px-12 py-3 rounded-xl text-sm focus:border-red-600 outline-none transition-all"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </form>

                {/* Mobile Search History */}
                {searchHistory.length > 0 && isMobileSearchFocused && (
                    <div className="mt-4 bg-[#0c0c0c] border border-red-600/20 rounded-xl p-4 shadow-xl space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black tracking-widest text-[#ef4444] uppercase flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Búsquedas Recientes
                            </span>
                            <button 
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    clearSearchHistory();
                                }}
                                className="text-[9px] font-black text-gray-500 hover:text-red-500 uppercase tracking-wider transition-colors"
                            >
                                Borrar
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {searchHistory.map((query, index) => (
                                <div key={index} className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-red-600/30 hover:bg-white/10 rounded-full px-3 py-1.5 transition-all">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSearchQuery(query);
                                            performSearch(query);
                                            setIsMobileSearchOpen(false);
                                        }}
                                        className="text-xs text-gray-300 hover:text-white font-medium"
                                    >
                                        {query}
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            deleteHistoryItem(query);
                                        }}
                                        className="text-gray-500 hover:text-red-500 p-0.5 rounded-full hover:bg-white/5 transition-colors"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 bg-black/95 z-[60] transition-all duration-500 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col items-center justify-center h-full gap-8">
                    {['home', 'movies', 'series', 'comunidad', 'downloads'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => { setCurrentPage(p as Page); setIsMobileMenuOpen(false); setSearchResults([]); }} 
                            className={`text-4xl font-bebas tracking-[0.2em] transition-all ${currentPage === p ? 'text-red-500' : 'text-gray-400'}`}
                        >
                            {p === 'home' ? 'Inicio' : p === 'movies' ? 'Películas' : p === 'series' ? 'Series' : p === 'comunidad' ? 'Comunidad' : 'Descargas'}
                        </button>
                    ))}
                    <button 
                        onClick={() => { setIsUploadFormOpen(true); setIsMobileMenuOpen(false); }}
                        className="text-4xl font-bebas tracking-[0.2em] text-gray-400 hover:text-red-500 transition-all uppercase"
                    >
                        Subir
                    </button>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="mt-12 text-gray-500 uppercase font-bold tracking-widest text-sm">Cerrar</button>
                </div>
            </div>

            <main className="flex-grow">
                {currentPage === 'home' && featured && (
                    <div className="relative h-[70vh] md:h-[90vh] w-full mb-8 md:mb-16 overflow-hidden">
                        <img src={featured.backdropUrl} className="w-full h-full object-cover animate-kenburns opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent" />
                        <div className="absolute bottom-12 md:bottom-32 left-4 md:left-24 right-4 md:right-auto max-w-3xl space-y-4 md:space-y-6 animate-fade-in-up">
                            <h2 className="text-4xl md:text-9xl font-bebas text-white drop-shadow-2xl leading-none">{featured.title}</h2>
                            <p className="text-sm md:text-xl text-gray-300 line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-lg font-medium">{featured.description}</p>
                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4">
                                <button onClick={() => setSelectedVideo(featured)} className="bg-white text-black px-6 md:px-12 py-3 md:py-5 rounded-lg md:rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all transform active:scale-95 shadow-2xl text-sm md:text-lg uppercase tracking-widest">
                                    <PlayIcon className="w-5 h-5 md:w-7 md:h-7" /> {t('play')}
                                </button>
                                <button className="bg-gray-500/30 backdrop-blur-md text-white px-6 md:px-12 py-3 md:py-5 rounded-lg md:rounded-xl font-bold hover:bg-gray-500/50 transition-all text-sm md:text-lg uppercase tracking-widest border border-white/10">
                                    MÁS INFO
                                </button>
                                {/* Download button for featured movie */}
                                {featured.type === 'movie' && featured.videoUrl && (
                                    <button 
                                        onClick={() => downloadedUrls.includes(featured.videoUrl!) ? removeDownload(featured.videoUrl!) : downloadVideo(featured.videoUrl!, { ...featured, id: featured.id, type: 'movie' })}
                                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                    >
                                        {downloading[featured.videoUrl!] !== undefined ? (
                                            <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : downloadedUrls.includes(featured.videoUrl!) ? (
                                            <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        ) : (
                                            <DownloadIcon className="w-5 h-5" />
                                        )}
                                        <span className="text-xs font-bold uppercase tracking-widest">{downloadedUrls.includes(featured.videoUrl!) ? 'Descargado' : 'Descargar'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={`px-4 md:px-24 pb-24 ${currentPage !== 'home' ? 'pt-24 md:pt-32' : ''}`}>

                    {currentPage === 'downloads' ? (
                        <div className="animate-fade-in">
                            <h3 className="text-2xl md:text-5xl font-bebas text-white tracking-[0.2em] uppercase border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-6 mb-12">
                                Mis Descargas
                            </h3>
                            
                            {downloadedUrls.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <DownloadIcon className="w-16 h-16 text-gray-700 mb-4" />
                                    <p className="text-gray-500 text-xl font-medium">No tienes descargas aún.</p>
                                    <p className="text-gray-600 text-sm mt-2">Los videos que descargues aparecerán aquí para ver sin conexión.</p>
                                    <button onClick={() => setCurrentPage('home')} className="mt-8 bg-red-600 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-red-700 transition-all">Ver catálogo</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {downloadedUrls.map((url, idx) => {
                                        const metadata = JSON.parse(localStorage.getItem('seikotv_downloads_metadata') || '{}')[url];
                                        if (!metadata) return null;
                                        
                                        return (
                                            <div key={`${url}-${idx}`} className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-red-600/50 transition-all shadow-2xl">
                                                <div className="relative aspect-video">
                                                    <img src={metadata.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedVideo(metadata.type === 'episode' ? metadata.parentContent : metadata);
                                                        }}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <div className="bg-red-600 p-4 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                                                            <PlayIcon className="w-8 h-8 text-white" />
                                                        </div>
                                                    </button>
                                                </div>
                                                <div className="p-6">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="min-w-0">
                                                            <h4 className="text-white font-bold text-lg truncate">{metadata.title}</h4>
                                                            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Listo para ver offline</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => removeDownload(url)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                                            title="Eliminar descarga"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <div className="mt-12 p-6 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-start gap-4">
                                <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <div>
                                    <h5 className="text-white font-bold text-sm">Información sobre Descargas</h5>
                                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                        Las descargas ocupan espacio en tu dispositivo. La persistencia depende de tu navegador; si borras los datos del sitio o el historial, las descargas podrían eliminarse automáticamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : currentPage === 'comunidad' ? (
                        <div className="animate-fade-in space-y-8 max-w-4xl mx-auto pt-4">
                            <div className="flex items-center gap-3 border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-6 mb-8">
                                <h3 className="text-2xl md:text-5xl font-bebas text-white tracking-[0.2em] uppercase">
                                    Comunidad SeikoYT
                                </h3>
                                <span className="bg-red-600/20 text-red-500 border border-red-600/30 text-[10px] px-3 py-1 rounded-full uppercase font-black tracking-widest animate-pulse">
                                    Live Channel
                                </span>
                            </div>
                            
                            {/* Filter Bar */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {['Todos', 'Anuncios', 'FanDubs', 'FanArts', 'General'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCommunityFilter(cat)}
                                        className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                            (cat === 'Todos' && communityFilter === 'Todos') || 
                                            (cat === 'Anuncios' && communityFilter === 'Anuncio') ||
                                            (cat === 'FanDubs' && communityFilter === 'FanDub') ||
                                            (cat === 'FanArts' && communityFilter === 'FanArt') ||
                                            (cat === 'General' && communityFilter === 'General')
                                                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] border-transparent'
                                                : 'bg-[#121212]/50 border border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Create Post Block */}
                            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex gap-3 items-start">
                                    <img src={activeProfile?.avatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                    <textarea
                                        value={newPostText}
                                        onChange={(e) => setNewPostText(e.target.value)}
                                        placeholder="Comparte un comentario, FanDub, o edit de Gacha con la comunidad SeikoYT..."
                                        className="flex-grow bg-[#0c0c0c] border border-white/5 rounded-xl p-4 text-xs md:text-sm text-white focus:outline-none focus:border-red-600 focus:bg-[#121212] transition-all resize-none h-24 placeholder:text-gray-600"
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                                        Publicando como: <strong className="text-gray-300 font-bold">{activeProfile?.name}</strong>
                                    </span>
                                    <button 
                                        onClick={() => {
                                            if (!newPostText.trim()) return;
                                            const newPost = {
                                                id: Date.now(),
                                                authorName: activeProfile?.name || 'Seiko Gacha-Fan',
                                                authorAvatar: activeProfile?.avatar || 'https://59m37zkauy.ucarecd.net/6449ac81-e76b-4b61-bddb-52b4d8f8a27f/AirbrushIMAGEENHANCER177165941446117716594144612.jpg',
                                                time: 'Ahora mismo',
                                                content: newPostText,
                                                image: undefined,
                                                likes: 0,
                                                hasLiked: false,
                                                commentsCount: 0,
                                                category: 'General'
                                            };
                                            setCommunityPosts([newPost, ...communityPosts]);
                                            setNewPostText('');
                                        }}
                                        disabled={!newPostText.trim()}
                                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            newPostText.trim() 
                                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer' 
                                                : 'bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed'
                                        }`}
                                    >
                                        Publicar
                                    </button>
                                </div>
                            </div>

                            {/* Feed List with In-Feed Ad layout */}
                            <div className="space-y-6">
                                {communityPosts
                                    .filter(post => communityFilter === 'Todos' || post.category === communityFilter)
                                    .map((post, index) => (
                                        <React.Fragment key={post.id}>
                                            <div className="bg-[#121212]/50 border border-white/5 rounded-2xl p-6 hover:border-red-600/30 transition-all duration-300 shadow-xl space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <img src={post.authorAvatar} className="w-11 h-11 rounded-full object-cover border border-white/10" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-white text-sm">{post.authorName}</h4>
                                                                <span className="bg-red-600/10 text-red-500 border border-red-500/20 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">
                                                                    {post.category}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 font-medium">{post.time}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

                                                {post.image && (
                                                    <div className="rounded-xl overflow-hidden border border-white/10 aspect-video md:aspect-[21/9]">
                                                        <img src={post.image} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-gray-500">
                                                    <button 
                                                        onClick={() => {
                                                            setCommunityPosts(communityPosts.map(p => 
                                                                p.id === post.id 
                                                                    ? { ...p, likes: p.hasLiked ? p.likes - 1 : p.likes + 1, hasLiked: !p.hasLiked }
                                                                    : p
                                                            ));
                                                        }}
                                                        className={`flex items-center gap-2 text-xs font-bold transition-colors ${post.hasLiked ? 'text-red-500' : 'hover:text-white'}`}
                                                    >
                                                        <svg className={`w-5 h-5 ${post.hasLiked ? 'fill-current' : 'fill-none stroke-current'}`} strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                                        <span className="font-mono">{post.likes}</span>
                                                    </button>
                                                    <button className="flex items-center gap-2 text-xs font-bold hover:text-white transition-colors">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                                        <span className="font-mono">{post.commentsCount}</span>
                                                    </button>
                                                </div>
                                            </div>

                                        </React.Fragment>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {searchResults.length > 0 && (
                        <div className="mb-16 animate-fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <h3 className="text-2xl md:text-4xl font-bebas text-white tracking-[0.2em] uppercase border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-6">
                                    Resultados de YouTube
                                </h3>
                                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                                    {searchHistory.length > 0 && (
                                        <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1 rounded-full text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <span className="text-stone-500">Recientes:</span>
                                            <div className="flex gap-2">
                                                {searchHistory.slice(0, 3).map((q, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            setSearchQuery(q);
                                                            performSearch(q);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors uppercase text-[9px] hover:underline font-extrabold"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => { setSearchResults([]); setSearchQuery(''); }}
                                        className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-8">
                                {searchResults.map((item, idx) => (
                                    <ContentCard 
                                        key={`${item.id || 'search'}-${idx}`} 
                                        item={item} 
                                        onPlay={() => setSelectedVideo(item)} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
                        <h3 className="text-2xl md:text-4xl font-bebas text-white tracking-[0.2em] uppercase border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-6">
                            {currentPage === 'movies' ? 'Todas las Películas' : currentPage === 'series' ? 'Series SeikoTV' : 'Nuestras Recomendaciones'}
                        </h3>
                        
                        {/* Filtros Rápidos */}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'recent', label: 'Recientes' },
                                { id: 'popular', label: 'Más vistos' },
                                { id: 'following', label: 'Siguiendo' },
                                { id: 'ongoing', label: 'En emisión' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id as Filter)}
                                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${activeFilter === filter.id ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-8">
                        {filteredContent.map((item, idx) => {
                            // Si es serie, mostramos el progreso del primer capítulo como referencia general
                            const progressKey = item.type === 'movie' ? item.id : `${item.id}_${item.seasons?.[0]?.episodes?.[0]?.id || ''}`;
                            const progress = watchProgress[progressKey];
                            
                            return (
                                <ContentCard 
                                    key={`${item.id}-${idx}`} 
                                    item={item} 
                                    onPlay={() => setSelectedVideo(item)} 
                                    progress={progress ? (progress.currentTime / progress.duration) * 100 : undefined} 
                                />
                            );
                        })}
                    </div>
                        </>
                    )}
                </div>
            </main>

            <Footer onNavigate={(tab) => {
                const validPages: Page[] = ['home', 'movies', 'series', 'downloads', 'comunidad'];
                if (validPages.includes(tab as any)) {
                    setCurrentPage(tab as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }} />

            {selectedVideo && (
                <VideoPlayer 
                    item={selectedVideo} 
                    onClose={() => setSelectedVideo(null)} 
                    autoSkipIntro={autoSkipIntro}
                    setAutoSkipIntro={setAutoSkipIntro}
                    downloadedUrls={downloadedUrls}
                    downloadVideo={downloadVideo}
                    downloading={downloading}
                    removeDownload={removeDownload}
                />
            )}
            {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
            {isUploadFormOpen && <ContentUploadForm onClose={() => setIsUploadFormOpen(false)} />}
            {isProfileEditOpen && <ProfileEdit activeProfile={activeProfile} onClose={() => setIsProfileEditOpen(false)} />}
            {showFeedback && currentProfile && <FeedbackToast userId={currentProfile.id} onClose={() => setShowFeedback(false)} />}
            <AiAssistant />
        </div>
    );
};

const App: React.FC = () => (
    <AuthProvider>
        <LanguageProvider>
            <UserHistoryProvider>
                <MainApp />
            </UserHistoryProvider>
        </LanguageProvider>
    </AuthProvider>
);

export default App;
