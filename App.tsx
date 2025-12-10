import React, { useState, useEffect, useRef, createContext, useContext, useMemo, useCallback } from 'react';
import { Content, Episode } from './types';
import { MOCK_CONTENT, LANGUAGES, TRANSLATIONS } from './constants';
// Gemini service imports removed as features are deactivated.

// FIX: Define custom element as a component variable to bypass strict IntrinsicElements type checking.
const HyvorTalkComments = 'hyvor-talk-comments' as unknown as React.ComponentType<any>;

// FIX: Declare global interface for Jitsi API to avoid TypeScript errors without installing types
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

// --- HELPER & UTILITY ---

const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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

    // Memoize translations map to prevent recreation on every render
    const translations = useMemo(() => TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'], [currentLanguage]);

    const t = useCallback((key: string) => {
        return translations[key] || TRANSLATIONS['en'][key] || key;
    }, [translations]);

    // Handle RTL for Arabic
    useEffect(() => {
        document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLanguage;
    }, [currentLanguage]);

    const value = useMemo(() => ({ currentLanguage, setLanguage: setCurrentLanguage, t }), [currentLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
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
            const saved = localStorage.getItem('seiko_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load watchlist", e);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('seiko_watchlist', JSON.stringify(watchlist));
        } catch (e) {
            console.error("Failed to save watchlist", e);
        }
    }, [watchlist]);

    const addToWatchlist = useCallback((id: string) => {
        setWatchlist(prev => {
            if (!prev.includes(id)) return [...prev, id];
            return prev;
        });
    }, []);

    const removeFromWatchlist = useCallback((id: string) => {
        setWatchlist(prev => prev.filter(itemId => itemId !== id));
    }, []);

    const isInWatchlist = useCallback((id: string) => watchlist.includes(id), [watchlist]);

    const value = useMemo(() => ({ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }), [watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist]);

    return (
        <WatchlistContext.Provider value={value}>
            {children}
        </WatchlistContext.Provider>
    );
};

// --- USER HISTORY CONTEXT (For Recommendations & Continue Watching) ---

type WatchProgress = {
    currentTime: number;
    duration: number;
    lastWatched: number;
};

type UserHistoryContextType = {
    history: string[]; // List of content IDs watched
    watchProgress: Record<string, WatchProgress>; // Progress details
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
            const saved = localStorage.getItem('seiko_watch_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load history", e);
            return [];
        }
    });

    const [watchProgress, setWatchProgress] = useState<Record<string, WatchProgress>>(() => {
        try {
            const saved = localStorage.getItem('seiko_watch_progress');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load watch progress", e);
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('seiko_watch_history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    }, [history]);

    useEffect(() => {
        try {
            localStorage.setItem('seiko_watch_progress', JSON.stringify(watchProgress));
        } catch (e) {
            console.error("Failed to save watch progress", e);
        }
    }, [watchProgress]);

    const addToHistory = useCallback((id: string) => {
        setHistory(prev => {
            // Remove if already exists to move it to the end (most recent)
            const filtered = prev.filter(itemId => itemId !== id);
            return [...filtered, id];
        });
    }, []);

    const updateProgress = useCallback((id: string, currentTime: number, duration: number) => {
        setWatchProgress(prev => ({
            ...prev,
            [id]: { currentTime, duration, lastWatched: Date.now() }
        }));
    }, []);

    const value = useMemo(() => ({ history, watchProgress, addToHistory, updateProgress }), [history, watchProgress, addToHistory, updateProgress]);

    return (
        <UserHistoryContext.Provider value={value}>
            {children}
        </UserHistoryContext.Provider>
    );
};

// --- ICONS ---
// Memoize icons to prevent re-renders (though they are light, it's good practice)
const PlayIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>
));
const PauseIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
));
const VolumeUpIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
));
const VolumeOffIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
));
const SubtitlesIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"></path></svg>
));
const FullscreenIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>
));
const InfoIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
));
const CloseIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
));
const HeartIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
));
const SettingsIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c.59-.24 1.13.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>
));
const MinimizeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"></path></svg>
));
const ExpandIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"></path></svg>
));
const SearchIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
));
const CheckCircleIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
));
const GlobeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
));
const PlusIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
));
const CheckIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>
);
const PiPIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.97h18v14.04z"></path></svg>
));
const ShareIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.66 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"></path></svg>
));
const PhoneIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1.01A11.36 11.36 0 0 1 8.59 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 17 17 0 0 0 17 17c.55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
));

// Social Icons
const YouTubeIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="YouTube"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
));
const InstagramIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="Instagram"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
));
const TikTokIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="TikTok"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0-1 13.6 6.84 6.84 0 0 0 6.45-6.84V6.76a7.69 7.69 0 0 0 4.25 1.74v-3.4a4.39 4.39 0 0 1-0.47-0.41z"/></svg>
));
const TwitchIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="Twitch"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
));
const DiscordIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="Discord"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561 19.9035 19.9035 0 005.9937 3.0314.0777.0777 0 00.0842-.0276 14.1847 14.1847 0 001.2262-1.9942.076.076 0 00-.0416-.1057 13.0843 13.0843 0 01-1.872-1.022.0766.0766 0 01-.0076-.1277 10.7495 10.7495 0 00.3718-.2917.0754.0754 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0738.0738 0 01.0785.0095c.1202.0984.246.1983.3728.2925a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873 1.022.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286 19.839 19.839 0 006.0028-3.0314.077.077 0 00.0322-.0543c.4928-5.1774-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
));
const TwitterIcon: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-label="X (Twitter)"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
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


// Removed SplashScreen as requested


type Page = 'home' | 'movies' | 'search' | 'watchlist' | 'calls';


