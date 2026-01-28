
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season, DrmConfig, UserProfile } from './types';
import { LANGUAGES, TRANSLATIONS, MOCK_CONTENT } from './constants';
import { db, isConfigured } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
    const [currentLanguage] = useState('en');
    const translations = useMemo(() => TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'], [currentLanguage]);
    
    const t = useCallback((key: string): string => {
        const val = translations[key] || TRANSLATIONS['en'][key] || key;
        return typeof val === 'string' ? val : String(val);
    }, [translations]);

    return <LanguageContext.Provider value={{ currentLanguage, t }}>{children}</LanguageContext.Provider>;
};

// --- WATCHLIST CONTEXT ---
type WatchlistContextType = {
    watchlist: string[];
    isInWatchlist: (id: string) => boolean;
    addToWatchlist: (id: string) => void;
    removeFromWatchlist: (id: string) => void;
};
const WatchlistContext = createContext<WatchlistContextType>({
    watchlist: [],
    isInWatchlist: () => false,
    addToWatchlist: () => {},
    removeFromWatchlist: () => {},
});
export const useWatchlist = () => useContext(WatchlistContext);
export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const addToWatchlist = (id: string) => setWatchlist(prev => [...prev, id]);
    const removeFromWatchlist = (id: string) => setWatchlist(prev => prev.filter(i => i !== id));
    const isInWatchlist = (id: string) => watchlist.includes(id);
    return <WatchlistContext.Provider value={{ watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist }}>{children}</WatchlistContext.Provider>;
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
    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>({});
    const updateProgress = (id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => ({ ...prev, [id]: { currentTime, duration, lastWatched: Date.now() } }));
    };
    return <UserHistoryContext.Provider value={{ watchProgress, updateProgress }}>{children}</UserHistoryContext.Provider>;
};

// --- ICONS ---
const PlayIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const SettingsIcon = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59-.24 1.13.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>;

const VideoPlayer: React.FC<{ id: string; src: string; title: string; onClose: () => void }> = ({ id, src, title, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { updateProgress, watchProgress } = useUserHistory();

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onTime = () => { if(v.duration) updateProgress(id, v.currentTime, v.duration); };
        const onLoaded = () => { if (watchProgress[id]) v.currentTime = watchProgress[id].currentTime; };
        v.addEventListener('timeupdate', onTime);
        v.addEventListener('loadedmetadata', onLoaded);
        return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onLoaded); };
    }, [id]);

    return (
        <div className="fixed inset-0 bg-black z-[150] flex items-center justify-center">
            <video ref={videoRef} src={src} autoPlay controls className="w-full h-full max-h-screen" />
            <button onClick={onClose} className="absolute top-6 right-6 text-white bg-black/50 p-3 rounded-full hover:bg-red-600 transition-colors z-[160]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div className="absolute top-6 left-6 text-white font-bebas text-2xl z-[160]">{String(title)}</div>
        </div>
    );
};

