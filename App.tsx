
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

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    adsbygoogle: any;
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
    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>({});

    const updateProgress = (id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => {
            return { ...prev, [id]: { currentTime, duration, lastWatched: Date.now() } };
        });
    };
    return <UserHistoryContext.Provider value={{ watchProgress, updateProgress }}>{children}</UserHistoryContext.Provider>;
};

// --- ICONS ---
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const NextIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const ListIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const AudioIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const SearchIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

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
}> = ({ item, onClose, autoSkipIntro, setAutoSkipIntro }) => {
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
    const [duration, setDuration] = useState(0);
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [showSkipNotification, setShowSkipNotification] = useState(false);
    const hasAutoSkippedRef = useRef<string | null>(null);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

    const activeVideo = useMemo(() => {
        const getUrl = (data: any) => {
            if (data.audioTracks && data.audioTracks[currentAudio]) {
                return data.audioTracks[currentAudio];
            }
            return data.videoUrl || '';
        };

        if (item.type === 'movie') return { url: getUrl(item), id: item.id };
        const ep = episodes[currentEpIndex];
        return ep ? { url: getUrl(ep), id: `${item.id}_${ep.id}` } : { url: '', id: '' };
    }, [item, episodes, currentEpIndex, currentAudio]);

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
                                    event.target.seekTo(watchProgress[activeVideo.id].currentTime, true);
                                }
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

    useEffect(() => {
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('touchstart', resetIdleTimer);
        resetIdleTimer();
        return () => {
            window.removeEventListener('mousemove', resetIdleTimer);
            window.removeEventListener('touchstart', resetIdleTimer);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

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

    const youtubeUrl = useMemo(() => {
        if (item.source === 'youtube' && item.youtubeId) {
            return `https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=0&enablejsapi=1`;
        }
        return null;
    }, [item]);

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
                v.currentTime = watchProgress[activeVideo.id].currentTime;
            }
            setDuration(v.duration);
        };
        
        v.addEventListener('timeupdate', onTime);
        v.addEventListener('loadedmetadata', onLoaded);
        return () => { 
            v.removeEventListener('timeupdate', onTime); 
            v.removeEventListener('loadedmetadata', onLoaded); 
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
        <div className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center animate-fade-in overflow-hidden cursor-none" style={{ cursor: showControls ? 'default' : 'none' }}>
            {/* Cabecera del reproductor */}
            <div className={`absolute top-0 inset-x-0 h-16 md:h-20 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-4 md:px-8 z-10 transition-all duration-700 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                <div className="flex flex-col min-w-0">
                    <span className="text-red-500 font-bebas text-sm md:text-xl tracking-widest uppercase">Reproduciendo</span>
                    <h2 className="text-white font-bold text-sm md:text-2xl truncate max-w-[150px] sm:max-w-md">
                        {item.title} {item.type === 'series' && episodes[currentEpIndex] ? ` - Cap. ${currentEpIndex + 1}: ${episodes[currentEpIndex].title}` : ''}
                    </h2>
                </div>
                <div className="flex gap-2 md:gap-4">
                    <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all relative"
                        title="Configuración"
                    >
                        <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        
                        {isSettingsOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 md:w-64 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-scale-in p-4 z-50">
                                <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3">Ajustes del Reproductor</h4>
                                <div className="flex items-center justify-between gap-3">
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
                            </div>
                        )}
                    </button>

                    <button 
                        onClick={handleMarkAsWatched}
                        className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border border-green-600/30 hidden sm:block"
                    >
                        Visto
                    </button>
                    {availableTracks.length > 1 && (
                        <div className="relative">
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
                    {item.type === 'series' && (
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full transition-all"
                            title="Lista de Episodios"
                        >
                            <ListIcon className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    )}
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white p-2 md:p-3 rounded-full transition-all">
                        <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
            </div>

            {/* Contenedor de Video Dinámico */}
            <div className="w-full h-full relative flex items-center justify-center">
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
                ) : isEmbed ? (
                    <iframe 
                        src={processedUrl} 
                        className="w-full h-full" 
                        allowFullScreen 
                        frameBorder="0"
                        allow="autoplay; fullscreen"
                    />
                ) : (
                    <video 
                        ref={videoRef} 
                        src={activeVideo.url} 
                        autoPlay 
                        controls 
                        className="w-full h-full object-contain"
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

                {/* Barra de Progreso Manual (Solo para Video Nativo por ahora, YouTube requiere API compleja) */}
                {!youtubeUrl && !isEmbed && (
                    <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent transition-all duration-700 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-gray-400 w-12">{formatTime(currentTime)}</span>
                            <input 
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="flex-grow video-progress"
                            />
                            <span className="text-[10px] font-bold text-gray-400 w-12">{formatTime(duration)}</span>
                        </div>
                    </div>
                )}
                
                {/* Overlay para YouTube que permite ver controles pero bloquea clics directos si se desea */}
                {youtubeUrl && (
                    <div className={`absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent transition-all duration-700 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                         <div className="flex justify-center">
                            <button 
                                onClick={handleMarkAsWatched}
                                className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-2xl"
                            >
                                Marcar como Terminado
                            </button>
                         </div>
                    </div>
                )}
            </div>

            {/* MENÚ DE EPISODIOS (Lateral deslizable) */}
            <div className={`fixed right-0 top-0 bottom-0 w-full sm:w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 z-[210] transition-transform duration-500 shadow-2xl p-6 overflow-y-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <h3 className="font-bebas text-2xl text-red-500 tracking-wider">Episodios</h3>
                    <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div className="space-y-4">
                    {episodes.map((ep, idx) => {
                        const progress = watchProgress[`${item.id}_${ep.id}`];
                        const percent = progress ? (progress.currentTime / progress.duration) * 100 : 0;

                        return (
                            <div 
                                key={ep.id}
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
                                    <div className="flex flex-col justify-center min-w-0">
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Capítulo {idx + 1}</span>
                                        <h4 className="text-sm font-bold text-white truncate">{ep.title}</h4>
                                        <span className="text-[10px] text-gray-500">{ep.duration}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
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
            <img 
                src={item.thumbnailUrl} 
                alt={item.title}
                className="w-full h-full object-cover transition-opacity duration-300 md:group-hover:opacity-40"
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
type Page = 'home' | 'movies' | 'series';
type Filter = 'all' | 'recent' | 'popular' | 'following';

const MainApp: React.FC = () => {
    const { profile: currentProfile, isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const { watchProgress } = useUserHistory();

    const [currentPage, setCurrentPage] = useState<Page>('home');
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
    const [autoSkipIntro, setAutoSkipIntro] = useState(() => {
        return localStorage.getItem('seikotv_auto_skip_intro') === 'true';
    });

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
    }, []);

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
                    <nav className="hidden md:flex gap-8">
                        {['home', 'movies', 'series'].map(p => (
                            <button 
                                key={p} 
                                onClick={() => { setCurrentPage(p as Page); setSearchResults([]); }} 
                                className={`text-[12px] font-bold uppercase tracking-[0.3em] transition-all hover:text-red-500 ${currentPage === p && searchResults.length === 0 ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
                            >
                                {p === 'home' ? 'Inicio' : p === 'movies' ? 'Películas' : 'Series'}
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="flex-grow max-w-md mx-8 hidden lg:block">
                    <form onSubmit={handleSearch} className="relative group">
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                    <div className="relative group">
                        <img src={currentProfile.avatar} className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl cursor-pointer border-2 border-transparent hover:border-red-600 transition-all shadow-xl" />
                        <div className="absolute top-full right-0 mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all p-2 z-50">
                            <button onClick={() => setIsProfileEditOpen(true)} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 rounded-lg transition-colors">Editar Perfil</button>
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
                        placeholder="Buscar en YouTube..."
                        className="w-full bg-white/10 border border-white/20 px-12 py-3 rounded-xl text-sm focus:border-red-600 outline-none transition-all"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </form>
            </div>

            {/* Mobile Menu Overlay */}
            <div className={`fixed inset-0 bg-black/95 z-[60] transition-all duration-500 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col items-center justify-center h-full gap-8">
                    {['home', 'movies', 'series'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => { setCurrentPage(p as Page); setIsMobileMenuOpen(false); }} 
                            className={`text-4xl font-bebas tracking-[0.2em] transition-all ${currentPage === p ? 'text-red-500' : 'text-gray-400'}`}
                        >
                            {p === 'home' ? 'Inicio' : p === 'movies' ? 'Películas' : 'Series'}
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
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-4 md:px-24 pb-24">
                    {searchResults.length > 0 && (
                        <div className="mb-16 animate-fade-in">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl md:text-4xl font-bebas text-white tracking-[0.2em] uppercase border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-6">
                                    Resultados de YouTube
                                </h3>
                                <button 
                                    onClick={() => setSearchResults([])}
                                    className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest"
                                >
                                    Limpiar
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-8">
                                {searchResults.map(item => (
                                    <ContentCard 
                                        key={item.id} 
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
                                { id: 'following', label: 'Siguiendo' }
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
                        {filteredContent.map(item => {
                            // Si es serie, mostramos el progreso del primer capítulo como referencia general
                            const progressKey = item.type === 'movie' ? item.id : `${item.id}_${item.seasons?.[0]?.episodes?.[0]?.id || ''}`;
                            const progress = watchProgress[progressKey];
                            
                            return (
                                <ContentCard 
                                    key={item.id} 
                                    item={item} 
                                    onPlay={() => setSelectedVideo(item)} 
                                    progress={progress ? (progress.currentTime / progress.duration) * 100 : undefined} 
                                />
                            );
                        })}
                    </div>
                </div>
            </main>

            {selectedVideo && (
                <VideoPlayer 
                    item={selectedVideo} 
                    onClose={() => setSelectedVideo(null)} 
                    autoSkipIntro={autoSkipIntro}
                    setAutoSkipIntro={setAutoSkipIntro}
                />
            )}
            {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
            {isUploadFormOpen && <ContentUploadForm onClose={() => setIsUploadFormOpen(false)} />}
            {isProfileEditOpen && <ProfileEdit onClose={() => setIsProfileEditOpen(false)} />}
            {showFeedback && currentProfile && <FeedbackToast userId={currentProfile.id} onClose={() => setShowFeedback(false)} />}
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
