
import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season, DrmConfig } from './types';
import { MOCK_CONTENT, LANGUAGES, TRANSLATIONS } from './constants';
import { getPersonalizedRecommendations } from './services/geminiService';

// FIX: Define custom element as a component variable to bypass strict IntrinsicElements type checking.
const HyvorTalkComments = 'hyvor-talk-comments' as unknown as React.ComponentType<any>;

// FIX: Declare global interface for Jitsi API and Shaka Player to avoid TypeScript errors
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    adsbygoogle: any;
    shaka: any;
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

const getPreviousEpisode = (content: Content, currentEpisodeId: string): Episode | null => {
    if (!content.seasons) return null;
    let previousEpisode: Episode | null = null;
    for (const season of content.seasons) {
        for (const episode of season.episodes) {
            if (episode.id === currentEpisodeId) return previousEpisode;
            previousEpisode = episode;
        }
    }
    return null;
};

const AdUnit: React.FC<{ slot: string; format?: 'auto' | 'fluid' | 'rectangle'; className?: string }> = ({ slot, format = 'auto', className = '' }) => {
    const adRef = useRef<HTMLModElement>(null);

    useEffect(() => {
        // Delay the push to ensure the element has been rendered and has dimensions (layout phase complete)
        const timer = setTimeout(() => {
            try {
                if (adRef.current && adRef.current.offsetWidth > 0) {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } else {
                    // Retry once more if width is 0 (e.g. during animations)
                    setTimeout(() => {
                         if (adRef.current && adRef.current.offsetWidth > 0) {
                            try {
                                (window.adsbygoogle = window.adsbygoogle || []).push({});
                            } catch (e) {
                                console.error("AdSense error (retry):", e);
                            }
                         }
                    }, 500);
                }
            } catch (e) {
                console.error("AdSense error:", e);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`my-8 flex justify-center w-full overflow-hidden min-h-[90px] bg-white/5 rounded-lg items-center text-gray-600 text-xs ${className}`}>
            <ins className="adsbygoogle"
                 ref={adRef}
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
const SkipPreviousIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path></svg>
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
const GamepadIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path></svg>
));
const WifiIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z"/></svg>
));
const HeadphonesIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>
));

const YouTubeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
));
const InstagramIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.303.06-2.192.267-2.97.568-.804.312-1.486.732-2.165 1.411-.679.679-1.099 1.361-1.411 2.165-.301.778-.508 1.667-.568 2.97-.058 1.28-.072 1.688-.072 4.947-.072s3.667-.014 4.947-.072c1.303-.06 2.192-.267 2.97-.568.804-.312 1.486-.732 2.165-1.411.679-.679 1.099-1.361 1.411-2.165.301-.778.508-1.667.508-2.97-.568-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.441s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.441-1.441-1.441z"/></svg>
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