const LanguageSelector: React.FC = () => {
    const { currentLanguage, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const handleLanguageChange = (code: string) => {
        setLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Select Language"
            >
                <GlobeIcon className="w-5 h-5 mr-1" />
                <span className="uppercase text-xs font-bold">{currentLanguage.split('-')[0]}</span>
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-black/90 border border-gray-800 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
                    <div className="max-h-64 overflow-y-auto scrollbar-hide">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 flex items-center justify-between transition-colors focus:outline-none focus:bg-white/20 ${currentLanguage === lang.code ? 'text-red-500 font-bold bg-white/5' : 'text-gray-200'}`}
                            >
                                <span>{lang.name}</span>
                                {currentLanguage === lang.code && <span className="text-xs bg-red-500 text-white rounded-full w-2 h-2"></span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Backdrop to close */}
            {isOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true"></div>
            )}
        </div>
    );
};


const Header: React.FC<{
    onNavigate: (page: Page) => void;
    currentPage: Page;
    onSearch: (query: string) => void;
    searchQuery: string;
}> = ({ onNavigate, currentPage, onSearch, searchQuery }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const { t } = useLanguage();
   
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
   
    const navLinkClasses = (page: Page) =>
        `cursor-pointer transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-[-4px] after:h-[2px] after:w-full after:bg-red-500 after:transition-transform after:duration-300 focus:outline-none focus:text-white ${currentPage === page ? 'text-white font-bold after:scale-x-100' : 'text-gray-300 hover:text-white after:scale-x-0 hover:after:scale-x-100'}`;


    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                <div className="flex items-center space-x-8">
                    <h1 className="text-3xl md:text-4xl text-red-500 font-bebas tracking-wider cursor-pointer" onClick={() => onNavigate('home')} tabIndex={0} role="button" aria-label="SeikoYT Home">SEIKOYT</h1>
                    <nav className="hidden lg:flex items-center space-x-6 font-medium">
                        <button onClick={() => onNavigate('home')} className={navLinkClasses('home')}>{t('home')}</button>
                        <button onClick={() => onNavigate('movies')} className={navLinkClasses('movies')}>{t('movies')}</button>
                        <button onClick={() => onNavigate('watchlist')} className={navLinkClasses('watchlist')}>{t('myList')}</button>
                        <button onClick={() => onNavigate('calls')} className={navLinkClasses('calls')}>{t('calls')}</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative hidden sm:block">
                        <label htmlFor="search-input" className="sr-only">{t('searchPlaceholder')}</label>
                        <input
                            id="search-input"
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            className="bg-black/50 border border-gray-600 rounded-full px-4 py-1.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 w-32 md:w-48 lg:w-64 transition-all focus:w-40 md:focus:w-56 lg:focus:w-72 placeholder-gray-400"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                    
                    <LanguageSelector />

                    <button
                        onClick={() => onNavigate('calls')}
                        className="lg:hidden text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                        aria-label="Calls"
                    >
                         <PhoneIcon className="w-6 h-6" />
                    </button>
                    <a
                        href="https://www.patreon.com/c/SeikoVT?vanity=user"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center space-x-2 border border-red-500 text-red-500 font-medium px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label="Donate on Patreon"
                    >
                        <HeartIcon className="w-5 h-5" />
                        <span>Doname :)</span>
                    </a>
                </div>
            </div>
        </header>
    );
};




const HeroBanner: React.FC<{ content: Content; onDetailsClick: () => void; onPlayClick: () => void }> = ({ content, onDetailsClick, onPlayClick }) => {
    const { t } = useLanguage();
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const inWatchlist = isInWatchlist(content.id);

    const toggleWatchlist = () => {
        if (inWatchlist) removeFromWatchlist(content.id);
        else addToWatchlist(content.id);
    };

    return (
        <div className="relative h-screen -mb-40 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <img src={content.backdropUrl} alt="" role="presentation" className="w-full h-full object-cover animate-kenburns" loading="lazy" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col justify-end pb-52 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-bebas text-white tracking-wide animate-fade-in-up">{content.title}</h2>
                    <p className="mt-4 text-gray-200 text-base md:text-lg max-w-xl animate-fade-in-up animate-fade-in-up-delay-1">{content.description}</p>
                    <div className="mt-8 flex space-x-4 animate-fade-in-up animate-fade-in-up-delay-2">
                        <button onClick={onPlayClick} className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/30 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white">
                            <PlayIcon className="w-6 h-6 mr-2" />
                            {t('play')}
                        </button>
                        <button onClick={onDetailsClick} className="flex items-center bg-black/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/40 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white">
                            <InfoIcon className="w-6 h-6 mr-2" />
                            {t('moreInfo')}
                        </button>
                        <button onClick={toggleWatchlist} className="flex items-center bg-black/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/40 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white" aria-label={inWatchlist ? t('removeFromList') : t('addToList')}>
                            {inWatchlist ? <CheckIcon className="w-6 h-6 mr-2" /> : <PlusIcon className="w-6 h-6 mr-2" />}
                            {inWatchlist ? t('removeFromList') : t('addToList')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};




// Memoize ContentCard to prevent re-renders on every scroll or minor state change
const ContentCard: React.FC<{ content: Content; onCardClick: () => void; progress?: number }> = React.memo(({ content, onCardClick, progress }) => (
    <button 
        className="w-full group text-left block focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg" 
        onClick={onCardClick}
        aria-label={`View details for ${content.title}`}
    >
        <div className="aspect-[2/3] overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-105 group-hover:ring-2 ring-white/70 relative">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" loading="lazy" />
            {progress !== undefined && progress > 0 && progress < 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
                    <div className="h-full bg-red-600" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    </button>
));








// Memoize ContentRow to avoid re-rendering entire rows when only one row changes or on scroll
const ContentRow: React.FC<{ title: string; contents: Content[]; onCardClick: (content: Content) => void; getProgress?: (id: string) => number }> = React.memo(({ title, contents, onCardClick, getProgress }) => (
    <div className="mb-12">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 sm:px-6 lg:px-8">{title}</h3>
        <div className="grid grid-flow-col auto-cols-[10rem] sm:auto-cols-[12rem] md:auto-cols-[14rem] gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 scrollbar-hide">
            {contents.map(content => (
                <ContentCard 
                    key={content.id} 
                    content={content} 
                    onCardClick={() => onCardClick(content)} 
                    progress={getProgress ? getProgress(content.id) : undefined}
                />
            ))}
        </div>
    </div>
));




const MoviesPage: React.FC<{ contents: Content[]; onCardClick: (content: Content) => void }> = ({ contents, onCardClick }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bebas text-white mb-8">{t('allMovies')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {contents.map(content => (
                    <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
                ))}
            </div>
        </div>
    );
};


const SearchPage: React.FC<{
    query: string;
    results: Content[];
    isSearching: boolean;
    onCardClick: (content: Content) => void
}> = ({ query, results, isSearching, onCardClick }) => {
    const { t } = useLanguage();
    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
            <h2 className="text-4xl font-bebas text-white mb-4">{t('searchResults')}</h2>
            <p className="text-gray-400 mb-8">{t('resultsFor')} "{query}"</p>
        
            {isSearching ? (
                <div className="flex justify-center py-20">
                    <LoadingSpinner />
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {results.map(content => (
                        <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">{t('noMatches')} "{query}"</p>
                </div>
            )}
        </div>
    );
};

const WatchlistPage: React.FC<{ onCardClick: (content: Content) => void }> = ({ onCardClick }) => {
    const { t } = useLanguage();
    const { watchlist } = useWatchlist();
    
    // Filter global content based on saved IDs
    const savedContent = useMemo(() => MOCK_CONTENT.filter(c => watchlist.includes(c.id)), [watchlist]);

    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
            <h2 className="text-4xl font-bebas text-white mb-8">{t('myList')}</h2>
            {savedContent.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {savedContent.map(content => (
                        <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <HeartIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">{t('emptyWatchlist')}</p>
                </div>
            )}
        </div>
    );
};

const CallsPage: React.FC = () => {
    const { t } = useLanguage();
    const [roomName, setRoomName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isCallStarted, setIsCallStarted] = useState(false);
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const [jitsiApi, setJitsiApi] = useState<any>(null);

    // Restore call state from session storage on mount
    useEffect(() => {
        const activeCall = sessionStorage.getItem('seiko_call_active');
        if (activeCall) {
            try {
                const { room, name } = JSON.parse(activeCall);
                if (room && name) {
                    setRoomName(room);
                    setDisplayName(name);
                    setIsCallStarted(true);
                }
            } catch (e) {
                console.error("Error parsing saved call state", e);
            }
        }
    }, []);

    useEffect(() => {
        // Load Jitsi script
        if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement("script");
            script.src = "https://meet.jit.si/external_api.js";
            script.async = true;
            document.body.appendChild(script);
        }
        
        return () => {
            if (jitsiApi) {
                jitsiApi.dispose();
            }
        };
    }, []);

    const startCall = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomName || !displayName) return;
        
        // Persist call state
        sessionStorage.setItem('seiko_call_active', JSON.stringify({ room: roomName, name: displayName }));
        setIsCallStarted(true);
    };

    const handleExitCall = () => {
        if (jitsiApi) jitsiApi.dispose();
        sessionStorage.removeItem('seiko_call_active');
        setIsCallStarted(false);
        setJitsiApi(null);
    };

    useEffect(() => {
        if (isCallStarted && window.JitsiMeetExternalAPI && jitsiContainerRef.current) {
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
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    // Hide the Jitsi close button so user uses our custom Exit button
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                        'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                        'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                        'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                        'security'
                    ],
                }
            };
            const api = new window.JitsiMeetExternalAPI(domain, options);
            setJitsiApi(api);
            
            // NOTE: We do NOT listen to videoConferenceLeft here to prevent accidental closures
            // when Jitsi redirects for authentication or other internal reasons.
            // User must explicitly click the "Exit" button in our UI.
        }
    }, [isCallStarted]);

    if (isCallStarted) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col pt-16 md:pt-20">
                 <div className="absolute top-4 right-4 z-[60]">
                    <button 
                        onClick={handleExitCall}
                        className="bg-red-600 text-white px-4 py-2 rounded-full font-bold hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Exit Call"
                    >
                        Exit
                    </button>
                 </div>
                 <div ref={jitsiContainerRef} className="w-full h-full" />
            </div>
        );
    }

    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
             <div className="w-full max-w-md bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-center mb-8">
                    <PhoneIcon className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-3xl font-bebas text-white mb-2">{t('calls')}</h2>
                    <p className="text-gray-400">{t('callsDescription')}</p>
                </div>

                <form onSubmit={startCall} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="displayName" className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('displayName')}</label>
                        <input 
                            id="displayName"
                            required 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={t('enterDisplayName')}
                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors focus:ring-1 focus:ring-red-500" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="roomName" className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('roomName')}</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-gray-500">SeikoYT-</span>
                            <input 
                                id="roomName"
                                required 
                                type="text" 
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                placeholder={t('enterRoomName')}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 pl-24 text-white focus:outline-none focus:border-red-500 transition-colors focus:ring-1 focus:ring-red-500" 
                            />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-red-600/20 transition-transform transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        {t('joinCall')}
                    </button>
                </form>
             </div>
        </div>
    );
};

const ChangelogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useLanguage();
    const changelogData = [
        { date: '2024-05-20', change: 'Optimized video playback for smoother streaming.' },
        { date: '2024-05-18', change: 'Added new movies: "Mi chico malo", "Amor de Cupido", "Desde pequeños..."' },
        { date: '2024-05-15', change: 'Added "Continue Watching" section.' },
        { date: '2024-05-10', change: 'Restored Community Calls feature.' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-lg flex flex-col animate-scale-in border border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold font-bebas tracking-wide text-red-500">{t('changelogTitle')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors focus:outline-none" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <ul className="space-y-4">
                        {changelogData.map((item, index) => (
                            <li key={index} className="border-l-2 border-red-500 pl-4">
                                <span className="block text-xs text-gray-500 font-bold mb-1">{item.date}</span>
                                <p className="text-gray-300 text-sm">{item.change}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-800 bg-black/20 text-right">
                    <button onClick={onClose} className="text-sm font-bold text-white hover:text-red-500 transition-colors">
                        {t('close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
        <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-end p-2 flex-shrink-0 absolute top-0 right-0 z-50">
                <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 m-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="overflow-y-auto w-full">
                {children}
            </div>
        </div>
    </div>
);




const CommentsSection: React.FC<{ pageId: string }> = ({ pageId }) => {
    useEffect(() => {
        const scriptSrc = "https://talk.hyvor.com/embed/embed.js";
        if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
            const script = document.createElement('script');
            script.src = scriptSrc;
            script.async = true;
            script.type = "module";
            document.body.appendChild(script);
        }
    }, []);




    return (
        <div className="mt-8 pt-6 border-t border-gray-800 px-4 md:px-0 max-w-5xl mx-auto min-h-[300px]">
            <HyvorTalkComments
                website-id="14533"
                page-id={pageId}
            />
        </div>
    );
};




const DetailModalContent: React.FC<{ content: Content; onPlayTrailer: (id: string, url: string, title: string, description: string) => void; onPlayMovie: (id: string, url: string, title: string, description: string, introStart?: number, introEnd?: number) => void }> = ({ content, onPlayTrailer, onPlayMovie }) => {
    const [activeSeason, setActiveSeason] = useState<number>(1);
    const { t } = useLanguage();
    const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
    const inWatchlist = isInWatchlist(content.id);

    const isSeries = content.type === 'series' && content.seasons && content.seasons.length > 0;
    const currentSeason = isSeries ? content.seasons?.find(s => s.seasonNumber === activeSeason) : null;

    const handleMainPlay = () => {
        if (isSeries && content.seasons && content.seasons.length > 0) {
            // Play S1 E1
            const s1 = content.seasons.find(s => s.seasonNumber === 1);
            if (s1 && s1.episodes.length > 0) {
                const e1 = s1.episodes[0];
                onPlayMovie(content.id, e1.videoUrl, e1.title, e1.description, e1.introStart, e1.introEnd);
            }
        } else if (content.videoUrl) {
            onPlayMovie(content.id, content.videoUrl, content.title, content.description, content.introStart, content.introEnd);
        }
    };

    const toggleWatchlist = () => {
        if (inWatchlist) removeFromWatchlist(content.id);
        else addToWatchlist(content.id);
    };


    return (
        <div className="pb-12">
            <div className="relative aspect-video w-full">
                <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full">
                     <h2 className="text-5xl font-bebas text-white drop-shadow-lg">{content.title}</h2>
                </div>
            </div>
           
            <div className="px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <div className="flex items-baseline space-x-4 mb-4 text-gray-400">
                            <span className="font-bold text-green-400">97% Match</span>
                            <span>{content.releaseYear}</span>
                            <span className="border border-gray-500 px-1 text-sm">{content.rating}</span>
                            {isSeries && <span className="text-xs border border-gray-500 px-1 rounded">{t('series').toUpperCase()}</span>}
                        </div>
                        <p className="text-gray-300 leading-relaxed">{content.description}</p>
                        <div className="mt-6 flex flex-wrap gap-4">
                            <button
                                onClick={handleMainPlay}
                                className="flex items-center bg-white text-black font-bold px-6 py-3 rounded hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                <PlayIcon className="w-6 h-6 mr-2" />
                                {isSeries ? t('playEpisode') : t('playMovie')}
                            </button>
                            <button
                                onClick={() => content.trailerUrl && onPlayTrailer(content.id, content.trailerUrl, `${content.title} (Trailer)`, "Official Trailer")}
                                className="flex items-center bg-gray-600/60 text-white font-bold px-6 py-3 rounded hover:bg-gray-600/80 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                            >
                                <PlayIcon className="w-6 h-6 mr-2" />
                                {t('playTrailer')}
                            </button>
                            <button 
                                onClick={toggleWatchlist} 
                                className="flex items-center border border-gray-400 text-gray-200 font-bold px-4 py-3 rounded hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={inWatchlist ? t('removeFromList') : t('addToList')}
                            >
                                {inWatchlist ? <CheckIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
                            </button>
                        </div>




                        {/* Series Section: Seasons & Episodes */}
                        {isSeries && content.seasons && (
                            <div className="mt-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">{t('episodes')}</h3>
                                    {content.seasons.length > 1 && (
                                        <div className="relative">
                                            <select
                                                value={activeSeason}
                                                onChange={(e) => setActiveSeason(Number(e.target.value))}
                                                className="bg-black border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-white"
                                                aria-label="Select Season"
                                            >
                                                {content.seasons.map(season => (
                                                    <option key={season.id} value={season.seasonNumber}>
                                                        {season.title || `Season ${season.seasonNumber}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>




                                <div className="space-y-4">
                                    {currentSeason?.episodes.map((episode) => (
                                        <button
                                            key={episode.id}
                                            className="flex flex-col sm:flex-row group cursor-pointer p-4 rounded-lg hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 w-full text-left focus:outline-none focus:ring-2 focus:ring-white"
                                            onClick={() => onPlayMovie(content.id, episode.videoUrl, episode.title, episode.description, episode.introStart, episode.introEnd)}
                                        >
                                            <div className="relative w-full sm:w-40 aspect-video flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 overflow-hidden rounded">
                                                <img src={episode.thumbnailUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                                                    <PlayIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-white font-bold text-sm sm:text-base mb-1">{episode.title}</h4>
                                                    <span className="text-gray-500 text-xs">{episode.duration}</span>
                                                </div>
                                                <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">{episode.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}




                    </div>
                    <div>
                         <h3 className="text-gray-500 font-semibold mb-2">{t('genres')}</h3>
                         <div className="flex flex-wrap gap-2">
                            {content.genre.map(g => (
                                <span key={g} className="bg-gray-800 text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">{g}</span>
                            ))}
                         </div>
                    </div>
                </div>
               
                {/* Comments Section */}
                <CommentsSection pageId={content.id} />
            </div>
        </div>
    );
};




interface VideoPlayerProps {
    id: string; // The ID of the content being played (for history tracking)
    src: string;
    title: string;
    description: string;
    introStart?: number;
    introEnd?: number;
    onClose: () => void;
    isMiniMode: boolean;
    toggleMiniMode: () => void;
}




const VideoPlayer: React.FC<VideoPlayerProps> = ({ id, src, title, description, introStart, introEnd, onClose, isMiniMode, toggleMiniMode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const thumbnailRef = useRef<HTMLVideoElement>(null); // Ref for the preview thumbnail video
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [areSubtitlesVisible, setAreSubtitlesVisible] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showSpeedOptions, setShowSpeedOptions] = useState(false);
    const [quality, setQuality] = useState('1080p');
    const [showQualityOptions, setShowQualityOptions] = useState(false);
    const [showShareTooltip, setShowShareTooltip] = useState(false); // State for share tooltip feedback
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    // Optimization: Buffering state
    const [isBuffering, setIsBuffering] = useState(false);

    const controlsTimeoutRef = useRef<number | null>(null);
    const preMuteVolumeRef = useRef<number>(1);
    const { addToHistory, watchProgress, updateProgress } = useUserHistory(); // Hook to add to watch history and progress
    const VTT_TRACK_SRC = `data:text/vtt;base64,V0VCVlRUCgowMDowMDowMS4wMDAgLS0+IDAwOjAwOjA0LjAwMwpUaGlzIGlzIGEgc2FtcGxlIHN1YnRpdGxlIGZvciBkZW1vbnN0cmF0aW9uLgoKMDA6MDA6MDUuMDAwIC0tPiAwMDowMDowOS4wMDAKUGxheWJhY2sgc3BlZWQgYW5kIHN1YnRpdGxlcyBhcmUgbm93IGZ1bGx5IGZ1bmN0aW9uYWwu`;
   
    // Preview states
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const [previewX, setPreviewX] = useState<number>(0);

    // Initial Resume Logic
    useEffect(() => {
        const video = videoRef.current;
        if (id && video && watchProgress[id]) {
            addToHistory(id);
            const saved = watchProgress[id];
            // If saved progress is valid and not at the very end (e.g. within last 5 seconds)
            if (saved.currentTime > 0 && saved.currentTime < saved.duration - 5) {
                video.currentTime = saved.currentTime;
            }
        } else if (id) {
             addToHistory(id);
        }
    }, [id, addToHistory]); // Don't depend on watchProgress to avoid loops, stick to mount/id change

    // Save Progress Logic & Buffering Events
    useEffect(() => {
        const video = videoRef.current;
        
        const handlePause = () => {
            if (video && video.duration > 0) {
                updateProgress(id, video.currentTime, video.duration);
            }
        };

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleCanPlay = () => setIsBuffering(false);

        const handleUnmount = () => {
             if (video && video.duration > 0) {
                updateProgress(id, video.currentTime, video.duration);
            }
        };

        if (video) {
            video.addEventListener('pause', handlePause);
            video.addEventListener('waiting', handleWaiting);
            video.addEventListener('playing', handlePlaying);
            video.addEventListener('canplay', handleCanPlay);
        }

        return () => {
            if (video) {
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('waiting', handleWaiting);
                video.removeEventListener('playing', handlePlaying);
                video.removeEventListener('canplay', handleCanPlay);
                // Save on unmount
                handleUnmount();
            }
        };
    }, [id, updateProgress]);


    const hideControls = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
    };




    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;




        const handleTimeUpdate = () => {
            if (video.duration) {
                setCurrentTime(video.currentTime);
                setProgress((video.currentTime / video.duration) * 100);




                // Intro detection logic: Show "Skip Intro" if current time is between introStart and introEnd
                if (introStart !== undefined && introEnd !== undefined) {
                    if (video.currentTime >= introStart && video.currentTime <= introEnd) {
                        setShowSkipIntro(true);
                    } else {
                        setShowSkipIntro(false);
                    }
                } else {
                     setShowSkipIntro(false);
                }
            }
        };
        const handleLoadedMetadata = () => {
            setDuration(video.duration);
             if (video.textTracks && video.textTracks.length > 0) {
                video.textTracks[0].mode = 'hidden';
                setAreSubtitlesVisible(false);
            }
        };




        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        // Removed video.play() from here to avoid race condition with the isPlaying effect
        hideControls();




        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [src, introStart, introEnd]);




    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;




            if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }




            if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'm', 'M'].includes(e.key)) {
                e.preventDefault();
            }




            switch (e.key) {
                case ' ':
                    setIsPlaying(prev => !prev);
                    break;
                case 'ArrowLeft':
                    video.currentTime = Math.max(0, video.currentTime - 5);
                    break;
                case 'ArrowRight':
                    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
                    break;
                case 'ArrowUp':
                    setVolume(currentVolume => {
                        const newVolume = Math.min(1, currentVolume + 0.05);
                        video.volume = newVolume;
                        if (newVolume > 0) preMuteVolumeRef.current = newVolume;
                        return newVolume;
                    });
                    break;
                case 'ArrowDown':
                    setVolume(currentVolume => {
                        const newVolume = Math.max(0, currentVolume - 0.05);
                        video.volume = newVolume;
                        return newVolume;
                    });
                    break;
                case 'm':
                case 'M':
                    setVolume(currentVolume => {
                        if (currentVolume > 0) {
                            preMuteVolumeRef.current = currentVolume;
                            video.volume = 0;
                            return 0;
                        } else {
                            const restoredVolume = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 1;
                            video.volume = restoredVolume;
                            return restoredVolume;
                        }
                    });
                    break;
            }
        };




        window.addEventListener('keydown', handleKeyDown);




        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Effect to update thumbnail preview time
    useEffect(() => {
        if (thumbnailRef.current && previewTime !== null) {
            thumbnailRef.current.currentTime = previewTime;
        }
    }, [previewTime]);


    const handleMouseMove = (e: React.MouseEvent) => {
        // Calculate proximity
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            const edgeThreshold = 100; // px
            const centerThreshold = 150; // px radius
            
            const isNearTop = y < edgeThreshold;
            const isNearBottom = y > h - edgeThreshold;
            // Also consider left/right edges if desired, but top/bottom is most important for controls.
            
            const distCenter = Math.sqrt(Math.pow(x - w/2, 2) + Math.pow(y - h/2, 2));
            const isNearCenter = distCenter < centerThreshold;

            if (isNearTop || isNearBottom || isNearCenter) {
                setShowControls(true);
                hideControls();
            }
        }
    };




    const togglePlayPause = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsPlaying(prev => !prev);
    };
    
    // Updated isPlaying effect to handle promises safely
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented
                    if (error.name === 'AbortError') {
                        // This corresponds to the "play() request was interrupted by a call to pause()" error.
                        // We can generally ignore this as it means the user paused quickly or state changed.
                    } else {
                        console.error('Playback prevented:', error);
                        setIsPlaying(false);
                    }
                });
            }
        } else {
            video.pause();
        }
    }, [isPlaying]);




    const handleSkipIntro = () => {
        if (videoRef.current && introEnd !== undefined) {
            videoRef.current.currentTime = introEnd; // Jump to the end of intro
            setShowSkipIntro(false);
        }
    };




    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const newTime = (Number(e.target.value) / 100) * duration;
        videoRef.current.currentTime = newTime;
    };
   
    const handleProgressMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const time = (x / width) * duration;
       
        if (time >= 0 && time <= duration) {
            setPreviewTime(time);
            setPreviewX(x);
        }
    };




    const handleProgressMouseLeave = () => {
        setPreviewTime(null);
    };




    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        videoRef.current.volume = newVolume;
        if (newVolume > 0) {
            preMuteVolumeRef.current = newVolume;
        }
    };




    const changePlaybackRate = (rate: number) => {
        if (!videoRef.current) return;
        setPlaybackRate(rate);
        videoRef.current.playbackRate = rate;
        setShowSpeedOptions(false);
    };




    const toggleSubtitles = () => {
        const video = videoRef.current;
        if (!video || !video.textTracks || video.textTracks.length === 0) return;
        const firstTrack = video.textTracks[0];
        const isVisible = firstTrack.mode === 'showing';
        firstTrack.mode = isVisible ? 'hidden' : 'showing';
        setAreSubtitlesVisible(!isVisible);
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (error) {
            console.error("PiP failed:", error);
        }
    };

    const handleShare = async () => {
        if (videoRef.current) {
            const currentUrl = window.location.href; // In a real app, this might be a deep link to the video
            try {
                await navigator.clipboard.writeText(currentUrl);
                setShowShareTooltip(true);
                setTimeout(() => setShowShareTooltip(false), 2000);
            } catch (err) {
                console.error("Failed to copy link", err);
            }
        }
    };


    const toggleFullScreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };




    const containerClasses = isMiniMode
        ? "fixed bottom-6 right-6 w-96 aspect-video bg-black z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-800 transition-all duration-300 group"
        : "fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in";




    return (
        <div
            ref={containerRef}
            className={containerClasses}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                className={isMiniMode ? "w-full h-full object-cover" : "w-full h-auto max-h-full"}
                onClick={isMiniMode ? toggleMiniMode : togglePlayPause}
                crossOrigin="anonymous"
                preload="auto" // Force browser to preload aggressively to prevent stalling
            >
                <track default kind="subtitles" srcLang="en" label="English" src={VTT_TRACK_SRC} />
            </video>
            
            {/* Buffering Indicator */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
           
            {/* Pause Overlay - The Dark Veil */}
            {!isPlaying && !isMiniMode && !isBuffering && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-8 transition-opacity duration-500 animate-fade-in cursor-pointer"
                    onClick={togglePlayPause}
                >
                    <div className="transform transition-transform duration-300 hover:scale-110 mb-6">
                         <PlayIcon className="w-24 h-24 text-white opacity-90" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bebas text-white mb-4 drop-shadow-lg tracking-wide">{title}</h2>
                    <p className="text-gray-300 max-w-2xl text-lg line-clamp-2">{description}</p>
                    <div className="mt-8 text-sm text-gray-400 font-medium tracking-widest uppercase">Paused</div>
                </div>
            )}
           
            {isMiniMode && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4 z-30">
                    <button onClick={toggleMiniMode} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Expand Player">
                         <ExpandIcon className="w-6 h-6" />
                    </button>
                    <button onClick={togglePlayPause} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={onClose} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Close Player">
                         <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            )}




            {/* Skip Intro Button */}
            {showSkipIntro && !isMiniMode && (
                 <button
                    onClick={handleSkipIntro}
                    className="absolute bottom-24 right-4 md:right-12 z-40 bg-black/70 hover:bg-white/20 border border-white/30 backdrop-blur-sm text-white font-medium px-5 py-2 rounded flex items-center space-x-2 transition-all animate-fade-in group focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Skip Intro"
                 >
                    <span>Skip Intro</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"></path>
                    </svg>
                 </button>
            )}




            {!isMiniMode && (
                <>
                    <button onClick={onClose} className={`absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full transition-opacity duration-300 z-50 focus:outline-none focus:ring-2 focus:ring-white ${showControls ? 'opacity-100' : 'opacity-0'}`} aria-label="Close Player">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                    <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="relative w-full group/progress">
                            {previewTime !== null && !isNaN(previewTime) && (
                                <div
                                    className="absolute bottom-4 -translate-x-1/2 bg-black border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl pointer-events-none z-20 flex flex-col items-center"
                                    style={{ left: previewX, width: '160px' }}
                                >
                                    <video
                                        ref={thumbnailRef}
                                        src={src}
                                        className="w-full h-24 object-cover bg-gray-900"
                                        muted
                                        preload="auto"
                                    />
                                    <div className="bg-black/80 w-full text-center py-1 text-xs font-bold text-white font-mono">
                                        {formatTime(previewTime)}
                                    </div>
                                </div>
                            )}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={handleScrub}
                                onMouseMove={handleProgressMouseMove}
                                onMouseLeave={handleProgressMouseLeave}
                                className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer video-progress relative z-10 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Seek Video"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-white">
                            <div className="flex items-center space-x-4">
                                <button onClick={togglePlayPause} className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}</button>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => {
                                        const video = videoRef.current;
                                        if (!video) return;
                                        setVolume(currentVolume => {
                                            if (currentVolume > 0) {
                                                preMuteVolumeRef.current = currentVolume;
                                                video.volume = 0;
                                                return 0;
                                            } else {
                                                const restoredVolume = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 1;
                                                video.volume = restoredVolume;
                                                return restoredVolume;
                                            }
                                        });
                                    }} className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label={volume > 0 ? "Mute" : "Unmute"}>{volume > 0 ? <VolumeUpIcon className="w-6 h-6" /> : <VolumeOffIcon className="w-6 h-6" />}</button>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.05" 
                                        value={volume} 
                                        onChange={handleVolumeChange} 
                                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500" 
                                        aria-label="Volume"
                                        aria-valuemin={0}
                                        aria-valuemax={1}
                                        aria-valuenow={volume}
                                    />
                                </div>
                                <span className="text-sm font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <button onClick={() => { setShowQualityOptions(q => !q); setShowSpeedOptions(false); }} className={`transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1 ${showQualityOptions ? 'text-red-500' : 'text-white hover:text-red-500'}`} aria-label="Settings" aria-haspopup="true" aria-expanded={showQualityOptions}>
                                        <SettingsIcon className="w-6 h-6" />
                                    </button>
                                    {showQualityOptions && (
                                        <div className="absolute bottom-full mb-2 right-0 bg-black/90 border border-gray-800 rounded-lg overflow-hidden min-w-[120px] z-50 animate-fade-in">
                                            <div className="px-4 py-2 text-xs text-gray-400 font-bold border-b border-gray-800 bg-white/5">QUALITY</div>
                                            {['4K', '1080p', '720p', '480p', 'Auto'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => { setQuality(q); setShowQualityOptions(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 flex items-center justify-between transition-colors focus:outline-none focus:bg-white/20 ${quality === q ? 'text-red-500 font-bold bg-white/5' : 'text-gray-200'}`}
                                                >
                                                    <span>{q}</span>
                                                    {quality === q && <span className="text-xs bg-red-500 text-white rounded-full w-2 h-2"></span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button onClick={() => { setShowSpeedOptions(s => !s); setShowQualityOptions(false); }} className="text-sm font-bold w-12 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label="Playback Speed" aria-haspopup="true" aria-expanded={showSpeedOptions}>{playbackRate}x</button>
                                    {showSpeedOptions && (
                                        <ul className="absolute bottom-full mb-2 right-0 bg-black/70 rounded-md py-1">
                                            {[0.5, 1, 1.5, 2].map(rate => (
                                                <li key={rate}><button onClick={() => changePlaybackRate(rate)} className="px-4 py-1 hover:bg-red-500 w-full text-left text-sm focus:outline-none focus:bg-red-500">{rate}x</button></li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <button onClick={toggleSubtitles} className={`focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1 ${areSubtitlesVisible ? 'text-red-500' : ''}`} aria-label={areSubtitlesVisible ? "Disable Subtitles" : "Enable Subtitles"}><SubtitlesIcon className="w-6 h-6" /></button>
                                <button onClick={togglePiP} title="Picture-in-Picture" className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label="Picture in Picture">
                                    <PiPIcon className="w-6 h-6" />
                                </button>
                                <button onClick={toggleMiniMode} title="Mini Player" className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label="Minimize Player">
                                    <MinimizeIcon className="w-6 h-6" />
                                </button>
                                <div className="relative">
                                    <button onClick={handleShare} title="Share" className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label="Share Link">
                                        <ShareIcon className="w-6 h-6" />
                                    </button>
                                    {showShareTooltip && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in" role="status">
                                            Link Copied!
                                        </div>
                                    )}
                                </div>
                                <button onClick={toggleFullScreen} className="focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1" aria-label="Fullscreen"><FullscreenIcon className="w-6 h-6" /></button>
                            </div>
                        </div>
                    </div>
                </>
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
                <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                    <div className="flex space-x-6 mb-4 md:mb-0">
                        <a href="https://www.youtube.com/@Seiko_EsposodeGabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF0000] transition-colors" aria-label="YouTube"><YouTubeIcon className="w-6 h-6" /></a>
                        <a href="https://instagram.com/seikovt_esposodegabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E4405F] transition-colors" aria-label="Instagram"><InstagramIcon className="w-6 h-6" /></a>
                        <a href="https://tiktok.com/@seikovt1" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#00F2EA] transition-colors" aria-label="TikTok"><TikTokIcon className="w-6 h-6" /></a>
                        <a href="https://twitch.tv/seiko_vt" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#9146FF] transition-colors" aria-label="Twitch"><TwitchIcon className="w-6 h-6" /></a>
                        <a href="https://discord.gg/fdDkGA7MWP" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5865F2] transition-colors" aria-label="Discord"><DiscordIcon className="w-6 h-6" /></a>
                        <a href="https://x.com/Sei_EsposodeAna" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="X (Twitter)"><TwitterIcon className="w-6 h-6" /></a>
                    </div>
                    <div className="text-center md:text-right">
                        <h4 className="text-red-500 font-bebas text-2xl tracking-wider">SEIKO VT</h4>
                        <p className="text-gray-500 text-xs mt-1">{t('joinCommunity')}</p>
                    </div>
                </div>
                
                <div className="text-center text-gray-600 text-xs leading-relaxed border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <p>{t('copyright')}</p>
                        <p className="mt-1">Otros nombres o marcas son marcas registradas de sus respectivos dueños.</p>
                    </div>
                     <button 
                        onClick={() => setShowChangelog(true)} 
                        className="mt-4 md:mt-0 text-gray-500 hover:text-red-500 transition-colors font-bold"
                    >
                        {t('changelog')}
                    </button>
                </div>
            </div>
            {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
        </footer>
    );
};




interface PlayerState {
    id: string; // Added ID to PlayerState
    url: string;
    title: string;
    description: string;
    introStart?: number;
    introEnd?: number;
}




// --- TOP-LEVEL APP COMPONENT ---




export default function App() {
    return (
        <LanguageProvider>
            <WatchlistProvider>
                <UserHistoryProvider>
                    <MainApp />
                </UserHistoryProvider>
            </WatchlistProvider>
        </LanguageProvider>
    );
}

function MainApp() {
    // Initializing state from storage ensures if Jitsi refreshes the page, we stay on 'calls'
    const [currentPage, setCurrentPage] = useState<Page>(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('seiko_call_active')) {
            return 'calls';
        }
        return 'home';
    });

    const [activeModal, setActiveModal] = useState<boolean>(false);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    // showSplash state removed as requested
   
    // Use a single object to track player state including metadata and intro info
    const [playerState, setPlayerState] = useState<PlayerState | null>(null);
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);
    const { history, watchProgress } = useUserHistory(); // Get history for recommendations
    const { t } = useLanguage(); // Get translation function

    // Memoize these calculations to avoid recalculating on every render
    const featuredContent = useMemo(() => MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0], []);
    const genres = useMemo(() => [...new Set(MOCK_CONTENT.flatMap(c => c.genre))], []);
   
    // Memoize filtered content to avoid filtering on every render unless search query changes
    const filteredContent = useMemo(() => {
        return searchQuery
        ? MOCK_CONTENT.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];
    }, [searchQuery]);

    // Memoize Recommendation Logic
    const recommendedContent = useMemo(() => {
        const getRecommendations = (historyIds: string[], allContent: Content[]): Content[] => {
            if (historyIds.length === 0) return [];
    
            const watchedContent = allContent.filter(c => historyIds.includes(c.id));
            const genreCounts: Record<string, number> = {};
    
            watchedContent.forEach(c => {
                c.genre.forEach(g => {
                    genreCounts[g] = (genreCounts[g] || 0) + 1;
                });
            });
    
            const unwatchedContent = allContent.filter(c => !historyIds.includes(c.id));
    
            return unwatchedContent.sort((a, b) => {
                const scoreA = a.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0);
                const scoreB = b.genre.reduce((acc, g) => acc + (genreCounts[g] || 0), 0);
                return scoreB - scoreA;
            }).slice(0, 10);
        };
        return getRecommendations(history, MOCK_CONTENT);
    }, [history]);

    // Memoize Continue Watching Logic
    const continueWatchingContent = useMemo(() => {
        const getContinueWatching = (progressMap: Record<string, WatchProgress>, allContent: Content[]): Content[] => {
            // Filter content that has progress, is not finished (< 95%), and sort by lastWatched
            return allContent
                .filter(c => {
                    const progress = progressMap[c.id];
                    return progress && (progress.currentTime / progress.duration) < 0.95;
                })
                .sort((a, b) => {
                    const timeA = progressMap[a.id]?.lastWatched || 0;
                    const timeB = progressMap[b.id]?.lastWatched || 0;
                    return timeB - timeA;
                });
        };
        return getContinueWatching(watchProgress, MOCK_CONTENT);
    }, [watchProgress]);

    const getProgressPercent = useCallback((id: string) => {
        const progress = watchProgress[id];
        if (!progress || progress.duration === 0) return 0;
        return (progress.currentTime / progress.duration) * 100;
    }, [watchProgress]);


    const handleCardClick = useCallback((content: Content) => {
        setIsLoadingContent(true);
        // Simulate network delay for fetching details
        setTimeout(() => {
            setSelectedContent(content);
            setActiveModal(true);
            setIsLoadingContent(false);
        }, 800);
    }, []);
   
    const handleHeroDetailsClick = useCallback(() => {
        setIsLoadingContent(true);
        setTimeout(() => {
            setSelectedContent(featuredContent);
            setActiveModal(true);
            setIsLoadingContent(false);
        }, 800);
    }, [featuredContent]);




    const handlePlayClick = useCallback((id: string, url: string, title: string, description: string, introStart?: number, introEnd?: number) => {
        if (url) {
            setActiveModal(false);
            setPlayerState({ id, url, title, description, introStart, introEnd });
            setIsMiniPlayer(false);
        }
    }, []);




    const closeModal = useCallback(() => {
        setActiveModal(false);
        setTimeout(() => setSelectedContent(null), 300);
    }, []);
   
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setCurrentPage(prev => prev !== 'search' ? 'search' : prev);
            // Simulate search loading
            setIsSearching(true);
        } else {
            setCurrentPage(prev => prev === 'search' ? 'home' : prev);
            setIsSearching(false);
        }
    }, []);
   
    // Effect to simulate search network latency when query changes
    useEffect(() => {
        if (currentPage === 'search' && searchQuery) {
            const timer = setTimeout(() => {
                setIsSearching(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, currentPage]);
   
    return (
        <div className="bg-black min-h-screen text-white">
            {/* showSplash removed here */}
            {isLoadingContent && <LoadingOverlay />}
           
            <Header
                onNavigate={setCurrentPage}
                currentPage={currentPage}
                onSearch={handleSearch}
                searchQuery={searchQuery}
            />
            <main>
                {currentPage === 'home' ? (
                    <>
                        <HeroBanner
                            content={featuredContent}
                            onDetailsClick={handleHeroDetailsClick}
                            onPlayClick={() => handlePlayClick(featuredContent.id, featuredContent.videoUrl || '', featuredContent.title, featuredContent.description, featuredContent.introStart, featuredContent.introEnd)}
                        />
                        <div className="relative z-20 -mt-28">
                            {/* Render Continue Watching row if available */}
                            {continueWatchingContent.length > 0 && (
                                <ContentRow
                                    title={t('continueWatching')}
                                    contents={continueWatchingContent}
                                    onCardClick={handleCardClick}
                                    getProgress={getProgressPercent}
                                />
                            )}

                            {/* Render Recommended For You row if there are recommendations */}
                            {recommendedContent.length > 0 && (
                                <ContentRow
                                    title={t('recommendedForYou')}
                                    contents={recommendedContent}
                                    onCardClick={handleCardClick}
                                />
                            )}
                            
                            {genres.map(genre => (
                                <ContentRow
                                    key={genre}
                                    title={genre}
                                    contents={MOCK_CONTENT.filter(c => c.genre.includes(genre))}
                                    onCardClick={handleCardClick}
                                />
                            ))}
                        </div>
                    </>
                ) : currentPage === 'search' ? (
                    <SearchPage
                        query={searchQuery}
                        results={filteredContent}
                        isSearching={isSearching}
                        onCardClick={handleCardClick}
                    />
                ) : currentPage === 'watchlist' ? (
                    <WatchlistPage onCardClick={handleCardClick} />
                ) : currentPage === 'calls' ? (
                    <CallsPage />
                ) : (
                    <MoviesPage contents={MOCK_CONTENT} onCardClick={handleCardClick} />
                )}
            </main>
           
            {playerState && (
                <VideoPlayer
                    key={playerState.url}
                    id={playerState.id} // Pass ID to VideoPlayer
                    src={playerState.url}
                    title={playerState.title}
                    description={playerState.description}
                    introStart={playerState.introStart}
                    introEnd={playerState.introEnd}
                    onClose={() => {
                        setPlayerState(null);
                        setIsMiniPlayer(false);
                    }}
                    isMiniMode={isMiniPlayer}
                    toggleMiniMode={() => setIsMiniPlayer(prev => !prev)}
                />
            )}




            {activeModal && selectedContent && (
                <Modal onClose={closeModal}>
                    <DetailModalContent
                        content={selectedContent}
                        onPlayTrailer={handlePlayClick}
                        onPlayMovie={handlePlayClick}
                    />
                </Modal>
            )}




            <Footer />
        </div>
    );
}