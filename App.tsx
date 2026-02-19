
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season, UserProfile } from './types';
import { LANGUAGES, TRANSLATIONS, MOCK_CONTENT, AUDIO_TRACKS, USER_LEVELS } from './constants';
import { db, isConfigured } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import AdminPanel from './AdminPanel';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    adsbygoogle: any;
    shaka: any;
  }
}

// --- HELPER & UTILITY ---
const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- PROFILE CONTEXT ---
type ProfileContextType = {
    currentProfile: UserProfile | null;
    profiles: UserProfile[];
    switchProfile: (profileId: string) => void;
    logout: () => void;
};

const ProfileContext = createContext<ProfileContextType>({
    currentProfile: null,
    profiles: [],
    switchProfile: () => {},
    logout: () => {},
});

export const useProfile = () => useContext(ProfileContext);

const DEFAULT_AVATARS = [
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png",
    "https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png"
];

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profiles] = useState<UserProfile[]>([{ id: '1', name: 'Admin', avatar: DEFAULT_AVATARS[0] }]);
    const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

    const currentProfile = useMemo(() => profiles.find(p => p.id === currentProfileId) || null, [profiles, currentProfileId]);
    const switchProfile = (id: string) => setCurrentProfileId(id);
    const logout = () => setCurrentProfileId(null);

    return <ProfileContext.Provider value={{ currentProfile, profiles, switchProfile, logout }}>{children}</ProfileContext.Provider>;
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
    totalWatchTime: number;
    updateProgress: (id: string, currentTime: number, duration: number) => void;
};
const UserHistoryContext = createContext<UserHistoryContextType>({
    watchProgress: {},
    totalWatchTime: 0,
    updateProgress: () => {},
});
export const useUserHistory = () => useContext(UserHistoryContext);
export const UserHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentProfile } = useProfile();
    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>({});
    const [totalWatchTime, setTotalWatchTime] = useState(0);

    useEffect(() => {
        if (!currentProfile) return;
        const timeKey = `seikoyt_total_time_${currentProfile.id}`;
        setTotalWatchTime(parseInt(localStorage.getItem(timeKey) || '0'));
    }, [currentProfile]);

    const updateProgress = (id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => {
            const prevProgress = prev[id];
            const delta = prevProgress ? Math.max(0, currentTime - prevProgress.currentTime) : 0;
            
            // Only add delta if it's reasonable (e.g. not a seek)
            if (delta > 0 && delta < 5) {
                setTotalWatchTime(t => {
                    const newTotal = t + delta;
                    if (currentProfile) {
                        localStorage.setItem(`seikoyt_total_time_${currentProfile.id}`, Math.floor(newTotal).toString());
                    }
                    return newTotal;
                });
            }

            return { ...prev, [id]: { currentTime, duration, lastWatched: Date.now() } };
        });
    };
    return <UserHistoryContext.Provider value={{ watchProgress, totalWatchTime, updateProgress }}>{children}</UserHistoryContext.Provider>;
};

// --- ICONS ---
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const NextIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;
const ListIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
const AudioIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const FireIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6 2.136 2.136 2.107 5.558 0 7.707a5.5 5.5 0 0 1-7.707 0z"/></svg>;

// --- STREAK CONTEXT ---
type StreakContextType = {
    streak: number;
};
const StreakContext = createContext<StreakContextType>({ streak: 0 });
export const useStreak = () => useContext(StreakContext);
export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentProfile } = useProfile();
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        if (!currentProfile) return;

        const streakKey = `seikoyt_streak_${currentProfile.id}`;
        const lastLoginKey = `seikoyt_last_login_${currentProfile.id}`;
        
        const storedStreak = parseInt(localStorage.getItem(streakKey) || '0');
        const storedLastLogin = localStorage.getItem(lastLoginKey);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (!storedLastLogin) {
            setStreak(1);
            localStorage.setItem(streakKey, '1');
            localStorage.setItem(lastLoginKey, todayStr);
        } else {
            const lastLoginDate = new Date(storedLastLogin);
            lastLoginDate.setHours(0, 0, 0, 0);
            
            const diffTime = today.getTime() - lastLoginDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                const newStreak = storedStreak + 1;
                setStreak(newStreak);
                localStorage.setItem(streakKey, newStreak.toString());
                localStorage.setItem(lastLoginKey, todayStr);
            } else if (diffDays > 1) {
                setStreak(1);
                localStorage.setItem(streakKey, '1');
                localStorage.setItem(lastLoginKey, todayStr);
            } else {
                setStreak(storedStreak);
            }
        }
    }, [currentProfile]);

    return <StreakContext.Provider value={{ streak }}>{children}</StreakContext.Provider>;
};

