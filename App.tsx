
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode } from './types';
import { MOCK_CONTENT, LANGUAGES, TRANSLATIONS } from './constants';

// FIX: Define custom element as a component variable to bypass strict IntrinsicElements type checking.
const HyvorTalkComments = 'hyvor-talk-comments' as unknown as React.ComponentType<any>;

// FIX: Declare global interface for Jitsi API to avoid TypeScript errors
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    adsbygoogle: any;
  }
}

// --- HELPER & UTILITY ---

const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// --- ADSENSE COMPONENT ---

const AdUnit: React.FC<{ slot: string; format?: 'auto' | 'fluid' | 'rectangle'; className?: string }> = ({ slot, format = 'auto', className = '' }) => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error:", e);
        }
    }, []);

    return (
        <div className={`my-8 flex justify-center w-full overflow-hidden min-h-[90px] bg-white/5 rounded-lg items-center text-gray-600 text-xs ${className}`}>
            <ins className="adsbygoogle"
                 style={{ display: 'block', width: '100%' }}
                 data-ad-client="ca-pub-8922860413075053"
                 data-ad-slot={slot}
                 data-ad-format={format}
                 data-full-width-responsive="true"></ins>
            <div className="absolute pointer-events-none opacity-20">Advertisement</div>
        </div>
    );
};

// --- LANGUAGE CONTEXT ---

type LanguageContextType = {
    currentLanguage: string;
    setLanguage: (lang: string) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
    currentLanguage: 'en',
    setLanguage: () => {},
    t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState('en');
    const translations = useMemo(() => TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'], [currentLanguage]);
    const t = useCallback((key: string) => translations[key] || TRANSLATIONS['en'][key] || key, [translations]);

    useEffect(() => {
        document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
    }, [currentLanguage]);

    const value = useMemo(() => ({ currentLanguage, setLanguage: setCurrentLanguage, t }), [currentLanguage, t]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// --- WATCHLIST CONTEXT ---

type WatchlistContextType = {
    watchlist: string[];
    addToWatchlist: (id: string) => void;
    removeFromWatchlist: (id: string) => void;
    isInWatchlist: (id: string) => boolean;
};

const WatchlistContext = createContext<WatchlistContextType>({
    watchlist: [],
    addToWatchlist: () => {},
    removeFromWatchlist: () => {},
    isInWatchlist: () => false,
});

export const useWatchlist = () => useContext(WatchlistContext);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [watchlist, setWatchlist] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('seikoyt_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const addToWatchlist = useCallback((id: string) => setWatchlist(prev => prev.includes(id) ? prev : [...prev, id]), []);
    const removeFromWatchlist = useCallback((id: string) => setWatchlist(prev => prev.filter(itemId => itemId !== id)), []);
    const isInWatchlist = useCallback((id: string) => watchlist.includes(id), [watchlist]);

    const value = useMemo(() => ({ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }), [watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist]);
    return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

// --- USER HISTORY CONTEXT ---

type WatchProgress = {
    currentTime: number;
    duration: number;
    lastWatched: number;
};

type UserHistoryContextType = {
    history: string[];
    watchProgress: Record<string, WatchProgress>;
    addToHistory: (id: string) => void;
    updateProgress: (id: string, currentTime: number, duration: number) => void;
};

const UserHistoryContext = createContext<UserHistoryContextType>({
    history: [],
    watchProgress: {},
    addToHistory: () => {},
    updateProgress: () => {},
});

export const useUserHistory = () => useContext(UserHistoryContext);

export const UserHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_watch_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_watch_progress');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });

    useEffect(() => { localStorage.setItem('seikoyt_watch_history', JSON.stringify(history)); }, [history]);
    useEffect(() => { localStorage.setItem('seikoyt_watch_progress', JSON.stringify(watchProgress)); }, [watchProgress]);

    const addToHistory = useCallback((id: string) => {
        setHistory(prev => [...prev.filter(itemId => itemId !== id), id]);
    }, []);

    const updateProgress = useCallback((id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => ({
            ...prev,
            [id]: { currentTime, duration, lastWatched: Date.now() }
        }));
    }, []);

    const value = useMemo(() => ({ history, watchProgress, addToHistory, updateProgress }), [history, watchProgress, addToHistory, updateProgress]);
    return <UserHistoryContext.Provider value={value}>{children}</UserHistoryContext.Provider>;
};

// --- ICONS ---
const PlayIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
));
const PauseIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
));
const VolumeUpIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
));
const VolumeOffIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
));
const SubtitlesIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"></path></svg>
));
const FullscreenIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>
));
const InfoIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
));
const CloseIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
));
const HeartIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
));
const SettingsIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59-.24 1.13.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>
));
const MinimizeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"></path></svg>
));
const ExpandIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"></path></svg>
));
const SearchIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
));
const GlobeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
));
const PhoneIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1.01A11.36 11.36 0 0 1 8.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 17 17 0 0 0 17 17c.55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
));

