
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season } from './types';
import { MOCK_CONTENT, LANGUAGES, TRANSLATIONS } from './constants';
import { getPersonalizedRecommendations } from './services/geminiService';

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

const getFirstEpisode = (content: Content): Episode | null => {
    if (content.type === 'series' && content.seasons && content.seasons.length > 0) {
        // Find the first season that has episodes
        const season = content.seasons.find(s => s.episodes.length > 0);
        if (season) {
            return season.episodes[0];
        }
    }
    return null;
};

const getNextEpisode = (content: Content, currentEpisodeId: string): Episode | null => {
    if (!content.seasons) return null;
    let foundCurrent = false;
    for (const season of content.seasons) {
        for (const episode of season.episodes) {
            if (foundCurrent) return episode;
            if (episode.id === currentEpisodeId) foundCurrent = true;
        }
    }
    return null;
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
    searchHistory: string[];
    likedContent: string[];
    dislikedContent: string[];
    addToHistory: (id: string) => void;
    updateProgress: (id: string, currentTime: number, duration: number) => void;
    addSearchToHistory: (query: string) => void;
    clearSearchHistory: () => void;
    toggleLike: (id: string) => void;
    toggleDislike: (id: string) => void;
    isLiked: (id: string) => boolean;
    isDisliked: (id: string) => boolean;
};

const UserHistoryContext = createContext<UserHistoryContextType>({
    history: [],
    watchProgress: {},
    searchHistory: [],
    likedContent: [],
    dislikedContent: [],
    addToHistory: () => {},
    updateProgress: () => {},
    addSearchToHistory: () => {},
    clearSearchHistory: () => {},
    toggleLike: () => {},
    toggleDislike: () => {},
    isLiked: () => false,
    isDisliked: () => false,
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

    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_search_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [likedContent, setLikedContent] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_liked_content');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [dislikedContent, setDislikedContent] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_disliked_content');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    useEffect(() => { localStorage.setItem('seikoyt_watch_history', JSON.stringify(history)); }, [history]);
    useEffect(() => { localStorage.setItem('seikoyt_watch_progress', JSON.stringify(watchProgress)); }, [watchProgress]);
    useEffect(() => { localStorage.setItem('seikoyt_search_history', JSON.stringify(searchHistory)); }, [searchHistory]);
    useEffect(() => { localStorage.setItem('seikoyt_liked_content', JSON.stringify(likedContent)); }, [likedContent]);
    useEffect(() => { localStorage.setItem('seikoyt_disliked_content', JSON.stringify(dislikedContent)); }, [dislikedContent]);

    const addToHistory = useCallback((id: string) => {
        setHistory(prev => [...prev.filter(itemId => itemId !== id), id]);
    }, []);

    const updateProgress = useCallback((id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => ({
            ...prev,
            [id]: { currentTime, duration, lastWatched: Date.now() }
        }));
    }, []);

    const addSearchToHistory = useCallback((query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setSearchHistory(prev => {
            const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
            return [trimmed, ...filtered].slice(0, 10); // Keep last 10
        });
    }, []);

    const clearSearchHistory = useCallback(() => {
        setSearchHistory([]);
    }, []);

    const toggleLike = useCallback((id: string) => {
        setLikedContent(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        setDislikedContent(prev => prev.filter(i => i !== id)); // Remove from dislike if liked
    }, []);

    const toggleDislike = useCallback((id: string) => {
        setDislikedContent(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        setLikedContent(prev => prev.filter(i => i !== id)); // Remove from like if disliked
    }, []);

    const isLiked = useCallback((id: string) => likedContent.includes(id), [likedContent]);
    const isDisliked = useCallback((id: string) => dislikedContent.includes(id), [dislikedContent]);

    const value = useMemo(() => ({ 
        history, 
        watchProgress, 
        searchHistory, 
        likedContent,
        dislikedContent,
        addToHistory, 
        updateProgress, 
        addSearchToHistory, 
        clearSearchHistory, 
        toggleLike, 
        toggleDislike, 
        isLiked, 
        isDisliked
    }), [history, watchProgress, searchHistory, likedContent, dislikedContent, addToHistory, updateProgress, addSearchToHistory, clearSearchHistory, toggleLike, toggleDislike, isLiked, isDisliked]);
    
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
const SkipNextIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg>
));
const PipIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"></path></svg>
));
const HistoryIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"></path></svg>
));
const TrashIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
));
const ThumbUpIcon: React.FC<{ className?: string, filled?: boolean }> = React.memo(({ className, filled }) => (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
));
const ThumbDownIcon: React.FC<{ className?: string, filled?: boolean }> = React.memo(({ className, filled }) => (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
));
const SparklesIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 6 6.5 9.5 3 12l3.5 2.5L9 18l2.5-3.5L15 12l-3.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"></path></svg>
));

