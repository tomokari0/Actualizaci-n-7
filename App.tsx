import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode, Season, DrmConfig, UserProfile } from './types';
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

// --- PROFILE CONTEXT ---

type ProfileContextType = {
    currentProfile: UserProfile | null;
    profiles: UserProfile[];
    switchProfile: (profileId: string) => void;
    addProfile: (name: string) => void;
    deleteProfile: (id: string) => void;
    logout: () => void;
};

const ProfileContext = createContext<ProfileContextType>({
    currentProfile: null,
    profiles: [],
    switchProfile: () => {},
    addProfile: () => {},
    deleteProfile: () => {},
    logout: () => {},
});

export const useProfile = () => useContext(ProfileContext);

const DEFAULT_AVATARS = [
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png",
    "https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png",
    "https://mir-s3-cdn-cf.behance.net/project_modules/disp/64623a33850498.56ba69ac2a6f7.png",
    "https://mir-s3-cdn-cf.behance.net/project_modules/disp/1bdc9a33850498.56ba69ac2ba5b.png",
    "https://mir-s3-cdn-cf.behance.net/project_modules/disp/f9eb71173566935.64936a77af35d.png"
];

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profiles, setProfiles] = useState<UserProfile[]>(() => {
        try {
            const saved = localStorage.getItem('seikoyt_profiles');
            return saved ? JSON.parse(saved) : [{ id: '1', name: 'User 1', avatar: DEFAULT_AVATARS[0] }];
        } catch {
            return [{ id: '1', name: 'User 1', avatar: DEFAULT_AVATARS[0] }];
        }
    });

    const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('seikoyt_profiles', JSON.stringify(profiles));
    }, [profiles]);

    const currentProfile = useMemo(() => 
        profiles.find(p => p.id === currentProfileId) || null
    , [profiles, currentProfileId]);

    const switchProfile = (id: string) => setCurrentProfileId(id);
    
    const logout = () => setCurrentProfileId(null);

    const addProfile = (name: string) => {
        const newProfile: UserProfile = {
            id: Date.now().toString(),
            name,
            avatar: DEFAULT_AVATARS[profiles.length % DEFAULT_AVATARS.length]
        };
        setProfiles([...profiles, newProfile]);
    };

    const deleteProfile = (id: string) => {
        setProfiles(profiles.filter(p => p.id !== id));
        if (currentProfileId === id) setCurrentProfileId(null);
    };

    const value = useMemo(() => ({
        currentProfile,
        profiles,
        switchProfile,
        addProfile,
        deleteProfile,
        logout
    }), [currentProfile, profiles, currentProfileId]);

    return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
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
    const { currentProfile } = useProfile();
    const [watchlist, setWatchlist] = useState<string[]>([]);

    // Load watchlist for current profile
    useEffect(() => {
        if (!currentProfile) {
            setWatchlist([]);
            return;
        }
        try {
            const saved = localStorage.getItem(`seikoyt_watchlist_${currentProfile.id}`);
            setWatchlist(saved ? JSON.parse(saved) : []);
        } catch {
            setWatchlist([]);
        }
    }, [currentProfile]);

    // Save watchlist when it changes
    useEffect(() => {
        if (currentProfile) {
            localStorage.setItem(`seikoyt_watchlist_${currentProfile.id}`, JSON.stringify(watchlist));
        }
    }, [watchlist, currentProfile]);

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
    const { currentProfile } = useProfile();
    
    // State Initializers
    const [history, setHistory] = useState<string[]>([]);
    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>({});
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [likedContent, setLikedContent] = useState<string[]>([]);
    const [dislikedContent, setDislikedContent] = useState<string[]>([]);

    // Load Data on Profile Change
    useEffect(() => {
        if (!currentProfile) return;
        const pid = currentProfile.id;

        try { setHistory(JSON.parse(localStorage.getItem(`seikoyt_watch_history_${pid}`) || '[]')); } catch {}
        try { setWatchProgress(JSON.parse(localStorage.getItem(`seikoyt_watch_progress_${pid}`) || '{}')); } catch {}
        try { setSearchHistory(JSON.parse(localStorage.getItem(`seikoyt_search_history_${pid}`) || '[]')); } catch {}
        try { setLikedContent(JSON.parse(localStorage.getItem(`seikoyt_liked_content_${pid}`) || '[]')); } catch {}
        try { setDislikedContent(JSON.parse(localStorage.getItem(`seikoyt_disliked_content_${pid}`) || '[]')); } catch {}

    }, [currentProfile]);

    // Save Data Effects
    useEffect(() => { if (currentProfile) localStorage.setItem(`seikoyt_watch_history_${currentProfile.id}`, JSON.stringify(history)); }, [history, currentProfile]);
    useEffect(() => { if (currentProfile) localStorage.setItem(`seikoyt_watch_progress_${currentProfile.id}`, JSON.stringify(watchProgress)); }, [watchProgress, currentProfile]);
    useEffect(() => { if (currentProfile) localStorage.setItem(`seikoyt_search_history_${currentProfile.id}`, JSON.stringify(searchHistory)); }, [searchHistory, currentProfile]);
    useEffect(() => { if (currentProfile) localStorage.setItem(`seikoyt_liked_content_${currentProfile.id}`, JSON.stringify(likedContent)); }, [likedContent, currentProfile]);
    useEffect(() => { if (currentProfile) localStorage.setItem(`seikoyt_disliked_content_${currentProfile.id}`, JSON.stringify(dislikedContent)); }, [dislikedContent, currentProfile]);

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
// (Icons kept as is, but memoized to prevent re-renders)
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
const PlusIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
));
const ProfileIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
));

const YouTubeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
));
const InstagramIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.303.06-2.192.267-2.97.568-.804.312-1.486.732-2.165 1.411-.679.679-1.099 1.361-1.411 2.165-.301.778-.508 1.667-.568 2.97-.058 1.28-.072 1.688-.072 4.947-.072s3.667-.014 4.947-.072c1.303-.06 2.192-.267 2.97-.568.804-.312 1.486-.732 2.165-1.411.679-.679 1.099-1.361 1.411-2.165.301-.778.508-1.667.508-2.97-.568-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162-2.759-6.162-6.162zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.441s.645 1.441 1.441 1.441 1.441-.645 1.441-1.441-.645-1.441-1.441-.645-1.441-1.441z"/></svg>
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

const ProfileSelector: React.FC = () => {
    const { profiles, switchProfile, addProfile, deleteProfile } = useProfile();
    const [isAdding, setIsAdding] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleAdd = () => {
        if (newProfileName.trim()) {
            addProfile(newProfileName.trim());
            setNewProfileName('');
            setIsAdding(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#141414] z-[100] flex flex-col items-center justify-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bebas text-white mb-12 tracking-wide">Who's Watching?</h1>
            
            <div className="flex flex-wrap justify-center gap-8 mb-12">
                {profiles.map(profile => (
                    <div key={profile.id} className="group flex flex-col items-center w-32 space-y-4 cursor-pointer relative">
                        <div 
                            className="w-32 h-32 rounded bg-gray-800 overflow-hidden border-2 border-transparent group-hover:border-white transition-all relative"
                            onClick={() => !isEditing && switchProfile(profile.id)}
                        >
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}>
                                    <TrashIcon className="w-8 h-8 text-red-500 hover:scale-110 transition-transform" />
                                </div>
                            )}
                        </div>
                        <span className="text-gray-400 group-hover:text-white text-lg transition-colors">{profile.name}</span>
                    </div>
                ))}

                {/* Add Profile Button */}
                {!isAdding && profiles.length < 5 && (
                    <div className="group flex flex-col items-center w-32 space-y-4 cursor-pointer" onClick={() => setIsAdding(true)}>
                        <div className="w-32 h-32 rounded-full flex items-center justify-center bg-transparent group-hover:bg-white transition-all border-2 border-gray-500 group-hover:border-white">
                            <PlusIcon className="w-16 h-16 text-gray-500 group-hover:text-black transition-colors" />
                        </div>
                        <span className="text-gray-400 group-hover:text-white text-lg transition-colors">Add Profile</span>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="flex flex-col items-center space-y-4 animate-fade-in">
                    <input 
                        type="text" 
                        placeholder="Name" 
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="bg-[#333] border border-gray-600 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-white w-64"
                        autoFocus
                    />
                    <div className="flex space-x-4">
                        <button onClick={handleAdd} className="bg-white text-black px-6 py-2 font-bold hover:bg-red-600 hover:text-white transition-colors">Save</button>
                        <button onClick={() => setIsAdding(false)} className="border border-gray-500 text-gray-500 px-6 py-2 font-bold hover:border-white hover:text-white transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsEditing(!isEditing)}
                className="mt-8 border border-gray-500 text-gray-500 px-8 py-2 font-bold hover:border-white hover:text-white transition-colors uppercase tracking-widest text-sm"
            >
                {isEditing ? 'Done' : 'Manage Profiles'}
            </button>
        </div>
    );
};

// FIX: Add missing LanguageSelector component.
const LanguageSelector: React.FC = () => {
    const { currentLanguage, setLanguage } = useLanguage();
    const { currentProfile, logout } = useProfile();

    return (
        <div className="relative group">
            <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                {currentProfile ? (
                    <img src={currentProfile.avatar} alt="Profile" className="w-8 h-8 rounded" />
                ) : (
                    <GlobeIcon className="w-5 h-5" />
                )}
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-[#181818] border border-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-700 mb-2">
                    <p className="text-xs text-gray-500 font-bold uppercase">Language</p>
                </div>
                {LANGUAGES.slice(0, 5).map((lang) => ( // Show top 5 to keep menu short
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${currentLanguage === lang.code ? 'text-red-500 font-bold' : 'text-gray-300'}`}
                    >
                        {lang.name}
                    </button>
                ))}
                
                <div className="border-t border-gray-700 mt-2 pt-2">
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-red-600 transition-colors">
                        Exit Profile
                    </button>
                </div>
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

// --- LEGAL & INFO COMPONENTS FOR ADSENSE COMPLIANCE ---

const LegalModal: React.FC<{ type: 'privacy' | 'terms'; onClose: () => void }> = ({ type, onClose }) => {
    const { t } = useLanguage();
    const isPrivacy = type === 'privacy';
    
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-2xl flex flex-col animate-scale-in border border-gray-800 max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-black/20">
                    <h3 className="text-xl font-bold">{isPrivacy ? t('privacyPolicy') : t('termsOfService')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto text-sm text-gray-300 leading-relaxed space-y-4">
                    {isPrivacy ? (
                        <>
                            <p><strong>Last Updated: January 2025</strong></p>
                            <p>At SeikoYT, accessible from seikoyt.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by SeikoYT and how we use it.</p>
                            <h4 className="text-white font-bold mt-4">Log Files</h4>
                            <p>SeikoYT follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.</p>
                            <h4 className="text-white font-bold mt-4">Cookies and Web Beacons</h4>
                            <p>Like any other website, SeikoYT uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.</p>
                            <h4 className="text-white font-bold mt-4">Google DoubleClick DART Cookie</h4>
                            <p>Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet.</p>
                        </>
                    ) : (
                        <>
                            <p><strong>Welcome to SeikoYT!</strong></p>
                            <p>These terms and conditions outline the rules and regulations for the use of SeikoYT's Website.</p>
                            <h4 className="text-white font-bold mt-4">Cookies</h4>
                            <p>We employ the use of cookies. By accessing SeikoYT, you agreed to use cookies in agreement with the SeikoYT's Privacy Policy.</p>
                            <h4 className="text-white font-bold mt-4">License</h4>
                            <p>Unless otherwise stated, SeikoYT and/or its licensors own the intellectual property rights for all material on SeikoYT. All intellectual property rights are reserved. You may access this from SeikoYT for your own personal use subjected to restrictions set in these terms and conditions.</p>
                            <h4 className="text-white font-bold mt-4">User Comments</h4>
                            <p>This Agreement shall begin on the date hereof. Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. SeikoYT does not filter, edit, publish or review Comments prior to their presence on the website.</p>
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-gray-800 bg-black/20 text-right">
                    <button onClick={onClose} className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors uppercase text-xs tracking-wider">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const SeikoInfo: React.FC = () => (
  <div className="container mx-auto px-4 py-12 text-gray-400 text-sm border-t border-gray-800/30">
    <div className="max-w-4xl mx-auto text-center space-y-6">
        <h2 className="text-2xl text-white font-bold mb-2 font-bebas tracking-wide">Watch Free Movies & TV Shows</h2>
        <p className="leading-relaxed">
          SeikoYT offers a vast library of free movies and TV series across various genres including Action, Drama, Sci-Fi, and more. 
          Experience high-quality streaming without a subscription. Our platform is supported by ads to keep it free for everyone.
          Whether you are looking for the latest blockbusters, timeless classics, or hidden gems, SeikoYT has something for every taste.
        </p>
        <p className="leading-relaxed">
          Discover original series, blockbuster hits, and indie gems. Create your watchlist, share with friends, and join our community events.
          We are dedicated to providing a seamless viewing experience with features like personalized recommendations, multi-language support, and interactive community tools.
        </p>
    </div>
  </div>
);

const Footer: React.FC<{ onOpenPrivacy: () => void; onOpenTerms: () => void }> = ({ onOpenPrivacy, onOpenTerms }) => {
    const { t } = useLanguage();
    return (
        <footer className="bg-black py-12 border-t border-gray-900 mt-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="relative">
                            <SantaHatIcon className="absolute -top-3 -left-3 w-6 h-6 transform -rotate-12" />
                            <span className="text-2xl font-bebas text-red-500 tracking-wider">SEIKOYT</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                        <button onClick={onOpenPrivacy} className="hover:text-white transition-colors">{t('privacyPolicy')}</button>
                        <button onClick={onOpenTerms} className="hover:text-white transition-colors">{t('termsOfService')}</button>
                        <a href="#" className="hover:text-white transition-colors">Cookie Preferences</a>
                        <a href="#" className="hover:text-white transition-colors">Help Center</a>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-600 space-y-2">
                    <p>{t('copyright')}</p>
                    <p>SeikoYT is a proof-of-concept streaming platform.</p>
                </div>
            </div>
        </footer>
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
    
    // Theme State with Persistence
    const [playerTheme, setPlayerTheme] = useState<'dark' | 'light'>(() => {
        try {
            return (localStorage.getItem('seikoyt_player_theme') as 'dark' | 'light') || 'dark';
        } catch {
            return 'dark';
        }
    });

    useEffect(() => {
        localStorage.setItem('seikoyt_player_theme', playerTheme);
    }, [playerTheme]);
    
    // New Features: Data Saver & Spatial Audio
    const [dataSaver, setDataSaver] = useState(false);
    const [spatialAudio, setSpatialAudio] = useState(false);

    const { updateProgress, watchProgress } = useUserHistory();
    const { t } = useLanguage();

    // Fix for Dependency Cycle: Use Ref for watchProgress
    const watchProgressRef = useRef(watchProgress);
    useEffect(() => {
        watchProgressRef.current = watchProgress;
    }, [watchProgress]);

    // Theme Helpers
    const isDark = playerTheme === 'dark';
    const menuBg = isDark ? 'bg-[#181818]/95 border-gray-700 text-white' : 'bg-white/95 border-gray-200 text-gray-800 shadow-xl';
    const overlayBg = isDark ? 'bg-black/90 border-gray-700' : 'bg-white/95 border-gray-200 shadow-xl';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const hoverItem = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
    const activeItem = 'text-red-500 font-bold';
    const buttonText = isDark ? 'text-white' : 'text-black';
    const cancelBtn = isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800';
    
    // Player UI Theme Variables
    const controlsText = isDark ? 'text-white' : 'text-gray-900';
    const controlsBg = isDark ? 'from-black via-black/80' : 'from-white/90 via-white/80';
    const progressBarBg = isDark ? 'bg-gray-600' : 'bg-gray-300';
    const lightModeStyles = !isDark ? `
        input[type=range].video-progress::-webkit-slider-runnable-track {
            background: rgba(0, 0, 0, 0.1) !important;
        }
    ` : '';

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
                        console.warn('Shaka Player load failed, falling back to native player:', e);
                        // Fallback logic for simple MP4s that Shaka fails to load (e.g. CORS or format issues)
                        await player.unload();
                        video.src = src;
                        try {
                            await video.play();
                        } catch (nativeError) {
                             console.error("Native playback failed:", nativeError);
                        }
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
             // Restore watch progress here using ref to avoid dependency cycle
             const savedProgress = watchProgressRef.current[id];
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
    }, [id, updateProgress, introStart, introEnd, drm, src]); // Removed watchProgress to fix loop/error

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
            <style>{lightModeStyles}</style>
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
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t ${controlsBg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end`}>
                
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
                    className={`w-full h-1 ${progressBarBg} rounded-lg appearance-none cursor-pointer video-progress mb-4`}
                />
                
                <div className="flex justify-between items-center">
                    
                    {/* Left Controls */}
                    <div className="flex items-center space-x-4">
                        {/* Previous Episode Button */}
                        {hasPreviousEpisode && onPrevious && (
                             <button onClick={(e) => { e.stopPropagation(); onPrevious(); }} className={`${controlsText} hover:text-red-500 transition-colors flex items-center space-x-1`} title={t('previousEpisode')}>
                                <SkipPreviousIcon className="w-8 h-8" />
                            </button>
                        )}

                         <button onClick={togglePlay} className={`${controlsText} hover:text-red-500 transition-colors`}>
                            {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                        </button>
                        
                        {/* Next Episode Button */}
                        {hasNextEpisode && onNext && (
                             <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`${controlsText} hover:text-red-500 transition-colors flex items-center space-x-1`} title={t('nextEpisode')}>
                                <SkipNextIcon className="w-8 h-8" />
                            </button>
                        )}

                        {/* Volume Control */}
                        <div className="flex items-center space-x-2 group/volume relative">
                            <button onClick={toggleMute} className={`${controlsText} hover:text-red-500 transition-colors`}>
                                {isMuted || volume === 0 ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={isMuted ? 0 : volume} 
                                onChange={handleVolumeChange} 
                                className={`w-20 h-1 ${progressBarBg} rounded-lg appearance-none cursor-pointer video-progress opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200`} 
                            />
                        </div>
                        
                        <div className={`${controlsText} text-sm font-mono tracking-wider`}>{formatTime(currentTime)} / {formatTime(duration)}</div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center space-x-4 relative">
                         
                         {/* Settings Menu */}
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setActiveSettingsTab('main'); }} 
                                className={`${controlsText} hover:text-red-500 transition-colors p-1 ${showSettings ? 'rotate-90' : ''} transform duration-300`}
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                            
                            {/* Auto Quality Badge (Visible) */}
                            <span className={`hidden md:inline-block text-[10px] font-bold ${textSecondary} border ${isDark ? 'border-gray-600' : 'border-gray-300'} px-1.5 py-0.5 rounded ml-2 uppercase tracking-wide`}>
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
                        <button onClick={togglePiP} className={`${controlsText} hover:text-red-500 transition-colors p-1`} title="Picture-in-Picture">
                            <PipIcon className="w-6 h-6" />
                        </button>

                        {/* Custom Mini Mode */}
                        {!isMiniMode && (
                            <button onClick={toggleMiniMode} className={`${controlsText} hover:text-red-500 transition-colors p-1`} title="Mini Player">
                                <MinimizeIcon className="w-6 h-6" />
                            </button>
                        )}

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className={`${controlsText} hover:text-red-500 transition-colors p-1`} title="Fullscreen">
                            {isFullscreen ? <MinimizeIcon className="w-6 h-6" /> : <FullscreenIcon className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContentCard: React.FC<{ item: Content; onPlay: () => void; progress?: { currentTime: number; duration: number } }> = ({ item, onPlay, progress }) => {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
    const { toggleLike, isLiked, toggleDislike, isDisliked } = useUserHistory();
    const inList = isInWatchlist(item.id);
    const liked = isLiked(item.id);
    const disliked = isDisliked(item.id);

    const percent = progress ? (progress.currentTime / progress.duration) * 100 : 0;

    return (
        <div className="group relative bg-[#181818] rounded-md overflow-hidden transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-2xl border border-transparent hover:border-gray-700">
            <div className="aspect-[16/9] relative cursor-pointer" onClick={onPlay}>
                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                {progress && percent < 95 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div className="h-full bg-red-600" style={{ width: `${percent}%` }}></div>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayIcon className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
            </div>
            
            <div className="p-3 absolute inset-x-0 bottom-0 bg-[#181818] translate-y-full group-hover:translate-y-0 transition-transform duration-300 shadow-xl z-30">
                 <div className="flex justify-between items-start mb-2">
                     <div className="flex space-x-2">
                         <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="bg-white text-black rounded-full p-1 hover:bg-gray-200"><PlayIcon className="w-4 h-4" /></button>
                         <button onClick={(e) => { e.stopPropagation(); inList ? removeFromWatchlist(item.id) : addToWatchlist(item.id); }} className="border border-gray-500 rounded-full p-1 hover:border-white text-gray-300 hover:text-white">
                             {inList ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> : <PlusIcon className="w-4 h-4" />}
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }} className={`border border-gray-500 rounded-full p-1 hover:border-white ${liked ? 'text-green-500 border-green-500' : 'text-gray-300 hover:text-white'}`}>
                             <ThumbUpIcon className="w-4 h-4" filled={liked} />
                         </button>
                         <button onClick={(e) => { e.stopPropagation(); toggleDislike(item.id); }} className={`border border-gray-500 rounded-full p-1 hover:border-white ${disliked ? 'text-red-500 border-red-500' : 'text-gray-300 hover:text-white'}`}>
                             <ThumbDownIcon className="w-4 h-4" filled={disliked} />
                         </button>
                     </div>
                 </div>
                 <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{item.title}</h4>
                 <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-bold">
                     <span className="text-green-400">98% Match</span>
                     <span className="border border-gray-600 px-1 rounded">{item.rating}</span>
                     <span>{item.releaseYear}</span>
                 </div>
                 <div className="flex flex-wrap gap-1 mt-2">
                     {item.genre.slice(0, 3).map(g => (
                         <span key={g} className="text-[9px] text-gray-500">{g}</span>
                     ))}
                 </div>
            </div>
        </div>
    );
};

const ContentRow: React.FC<{ title: string; items: Content[]; onPlay: (c: Content) => void; progressMap?: Record<string, { currentTime: number; duration: number }> }> = ({ title, items, onPlay, progressMap }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="space-y-2 group/row">
             <div className="flex justify-between items-end px-1">
                <h3 className="text-lg md:text-xl font-bold text-gray-200 group-hover/row:text-white transition-colors">{title}</h3>
                <div className="hidden md:flex space-x-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button onClick={() => scroll('left')} className="p-1 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors"><SkipPreviousIcon className="w-4 h-4" /></button>
                    <button onClick={() => scroll('right')} className="p-1 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors"><SkipNextIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <div ref={scrollRef} className="flex space-x-4 overflow-x-auto pb-8 scrollbar-hide scroll-smooth px-1">
                {items.map(item => (
                    <div key={item.id} className="flex-none w-[160px] md:w-[220px]">
                        <ContentCard item={item} onPlay={() => onPlay(item)} progress={progressMap?.[item.id]} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const MainApp: React.FC = () => {
    const { currentProfile } = useProfile();
    const { t } = useLanguage();
    const { watchlist } = useWatchlist();
    const { history, watchProgress, searchHistory, likedContent, toggleLike, toggleDislike, isLiked, isDisliked } = useUserHistory();
    
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [filteredContent, setFilteredContent] = useState<Content[]>(MOCK_CONTENT);

    // Initial Recommendations
    useEffect(() => {
        if (currentProfile) {
            const fetchRecommendations = async () => {
                const watchedTitles = history.map(id => MOCK_CONTENT.find(c => c.id === id)?.title || '').filter(Boolean);
                const likedTitles = likedContent.map(id => MOCK_CONTENT.find(c => c.id === id)?.title || '').filter(Boolean);
                
                // Only fetch if we have some data to personalize or at least every once in a while
                // For now, always fetch if empty to show something 'smart'
                if (recommendations.length === 0) {
                     const recIds = await getPersonalizedRecommendations(
                        watchedTitles, 
                        likedTitles, 
                        searchHistory, 
                        MOCK_CONTENT.map(c => ({ id: c.id, title: c.title, description: c.description, genre: c.genre }))
                    );
                    setRecommendations(recIds);
                }
            };
            fetchRecommendations();
        }
    }, [currentProfile, history, likedContent, searchHistory]); // simplified deps

    // Search Logic
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredContent(MOCK_CONTENT);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = MOCK_CONTENT.filter(c => 
                c.title.toLowerCase().includes(lowerQuery) || 
                c.description.toLowerCase().includes(lowerQuery) ||
                c.genre.some(g => g.toLowerCase().includes(lowerQuery))
            );
            setFilteredContent(filtered);
            if (currentPage !== 'search') setCurrentPage('search');
        }
    }, [searchQuery]);

    // Handle play content
    const handlePlay = (content: Content, episode?: Episode) => {
        setSelectedContent(content);
        if (content.type === 'series') {
            setSelectedEpisode(episode || getFirstEpisode(content));
        } else {
            setSelectedEpisode(null);
        }
        setIsMiniPlayer(false);
    };

    const handleClosePlayer = () => {
        setSelectedContent(null);
        setSelectedEpisode(null);
        setIsMiniPlayer(false);
    };

    const handleNextEpisode = () => {
        if (selectedContent && selectedContent.type === 'series' && selectedEpisode) {
            const next = getNextEpisode(selectedContent, selectedEpisode.id);
            if (next) setSelectedEpisode(next);
        }
    };
    
    const handlePreviousEpisode = () => {
        if (selectedContent && selectedContent.type === 'series' && selectedEpisode) {
            const prev = getPreviousEpisode(selectedContent, selectedEpisode.id);
            if (prev) setSelectedEpisode(prev);
        }
    };

    if (!currentProfile) {
        return <ProfileSelector />;
    }

    const featuredContent = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];
    const trendingContent = MOCK_CONTENT.slice(0, 5);
    const recommendedItems = recommendations.map(id => MOCK_CONTENT.find(c => c.id === id)).filter(Boolean) as Content[];
    const continueWatchingItems = history.map(id => MOCK_CONTENT.find(c => c.id === id)).filter(c => c && watchProgress[c.id]?.currentTime > 0) as Content[];

    const videoSrc = selectedContent?.type === 'series' && selectedEpisode ? selectedEpisode.videoUrl : selectedContent?.videoUrl;
    const videoTitle = selectedContent?.type === 'series' && selectedEpisode ? `${selectedContent.title}: ${selectedEpisode.title}` : selectedContent?.title;
    const videoDesc = selectedContent?.type === 'series' && selectedEpisode ? selectedEpisode.description : selectedContent?.description;
    
    const hasNext = selectedContent?.type === 'series' && selectedEpisode ? !!getNextEpisode(selectedContent, selectedEpisode.id) : false;
    const hasPrev = selectedContent?.type === 'series' && selectedEpisode ? !!getPreviousEpisode(selectedContent, selectedEpisode.id) : false;

    return (
        <div className="bg-[#141414] min-h-screen text-white font-sans selection:bg-red-500 selection:text-white pb-20">
            <Snowfall />
            <Header 
                onNavigate={setCurrentPage} 
                currentPage={currentPage} 
                onSearch={setSearchQuery} 
                searchQuery={searchQuery}
            />

            <main className="pt-16 md:pt-20">
                {currentPage === 'home' && (
                    <>
                        {/* Hero Section */}
                        {!searchQuery && (
                            <div className="relative h-[56.25vw] max-h-[85vh] w-full">
                                <div className="absolute inset-0">
                                    <img src={featuredContent.backdropUrl} alt={featuredContent.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
                                </div>
                                <div className="absolute bottom-[20%] left-[4%] max-w-xl space-y-4 z-10 animate-fade-in-up">
                                    <h2 className="text-5xl md:text-7xl font-bebas text-white drop-shadow-lg">{featuredContent.title}</h2>
                                    <p className="text-gray-200 text-sm md:text-lg line-clamp-3 drop-shadow-md">{featuredContent.description}</p>
                                    <div className="flex space-x-4 pt-4">
                                        <button 
                                            onClick={() => handlePlay(featuredContent)}
                                            className="bg-white text-black px-6 py-2 md:px-8 md:py-3 rounded flex items-center font-bold hover:bg-gray-200 transition-colors"
                                        >
                                            <PlayIcon className="w-6 h-6 mr-2" /> {t('play')}
                                        </button>
                                        <button 
                                            className="bg-gray-500/70 text-white px-6 py-2 md:px-8 md:py-3 rounded flex items-center font-bold hover:bg-gray-500/50 transition-colors backdrop-blur-sm"
                                        >
                                            <InfoIcon className="w-6 h-6 mr-2" /> {t('moreInfo')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="px-4 md:px-12 space-y-12 -mt-10 relative z-20">
                            {continueWatchingItems.length > 0 && (
                                <ContentRow title={t('continueWatching')} items={continueWatchingItems} onPlay={handlePlay} progressMap={watchProgress} />
                            )}
                            
                            {recommendedItems.length > 0 && (
                                <ContentRow title={t('recommendedForYou')} items={recommendedItems} onPlay={handlePlay} />
                            )}

                             <ContentRow title="Trending Now" items={trendingContent} onPlay={handlePlay} />
                             <AdUnit slot="1234567890" />
                             <ContentRow title={t('allMovies')} items={MOCK_CONTENT} onPlay={handlePlay} />
                        </div>
                    </>
                )}

                {currentPage === 'movies' && (
                    <div className="px-4 md:px-12 pt-8">
                        <h2 className="text-2xl font-bold mb-6 font-bebas tracking-wide text-red-500">{t('movies')}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {MOCK_CONTENT.filter(c => c.type === 'movie').map(item => (
                                <ContentCard key={item.id} item={item} onPlay={() => handlePlay(item)} />
                            ))}
                        </div>
                    </div>
                )}
                
                {currentPage === 'search' && (
                    <div className="px-4 md:px-12 pt-8">
                        <h2 className="text-2xl font-bold mb-6 font-bebas tracking-wide text-red-500">
                             {searchQuery ? `${t('resultsFor')} "${searchQuery}"` : t('searchPlaceholder')}
                        </h2>
                         {filteredContent.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredContent.map(item => (
                                    <ContentCard key={item.id} item={item} onPlay={() => handlePlay(item)} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 mt-20">
                                <p>{t('noMatches')} "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}
                
                {currentPage === 'watchlist' && (
                     <div className="px-4 md:px-12 pt-8">
                        <h2 className="text-2xl font-bold mb-6 font-bebas tracking-wide text-red-500">{t('myList')}</h2>
                        {watchlist.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {watchlist.map(id => {
                                    const item = MOCK_CONTENT.find(c => c.id === id);
                                    return item ? <ContentCard key={id} item={item} onPlay={() => handlePlay(item)} /> : null;
                                })}
                            </div>
                        ) : (
                             <div className="text-center text-gray-500 mt-20">
                                <p>{t('emptyWatchlist')}</p>
                            </div>
                        )}
                    </div>
                )}

                {currentPage === 'calls' && (
                    <div className="px-4 md:px-12 pt-8 text-center">
                         <h2 className="text-2xl font-bold mb-6 font-bebas tracking-wide text-red-500">{t('calls')}</h2>
                         <p className="text-gray-400">{t('callsDescription')}</p>
                         <div className="mt-8 p-8 border border-gray-800 rounded bg-gray-900">
                             <p>{t('comingSoon')}</p>
                         </div>
                    </div>
                )}
                
                {currentPage === 'minigames' && (
                     <div className="px-4 md:px-12 pt-8 text-center">
                         <h2 className="text-2xl font-bold mb-6 font-bebas tracking-wide text-red-500">{t('minigames')}</h2>
                         <p className="text-gray-400">{t('minigamesDesc')}</p>
                         <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                             {['Snake', 'Tetris', 'PacMan'].map(game => (
                                 <div key={game} className="aspect-video bg-gray-800 rounded flex items-center justify-center border border-gray-700 hover:border-red-500 transition-colors cursor-pointer group">
                                     <GamepadIcon className="w-12 h-12 text-gray-600 group-hover:text-white transition-colors" />
                                     <span className="ml-2 font-bebas text-xl text-gray-400 group-hover:text-white transition-colors">{game}</span>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}
            </main>

            <SeikoInfo />
            <Footer onOpenPrivacy={() => setShowPrivacy(true)} onOpenTerms={() => setShowTerms(true)} />
            
            {selectedContent && videoSrc && (
                <VideoPlayer 
                    id={selectedEpisode ? selectedEpisode.id : selectedContent.id}
                    src={videoSrc}
                    title={videoTitle || ''}
                    description={videoDesc || ''}
                    introStart={selectedEpisode ? selectedEpisode.introStart : selectedContent.introStart}
                    introEnd={selectedEpisode ? selectedEpisode.introEnd : selectedContent.introEnd}
                    onClose={handleClosePlayer}
                    isMiniMode={isMiniPlayer}
                    toggleMiniMode={() => setIsMiniPlayer(!isMiniPlayer)}
                    onNext={hasNext ? handleNextEpisode : undefined}
                    hasNextEpisode={hasNext}
                    onPrevious={hasPrev ? handlePreviousEpisode : undefined}
                    hasPreviousEpisode={hasPrev}
                    drm={selectedContent.drm}
                />
            )}

            {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
            {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
            {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
            
             <div className="fixed bottom-4 left-4 z-30">
                <button onClick={() => setShowChangelog(true)} className="text-xs text-gray-500 hover:text-white transition-colors bg-black/50 px-2 py-1 rounded border border-gray-800">
                    v2.1.0
                </button>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
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
};

export default App;