// FIX: Add missing social icons.
const YouTubeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
));
const InstagramIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.303.06-2.192.267-2.97.568-.804.312-1.486.732-2.165 1.411-.679.679-1.099 1.361-1.411 2.165-.301.778-.508 1.667-.568 2.97-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.06 1.303.267 2.192.568 2.97.312.804.732 1.486 1.411 2.165.679.679 1.361 1.099 2.165 1.411.778-.301 1.667-.508-2.97-.568-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.441s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.441-1.441-1.441z"/></svg>
));
const TikTokIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a6.34 6.34 0 0 1-2.33-2.23v11.16c.01 1.48-.44 2.96-1.3 4.21-.86 1.25-2.1 2.2-3.53 2.72-1.43.52-3 .64-4.5.35a8.1 8.1 0 0 1-3.76-1.61c-1.11-.89-1.99-2.06-2.55-3.38-.56-1.33-.76-2.79-.58-4.24.18-1.45.76-2.84 1.67-3.99.91-1.15 2.14-2.01 3.53-2.48 1.4-.47 2.9-.55 4.34-.23v4.08c-.83-.19-1.7-.19-2.5-.01-1.03.22-1.94.86-2.52 1.72-.58.86-.78 1.9-.55 2.92.23 1.02.87 1.9 1.77 2.45.9.55 1.97.71 2.98.45.91-.23 1.71-.84 2.24-1.64.4-.6.62-1.3.62-2.01V.02z"/></svg>
));
const DiscordIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.125-.094.252-.192.37-.29a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .077.01c.118.098.245.196.37.29a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.872.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.156 2.419 0 1.334-.945 2.419-2.156 2.419zm7.974 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.156 2.419 0 1.334-.946 2.419-2.156 2.419z"/></svg>
));

// --- UI COMPONENTS ---

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const LoadingOverlay: React.FC = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in">
        <LoadingSpinner />
    </div>
);