// FIX: Add missing social icons.
const YouTubeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
));
const InstagramIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.303.06-2.192.267-2.97.568-.804.312-1.486.732-2.165 1.411-.679.679-1.099 1.361-1.411 2.165-.301.778-.508 1.667-.568 2.97-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.06 1.303.267 2.192.568 2.97.312.804.732 1.486 1.411 2.165.679.679 1.361 1.099 2.165 1.411.778.301 1.667.508 2.97.568 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.303-.06 2.192-.267 2.97-.568.804-.312 1.486-.732 2.165-1.411.679-.679 1.099-1.361 1.411-2.165.301-.778.508-1.667.508-2.97-.568-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.441s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.441-1.441-1.441z"/></svg>
));
const DiscordIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.125-.094.252-.192.37-.29a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .077.01c.118.098.245.196.37.29a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.872.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.156 2.419 0 1.334-.945 2.419-2.156 2.419zm7.974 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.156 2.419 0 1.334-.946 2.419-2.156 2.419z"/></svg>
));

const TikTokIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.65-1.62-1.1-.04 1.86.04 3.72-.08 5.57-.09 1.4-.4 2.78-1.05 4.03-1.17 2.2-3.35 3.74-5.73 4.14-2.42.4-4.94-.04-6.93-1.4A9.05 9.05 0 0 1 .83 13.9a8.13 8.13 0 0 1 11.69-7.14v4.06c-1.66-.88-3.9-.5-5.38 1.01-1.35 1.4-1.32 3.65.07 5.01 1.4 1.34 3.74 1.34 5.14-.04.88-.86 1.35-2.07 1.32-3.28-.01-4.03 0-8.06.01-12.09-.43-.03-.86-.06-1.15-.4z"/></svg>
));

// --- CHRISTMAS COMPONENTS ---

const SantaHatIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C12.5523 3 13 3.44772 13 4C13 4.55228 12.5523 5 12 5C11.4477 5 11 4.55228 11 4C11 3.44772 11.4477 3 12 3Z" fill="white" />
        <path d="M12 5L16 13H8L12 5Z" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 13H17C17.5523 13 18 13.4477 18 14V15H6V14C6 13.4477 6.44772 13 7 13Z" fill="white" />
    </svg>
));