const ContentCard: React.FC<{ item: Content; onPlay: () => void; progress?: number }> = ({ item, onPlay, progress }) => {
    return (
        <div className="group relative bg-[#181818] rounded-lg overflow-hidden transition-all hover:scale-110 hover:z-30 shadow-2xl border border-white/5">
            <div className="aspect-[2/3] relative">
                <img src={item.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all p-4 text-center">
                    <div onClick={onPlay} className="w-14 h-14 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center cursor-pointer mb-4 backdrop-blur-sm">
                        <PlayIcon className="w-8 h-8 text-white ml-1" />
                    </div>
                    <h4 className="text-white font-bold text-sm mb-2">{String(item.title)}</h4>
                </div>
                {progress !== undefined && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
};

type Page = 'home' | 'movies' | 'watchlist' | 'about';

const MainApp: React.FC = () => {
    const { currentProfile, logout, switchProfile, profiles } = useProfile();
    const { t } = useLanguage();
    const { watchProgress } = useUserHistory();
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [contentList, setContentList] = useState<Content[]>(MOCK_CONTENT);
    const [selectedVideo, setSelectedVideo] = useState<Content | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    
    // Secret logic to hide Admin button
    const [logoClicks, setLogoClicks] = useState(0);
    const [isAdminModeActive, setIsAdminModeActive] = useState(false);

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
        // Reset clicks after 2 seconds of inactivity
        setTimeout(() => setLogoClicks(0), 2000);
    };

    if (!currentProfile) {
        return (
            <div className="fixed inset-0 bg-[#141414] flex flex-col items-center justify-center p-6">
                <h1 className="text-5xl font-bebas text-white mb-16 tracking-widest uppercase text-center">¿Quién está viendo?</h1>
                <div className="flex gap-8">
                    {profiles.map(p => (
                        <div key={p.id} onClick={() => switchProfile(p.id)} className="group flex flex-col items-center space-y-6 cursor-pointer">
                            <div className="w-40 h-40 rounded bg-gray-800 border-4 border-transparent group-hover:border-white transition-all overflow-hidden shadow-2xl">
                                <img src={p.avatar} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-gray-400 group-hover:text-white text-2xl font-medium tracking-wide">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const featured = contentList.find(c => c.featured) || contentList[0];

    return (
        <div className="bg-[#141414] min-h-screen flex flex-col text-white">
            <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 to-transparent h-20 px-6 md:px-12 flex items-center justify-between transition-all">
                <div className="flex items-center space-x-12">
                    <h1 
                        onClick={() => { setCurrentPage('home'); handleLogoClick(); }} 
                        className={`text-4xl font-bebas tracking-wider cursor-pointer transition-all duration-300 select-none ${isAdminModeActive ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-110' : 'text-red-500 hover:scale-105'}`}
                    >
                        SEIKOYT
                    </h1>
                    <nav className="hidden md:flex space-x-8">
                        <button onClick={() => setCurrentPage('home')} className={`text-sm font-bold uppercase tracking-widest ${currentPage === 'home' ? 'text-white border-b-2 border-red-500' : 'text-gray-400 hover:text-white transition-colors'}`}>{t('home')}</button>
                        <button onClick={() => setCurrentPage('movies')} className={`text-sm font-bold uppercase tracking-widest ${currentPage === 'movies' ? 'text-white border-b-2 border-red-500' : 'text-gray-400 hover:text-white transition-colors'}`}>{t('movies')}</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-6">
                    {/* Admin button is only visible if the secret is unlocked AND profile is Admin */}
                    {isAdminModeActive && currentProfile.name === 'Admin' && (
                        <button 
                            onClick={() => setIsAdminOpen(true)} 
                            className="text-white bg-red-600/20 p-2 rounded-full border border-red-600/30 hover:bg-red-600/40 transition-all animate-pulse"
                            title="Panel de Administración Secreto"
                        >
                            <SettingsIcon className="w-6 h-6" />
                        </button>
                    )}
                    <img onClick={logout} src={currentProfile.avatar} className="w-10 h-10 rounded-lg cursor-pointer border-2 border-transparent hover:border-red-500 transition-all shadow-lg" title="Cerrar sesión" />
                </div>
            </header>

            <main className="flex-grow pt-20">
                {currentPage === 'home' && featured && (
                    <div className="relative h-[80vh] w-full mb-12 overflow-hidden">
                        <img src={featured.backdropUrl} className="w-full h-full object-cover animate-kenburns" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent" />
                        <div className="absolute bottom-24 left-6 md:left-12 max-w-2xl space-y-6">
                            <h2 className="text-5xl md:text-7xl font-bebas text-white drop-shadow-2xl tracking-wide">{String(featured.title)}</h2>
                            <p className="text-lg text-gray-200 line-clamp-3 drop-shadow-md">{String(featured.description)}</p>
                            <button onClick={() => setSelectedVideo(featured)} className="bg-white text-black px-10 py-4 rounded-lg font-bold flex items-center gap-4 hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl">
                                <PlayIcon className="w-6 h-6" /> {t('play')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-6 md:px-12 pb-20">
                    <h3 className="text-2xl md:text-3xl font-bebas text-white mb-8 tracking-widest uppercase border-l-4 border-red-500 pl-4">
                        {currentPage === 'watchlist' ? t('myList') : t('allMovies')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8">
                        {contentList.map(item => (
                            <ContentCard 
                                key={item.id} 
                                item={item} 
                                onPlay={() => setSelectedVideo(item)} 
                                progress={watchProgress[item.id] ? (watchProgress[item.id].currentTime / watchProgress[item.id].duration) * 100 : undefined} 
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer className="bg-black py-16 px-6 md:px-12 border-t border-white/5 text-center mt-auto">
                <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-6 leading-relaxed">
                    {t('aboutUsDescShort')}
                </p>
                <div className="text-gray-600 text-[10px] tracking-widest uppercase font-bold">{t('copyright')}</div>
            </footer>

            {selectedVideo && <VideoPlayer id={selectedVideo.id} src={selectedVideo.videoUrl || ''} title={selectedVideo.title} onClose={() => setSelectedVideo(null)} />}
            {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
        </div>
    );
};

const App: React.FC = () => (
    <ProfileProvider>
        <LanguageProvider>
            <WatchlistProvider>
                <UserHistoryProvider>
                    <MainApp />
                </UserHistoryProvider>
            </WatchlistProvider>
        </LanguageProvider>
    </ProfileProvider>
);

export default App;