// FIX: Add missing LanguageSelector component.
const LanguageSelector: React.FC = () => {
    const { currentLanguage, setLanguage } = useLanguage();
    return (
        <div className="relative group">
            <button className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors">
                <GlobeIcon className="w-5 h-5" />
                <span className="text-xs uppercase font-bold hidden md:inline">{currentLanguage}</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[#181818] border border-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentLanguage === lang.code ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    >
                        {lang.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

type Page = 'home' | 'movies' | 'search' | 'watchlist' | 'calls';

const ChangelogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useLanguage();
    const changelogData = [
        { date: '2024-05-21', change: 'Integración de Google AdSense para sostenibilidad de la plataforma.' },
        { date: '2024-05-20', change: 'Optimización masiva del rendimiento y carga diferida (lazy loading).' },
        { date: '2024-05-18', change: 'Nuevas películas añadidas: "Mi chico malo", "Amor de Cupido", "Desde pequeños 1 y 2".' },
        { date: '2024-05-15', change: 'Sistema de "Continuar viendo" y recomendaciones basadas en historial.' },
        { date: '2024-05-10', change: 'Lanzamiento de la sección de Comunidad con videollamadas Jitsi.' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-lg flex flex-col animate-scale-in border border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold font-bebas tracking-wide text-red-500">{t('changelogTitle')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors focus:outline-none"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <ul className="space-y-6">
                        {changelogData.map((item, index) => (
                            <li key={index} className="border-l-2 border-red-500 pl-4 relative">
                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="block text-xs text-gray-500 font-bold mb-1 uppercase">{item.date}</span>
                                <p className="text-gray-300 text-sm leading-relaxed">{item.change}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-800 bg-black/20 text-right">
                    <button onClick={onClose} className="text-sm font-bold text-white hover:text-red-500 transition-colors uppercase tracking-widest">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const Header: React.FC<{ onNavigate: (page: Page) => void; currentPage: Page; onSearch: (query: string) => void; searchQuery: string }> = ({ onNavigate, currentPage, onSearch, searchQuery }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const { t } = useLanguage();
   
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
   
    const navLinkClasses = (page: Page) =>
        `cursor-pointer transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:h-[2px] after:w-full after:bg-red-500 after:transition-transform after:duration-300 ${currentPage === page ? 'text-white font-bold after:scale-x-100' : 'text-gray-300 hover:text-white after:scale-x-0 hover:after:scale-x-100'}`;

    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                <div className="flex items-center space-x-8">
                    <h1 className="text-3xl md:text-4xl text-red-500 font-bebas tracking-wider cursor-pointer" onClick={() => onNavigate('home')}>SEIKOYT</h1>
                    <nav className="hidden lg:flex items-center space-x-6 font-medium">
                        {['home', 'movies', 'watchlist', 'calls'].map((p) => (
                            <button key={p} onClick={() => onNavigate(p as Page)} className={navLinkClasses(p as Page)}>{t(p)}</button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative hidden sm:block">
                        <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => onSearch(e.target.value)} className="bg-black/50 border border-gray-600 rounded-full px-4 py-1.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 w-32 md:w-48 lg:w-64 transition-all focus:w-40 md:focus:w-56 lg:focus:w-72" />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                    <LanguageSelector />
                    <button onClick={() => onNavigate('calls')} className="lg:hidden text-gray-300 hover:text-white"><PhoneIcon className="w-6 h-6" /></button>
                    <a href="https://www.patreon.com/c/SeikoVT?vanity=user" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center space-x-2 border border-red-500 text-red-500 font-medium px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-all transform hover:scale-105"><HeartIcon className="w-5 h-5" /><span>Doname :)</span></a>
                </div>
            </div>
        </header>
    );
};

const HeroBanner: React.FC<{ content: Content; onDetailsClick: () => void; onPlayClick: () => void }> = ({ content, onDetailsClick, onPlayClick }) => {
    const { t } = useLanguage();
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const inWatchlist = isInWatchlist(content.id);

    return (
        <div className="relative h-screen -mb-40 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden"><img src={content.backdropUrl} alt="" className="w-full h-full object-cover animate-kenburns" loading="lazy" /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col justify-end pb-52 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-bebas text-white tracking-wide animate-fade-in-up">{content.title}</h2>
                    <p className="mt-4 text-gray-200 text-base md:text-lg max-w-xl animate-fade-in-up animate-fade-in-up-delay-1">{content.description}</p>
                    <div className="mt-8 flex space-x-4 animate-fade-in-up animate-fade-in-up-delay-2">
                        <button onClick={onPlayClick} className="flex items-center bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-all transform hover:scale-105"><PlayIcon className="w-6 h-6 mr-2" />{t('play')}</button>
                        <button onClick={onDetailsClick} className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"><InfoIcon className="w-6 h-6 mr-2" />{t('moreInfo')}</button>
                        <button onClick={() => inWatchlist ? removeFromWatchlist(content.id) : addToWatchlist(content.id)} className="flex items-center bg-black/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/40 transition-all transform hover:scale-105">{inWatchlist ? t('removeFromList') : t('addToList')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContentCard: React.FC<{ content: Content; onCardClick: () => void; progress?: number }> = React.memo(({ content, onCardClick, progress }) => (
    <button className="w-full group text-left block focus:outline-none" onClick={onCardClick}>
        <div className="aspect-[2/3] overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-105 group-hover:ring-2 ring-white/70 relative">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" loading="lazy" />
            {progress !== undefined && progress > 0 && progress < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600"><div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div></div>
            )}
        </div>
    </button>
));

const ContentRow: React.FC<{ title: string; contents: Content[]; onCardClick: (content: Content) => void; getProgress?: (id: string) => number }> = React.memo(({ title, contents, onCardClick, getProgress }) => (
    <div className="mb-12">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 sm:px-6 lg:px-8">{title}</h3>
        <div className="grid grid-flow-col auto-cols-[10rem] sm:auto-cols-[12rem] md:auto-cols-[14rem] gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 scrollbar-hide">
            {contents.map(content => <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} progress={getProgress ? getProgress(content.id) : undefined} />)}
        </div>
    </div>
));

const CallsPage: React.FC = () => {
    const { t } = useLanguage();
    const [roomName, setRoomName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isCallStarted, setIsCallStarted] = useState(false);
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const [jitsiApi, setJitsiApi] = useState<any>(null);

    useEffect(() => {
        const activeCall = sessionStorage.getItem('seikoyt_call_active');
        if (activeCall) {
            const { room, name } = JSON.parse(activeCall);
            setRoomName(room); setDisplayName(name); setIsCallStarted(true);
        }
        if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement("script");
            script.src = "https://meet.jit.si/external_api.js"; script.async = true;
            document.body.appendChild(script);
        }
        return () => { if (jitsiApi) jitsiApi.dispose(); };
    }, []);

    const startCall = (e: React.FormEvent) => {
        e.preventDefault(); if (!roomName || !displayName) return;
        sessionStorage.setItem('seikoyt_call_active', JSON.stringify({ room: roomName, name: displayName }));
        setIsCallStarted(true);
    };

    useEffect(() => {
        if (isCallStarted && window.JitsiMeetExternalAPI && jitsiContainerRef.current) {
            const options = { roomName: `SeikoYT-${roomName}`, width: '100%', height: '100%', parentNode: jitsiContainerRef.current, userInfo: { displayName: displayName } };
            setJitsiApi(new window.JitsiMeetExternalAPI('meet.jit.si', options));
        }
    }, [isCallStarted]);

    if (isCallStarted) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col pt-16 md:pt-20">
                 <div className="absolute top-4 right-4 z-[60]"><button onClick={() => { if (jitsiApi) jitsiApi.dispose(); sessionStorage.removeItem('seikoyt_call_active'); setIsCallStarted(false); }} className="bg-red-600 text-white px-4 py-2 rounded-full font-bold hover:bg-red-700 transition uppercase tracking-widest text-xs">Exit</button></div>
                 <div ref={jitsiContainerRef} className="w-full h-full" />
            </div>
        );
    }

    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
             <div className="w-full max-w-md bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-center mb-8"><PhoneIcon className="w-16 h-16 mx-auto mb-4 text-red-500" /><h2 className="text-3xl font-bebas text-white mb-2">{t('calls')}</h2><p className="text-gray-400">{t('callsDescription')}</p></div>
                <form onSubmit={startCall} className="space-y-6">
                    <input required type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('enterDisplayName')} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 transition-colors" />
                    <div className="relative"><span className="absolute left-4 top-3 text-gray-500">SeikoYT-</span><input required type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t('enterRoomName')} className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 pl-24 text-white focus:border-red-500" /></div>
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-transform transform hover:scale-[1.02]">{t('joinCall')}</button>
                </form>
             </div>
        </div>
    );
};

const VideoPlayer: React.FC<{ id: string; src: string; title: string; description: string; introStart?: number; introEnd?: number; onClose: () => void; isMiniMode: boolean; toggleMiniMode: () => void }> = ({ id, src, title, description, introStart, introEnd, onClose, isMiniMode, toggleMiniMode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const { updateProgress, watchProgress } = useUserHistory();

    useEffect(() => {
        if (id && videoRef.current && watchProgress[id]) videoRef.current.currentTime = watchProgress[id].currentTime;
    }, [id]);

    useEffect(() => {
        const video = videoRef.current; if (!video) return;
        const handleTime = () => { setCurrentTime(video.currentTime); setProgress((video.currentTime / video.duration) * 100); };
        const handleLoaded = () => setDuration(video.duration);
        video.addEventListener('timeupdate', handleTime); video.addEventListener('loadedmetadata', handleLoaded);
        return () => { if (video) { updateProgress(id, video.currentTime, video.duration); video.removeEventListener('timeupdate', handleTime); video.removeEventListener('loadedmetadata', handleLoaded); } };
    }, [id, updateProgress]);

    const togglePlay = () => { if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); setIsPlaying(!isPlaying); } };

    return (
        <div ref={containerRef} className={isMiniMode ? "fixed bottom-6 right-6 w-96 aspect-video bg-black z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-800" : "fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in"}>
            <video ref={videoRef} src={src} autoPlay className="w-full h-full object-contain" onClick={togglePlay} />
            <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full z-50"><CloseIcon className="w-6 h-6" /></button>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent opacity-0 hover:opacity-100 transition-opacity">
                <input type="range" min="0" max="100" value={progress} onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = (Number(e.target.value) / 100) * duration; }} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer video-progress" />
                <div className="flex justify-between mt-2 text-white text-xs font-mono"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
            </div>
            {!isMiniMode && <button onClick={toggleMiniMode} className="absolute bottom-4 right-4 text-white p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"><MinimizeIcon className="w-6 h-6" /></button>}
        </div>
    );
};

const Footer: React.FC = () => {
    const { t } = useLanguage();
    const [showChangelog, setShowChangelog] = useState(false);
    return (
        <footer className="bg-black py-8 mt-12 border-t border-gray-800/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* AdSense Unit in Footer */}
                <AdUnit slot="FOOTER_AD_SLOT" className="opacity-60 grayscale hover:grayscale-0 transition-all" />
                
                <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                    <div className="flex space-x-6 mb-4 md:mb-0">
                        <a href="https://www.youtube.com/@Seiko_EsposodeGabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF0000] transition-colors"><YouTubeIcon className="w-6 h-6" /></a>
                        <a href="https://instagram.com/seikovt_esposodegabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E4405F] transition-colors"><InstagramIcon className="w-6 h-6" /></a>
                        <a href="https://tiktok.com/@seikovt1" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#00F2EA] transition-colors"><TikTokIcon className="w-6 h-6" /></a>
                        <a href="https://discord.gg/fdDkGA7MWP" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5865F2] transition-colors"><DiscordIcon className="w-6 h-6" /></a>
                    </div>
                    <div className="text-center md:text-right"><h4 className="text-red-500 font-bebas text-2xl tracking-wider">SEIKOYT</h4><p className="text-gray-500 text-xs mt-1">{t('joinCommunity')}</p></div>
                </div>
                <div className="text-center text-gray-600 text-xs border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div><p>{t('copyright')}</p></div>
                    <button onClick={() => setShowChangelog(true)} className="text-gray-500 hover:text-red-500 transition-colors font-bold uppercase tracking-widest text-[10px] bg-white/5 px-4 py-1.5 rounded-full border border-white/10">{t('changelog')}</button>
                </div>
            </div>
            {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
        </footer>
    );
};

export default function App() {
    return (
        <LanguageProvider><WatchlistProvider><UserHistoryProvider><MainApp /></UserHistoryProvider></WatchlistProvider></LanguageProvider>
    );
}

function MainApp() {
    const [currentPage, setCurrentPage] = useState<Page>(() => (typeof window !== 'undefined' && sessionStorage.getItem('seikoyt_call_active')) ? 'calls' : 'home');
    const [activeModal, setActiveModal] = useState(false);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [playerState, setPlayerState] = useState<{ id: string; url: string; title: string; description: string; introStart?: number; introEnd?: number } | null>(null);
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);
    const { history, watchProgress } = useUserHistory();
    const { t } = useLanguage();

    const featuredContent = useMemo(() => MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0], []);
    const genres = useMemo(() => [...new Set(MOCK_CONTENT.flatMap(c => c.genre))], []);
    const filteredContent = useMemo(() => searchQuery ? MOCK_CONTENT.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())) : [], [searchQuery]);

    const recommendedContent = useMemo(() => {
        if (history.length === 0) return [];
        const genreCounts: Record<string, number> = {};
        MOCK_CONTENT.filter(c => history.includes(c.id)).forEach(c => c.genre.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
        return MOCK_CONTENT.filter(c => !history.includes(c.id)).sort((a, b) => b.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0) - a.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0)).slice(0, 10);
    }, [history]);

    const continueWatchingContent = useMemo(() => MOCK_CONTENT.filter(c => { const p = watchProgress[c.id]; return p && (p.currentTime / p.duration) < 0.95; }).sort((a, b) => (watchProgress[b.id]?.lastWatched || 0) - (watchProgress[a.id]?.lastWatched || 0)), [watchProgress]);

    const handleCardClick = useCallback((content: Content) => { setIsLoadingContent(true); setTimeout(() => { setSelectedContent(content); setActiveModal(true); setIsLoadingContent(false); }, 600); }, []);
    const handlePlay = (id: string, url: string, title: string, description: string) => { setPlayerState({ id, url, title, description }); setIsMiniPlayer(false); setActiveModal(false); };

    return (
        <div className="bg-black min-h-screen text-white">
            {isLoadingContent && <LoadingOverlay />}
            <Header onNavigate={setCurrentPage} currentPage={currentPage} onSearch={(q) => { setSearchQuery(q); if (q) setCurrentPage('search'); else setCurrentPage('home'); }} searchQuery={searchQuery} />
            
            <main>
                {currentPage === 'home' ? (
                    <>
                        <HeroBanner content={featuredContent} onDetailsClick={() => handleCardClick(featuredContent)} onPlayClick={() => handlePlay(featuredContent.id, featuredContent.videoUrl!, featuredContent.title, featuredContent.description)} />
                        <div className="relative z-20 -mt-28 space-y-4">
                            {continueWatchingContent.length > 0 && <ContentRow title={t('continueWatching')} contents={continueWatchingContent} onCardClick={handleCardClick} getProgress={(id) => (watchProgress[id].currentTime / watchProgress[id].duration) * 100} />}
                            
                            {/* AdSense Unit after first row */}
                            <AdUnit slot="CONTENT_MIDDLE_AD_SLOT" />

                            {recommendedContent.length > 0 && <ContentRow title={t('recommendedForYou')} contents={recommendedContent} onCardClick={handleCardClick} />}
                            {genres.map(genre => <ContentRow key={genre} title={genre} contents={MOCK_CONTENT.filter(c => c.genre.includes(genre))} onCardClick={handleCardClick} />)}
                        </div>
                    </>
                ) : currentPage === 'search' ? (
                    <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
                        <h2 className="text-4xl font-bebas mb-8">{t('searchResults')} "{searchQuery}"</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{filteredContent.map(c => <ContentCard key={c.id} content={c} onCardClick={() => handleCardClick(c)} />)}</div>
                    </div>
                ) : currentPage === 'watchlist' ? (
                    <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
                        <h2 className="text-4xl font-bebas mb-8">{t('myList')}</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{MOCK_CONTENT.filter(c => useWatchlist().watchlist.includes(c.id)).map(c => <ContentCard key={c.id} content={c} onCardClick={() => handleCardClick(c)} />)}</div>
                    </div>
                ) : currentPage === 'calls' ? <CallsPage /> : null}
            </main>

            {playerState && <VideoPlayer {...playerState} src={playerState.url} onClose={() => setPlayerState(null)} isMiniMode={isMiniPlayer} toggleMiniMode={() => setIsMiniPlayer(!isMiniPlayer)} />}
            
            {activeModal && selectedContent && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setActiveModal(false)}>
                    <div className="bg-[#181818] rounded-xl overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="relative aspect-video">
                            <img src={selectedContent.backdropUrl} className="w-full h-full object-cover" />
                            <button onClick={() => setActiveModal(false)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"><CloseIcon className="w-6 h-6" /></button>
                            <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-[#181818] to-transparent">
                                <h2 className="text-4xl font-bebas">{selectedContent.title}</h2>
                                <div className="mt-4 flex space-x-4">
                                    <button onClick={() => handlePlay(selectedContent.id, selectedContent.videoUrl!, selectedContent.title, selectedContent.description)} className="bg-white text-black px-6 py-2 rounded font-bold">{t('play')}</button>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                <p className="text-gray-300">{selectedContent.description}</p>
                                <AdUnit slot="MODAL_AD_SLOT" className="mt-8" />
                                <div className="mt-12"><HyvorTalkComments website-id="14533" page-id={selectedContent.id} /></div>
                            </div>
                            <div className="text-sm space-y-4">
                                <div><span className="text-gray-500">Géneros:</span> {selectedContent.genre.join(', ')}</div>
                                <div><span className="text-gray-500">Lanzamiento:</span> {selectedContent.releaseYear}</div>
                                <div><span className="text-gray-500">Clasificación:</span> {selectedContent.rating}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}