// --- REPRODUCTOR DINÁMICO DE SERIES ---
const VideoPlayer: React.FC<{ item: Content; onClose: () => void }> = ({ item, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { updateProgress, watchProgress } = useUserHistory();
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [currentEpIndex, setCurrentEpIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const [currentAudio, setCurrentAudio] = useState('es');
    const [loading, setLoading] = useState(true);
    const [lastTime, setLastTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    const isEmbed = processedUrl.includes('iframe') || processedUrl.includes('uqload.com') || processedUrl.includes('youtube.com');

    useEffect(() => {
        const v = videoRef.current;
        if (!v || isEmbed) return;
        
        const onTime = () => { 
            if(v.duration) {
                updateProgress(activeVideo.id, v.currentTime, v.duration);
                setLastTime(v.currentTime);
            }
        };
        const onLoaded = () => { 
            if (lastTime > 0) {
                v.currentTime = lastTime;
            } else if (watchProgress[activeVideo.id]) {
                v.currentTime = watchProgress[activeVideo.id].currentTime;
            }
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
            <div className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-8 z-10 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col">
                    <span className="text-red-500 font-bebas text-xl tracking-widest uppercase">Reproduciendo</span>
                    <h2 className="text-white font-bold text-lg md:text-2xl truncate max-w-md">
                        {item.title} {item.type === 'series' && episodes[currentEpIndex] ? ` - Cap. ${currentEpIndex + 1}: ${episodes[currentEpIndex].title}` : ''}
                    </h2>
                </div>
                <div className="flex gap-4">
                    {availableTracks.length > 1 && (
                        <div className="relative">
                            <button 
                                onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
                                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all flex items-center gap-2"
                                title="Idioma de Audio"
                            >
                                <AudioIcon className="w-6 h-6" />
                                <span className="text-xs font-bold hidden md:block uppercase tracking-tighter">
                                    {AUDIO_TRACKS.find(t => t.code === currentAudio)?.name || currentAudio}
                                </span>
                            </button>
                            
                            {isAudioMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-scale-in">
                                    {AUDIO_TRACKS.filter(t => availableTracks.includes(t.code)).map(track => (
                                        <button
                                            key={track.code}
                                            onClick={() => handleAudioChange(track.code)}
                                            className={`w-full text-left px-4 py-3 text-sm font-bold transition-all flex items-center justify-between ${currentAudio === track.code ? 'text-red-500 bg-red-500/10' : 'text-white hover:bg-white/5'}`}
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
                            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all"
                            title="Lista de Episodios"
                        >
                            <ListIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
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
                        className={`absolute bottom-24 right-8 bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-2xl z-20 group ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <span>SIGUIENTE CAPÍTULO</span>
                        <NextIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>

            {/* MENÚ DE EPISODIOS (Lateral deslizable) */}
            <div className={`absolute right-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 z-30 transition-transform duration-500 shadow-2xl p-6 overflow-y-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
            className="group relative aspect-[2/3] bg-gray-900 rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-110 hover:z-10 shadow-xl border border-white/5 hover:border-red-600/50"
        >
            <img 
                src={item.thumbnailUrl} 
                alt={item.title}
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-40"
            />
            
            {/* Overlay Info */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black via-black/40 to-transparent">
                <div className="flex flex-col gap-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                        {item.type === 'series' ? 'Serie' : 'Película'}
                    </span>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{item.releaseYear}</span>
                        <span className="text-[10px] px-1 border border-gray-600 text-gray-400 rounded uppercase">{item.rating}</span>
                    </div>
                </div>
            </div>

            {/* Play Button Center Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
    const { currentProfile, logout, switchProfile, profiles } = useProfile();
    const { streak } = useStreak();
    const { t } = useLanguage();
    const { watchProgress, totalWatchTime } = useUserHistory();

    const currentLevel = useMemo(() => {
        return [...USER_LEVELS].reverse().find(l => totalWatchTime >= l.minSeconds) || USER_LEVELS[0];
    }, [totalWatchTime]);
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [activeFilter, setActiveFilter] = useState<Filter>('all');
    const [contentList, setContentList] = useState<Content[]>(MOCK_CONTENT);
    const [selectedVideo, setSelectedVideo] = useState<Content | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isAdminModeActive, setIsAdminModeActive] = useState(false);
    const [logoClicks, setLogoClicks] = useState(0);

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

    if (!currentProfile) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 animate-fade-in">
                <h1 className="text-6xl font-bebas text-white mb-16 tracking-widest uppercase text-center border-b-2 border-red-600 pb-2">SeikoYT</h1>
                <div className="flex gap-12">
                    {profiles.map(p => (
                        <div key={p.id} onClick={() => switchProfile(p.id)} className="group flex flex-col items-center space-y-4 cursor-pointer">
                            <div className="w-44 h-44 rounded-2xl bg-gray-900 border-4 border-transparent group-hover:border-red-600 transition-all overflow-hidden shadow-2xl group-hover:scale-105 transform">
                                <img src={p.avatar} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-gray-400 group-hover:text-white text-3xl font-bebas tracking-widest transition-colors uppercase">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen flex flex-col text-white font-montserrat">
            <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent h-24 px-8 md:px-16 flex items-center justify-between transition-all backdrop-blur-sm">
                <div className="flex items-center gap-12">
                    <h1 
                        onClick={() => { setCurrentPage('home'); handleLogoClick(); }} 
                        className={`text-5xl font-bebas tracking-widest cursor-pointer transition-all duration-300 select-none ${isAdminModeActive ? 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]' : 'text-red-600'}`}
                    >
                        SEIKOYT
                    </h1>
                    <nav className="hidden md:flex gap-8">
                        {['home', 'movies', 'series'].map(p => (
                            <button 
                                key={p} 
                                onClick={() => setCurrentPage(p as Page)} 
                                className={`text-[12px] font-bold uppercase tracking-[0.3em] transition-all hover:text-red-500 ${currentPage === p ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`}
                            >
                                {p === 'home' ? 'Inicio' : p === 'movies' ? 'Películas' : 'Series'}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full shadow-xl group hover:border-red-600/30 transition-all">
                        <span className="text-xl">{currentLevel.icon}</span>
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-tighter leading-none ${currentLevel.color}`}>{currentLevel.name}</span>
                            <span className="text-[10px] text-gray-500 font-bold leading-none mt-0.5">{Math.floor(totalWatchTime / 60)} min vistos</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.1)] group hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all">
                        <FireIcon className="w-5 h-5 text-red-500 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter leading-none">Racha</span>
                            <span className="text-sm font-bold text-white leading-none">{streak} {streak === 1 ? 'Día' : 'Días'}</span>
                        </div>
                    </div>
                    {isAdminModeActive && currentProfile.name === 'Admin' && (
                        <button onClick={() => setIsAdminOpen(true)} className="text-white hover:text-red-500 transition-all">
                            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59-.24 1.13.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        </button>
                    )}
                    <img onClick={logout} src={currentProfile.avatar} className="w-12 h-12 rounded-xl cursor-pointer border-2 border-transparent hover:border-red-600 transition-all shadow-xl" />
                </div>
            </header>

            <main className="flex-grow">
                {currentPage === 'home' && featured && (
                    <div className="relative h-[90vh] w-full mb-16 overflow-hidden">
                        <img src={featured.backdropUrl} className="w-full h-full object-cover animate-kenburns opacity-70" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent" />
                        <div className="absolute bottom-32 left-8 md:left-24 max-w-3xl space-y-6 animate-fade-in-up">
                            <h2 className="text-7xl md:text-9xl font-bebas text-white drop-shadow-2xl leading-none">{featured.title}</h2>
                            <p className="text-lg md:text-xl text-gray-300 line-clamp-3 leading-relaxed drop-shadow-lg font-medium">{featured.description}</p>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setSelectedVideo(featured)} className="bg-white text-black px-12 py-5 rounded-xl font-bold flex items-center gap-3 hover:bg-red-600 hover:text-white transition-all transform active:scale-95 shadow-2xl text-lg uppercase tracking-widest">
                                    <PlayIcon className="w-7 h-7" /> {t('play')}
                                </button>
                                <button className="bg-gray-500/30 backdrop-blur-md text-white px-12 py-5 rounded-xl font-bold hover:bg-gray-500/50 transition-all text-lg uppercase tracking-widest border border-white/10">
                                    MÁS INFO
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-8 md:px-24 pb-24">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <h3 className="text-4xl font-bebas text-white tracking-[0.2em] uppercase border-l-8 border-red-600 pl-6">
                            {currentPage === 'movies' ? 'Todas las Películas' : currentPage === 'series' ? 'Series SeikoYT' : 'Nuestras Recomendaciones'}
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

            {selectedVideo && <VideoPlayer item={selectedVideo} onClose={() => setSelectedVideo(null)} />}
            {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
        </div>
    );
};

const App: React.FC = () => (
    <ProfileProvider>
        <StreakProvider>
            <LanguageProvider>
                <UserHistoryProvider>
                    <MainApp />
                </UserHistoryProvider>
            </LanguageProvider>
        </StreakProvider>
    </ProfileProvider>
);

export default App;