const Snowfall = () => {
  const snowflakes = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 3 + 2}s`,
    animationDelay: `${Math.random() * 5}s`,
    opacity: Math.random() * 0.5 + 0.2,
    size: `${Math.random() * 4 + 2}px`
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {snowflakes.map(flake => (
        <div
          key={flake.id}
          className="absolute bg-white rounded-full animate-snow"
          style={{
            left: flake.left,
            top: '-10px',
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDuration: flake.animationDuration,
            animationDelay: flake.animationDelay,
          }}
        />
      ))}
    </div>
  );
};

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

// --- NEW ABOUT SECTION FOR ADSENSE COMPLIANCE ---
const AboutSection: React.FC = () => {
    const { t } = useLanguage();
    return (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-gray-400 text-sm leading-relaxed border-t border-gray-800/30 mt-12">
            <h3 className="text-white font-bold text-lg mb-4">{t('aboutUs')}</h3>
            <p className="mb-4">
                {t('aboutText1')}
            </p>
            <p>
                {t('aboutText2')}
            </p>
        </section>
    );
};

const Header: React.FC<{ onNavigate: (page: Page) => void; currentPage: Page; onSearch: (query: string) => void; searchQuery: string }> = ({ onNavigate, currentPage, onSearch, searchQuery }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const { t } = useLanguage();
    const { searchHistory, addSearchToHistory, clearSearchHistory } = useUserHistory();
    const [showHistory, setShowHistory] = useState(false);
   
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
   
    const navLinkClasses = (page: Page) =>
        `cursor-pointer transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:h-[2px] after:w-full after:bg-red-500 after:transition-transform after:duration-300 ${currentPage === page ? 'text-white font-bold after:scale-x-100' : 'text-gray-300 hover:text-white after:scale-x-0 hover:after:scale-x-100'}`;

    const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            addSearchToHistory(searchQuery);
            setShowHistory(false);
        }
    };

    const handleHistoryClick = (term: string) => {
        onSearch(term);
        addSearchToHistory(term);
        setShowHistory(false);
    };

    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                <div className="flex items-center space-x-8">
                    <div className="relative cursor-pointer group" onClick={() => onNavigate('home')}>
                        <SantaHatIcon className="absolute -top-3 -left-3 w-8 h-8 transform -rotate-12 z-10" />
                        <h1 className="text-3xl md:text-4xl text-red-500 font-bebas tracking-wider relative z-0 group-hover:text-red-400 transition-colors">SEIKOYT</h1>
                    </div>
                    <nav className="hidden lg:flex items-center space-x-6 font-medium">
                        {['home', 'movies', 'watchlist', 'calls'].map((p) => (
                            <button key={p} onClick={() => onNavigate(p as Page)} className={navLinkClasses(p as Page)}>{t(p)}</button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative hidden sm:block">
                        <input 
                            type="text" 
                            placeholder={t('searchPlaceholder')} 
                            value={searchQuery} 
                            onChange={(e) => onSearch(e.target.value)} 
                            onFocus={() => setShowHistory(true)}
                            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                            onKeyDown={handleSearchSubmit}
                            className="bg-black/50 border border-gray-600 rounded-full px-4 py-1.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 w-32 md:w-48 lg:w-64 transition-all focus:w-40 md:focus:w-56 lg:focus:w-72" 
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        
                        {/* Search History Dropdown */}
                        {showHistory && searchHistory.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#181818] border border-gray-800 rounded-lg shadow-xl overflow-hidden z-50">
                                <ul>
                                    {searchHistory.map((term, index) => (
                                        <li key={index}>
                                            <button 
                                                onClick={() => handleHistoryClick(term)}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center transition-colors"
                                            >
                                                <HistoryIcon className="w-4 h-4 mr-3 text-gray-500" />
                                                <span className="truncate">{term}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t border-gray-800">
                                    <button 
                                        onClick={clearSearchHistory}
                                        className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-white/5 flex items-center transition-colors font-medium uppercase tracking-wide"
                                    >
                                        <TrashIcon className="w-3 h-3 mr-2" />
                                        {t('clearHistory')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <LanguageSelector />
                    <button onClick={() => onNavigate('calls')} className="lg:hidden text-gray-300 hover:text-white"><PhoneIcon className="w-6 h-6" /></button>
                    <a href="https://www.patreon.com/c/SeikoVT?vanity=user" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center space-x-2 border border-red-500 text-red-500 font-medium px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-all transform hover:scale-105"><HeartIcon className="w-5 h-5" /><span>{t('donate')}</span></a>
                </div>
            </div>
        </header>
    );
};

const VideoPlayer: React.FC<{ 
    id: string; 
    src: string; 
    title: string; 
    description: string; 
    introStart?: number; 
    introEnd?: number; 
    onClose: () => void; 
    isMiniMode: boolean; 
    toggleMiniMode: () => void;
    onNext?: () => void;
    hasNextEpisode?: boolean;
}> = ({ id, src, title, description, introStart, introEnd, onClose, isMiniMode, toggleMiniMode, onNext, hasNextEpisode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showSkip, setShowSkip] = useState(false);
    
    // New States for Features
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Auto Play States
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    const [autoPlayTimer, setAutoPlayTimer] = useState<number | null>(null);
    
    // Settings Menu State
    const [showSettings, setShowSettings] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'main' | 'quality' | 'audio' | 'subtitles' | 'speed'>('main');
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [currentAudio, setCurrentAudio] = useState('original');
    const [currentSubtitle, setCurrentSubtitle] = useState('off');

    const { updateProgress, watchProgress } = useUserHistory();
    const { t } = useLanguage();

    // Mock Detection for "Auto" Quality based on connection
    useEffect(() => {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
            const speed = connection.downlink;
            // Simple mock logic: if fast > 5mbps -> 1080p, else 720p
            if (currentQuality === 'auto') {
                // We don't change the actual video source here because we only have one string URL,
                // but this satisfies the UI requirement for an indicator.
            }
        }
    }, [currentQuality]);

    useEffect(() => {
        if (id && videoRef.current && watchProgress[id]) videoRef.current.currentTime = watchProgress[id].currentTime;
    }, [id]);

    useEffect(() => {
        const video = videoRef.current; if (!video) return;
        const handleTime = () => {
            const curr = video.currentTime;
            const dur = video.duration;
            setCurrentTime(curr);
            setProgress((curr / dur) * 100);

            // Intro skip logic
            if (introStart !== undefined && introEnd !== undefined) {
                if (curr >= introStart && curr <= introEnd) {
                    setShowSkip(true);
                } else {
                    setShowSkip(false);
                }
            }

            // Auto Play logic: Trigger when 5 seconds remaining
            if (hasNextEpisode && autoPlayEnabled && dur > 0 && dur - curr < 5 && autoPlayTimer === null) {
                setAutoPlayTimer(5);
            }
        };
        const handleLoaded = () => setDuration(video.duration);
        const handleEnded = () => {
             // Ensure auto-play triggers if it hasn't already (e.g., short video)
             if (hasNextEpisode && autoPlayEnabled && autoPlayTimer === null) {
                 setAutoPlayTimer(5);
             }
        };

        video.addEventListener('timeupdate', handleTime); 
        video.addEventListener('loadedmetadata', handleLoaded);
        video.addEventListener('ended', handleEnded);
        
        return () => { 
            if (video) { 
                updateProgress(id, video.currentTime, video.duration); 
                video.removeEventListener('timeupdate', handleTime); 
                video.removeEventListener('loadedmetadata', handleLoaded); 
                video.removeEventListener('ended', handleEnded);
            } 
        };
    }, [id, updateProgress, introStart, introEnd, hasNextEpisode, autoPlayEnabled, autoPlayTimer]);

    // Handle Auto Play Countdown
    useEffect(() => {
        let interval: any;
        if (autoPlayTimer !== null && autoPlayTimer > 0) {
            interval = setInterval(() => {
                setAutoPlayTimer((prev) => {
                    if (prev && prev <= 1) {
                        // Time's up, play next
                        if (onNext) onNext();
                        return null; 
                    }
                    return prev ? prev - 1 : null;
                });
            }, 1000);
        } else if (autoPlayTimer === 0) {
             // Should have triggered already, but just in case
             if (onNext) onNext();
             setAutoPlayTimer(null);
        }
        return () => clearInterval(interval);
    }, [autoPlayTimer, onNext]);

    // Reset Auto Play timer if source changes or next button clicked manually
    useEffect(() => {
        setAutoPlayTimer(null);
        setShowSkip(false);
    }, [id]);

    // Handle Volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const togglePlay = () => { 
        if (videoRef.current) { 
            if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); 
            setIsPlaying(!isPlaying); 
            // If paused, cancel auto play countdown
            if (isPlaying && autoPlayTimer !== null) setAutoPlayTimer(null);
        } 
    };

    const handleSkipIntro = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current && introEnd !== undefined) {
            videoRef.current.currentTime = introEnd;
            setShowSkip(false);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) setIsMuted(false);
    };

    const toggleMute = () => setIsMuted(!isMuted);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const togglePiP = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error("PiP failed", error);
        }
    };

    const handleSpeedChange = (rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setPlaybackRate(rate);
            setActiveSettingsTab('main');
        }
    };

    const cancelAutoPlay = () => {
        setAutoPlayTimer(null);
    };

    // Auto Quality Label
    const getQualityLabel = () => {
        if (currentQuality === 'auto') {
            // Mock detector logic
            const speed = (navigator as any).connection?.downlink || 10; 
            return `${t('auto')} (${speed > 5 ? '1080p' : '720p'})`;
        }
        return currentQuality;
    };

    return (
        <div ref={containerRef} className={`group ${isMiniMode ? "fixed bottom-6 right-6 w-96 aspect-video bg-black z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-800" : "fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in"}`}>
            <video 
                ref={videoRef} 
                src={src} 
                autoPlay 
                preload="auto"
                playsInline
                className="w-full h-full object-contain" 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            />
            
            <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full z-50 hover:bg-red-600 transition-colors"><CloseIcon className="w-6 h-6" /></button>
            
            {showSkip && (
                <button onClick={handleSkipIntro} className="absolute bottom-24 right-4 bg-white/90 backdrop-blur text-black px-6 py-2 rounded-lg font-bold hover:bg-white transition-all animate-fade-in flex items-center space-x-2 z-50 shadow-lg group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                    <span>{t('skipIntro')}</span>
                    <SkipNextIcon className="w-5 h-5" />
                </button>
            )}

            {/* Auto Play Overlay */}
            {autoPlayTimer !== null && (
                <div className="absolute bottom-24 right-4 bg-black/80 backdrop-blur border border-gray-700 p-4 rounded-xl shadow-2xl z-50 animate-fade-in flex flex-col items-center space-y-3 w-64">
                    <div className="text-gray-300 text-sm font-medium">{t('nextEpisodeIn')} <span className="text-white font-bold text-lg ml-1">{autoPlayTimer}</span></div>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-1000 ease-linear" style={{ width: `${(autoPlayTimer / 5) * 100}%` }}></div>
                    </div>
                    <div className="flex w-full space-x-2">
                        <button onClick={cancelAutoPlay} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded transition-colors">{t('cancel')}</button>
                        <button onClick={() => { if(onNext) onNext(); }} className="flex-1 bg-white text-black hover:bg-gray-200 text-xs font-bold py-2 rounded transition-colors">{t('playNow')}</button>
                    </div>
                </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                
                {/* Progress Bar */}
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progress} 
                    onChange={(e) => { 
                        if (videoRef.current) videoRef.current.currentTime = (Number(e.target.value) / 100) * duration; 
                    }} 
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer video-progress mb-4" 
                />
                
                <div className="flex justify-between items-center">
                    
                    {/* Left Controls */}
                    <div className="flex items-center space-x-4">
                         <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                            {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                        </button>
                        
                        {/* Next Episode Button */}
                        {hasNextEpisode && onNext && (
                             <button onClick={onNext} className="text-white hover:text-red-500 transition-colors flex items-center space-x-1" title={t('nextEpisode')}>
                                <SkipNextIcon className="w-8 h-8" />
                            </button>
                        )}

                        {/* Volume Control */}
                        <div className="flex items-center space-x-2 group/volume relative">
                            <button onClick={toggleMute} className="text-white hover:text-red-500 transition-colors">
                                {isMuted || volume === 0 ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={isMuted ? 0 : volume} 
                                onChange={handleVolumeChange} 
                                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer video-progress opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200" 
                            />
                        </div>
                        
                        <div className="text-white text-sm font-mono tracking-wider">{formatTime(currentTime)} / {formatTime(duration)}</div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center space-x-4 relative">
                         
                         {/* Settings Menu */}
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setActiveSettingsTab('main'); }} 
                                className={`text-white hover:text-red-500 transition-colors p-1 ${showSettings ? 'rotate-90' : ''} transform duration-300`}
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                            
                            {/* Auto Quality Badge (Visible) */}
                            <span className="hidden md:inline-block text-[10px] font-bold text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded ml-2 uppercase tracking-wide">
                                {getQualityLabel()}
                            </span>

                            {showSettings && (
                                <div className="absolute bottom-full mb-4 right-0 bg-[#181818]/95 backdrop-blur border border-gray-700 rounded-lg p-2 min-w-[200px] flex flex-col shadow-2xl z-50 text-sm overflow-hidden animate-scale-in">
                                    {activeSettingsTab === 'main' && (
                                        <>
                                            {/* Auto Play Toggle */}
                                            {hasNextEpisode && (
                                                <div className="flex justify-between items-center px-3 py-2 hover:bg-white/10 rounded w-full text-left text-white border-b border-gray-700 mb-1">
                                                    <span>{t('autoPlay')}</span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setAutoPlayEnabled(!autoPlayEnabled); }}
                                                        className={`w-8 h-4 rounded-full relative transition-colors ${autoPlayEnabled ? 'bg-red-500' : 'bg-gray-600'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${autoPlayEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: autoPlayEnabled ? '18px' : '2px' }}></div>
                                                    </button>
                                                </div>
                                            )}

                                            <button onClick={() => setActiveSettingsTab('quality')} className="flex justify-between items-center px-3 py-2 hover:bg-white/10 rounded w-full text-left text-white">
                                                <span>{t('quality')}</span>
                                                <span className="text-gray-400 text-xs">{getQualityLabel()}</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('speed')} className="flex justify-between items-center px-3 py-2 hover:bg-white/10 rounded w-full text-left text-white">
                                                <span>{t('speed')}</span>
                                                <span className="text-gray-400 text-xs">{playbackRate}x</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('audio')} className="flex justify-between items-center px-3 py-2 hover:bg-white/10 rounded w-full text-left text-white">
                                                <span>{t('audio')}</span>
                                                <span className="text-gray-400 text-xs capitalize">{currentAudio}</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('subtitles')} className="flex justify-between items-center px-3 py-2 hover:bg-white/10 rounded w-full text-left text-white">
                                                <span>{t('subtitles')}</span>
                                                <span className="text-gray-400 text-xs capitalize">{currentSubtitle}</span>
                                            </button>
                                        </>
                                    )}

                                    {activeSettingsTab === 'quality' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className="px-3 py-2 text-gray-400 hover:text-white border-b border-gray-700 mb-1 w-full text-left font-bold uppercase text-xs">← {t('quality')}</button>
                                            {['auto', '1080p', '720p', '480p'].map(q => (
                                                <button key={q} onClick={() => { setCurrentQuality(q); setActiveSettingsTab('main'); }} className={`px-3 py-2 hover:bg-white/10 rounded w-full text-left ${currentQuality === q ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                                    {q === 'auto' ? t('auto') : q}
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'speed' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className="px-3 py-2 text-gray-400 hover:text-white border-b border-gray-700 mb-1 w-full text-left font-bold uppercase text-xs">← {t('speed')}</button>
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                                <button key={rate} onClick={() => handleSpeedChange(rate)} className={`px-3 py-2 hover:bg-white/10 rounded w-full text-left ${playbackRate === rate ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                                    {rate}x
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'audio' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className="px-3 py-2 text-gray-400 hover:text-white border-b border-gray-700 mb-1 w-full text-left font-bold uppercase text-xs">← {t('audio')}</button>
                                            {['original', 'English', 'Spanish', 'Japanese'].map(track => (
                                                <button key={track} onClick={() => { setCurrentAudio(track); setActiveSettingsTab('main'); }} className={`px-3 py-2 hover:bg-white/10 rounded w-full text-left ${currentAudio === track ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                                    {track}
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'subtitles' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className="px-3 py-2 text-gray-400 hover:text-white border-b border-gray-700 mb-1 w-full text-left font-bold uppercase text-xs">← {t('subtitles')}</button>
                                            {['off', 'English', 'Spanish', 'Japanese'].map(sub => (
                                                <button key={sub} onClick={() => { setCurrentSubtitle(sub); setActiveSettingsTab('main'); }} className={`px-3 py-2 hover:bg-white/10 rounded w-full text-left ${currentSubtitle === sub ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                                    {sub === 'off' ? t('off') : sub}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Native PiP */}
                        <button onClick={togglePiP} className="text-white hover:text-red-500 transition-colors p-1" title="Picture-in-Picture">
                            <PipIcon className="w-6 h-6" />
                        </button>

                        {/* Custom Mini Mode */}
                        {!isMiniMode && (
                            <button onClick={toggleMiniMode} className="text-white hover:text-red-500 transition-colors p-1" title="Mini Player">
                                <MinimizeIcon className="w-6 h-6" />
                            </button>
                        )}

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className="text-white hover:text-red-500 transition-colors p-1" title="Fullscreen">
                            {isFullscreen ? <MinimizeIcon className="w-6 h-6" /> : <FullscreenIcon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContentCard: React.FC<{ content: Content; onCardClick: () => void }> = ({ content, onCardClick }) => {
    const { t } = useLanguage();
    return (
        <div 
            onClick={onCardClick}
            className="group relative bg-[#181818] rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-20"
        >
            <div className="aspect-[2/3] relative">
                <img 
                    src={content.thumbnailUrl} 
                    alt={content.title} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
            </div>
            <div className="p-3 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-8">
                <h4 className="font-bold text-white text-sm truncate">{content.title}</h4>
                <div className="flex items-center space-x-2 text-[10px] text-gray-300 mt-1">
                    <span className="text-green-400 font-bold">{content.rating}</span>
                    <span>{content.releaseYear}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                    {content.genre.slice(0, 2).map((g, i) => (
                        <span key={i} className="text-[9px] border border-gray-600 rounded px-1 text-gray-400">{g}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const HeroBanner: React.FC<{ content: Content; onDetailsClick: () => void; onPlayClick: () => void }> = ({ content, onDetailsClick, onPlayClick }) => {
    const { t } = useLanguage();
    return (
        <div className="relative h-[85vh] w-full">
            <div className="absolute inset-0">
                <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 lg:p-16 mb-16 flex flex-col justify-end items-start h-full">
                <h1 className="text-5xl md:text-7xl font-bebas text-white mb-4 max-w-3xl leading-none drop-shadow-lg">{content.title}</h1>
                <p className="text-white/90 text-sm md:text-lg mb-8 max-w-xl line-clamp-3 drop-shadow-md">{content.description}</p>
                <div className="flex space-x-4">
                    <button onClick={onPlayClick} className="flex items-center space-x-2 bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded hover:bg-white/90 transition-colors font-bold text-sm md:text-base">
                        <PlayIcon className="w-5 h-5 md:w-6 md:h-6" />
                        <span>{t('play')}</span>
                    </button>
                    <button onClick={onDetailsClick} className="flex items-center space-x-2 bg-gray-500/50 backdrop-blur-sm text-white px-6 md:px-8 py-2 md:py-3 rounded hover:bg-gray-500/70 transition-colors font-bold text-sm md:text-base">
                        <InfoIcon className="w-5 h-5 md:w-6 md:h-6" />
                        <span>{t('moreInfo')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ContentRow: React.FC<{ title: string; contents: Content[]; onCardClick: (c: Content) => void; icon?: React.ReactNode; getProgress?: (id: string) => number }> = ({ title, contents, onCardClick, icon, getProgress }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showControls, setShowControls] = useState(false);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const current = scrollRef.current;
            const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (contents.length === 0) return null;

    return (
        <div 
            className="mb-8 px-4 sm:px-6 lg:px-8 relative group/row"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center space-x-2">
                {icon && <span>{icon}</span>}
                <span>{title}</span>
            </h3>
            
            <div className="relative">
                <button 
                    onClick={() => scroll('left')} 
                    className={`absolute left-0 top-0 bottom-0 z-10 bg-black/50 hover:bg-black/70 w-12 flex items-center justify-center transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <span className="text-white text-4xl">‹</span>
                </button>

                <div 
                    ref={scrollRef}
                    className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4 pt-4 scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {contents.map((content) => (
                        <div key={content.id} className="flex-none w-[160px] md:w-[200px] relative">
                            <ContentCard content={content} onCardClick={() => onCardClick(content)} />
                            {getProgress && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-full mt-2 mx-1 overflow-hidden">
                                    <div 
                                        className="h-full bg-red-600" 
                                        style={{ width: `${getProgress(content.id)}%` }} 
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => scroll('right')} 
                    className={`absolute right-0 top-0 bottom-0 z-10 bg-black/50 hover:bg-black/70 w-12 flex items-center justify-center transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <span className="text-white text-4xl">›</span>
                </button>
            </div>
        </div>
    );
};

const CallsPage: React.FC = () => {
    const { t } = useLanguage();
    const [roomName, setRoomName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isInCall, setIsInCall] = useState(false);
    const jitsiContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load Jitsi script
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const startCall = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomName && displayName) {
            setIsInCall(true);
            // We need to wait a bit for the container to render
            setTimeout(() => {
                if (window.JitsiMeetExternalAPI && jitsiContainerRef.current) {
                    const domain = 'meet.jit.si';
                    const options = {
                        roomName: `SeikoYT-${roomName}`,
                        width: '100%',
                        height: '100%',
                        parentNode: jitsiContainerRef.current,
                        userInfo: {
                            displayName: displayName
                        },
                        configOverwrite: {
                            startWithAudioMuted: true,
                            startWithVideoMuted: true
                        },
                        interfaceConfigOverwrite: {
                            SHOW_JITSI_WATERMARK: false
                        }
                    };
                    const api = new window.JitsiMeetExternalAPI(domain, options);
                    api.addEventListener('videoConferenceLeft', () => {
                        setIsInCall(false);
                        api.dispose();
                    });
                }
            }, 100);
        }
    };

    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center">
            {!isInCall ? (
                <div className="w-full max-w-md bg-[#181818] p-8 rounded-xl border border-gray-800 shadow-2xl">
                    <div className="text-center mb-8">
                        <PhoneIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bebas text-white">{t('calls')}</h2>
                        <p className="text-gray-400 mt-2 text-sm">{t('callsDescription')}</p>
                    </div>
                    
                    <form onSubmit={startCall} className="space-y-6">
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">{t('roomName')}</label>
                            <input 
                                type="text" 
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder={t('enterRoomName')}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2">{t('displayName')}</label>
                            <input 
                                type="text" 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t('enterDisplayName')}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center space-x-2">
                            <PhoneIcon className="w-5 h-5" />
                            <span>{t('joinCall')}</span>
                        </button>
                    </form>
                </div>
            ) : (
                <div className="w-full h-[80vh] bg-black rounded-xl overflow-hidden border border-gray-800 relative">
                     <div ref={jitsiContainerRef} className="w-full h-full" />
                     <button 
                        onClick={() => setIsInCall(false)}
                        className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors z-10"
                     >
                         {t('exit')}
                     </button>
                </div>
            )}
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
                    <div className="flex space-x-4">
                        <a href="#" className="text-gray-500 hover:text-white transition-colors">{t('privacyPolicy')}</a>
                        <a href="#" className="text-gray-500 hover:text-white transition-colors">{t('termsOfService')}</a>
                    </div>
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
    const { history, watchProgress, likedContent, searchHistory, toggleLike, toggleDislike, isLiked, isDisliked } = useUserHistory();
    const { t } = useLanguage();
    
    // Series State
    const [playingContent, setPlayingContent] = useState<Content | null>(null);
    const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
    
    // AI Recommendations State
    const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
    const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);

    const featuredContent = useMemo(() => MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0], []);
    const genres = useMemo(() => [...new Set(MOCK_CONTENT.flatMap(c => c.genre))], []);
    const filteredContent = useMemo(() => searchQuery ? MOCK_CONTENT.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())) : [], [searchQuery]);

    // Simplified catalog for Gemini to save tokens
    const simplifiedCatalog = useMemo(() => MOCK_CONTENT.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        genre: c.genre
    })), []);

    useEffect(() => {
        // Debounce generation to avoid excessive API calls
        const timer = setTimeout(async () => {
            if (history.length > 0 || likedContent.length > 0 || searchHistory.length > 0) {
                setIsGeneratingRecs(true);
                const watchedTitles = MOCK_CONTENT.filter(c => history.includes(c.id)).map(c => c.title);
                const likedTitles = MOCK_CONTENT.filter(c => likedContent.includes(c.id)).map(c => c.title);
                
                const recIds = await getPersonalizedRecommendations(watchedTitles, likedTitles, searchHistory, simplifiedCatalog);
                setAiRecommendations(recIds);
                setIsGeneratingRecs(false);
            }
        }, 2000); // Wait 2 seconds after mount/update before fetching

        return () => clearTimeout(timer);
    }, [history, likedContent, searchHistory, simplifiedCatalog]);

    const recommendedContent = useMemo(() => {
        // If AI returned specific IDs, use them
        if (aiRecommendations.length > 0) {
            return MOCK_CONTENT.filter(c => aiRecommendations.includes(c.id));
        }

        // Fallback to genre-based logic
        if (history.length === 0 && likedContent.length === 0) return [];
        
        const genreCounts: Record<string, number> = {};
        const combinedIds = [...new Set([...history, ...likedContent])];
        
        MOCK_CONTENT.filter(c => combinedIds.includes(c.id)).forEach(c => c.genre.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
        
        return MOCK_CONTENT.filter(c => !combinedIds.includes(c.id)).sort((a, b) => 
            b.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0) - a.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0)
        ).slice(0, 10);
    }, [history, likedContent, aiRecommendations]);

    const continueWatchingContent = useMemo(() => MOCK_CONTENT.filter(c => { const p = watchProgress[c.id]; return p && (p.currentTime / p.duration) < 0.95; }).sort((a, b) => (watchProgress[b.id]?.lastWatched || 0) - (watchProgress[a.id]?.lastWatched || 0)), [watchProgress]);

    const handleCardClick = useCallback((content: Content) => { setIsLoadingContent(true); setTimeout(() => { setSelectedContent(content); setActiveModal(true); setIsLoadingContent(false); }, 600); }, []);
    
    // Enhanced play handler that supports series and episodes
    const handlePlayContent = (content: Content, episode?: Episode) => {
        let targetEpisode = episode;
        
        // If it's a series and no episode specified, try to find the first episode
        if (content.type === 'series' && !targetEpisode) {
            targetEpisode = getFirstEpisode(content);
        }

        // Logic for Series
        if (content.type === 'series') {
             if (targetEpisode) {
                 // Playing an episode
                 setPlayerState({ 
                    id: targetEpisode.id, 
                    url: targetEpisode.videoUrl, 
                    title: `${content.title}: ${targetEpisode.title}`, 
                    description: targetEpisode.description,
                    introStart: targetEpisode.introStart,
                    introEnd: targetEpisode.introEnd
                 });
                 setPlayingContent(content);
                 setPlayingEpisode(targetEpisode);
                 setIsMiniPlayer(false);
                 setActiveModal(false);
                 return;
             } 
             // Fallback if series has no seasons/episodes structure but has a main videoUrl (unlikely given MOCK_CONTENT but good for safety)
             else if (content.videoUrl) {
                 setPlayerState({ 
                    id: content.id, 
                    url: content.videoUrl, 
                    title: content.title, 
                    description: content.description,
                    introStart: content.introStart,
                    introEnd: content.introEnd
                 });
                 setPlayingContent(content);
                 setPlayingEpisode(null);
                 setIsMiniPlayer(false);
                 setActiveModal(false);
                 return;
             }
             // No playable content found
             console.warn("No playable content found for series");
             return;
        }

        // Logic for Movies
        if (content.videoUrl) {
            setPlayerState({ 
                id: content.id, 
                url: content.videoUrl, 
                title: content.title, 
                description: content.description,
                introStart: content.introStart,
                introEnd: content.introEnd
            });
            setPlayingContent(content);
            setPlayingEpisode(null);
            setIsMiniPlayer(false);
            setActiveModal(false);
        }
    };

    const handleNextEpisode = () => {
        if (playingContent && playingEpisode) {
            const next = getNextEpisode(playingContent, playingEpisode.id);
            if (next) {
                handlePlayContent(playingContent, next);
            }
        }
    };
    
    const hasNextEpisode = useMemo(() => {
        if (playingContent && playingEpisode) {
            return !!getNextEpisode(playingContent, playingEpisode.id);
        }
        return false;
    }, [playingContent, playingEpisode]);

    return (
        <div className="bg-black min-h-screen text-white relative">
            <Snowfall />
            {isLoadingContent && <LoadingOverlay />}
            <Header onNavigate={setCurrentPage} currentPage={currentPage} onSearch={(q) => { setSearchQuery(q); if (q) setCurrentPage('search'); else setCurrentPage('home'); }} searchQuery={searchQuery} />
            
            <main>
                {currentPage === 'home' ? (
                    <>
                        <HeroBanner content={featuredContent} onDetailsClick={() => handleCardClick(featuredContent)} onPlayClick={() => handlePlayContent(featuredContent)} />
                        <div className="relative z-20 -mt-28 space-y-4">
                            {continueWatchingContent.length > 0 && <ContentRow title={t('continueWatching')} contents={continueWatchingContent} onCardClick={handleCardClick} getProgress={(id) => (watchProgress[id].currentTime / watchProgress[id].duration) * 100} />}
                            
                            {/* AdSense Unit after first row - Wrapped in conditional logic usually, but here just placed */}
                            <AdUnit slot="CONTENT_MIDDLE_AD_SLOT" />

                            {recommendedContent.length > 0 && (
                                <ContentRow 
                                    title={isGeneratingRecs ? t('generatingRecommendations') : t('recommendedForYou')} 
                                    contents={recommendedContent} 
                                    onCardClick={handleCardClick} 
                                    icon={<SparklesIcon className={`w-6 h-6 text-yellow-400 ${isGeneratingRecs ? 'animate-pulse' : ''}`} />}
                                />
                            )}
                            
                            {genres.map(genre => <ContentRow key={genre} title={genre} contents={MOCK_CONTENT.filter(c => c.genre.includes(genre))} onCardClick={handleCardClick} />)}
                            
                            {/* SEO / Content Section for AdSense */}
                            <AboutSection />
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

            {playerState && (
                <VideoPlayer 
                    {...playerState} 
                    src={playerState.url} 
                    onClose={() => setPlayerState(null)} 
                    isMiniMode={isMiniPlayer} 
                    toggleMiniMode={() => setIsMiniPlayer(!isMiniPlayer)}
                    onNext={handleNextEpisode}
                    hasNextEpisode={hasNextEpisode}
                />
            )}
            
            {activeModal && selectedContent && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setActiveModal(false)}>
                    <div className="bg-[#181818] rounded-xl overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="relative aspect-video">
                            <img src={selectedContent.backdropUrl} className="w-full h-full object-cover" />
                            <button onClick={() => setActiveModal(false)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"><CloseIcon className="w-6 h-6" /></button>
                            <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-[#181818] to-transparent">
                                <h2 className="text-4xl font-bebas">{selectedContent.title}</h2>
                                <div className="mt-4 flex space-x-4 items-center">
                                    <button onClick={() => handlePlayContent(selectedContent)} className="bg-white text-black px-6 py-2 rounded font-bold">{t('play')}</button>
                                    <button onClick={() => toggleLike(selectedContent.id)} className={`p-2 rounded-full border border-white/20 hover:bg-white/10 ${isLiked(selectedContent.id) ? 'text-green-500' : 'text-white'}`}>
                                        <ThumbUpIcon className="w-5 h-5" filled={isLiked(selectedContent.id)} />
                                    </button>
                                    <button onClick={() => toggleDislike(selectedContent.id)} className={`p-2 rounded-full border border-white/20 hover:bg-white/10 ${isDisliked(selectedContent.id) ? 'text-red-500' : 'text-white'}`}>
                                        <ThumbDownIcon className="w-5 h-5" filled={isDisliked(selectedContent.id)} />
                                    </button>
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
                                <div><span className="text-gray-500">{t('genresLabel')}</span> {selectedContent.genre.join(', ')}</div>
                                <div><span className="text-gray-500">{t('releaseLabel')}</span> {selectedContent.releaseYear}</div>
                                <div><span className="text-gray-500">{t('ratingLabel')}</span> {selectedContent.rating}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}