type Page = 'home' | 'movies' | 'search' | 'watchlist' | 'calls' | 'minigames';

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
                        {['home', 'movies', 'minigames', 'watchlist', 'calls'].map((p) => (
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
    onPrevious?: () => void;
    hasPreviousEpisode?: boolean;
    drm?: DrmConfig;
}> = ({ id, src, title, description, introStart, introEnd, onClose, isMiniMode, toggleMiniMode, onNext, hasNextEpisode, onPrevious, hasPreviousEpisode, drm }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null); // Shaka Player instance
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
    const [isAutoPlayCancelled, setIsAutoPlayCancelled] = useState(false);
    
    // Settings Menu State
    const [showSettings, setShowSettings] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'main' | 'quality' | 'audio' | 'subtitles' | 'speed' | 'theme'>('main');
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [currentAudio, setCurrentAudio] = useState('original');
    const [currentSubtitle, setCurrentSubtitle] = useState('off');
    const [playerTheme, setPlayerTheme] = useState<'dark' | 'light'>('dark');
    
    // New Features: Data Saver & Spatial Audio
    const [dataSaver, setDataSaver] = useState(false);
    const [spatialAudio, setSpatialAudio] = useState(false);

    const { updateProgress, watchProgress } = useUserHistory();
    const { t } = useLanguage();

    // Theme Helpers
    const isDark = playerTheme === 'dark';
    const menuBg = isDark ? 'bg-[#181818]/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-800 shadow-xl';
    const overlayBg = isDark ? 'bg-black/90 border-gray-700' : 'bg-white/95 border-gray-200 shadow-xl';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const hoverItem = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
    const activeItem = 'text-red-500 font-bold';
    const buttonText = isDark ? 'text-white' : 'text-black';
    const cancelBtn = isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800';

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

    // Use refs for values accessed inside event listeners to avoid re-binding listeners on every render/state change
    const autoPlayStateRef = useRef({
        autoPlayEnabled,
        autoPlayTimer,
        isAutoPlayCancelled,
        hasNextEpisode,
        isPlaying
    });

    useEffect(() => {
        autoPlayStateRef.current = {
            autoPlayEnabled,
            autoPlayTimer,
            isAutoPlayCancelled,
            hasNextEpisode,
            isPlaying
        };
    }, [autoPlayEnabled, autoPlayTimer, isAutoPlayCancelled, hasNextEpisode, isPlaying]);

    // Separate Auto Play Timer Logic
    useEffect(() => {
        if (autoPlayTimer === 0) {
            if (onNext) onNext();
            setAutoPlayTimer(null);
        }
        
        if (autoPlayTimer === null || autoPlayTimer <= 0) return;

        const interval = setInterval(() => {
            setAutoPlayTimer(t => (t !== null && t > 0 ? t - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [autoPlayTimer, onNext]);

    // Reset state when video ID changes
    useEffect(() => {
        setAutoPlayTimer(null);
        setIsAutoPlayCancelled(false);
        setShowSkip(false);
        setIsPlaying(true);
        setProgress(0);
        setCurrentTime(0);
        // Do not reset volume/mute as those are global player preferences usually
    }, [id]);

    const toggleFullscreen = useCallback(() => {
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
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!videoRef.current) return;
            
            // Ignore inputs
            if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) return;

            const video = videoRef.current;

            switch(e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    if (video.paused) {
                        video.play();
                        setIsPlaying(true);
                    } else {
                        video.pause();
                        setIsPlaying(false);
                        // Cancel autoplay logic
                        setAutoPlayTimer(null);
                        setIsAutoPlayCancelled(true);
                    }
                    break;
                case 'arrowright':
                case 'l':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    // Cancel autoplay logic
                    setAutoPlayTimer(null);
                    setIsAutoPlayCancelled(true);
                    break;
                case 'arrowleft':
                case 'j':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    // Cancel autoplay logic
                    setAutoPlayTimer(null);
                    setIsAutoPlayCancelled(true);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    setVolume(v => {
                        const newVol = Math.min(1, v + 0.1);
                        return newVol;
                    });
                    setIsMuted(false);
                    video.muted = false;
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    setVolume(v => {
                        const newVol = Math.max(0, v - 0.1);
                        return newVol;
                    });
                    break;
                case 'm':
                    e.preventDefault();
                    setIsMuted(prev => {
                        const next = !prev;
                        video.muted = next;
                        if (!next && video.volume === 0) {
                            video.volume = 1;
                            setVolume(1);
                        }
                        return next;
                    });
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'escape':
                    if (!document.fullscreenElement) {
                        e.preventDefault();
                        onClose();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleFullscreen, onClose]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const initPlayer = async () => {
            // Assume Shaka is loaded globally via script tag
            const shaka = (window as any).shaka;

            if (shaka) {
                shaka.polyfill.installAll();

                if (shaka.Player.isBrowserSupported()) {
                    const player = new shaka.Player(video);
                    playerRef.current = player;

                    // Error handling
                    player.addEventListener('error', (event: any) => {
                       console.error('Shaka Player Error', event.detail);
                    });

                    // Configure DRM
                    const drmConfig: any = { servers: {} };
                    if (drm) {
                        if (drm.widevine) {
                            drmConfig.servers['com.widevine.alpha'] = drm.widevine.licenseUrl;
                        }
                        if (drm.playready) {
                            drmConfig.servers['com.microsoft.playready'] = drm.playready.licenseUrl;
                        }
                        if (drm.fairplay) {
                            drmConfig.servers['com.apple.fps.1_0'] = drm.fairplay.licenseUrl;
                            drmConfig.advanced = {
                                'com.apple.fps.1_0': {
                                    serverCertificateUrl: drm.fairplay.certificateUrl
                                }
                            };
                        }
                        player.configure({ drm: drmConfig });
                    }

                    try {
                        await player.load(src);
                        // Autoplay logic: If autoPlayEnabled refers to "play next episode", 
                        // we still generally want the video to start playing when opened.
                        // The component state `isPlaying` defaults to true.
                        await video.play();
                    } catch (e) {
                        console.error('Shaka load error', e);
                    }
                } else {
                    console.error('Shaka Player not supported');
                    video.src = src; // Fallback
                }
            } else {
                 video.src = src; // Fallback
            }
        };

        const handleTime = () => {
            const curr = video.currentTime;
            const dur = video.duration;
            if (!isNaN(curr)) setCurrentTime(curr);
            if (!isNaN(dur) && dur > 0) setProgress((curr / dur) * 100);

            // Intro skip logic
            if (introStart !== undefined && introEnd !== undefined) {
                // Ensure buttons show only during the window
                setShowSkip(curr >= introStart && curr <= introEnd);
            }

            // Auto Play logic using ref
            const state = autoPlayStateRef.current;
            if (state.hasNextEpisode && state.autoPlayEnabled && dur > 0) {
                const remaining = dur - curr;
                if (remaining <= 5 && remaining > 0) {
                    if (state.autoPlayTimer === null && !state.isAutoPlayCancelled && state.isPlaying) {
                        setAutoPlayTimer(5);
                    }
                } else if (remaining > 5) {
                    // Reset if we seek back
                    if (state.autoPlayTimer !== null) setAutoPlayTimer(null);
                    if (state.isAutoPlayCancelled) setIsAutoPlayCancelled(false);
                }
            }
        };

        const handleLoaded = () => {
             setDuration(video.duration);
             // Restore watch progress here (safer than useEffect)
             const savedProgress = watchProgress[id];
             if (savedProgress && savedProgress.currentTime > 0) {
                 video.currentTime = savedProgress.currentTime;
             }
        };

        const handleEnded = () => {
             const state = autoPlayStateRef.current;
             // Ensure auto-play triggers if it hasn't already (e.g., short video or fast forward)
             if (state.hasNextEpisode && state.autoPlayEnabled && state.autoPlayTimer === null && !state.isAutoPlayCancelled) {
                 setAutoPlayTimer(5);
             }
        };

        initPlayer();

        video.addEventListener('timeupdate', handleTime); 
        video.addEventListener('loadedmetadata', handleLoaded);
        video.addEventListener('ended', handleEnded);
        
        return () => { 
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            if (video) { 
                updateProgress(id, video.currentTime, video.duration); 
                video.removeEventListener('timeupdate', handleTime); 
                video.removeEventListener('loadedmetadata', handleLoaded); 
                video.removeEventListener('ended', handleEnded);
                video.removeAttribute('src');
                video.load();
            } 
        };
    }, [id, updateProgress, introStart, introEnd, drm, src, watchProgress]); 

    // Handle Volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const togglePlay = () => { 
        if (videoRef.current) { 
            if (isPlaying) {
                videoRef.current.pause(); 
                // Cancel autoplay on pause so it doesn't trigger while user is away
                if (autoPlayTimer !== null) {
                    setAutoPlayTimer(null);
                    setIsAutoPlayCancelled(true);
                }
            } else {
                videoRef.current.play(); 
            }
            setIsPlaying(!isPlaying); 
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

    const toggleMute = () => {
        if (isMuted) {
            setIsMuted(false);
            if (volume === 0) setVolume(1); // Restore volume if it was 0
        } else {
            setIsMuted(true);
        }
    };

    // toggleFullscreen moved to useCallback above

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
        setIsAutoPlayCancelled(true);
    };

    // Auto Quality Label
    const getQualityLabel = () => {
        if (dataSaver) return '480p (Saver)';
        
        if (currentQuality === 'auto') {
            // Mock detector logic
            const speed = (navigator as any).connection?.downlink || 10; 
            return `${t('auto')} (${speed > 5 ? '1080p' : '720p'})`;
        }
        return currentQuality;
    };

    return (
        <div ref={containerRef} className={`group ${isMiniMode ? "fixed bottom-6 right-6 w-96 aspect-video bg-black z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-800" : "fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in"}`}>
            {/* 
               IMPORTANT: For true DRM support, this standard HTML5 <video> tag 
               must be initialized by a specialized library like Shaka Player, Dash.js, or Video.js
               that handles the EME/CDM interactions using the provided `drm` config props.
            */}
            <video 
                ref={videoRef} 
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
                <div className={`absolute bottom-24 right-4 backdrop-blur border p-5 rounded-xl shadow-2xl z-50 animate-fade-in flex flex-col items-center space-y-4 w-72 ${overlayBg}`}>
                    <div className="flex flex-col items-center">
                        <span className={`${textSecondary} text-xs uppercase font-bold tracking-wider mb-1`}>{t('nextEpisodeIn')}</span>
                        <span className={`${isDark ? 'text-white' : 'text-gray-900'} font-bebas text-5xl leading-none drop-shadow-lg`}>{autoPlayTimer}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 transition-all duration-1000 ease-linear" style={{ width: `${(autoPlayTimer / 5) * 100}%` }}></div>
                    </div>
                    <div className="flex w-full space-x-3">
                        <button onClick={cancelAutoPlay} className={`flex-1 ${cancelBtn} text-xs font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wide`}>{t('cancel')}</button>
                        <button onClick={() => { if(onNext) onNext(); }} className={`flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold py-2.5 rounded-lg transition-colors uppercase tracking-wide`}>{t('playNow')}</button>
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
                        if (videoRef.current) {
                            videoRef.current.currentTime = (Number(e.target.value) / 100) * duration; 
                            // Manual seek resets timer
                            if (autoPlayTimer !== null) {
                                setAutoPlayTimer(null);
                                setIsAutoPlayCancelled(true);
                            }
                        }
                    }} 
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer video-progress mb-4" 
                />
                
                <div className="flex justify-between items-center">
                    
                    {/* Left Controls */}
                    <div className="flex items-center space-x-4">
                        {/* Previous Episode Button */}
                        {hasPreviousEpisode && onPrevious && (
                             <button onClick={(e) => { e.stopPropagation(); onPrevious(); }} className="text-white hover:text-red-500 transition-colors flex items-center space-x-1" title={t('previousEpisode')}>
                                <SkipPreviousIcon className="w-8 h-8" />
                            </button>
                        )}

                         <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                            {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                        </button>
                        
                        {/* Next Episode Button */}
                        {hasNextEpisode && onNext && (
                             <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white hover:text-red-500 transition-colors flex items-center space-x-1" title={t('nextEpisode')}>
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
                                <div className={`absolute bottom-full mb-4 right-0 backdrop-blur border rounded-lg p-2 min-w-[220px] flex flex-col shadow-2xl z-50 text-sm overflow-hidden animate-scale-in ${menuBg}`}>
                                    {activeSettingsTab === 'main' && (
                                        <>
                                            {/* Auto Play Toggle */}
                                            {hasNextEpisode && (
                                                <div className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1`}>
                                                    <span>{t('autoPlay')}</span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setAutoPlayEnabled(!autoPlayEnabled); }}
                                                        className={`w-8 h-4 rounded-full relative transition-colors ${autoPlayEnabled ? 'bg-red-500' : 'bg-gray-600'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${autoPlayEnabled ? 'left-4.5' : 'left-0.5'}`} style={{ left: autoPlayEnabled ? '18px' : '2px' }}></div>
                                                    </button>
                                                </div>
                                            )}

                                            {/* Feature 1: Data Saver Mode */}
                                            <div className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText} mb-1`}>
                                                <div className="flex items-center space-x-2">
                                                    <WifiIcon className="w-4 h-4" />
                                                    <span>{t('dataSaver')}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDataSaver(!dataSaver); }}
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${dataSaver ? 'bg-green-500' : 'bg-gray-600'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${dataSaver ? 'left-4.5' : 'left-0.5'}`} style={{ left: dataSaver ? '18px' : '2px' }}></div>
                                                </button>
                                            </div>

                                            <button onClick={() => setActiveSettingsTab('quality')} className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText} ${dataSaver ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <span>{t('quality')}</span>
                                                <span className={`${textSecondary} text-xs`}>{getQualityLabel()}</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('speed')} className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText}`}>
                                                <span>{t('speed')}</span>
                                                <span className={`${textSecondary} text-xs`}>{playbackRate}x</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('audio')} className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText}`}>
                                                <span>{t('audio')}</span>
                                                <span className={`${textSecondary} text-xs capitalize`}>{currentAudio}</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('subtitles')} className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText}`}>
                                                <span>{t('subtitles')}</span>
                                                <span className={`${textSecondary} text-xs capitalize`}>{currentSubtitle}</span>
                                            </button>
                                            <button onClick={() => setActiveSettingsTab('theme')} className={`flex justify-between items-center px-3 py-2 ${hoverItem} rounded w-full text-left ${buttonText}`}>
                                                <span>Theme</span>
                                                <span className={`${textSecondary} text-xs capitalize`}>{isDark ? 'Dark' : 'Light'}</span>
                                            </button>
                                        </>
                                    )}

                                    {activeSettingsTab === 'quality' && !dataSaver && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className={`px-3 py-2 ${textSecondary} hover:${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1 w-full text-left font-bold uppercase text-xs`}>← {t('quality')}</button>
                                            {['auto', '1080p', '720p', '480p'].map(q => (
                                                <button key={q} onClick={() => { setCurrentQuality(q); setActiveSettingsTab('main'); }} className={`px-3 py-2 ${hoverItem} rounded w-full text-left ${currentQuality === q ? activeItem : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {q === 'auto' ? t('auto') : q}
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'speed' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className={`px-3 py-2 ${textSecondary} hover:${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1 w-full text-left font-bold uppercase text-xs`}>← {t('speed')}</button>
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                                <button key={rate} onClick={() => handleSpeedChange(rate)} className={`px-3 py-2 ${hoverItem} rounded w-full text-left ${playbackRate === rate ? activeItem : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {rate}x
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'audio' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className={`px-3 py-2 ${textSecondary} hover:${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1 w-full text-left font-bold uppercase text-xs`}>← {t('audio')}</button>
                                            
                                            {/* Feature 2: Spatial Audio Toggle */}
                                            <div className={`flex justify-between items-center px-3 py-2 mb-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded mx-2 border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-1">
                                                        <HeadphonesIcon className={`w-3 h-3 ${isDark ? 'text-white' : 'text-black'}`} />
                                                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-black'}`}>{t('spatialAudio')}</span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-500">{t('spatialAudioDesc')}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSpatialAudio(!spatialAudio); }}
                                                    className={`w-8 h-4 rounded-full relative transition-colors ${spatialAudio ? 'bg-blue-500' : 'bg-gray-600'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${spatialAudio ? 'left-4.5' : 'left-0.5'}`} style={{ left: spatialAudio ? '18px' : '2px' }}></div>
                                                </button>
                                            </div>

                                            {['original', 'English', 'Spanish', 'Japanese'].map(track => (
                                                <button key={track} onClick={() => { setCurrentAudio(track); setActiveSettingsTab('main'); }} className={`px-3 py-2 ${hoverItem} rounded w-full text-left ${currentAudio === track ? activeItem : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {track}
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'subtitles' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className={`px-3 py-2 ${textSecondary} hover:${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1 w-full text-left font-bold uppercase text-xs`}>← {t('subtitles')}</button>
                                            {['off', 'English', 'Spanish', 'Japanese'].map(sub => (
                                                <button key={sub} onClick={() => { setCurrentSubtitle(sub); setActiveSettingsTab('main'); }} className={`px-3 py-2 ${hoverItem} rounded w-full text-left ${currentSubtitle === sub ? activeItem : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {sub === 'off' ? t('off') : sub}
                                                </button>
                                            ))}
                                        </>
                                    )}

                                    {activeSettingsTab === 'theme' && (
                                        <>
                                            <button onClick={() => setActiveSettingsTab('main')} className={`px-3 py-2 ${textSecondary} hover:${buttonText} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} mb-1 w-full text-left font-bold uppercase text-xs`}>← Theme</button>
                                            {['dark', 'light'].map(theme => (
                                                <button key={theme} onClick={() => { setPlayerTheme(theme as 'dark' | 'light'); setActiveSettingsTab('main'); }} className={`px-3 py-2 ${hoverItem} rounded w-full text-left capitalize ${playerTheme === theme ? activeItem : isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {theme}
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

// --- PAGE VIEWS ---

const WatchlistView: React.FC<{ onSelect: (c: Content) => void }> = ({ onSelect }) => {
    const { watchlist } = useWatchlist();
    const { t } = useLanguage();
    const items = MOCK_CONTENT.filter(c => watchlist.includes(c.id));

    if (items.length === 0) {
        return (
            <div className="pt-32 px-12 text-center min-h-[50vh]">
                <h2 className="text-2xl font-bold mb-4">{t('myList')}</h2>
                <p className="text-gray-400 mb-8">{t('emptyWatchlist')}</p>
                <div className="bg-gray-900/50 p-8 rounded-xl max-w-2xl mx-auto border border-gray-800 text-left">
                    <h3 className="text-xl font-bold mb-4 text-white">How to build your collection:</h3>
                    <ul className="space-y-4 text-gray-300 text-sm">
                        <li className="flex items-start">
                            <span className="text-red-500 mr-2 font-bold">1.</span>
                            Browse our extensive library of Movies and TV Shows.
                        </li>
                        <li className="flex items-start">
                            <span className="text-red-500 mr-2 font-bold">2.</span>
                            Click on any title to view details.
                        </li>
                        <li className="flex items-start">
                            <span className="text-red-500 mr-2 font-bold">3.</span>
                            Look for the "Add to List" button to save it for later.
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-24 px-4 sm:px-12 pb-12 min-h-screen">
            <h2 className="text-3xl font-bebas text-white mb-6">{t('myList')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map(item => (
                    <div key={item.id} onClick={() => onSelect(item)} className="aspect-[2/3] bg-gray-800 rounded overflow-hidden cursor-pointer hover:scale-105 transition-transform relative group">
                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <PlayIcon className="w-10 h-10 text-white" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CallsView: React.FC = () => {
    const { t } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.JitsiMeetExternalAPI && containerRef.current) {
            const domain = 'meet.jit.si';
            const options = {
                roomName: 'SeikoYTCommunityRoom_Main',
                width: '100%',
                height: 600,
                parentNode: containerRef.current,
                theme: 'dark',
                configOverwrite: { startWithAudioMuted: true },
            };
            const api = new window.JitsiMeetExternalAPI(domain, options);
            return () => api.dispose();
        }
    }, []);

    return (
        <div className="pt-24 px-4 sm:px-12 pb-12 min-h-screen animate-fade-in">
             <h2 className="text-3xl font-bebas text-white mb-6">{t('calls')}</h2>
             
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2">
                     <p className="text-gray-300 mb-6 text-lg">{t('callsDescription')}</p>
                     <div ref={containerRef} className="w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl min-h-[500px] border border-gray-800 relative flex items-center justify-center">
                        {!window.JitsiMeetExternalAPI && (
                            <div className="text-center p-8">
                                <PhoneIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Join the Conversation</h3>
                                <p className="text-gray-400">Loading secure video room...</p>
                            </div>
                        )}
                     </div>
                </div>
                
                <div className="bg-[#181818] p-6 rounded-xl border border-gray-800 h-fit">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Community Guidelines</h3>
                    <ul className="space-y-4 text-sm text-gray-400">
                        <li className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Respect Everyone:</strong> Treat all members with kindness and respect. Harassment is not tolerated.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>No Spoilers:</strong> Please use spoiler warnings when discussing recent episodes.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Keep it Clean:</strong> Avoid inappropriate language or content in public rooms.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Have Fun:</strong> Share your theories, fan art, and love for the shows!</span>
                        </li>
                    </ul>
                    
                    <div className="mt-8 pt-6 border-t border-gray-800">
                        <h4 className="text-white font-bold mb-2">Live Schedule</h4>
                        <div className="bg-white/5 p-3 rounded text-xs text-gray-400">
                            <div className="flex justify-between mb-1"><span>Fridays</span> <span className="text-white">8:00 PM EST</span></div>
                            <div>Weekly Fan Theory Discussion</div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}

const MinigamesView: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="pt-24 px-4 sm:px-12 pb-12 min-h-screen text-center animate-fade-in">
            <h2 className="text-3xl font-bebas text-white mb-6">{t('minigames')}</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-12">Take a break from watching and challenge yourself with our exclusive arcade collection. Compete for the high score!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {['Space Shooter', 'Dino Run', 'Memory Match'].map((game, i) => (
                    <div key={i} className="bg-[#181818] rounded-xl overflow-hidden hover:bg-[#202020] transition-colors cursor-pointer group border border-gray-800 flex flex-col h-full">
                        <div className="h-40 bg-gray-800 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent opacity-50"></div>
                            <GamepadIcon className="w-20 h-20 text-red-500 group-hover:scale-110 transition-transform relative z-10" />
                        </div>
                        <div className="p-6 flex-1 flex flex-col text-left">
                            <h3 className="text-xl font-bold text-white mb-2">{game}</h3>
                            <p className="text-gray-400 text-sm mb-4 flex-1">
                                {i === 0 && "Defend the galaxy against alien invaders in this classic retro shooter."}
                                {i === 1 && "Run as far as you can while dodging obstacles in this endless runner."}
                                {i === 2 && "Test your brain power by matching characters from your favorite shows."}
                            </p>
                            <button className="w-full bg-white/10 hover:bg-red-600 text-white font-bold py-2 rounded transition-colors text-sm uppercase tracking-wide">
                                {t('playGame')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 bg-[#181818] p-8 rounded-xl max-w-4xl mx-auto border border-gray-800">
                <h3 className="text-2xl font-bold text-white mb-6">Leaderboard</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-white/5 text-gray-200">
                            <tr>
                                <th className="px-6 py-3">Rank</th>
                                <th className="px-6 py-3">Player</th>
                                <th className="px-6 py-3">Game</th>
                                <th className="px-6 py-3">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-800 hover:bg-white/5">
                                <td className="px-6 py-4 font-bold text-yellow-500">#1</td>
                                <td className="px-6 py-4 text-white">SeikoFan99</td>
                                <td className="px-6 py-4">Space Shooter</td>
                                <td className="px-6 py-4">12,450</td>
                            </tr>
                            <tr className="border-b border-gray-800 hover:bg-white/5">
                                <td className="px-6 py-4 font-bold text-gray-400">#2</td>
                                <td className="px-6 py-4 text-white">MovieBuff22</td>
                                <td className="px-6 py-4">Dino Run</td>
                                <td className="px-6 py-4">8,920</td>
                            </tr>
                            <tr className="hover:bg-white/5">
                                <td className="px-6 py-4 font-bold text-orange-700">#3</td>
                                <td className="px-6 py-4 text-white">AnimeLoverX</td>
                                <td className="px-6 py-4">Memory Match</td>
                                <td className="px-6 py-4">5,300</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- APP COMPONENT ---

const MainLayout: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [isMiniMode, setIsMiniMode] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    
    const { t } = useLanguage();
    const { history, searchHistory } = useUserHistory();
    const [recommendations, setRecommendations] = useState<string[]>([]);
    
    // Fetch Recommendations
    useEffect(() => {
        const fetchRecs = async () => {
            if (history.length > 0) {
                 const recIds = await getPersonalizedRecommendations(history, [], searchHistory, MOCK_CONTENT);
                 setRecommendations(recIds);
            }
        };
        fetchRecs();
    }, [history, searchHistory]);

    // Handle Content Selection (Play)
    const handlePlay = (content: Content) => {
        setSelectedContent(content);
        setIsMiniMode(false);
    };

    // Filter Logic with Secret Codes (Feature 3)
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lower = searchQuery.toLowerCase().trim();

        // Secret Codes Logic
        const SECRET_CODES: Record<string, string[]> = {
            '6721': ['Sci-Fi', 'Fantasy', 'Animation'], // Anime Sci-Fi Proxy
            '3652': ['History', 'Drama', 'Documentary'], // Bio Docs Proxy
            '8195': ['Horror', 'Thriller'] // B-Horror Proxy
        };

        if (SECRET_CODES[lower]) {
            const genres = SECRET_CODES[lower];
            // Filter content that matches any of the secret genres
            return MOCK_CONTENT.filter(c => c.genre.some(g => genres.includes(g)));
        }

        return MOCK_CONTENT.filter(c => c.title.toLowerCase().includes(lower) || c.description.toLowerCase().includes(lower));
    }, [searchQuery]);

    // Helper to check if current search is a secret code
    const isSecretCodeActive = useMemo(() => {
        return ['6721', '3652', '8195'].includes(searchQuery.trim());
    }, [searchQuery]);

    const getSecretTitle = () => {
        if (searchQuery.trim() === '6721') return t('secretGenre1');
        if (searchQuery.trim() === '3652') return t('secretGenre2');
        if (searchQuery.trim() === '8195') return t('secretGenre3');
        return '';
    };

    const featured = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];
    const recContent = recommendations.map(id => MOCK_CONTENT.find(c => c.id === id)).filter(Boolean) as Content[];
    // Fill if empty
    const displayRecs = recContent.length > 0 ? recContent : MOCK_CONTENT.slice(0, 10);

    const renderContent = () => {
        if (searchQuery) {
            return (
                <div className="pt-24 px-4 sm:px-8 pb-12 min-h-screen animate-fade-in">
                    <h2 className="text-2xl text-white mb-6 font-bold flex items-center gap-2">
                        {isSecretCodeActive ? (
                            <>
                                <span className="text-yellow-400 animate-pulse">🔓 {t('secretUnlocked')}</span>
                                <span className="text-gray-400 text-sm ml-2">({getSecretTitle()})</span>
                            </>
                        ) : (
                            `${t('searchResults')} "${searchQuery}"`
                        )}
                    </h2>
                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {searchResults.map(item => (
                                <div key={item.id} onClick={() => handlePlay(item)} className="cursor-pointer group relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 transition-transform hover:scale-105">
                                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <PlayIcon className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-400 text-center mt-12">{t('noMatches')} "{searchQuery}"</div>
                    )}
                </div>
            );
        }

        switch(currentPage) {
            case 'home':
                return (
                    <div className="pb-20 animate-fade-in">
                        {featured && (
                            <div className="relative h-[85vh] w-full">
                                <div className="absolute inset-0">
                                    <img src={featured.backdropUrl} className="w-full h-full object-cover" alt="Hero" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-black/20 to-transparent" />
                                </div>
                                <div className="absolute bottom-0 left-0 p-8 sm:p-16 max-w-2xl space-y-5">
                                    <div className="flex items-center space-x-2 mb-2">
                                         <span className="text-red-600 font-black tracking-widest uppercase text-xs">Featured</span>
                                    </div>
                                    <h1 className="text-5xl sm:text-7xl font-black text-white font-bebas drop-shadow-xl leading-none">{featured.title}</h1>
                                    
                                    <div className="flex items-center space-x-4 text-sm font-bold text-gray-300">
                                        <span className="text-green-400">98% Match</span>
                                        <span>{featured.releaseYear}</span>
                                        <span className="border border-gray-500 px-1.5 py-0.5 rounded text-xs">{featured.rating}</span>
                                        <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-xs">HD</span>
                                    </div>

                                    <p className="text-gray-200 text-lg line-clamp-3 drop-shadow-md leading-relaxed">{featured.description}</p>
                                    
                                    <div className="flex space-x-4 pt-4">
                                        <button onClick={() => handlePlay(featured)} className="bg-white text-black px-8 py-3.5 rounded-lg font-bold flex items-center space-x-2 hover:bg-gray-200 transition-colors transform hover:scale-105 duration-200">
                                            <PlayIcon className="w-6 h-6" />
                                            <span>{t('play')}</span>
                                        </button>
                                        <button className="bg-gray-600/60 backdrop-blur-md text-white px-8 py-3.5 rounded-lg font-bold flex items-center space-x-2 hover:bg-gray-600/80 transition-colors">
                                            <InfoIcon className="w-6 h-6" />
                                            <span>{t('moreInfo')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="px-4 sm:px-12 -mt-32 relative z-10 space-y-12">
                             {/* Recommended Row */}
                             <section>
                                <h3 className="text-white font-bold text-xl mb-4 flex items-center space-x-2">
                                    <span>{t('recommendedForYou')}</span>
                                    <SparklesIcon className="w-4 h-4 text-yellow-500" />
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                    {displayRecs.map(item => (
                                        <div key={item.id} onClick={() => handlePlay(item)} className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 group relative shadow-lg">
                                            <img src={item.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" alt={item.title} />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <div className="flex justify-center mb-4">
                                                    <div className="bg-red-600 rounded-full p-2 hover:scale-110 transition-transform">
                                                        <PlayIcon className="w-6 h-6 text-white" />
                                                    </div>
                                                </div>
                                                <h4 className="text-white text-xs font-bold truncate">{item.title}</h4>
                                                <div className="flex justify-between items-center text-[10px] text-gray-300 mt-1">
                                                    <span>{item.releaseYear}</span>
                                                    <span className="border border-gray-500 px-1 rounded">{item.rating}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </section>

                             <AdUnit slot="home_middle" />

                             {/* Trending Row (Mock) */}
                             <section>
                                <h3 className="text-white font-bold text-xl mb-4">Trending Now</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                    {MOCK_CONTENT.slice(5, 17).map(item => (
                                        <div key={item.id} onClick={() => handlePlay(item)} className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 group relative shadow-lg">
                                            <img src={item.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" alt={item.title} />
                                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">TOP 10</div>
                                        </div>
                                    ))}
                                </div>
                             </section>
                        </div>
                        <AboutSection />
                        <div className="text-center text-gray-600 text-xs py-8 border-t border-gray-900/50 mt-12 bg-black">
                             {t('copyright')}
                        </div>
                    </div>
                );
            case 'movies':
                 return (
                    <div className="pt-24 px-4 sm:px-12 pb-12 min-h-screen animate-fade-in">
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-3xl text-white font-bebas">{t('allMovies')}</h2>
                            <div className="text-sm text-gray-400">Showing {MOCK_CONTENT.filter(c => c.type === 'movie').length} Titles</div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {MOCK_CONTENT.filter(c => c.type === 'movie').map(item => (
                                <div key={item.id} onClick={() => handlePlay(item)} className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform group relative">
                                    <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt={item.title} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <PlayIcon className="w-12 h-12 text-white opacity-80" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 );
            case 'watchlist':
                 return <WatchlistView onSelect={handlePlay} />;
            case 'calls':
                 return <CallsView />;
            case 'minigames':
                 return <MinigamesView />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-[#141414] min-h-screen text-white font-sans selection:bg-red-500 selection:text-white">
            <Snowfall />
            <Header 
                currentPage={currentPage} 
                onNavigate={setCurrentPage} 
                onSearch={setSearchQuery} 
                searchQuery={searchQuery} 
            />
            
            {renderContent()}

            {selectedContent && (
                <VideoPlayer 
                    id={selectedContent.id}
                    src={selectedContent.videoUrl || ''}
                    title={selectedContent.title}
                    description={selectedContent.description}
                    introStart={selectedContent.introStart}
                    introEnd={selectedContent.introEnd}
                    onClose={() => setSelectedContent(null)}
                    isMiniMode={isMiniMode}
                    toggleMiniMode={() => setIsMiniMode(!isMiniMode)}
                    hasNextEpisode={false} // Would implement for series
                    hasPreviousEpisode={false}
                    drm={selectedContent.drm}
                />
            )}
            
            <button onClick={() => setShowChangelog(true)} className="fixed bottom-4 left-4 text-[10px] text-gray-600 hover:text-white transition-colors z-40 bg-black/20 px-2 py-1 rounded border border-gray-800">v2.4.1</button>
            {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <WatchlistProvider>
                <UserHistoryProvider>
                    <MainLayout />
                </UserHistoryProvider>
            </WatchlistProvider>
        </LanguageProvider>
    );
};

export default App;
