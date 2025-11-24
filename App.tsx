import React, { useState, useEffect, useRef } from 'react';
import { Content, Episode } from './types';
import { MOCK_CONTENT } from './constants';
// Gemini service imports removed as features are deactivated.




// FIX: Define custom element as a component variable to bypass strict IntrinsicElements type checking.
const HyvorTalkComments = 'hyvor-talk-comments' as unknown as React.ComponentType<any>;




// --- HELPER & UTILITY ---




const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};




// --- ICONS ---




const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);
const VolumeUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
);
const VolumeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
);
const SubtitlesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z"></path></svg>
);
const FullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>
);
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path></svg>
);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
);
const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
);
const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59-.22L2.93 8.87c-.11.21-.06.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.11-.22.06-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path></svg>
);
const MinimizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"></path></svg>
);
const ExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"></path></svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
);
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"></path></svg>
);
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
);
// Social Icons
const YouTubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
);
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
);
const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0-1 13.6 6.84 6.84 0 0 0 6.45-6.84V6.76a7.69 7.69 0 0 0 4.25 1.74v-3.4a4.39 4.39 0 0 1-0.47-0.41z"/></svg>
);
const TwitchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
);
const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561 19.9035 19.9035 0 005.9937 3.0314.0777.0777 0 00.0842-.0276 14.1847 14.1847 0 001.2262-1.9942.076.076 0 00-.0416-.1057 13.0843 13.0843 0 01-1.872-1.022.0766.0766 0 01-.0076-.1277 10.7495 10.7495 0 00.3718-.2917.0754.0754 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0738.0738 0 01.0785.0095c.1202.0984.246.1983.3728.2925a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873 1.022.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286 19.839 19.839 0 006.0028-3.0314.077.077 0 00.0322-.0543c.4928-5.1774-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
);
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
);



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


const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [isFading, setIsFading] = useState(false);

    const handleVideoEnded = () => {
        setIsFading(true);
        setTimeout(() => {
            onFinish();
        }, 1000); // 1s transition duration matches duration-1000
    };

    return (
        <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            <video
                src="https://2qhd7azteo.ucarecd.net/e940ebf2-0e5c-4606-9ece-625bc6e9a126/Diseosinttulo.mp4"
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
            />
        </div>
    );
};


type Page = 'home' | 'movies' | 'search' | 'upload';




const Header: React.FC<{
    onNavigate: (page: Page) => void;
    currentPage: Page;
    onSearch: (query: string) => void;
    searchQuery: string;
}> = ({ onNavigate, currentPage, onSearch, searchQuery }) => {
    const [isScrolled, setIsScrolled] = useState(false);
   
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
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
                    <nav className="hidden md:flex items-center space-x-6 font-medium">
                        <button onClick={() => onNavigate('home')} className={navLinkClasses('home')}>Home</button>
                        <button onClick={() => onNavigate('movies')} className={navLinkClasses('movies')}>Movies</button>
                        <button onClick={() => onNavigate('upload')} className={navLinkClasses('upload')}>Creators</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative hidden sm:block">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            className="bg-black/50 border border-gray-600 rounded-full px-4 py-1.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500 w-32 md:w-48 lg:w-64 transition-all focus:w-40 md:focus:w-56 lg:focus:w-72 placeholder-gray-400"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                    <button
                        onClick={() => onNavigate('upload')}
                        className="md:hidden text-gray-300 hover:text-white"
                    >
                        <UploadIcon className="w-6 h-6" />
                    </button>
                    <a
                        href="https://www.patreon.com/c/SeikoVT?vanity=user"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center space-x-2 border border-red-500 text-red-500 font-medium px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors transform hover:scale-105"
                    >
                        <HeartIcon className="w-5 h-5" />
                        <span>Doname :)</span>
                    </a>
                </div>
            </div>
        </header>
    );
};




const HeroBanner: React.FC<{ content: Content; onDetailsClick: () => void; onPlayClick: () => void }> = ({ content, onDetailsClick, onPlayClick }) => (
    <div className="relative h-screen -mb-40 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
             <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover animate-kenburns" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        <div className="relative z-10 h-full flex flex-col justify-end pb-52 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
                <h2 className="text-5xl md:text-7xl lg:text-8xl font-bebas text-white tracking-wide animate-fade-in-up">{content.title}</h2>
                <p className="mt-4 text-gray-200 text-base md:text-lg max-w-xl animate-fade-in-up animate-fade-in-up-delay-1">{content.description}</p>
                <div className="mt-8 flex space-x-4 animate-fade-in-up animate-fade-in-up-delay-2">
                    <button onClick={onPlayClick} className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/30 transition-all transform hover:scale-105">
                        <PlayIcon className="w-6 h-6 mr-2" />
                        Play
                    </button>
                    <button onClick={onDetailsClick} className="flex items-center bg-black/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/40 transition-all transform hover:scale-105">
                        <InfoIcon className="w-6 h-6 mr-2" />
                        More Info
                    </button>
                </div>
            </div>
        </div>
    </div>
);




const ContentCard: React.FC<{ content: Content; onCardClick: () => void }> = ({ content, onCardClick }) => (
    <div className="w-full group cursor-pointer" onClick={onCardClick}>
        <div className="aspect-[2/3] overflow-hidden rounded-lg transition-all duration-300 transform group-hover:scale-105 group-hover:ring-2 ring-white/70">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
        </div>
    </div>
);








const ContentRow: React.FC<{ title: string; contents: Content[]; onCardClick: (content: Content) => void }> = ({ title, contents, onCardClick }) => (
    <div className="mb-12">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 sm:px-6 lg:px-8">{title}</h3>
        <div className="grid grid-flow-col auto-cols-[10rem] sm:auto-cols-[12rem] md:auto-cols-[14rem] gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 scrollbar-hide">
            {contents.map(content => (
                <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
            ))}
        </div>
    </div>
);




const MoviesPage: React.FC<{ contents: Content[]; onCardClick: (content: Content) => void }> = ({ contents, onCardClick }) => (
    <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bebas text-white mb-8">All Movies</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {contents.map(content => (
                <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
            ))}
        </div>
    </div>
);


const SearchPage: React.FC<{
    query: string;
    results: Content[];
    isSearching: boolean;
    onCardClick: (content: Content) => void
}> = ({ query, results, isSearching, onCardClick }) => (
    <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <h2 className="text-4xl font-bebas text-white mb-4">Search Results</h2>
        <p className="text-gray-400 mb-8">Results for "{query}"</p>
       
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
                <p className="text-xl">No matches found for "{query}"</p>
            </div>
        )}
    </div>
);

const UploadPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnailUrl: '',
        videoUrl: '',
        type: 'movie',
        genre: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg("");

        // ---------------------------------------------------------
        // INSTRUCCIONES:
        // 1. Ve a https://formspree.io/ y regístrate.
        // 2. Crea un nuevo formulario y obtén el ID del formulario.
        // 3. Reemplaza "TU_ID_DE_FORMSPREE_AQUI" con tu ID real (ej. "xkqjbdzp").
        // ---------------------------------------------------------
        const FORMSPREE_ID = "TU_ID_DE_FORMSPREE_AQUI"; 

        if (FORMSPREE_ID === "TU_ID_DE_FORMSPREE_AQUI") {
            alert("⚠️ ATENCIÓN: Debes configurar tu ID de Formspree en el código del componente UploadPage para que esto funcione.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmitted(true);
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    thumbnailUrl: '',
                    videoUrl: '',
                    type: 'movie',
                    genre: ''
                });
            } else {
                const data = await response.json();
                if (Object.prototype.hasOwnProperty.call(data, 'errors')) {
                    setErrorMsg(data["errors"].map((error: any) => error["message"]).join(", "));
                } else {
                    setErrorMsg("Oops! There was a problem submitting your form");
                }
            }
        } catch (error) {
            setErrorMsg("Error connecting to server. Please try again.");
            console.error("Submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
                <div className="text-center max-w-lg bg-white/5 p-8 rounded-2xl border border-green-500/30 backdrop-blur-sm animate-scale-in">
                    <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h2 className="text-3xl font-bebas text-white mb-4">Submission Received!</h2>
                    <p className="text-gray-300 mb-8">
                        Thank you for sharing your creation with SeikoYT. We have received your details via email and will review them shortly.
                    </p>
                    <button 
                        onClick={() => setSubmitted(false)}
                        className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        Upload Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-4xl md:text-5xl font-bebas text-white mb-2 text-red-500">Creator Studio</h2>
                    <p className="text-gray-400">Submit your masterpiece to be featured on SeikoYT.</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/5 p-6 md:p-8 rounded-2xl border border-white/10 backdrop-blur-sm space-y-6">
                    {errorMsg && (
                        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded">
                            {errorMsg}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title</label>
                            <input 
                                required 
                                type="text" 
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Movie Title" 
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
                            <select 
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors appearance-none"
                            >
                                <option value="movie">Movie</option>
                                <option value="series">Series</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description</label>
                        <textarea 
                            required 
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4} 
                            placeholder="What is your story about?" 
                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors resize-none"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Genre (Comma separated)</label>
                            <input 
                                required 
                                type="text" 
                                name="genre"
                                value={formData.genre}
                                onChange={handleChange}
                                placeholder="Action, Drama, Sci-Fi" 
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" 
                            />
                        </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video URL</label>
                            <input 
                                required 
                                type="url" 
                                name="videoUrl"
                                value={formData.videoUrl}
                                onChange={handleChange}
                                placeholder="https://example.com/video.mp4" 
                                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thumbnail URL</label>
                        <input 
                            required 
                            type="url" 
                            name="thumbnailUrl"
                            value={formData.thumbnailUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg" 
                            className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" 
                        />
                         <p className="text-xs text-gray-500">Use a high-quality image hosted on ImageKit, Imgur, or similar services.</p>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full font-bold text-lg py-4 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center ${isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20'}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <UploadIcon className="w-6 h-6 mr-2" />
                                    Submit Content
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-end p-2 flex-shrink-0 absolute top-0 right-0 z-50">
                <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 m-2 backdrop-blur-sm">
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




const DetailModalContent: React.FC<{ content: Content; onPlayTrailer: (url: string, title: string, description: string) => void; onPlayMovie: (url: string, title: string, description: string, introStart?: number, introEnd?: number) => void }> = ({ content, onPlayTrailer, onPlayMovie }) => {
    const [activeSeason, setActiveSeason] = useState<number>(1);




    const isSeries = content.type === 'series' && content.seasons && content.seasons.length > 0;
    const currentSeason = isSeries ? content.seasons?.find(s => s.seasonNumber === activeSeason) : null;




    const handleMainPlay = () => {
        if (isSeries && content.seasons && content.seasons.length > 0) {
            // Play S1 E1
            const s1 = content.seasons.find(s => s.seasonNumber === 1);
            if (s1 && s1.episodes.length > 0) {
                const e1 = s1.episodes[0];
                onPlayMovie(e1.videoUrl, e1.title, e1.description, e1.introStart, e1.introEnd);
            }
        } else if (content.videoUrl) {
            onPlayMovie(content.videoUrl, content.title, content.description, content.introStart, content.introEnd);
        }
    };




    return (
        <div className="pb-12">
            <div className="relative aspect-video w-full">
                <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover" />
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
                            {isSeries && <span className="text-xs border border-gray-500 px-1 rounded">SERIES</span>}
                        </div>
                        <p className="text-gray-300 leading-relaxed">{content.description}</p>
                        <div className="mt-6 flex flex-wrap gap-4">
                            <button
                                onClick={handleMainPlay}
                                className="flex items-center bg-white text-black font-bold px-6 py-3 rounded hover:bg-gray-200 transition-all"
                            >
                                <PlayIcon className="w-6 h-6 mr-2" />
                                {isSeries ? 'Play Episode 1' : 'Play Movie'}
                            </button>
                            <button
                                onClick={() => content.trailerUrl && onPlayTrailer(content.trailerUrl, `${content.title} (Trailer)`, "Official Trailer")}
                                className="flex items-center bg-gray-600/60 text-white font-bold px-6 py-3 rounded hover:bg-gray-600/80 transition-all"
                            >
                                <PlayIcon className="w-6 h-6 mr-2" />
                                Play Trailer
                            </button>
                        </div>




                        {/* Series Section: Seasons & Episodes */}
                        {isSeries && content.seasons && (
                            <div className="mt-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">Episodes</h3>
                                    {content.seasons.length > 1 && (
                                        <div className="relative">
                                            <select
                                                value={activeSeason}
                                                onChange={(e) => setActiveSeason(Number(e.target.value))}
                                                className="bg-black border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-gray-500"
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
                                        <div
                                            key={episode.id}
                                            className="flex flex-col sm:flex-row group cursor-pointer p-4 rounded-lg hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                                            onClick={() => onPlayMovie(episode.videoUrl, episode.title, episode.description, episode.introStart, episode.introEnd)}
                                        >
                                            <div className="relative w-full sm:w-40 aspect-video flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 overflow-hidden rounded">
                                                <img src={episode.thumbnailUrl} alt={episode.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}




                    </div>
                    <div>
                         <h3 className="text-gray-500 font-semibold mb-2">Genres</h3>
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
    src: string;
    title: string;
    description: string;
    introStart?: number;
    introEnd?: number;
    onClose: () => void;
    isMiniMode: boolean;
    toggleMiniMode: () => void;
}




const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title, description, introStart, introEnd, onClose, isMiniMode, toggleMiniMode }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
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
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const controlsTimeoutRef = useRef<number | null>(null);
    const preMuteVolumeRef = useRef<number>(1);
    const VTT_TRACK_SRC = `data:text/vtt;base64,V0VCVlRUCgowMDowMDowMS4wMDAgLS0+IDAwOjAwOjA0LjAwMwpUaGlzIGlzIGEgc2FtcGxlIHN1YnRpdGxlIGZvciBkZW1vbnN0cmF0aW9uLgoKMDA6MDA6MDUuMDAwIC0tPiAwMDowMDowOS4wMDAKUGxheWJhY2sgc3BlZWQgYW5kIHN1YnRpdGxlcyBhcmUgbm93IGZ1bGx5IGZ1bmN0aW9uYWwu`;
   
    // Preview states
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const [previewX, setPreviewX] = useState<number>(0);








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
        video.play().catch(e => console.error("Autoplay prevented:", e));
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




    const handleMouseMove = () => {
        setShowControls(true);
        hideControls();
    };




    const togglePlayPause = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsPlaying(prev => !prev);
    };
    useEffect(() => {
        if (videoRef.current) {
            isPlaying ? videoRef.current.play() : videoRef.current.pause();
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
            >
                <track default kind="subtitles" srcLang="en" label="English" src={VTT_TRACK_SRC} />
            </video>
           
            {/* Pause Overlay - The Dark Veil */}
            {!isPlaying && !isMiniMode && (
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
                    <button onClick={toggleMiniMode} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                         <ExpandIcon className="w-6 h-6" />
                    </button>
                    <button onClick={togglePlayPause} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>
                    <button onClick={onClose} className="p-2 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                         <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            )}




            {/* Skip Intro Button */}
            {showSkipIntro && !isMiniMode && (
                 <button
                    onClick={handleSkipIntro}
                    className="absolute bottom-24 right-4 md:right-12 z-40 bg-black/70 hover:bg-white/20 border border-white/30 backdrop-blur-sm text-white font-medium px-5 py-2 rounded flex items-center space-x-2 transition-all animate-fade-in group"
                 >
                    <span>Skip Intro</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"></path>
                    </svg>
                 </button>
            )}




            {!isMiniMode && (
                <>
                    <button onClick={onClose} className={`absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <CloseIcon className="w-7 h-7" />
                    </button>
                    <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="relative w-full group/progress">
                            {previewTime !== null && !isNaN(previewTime) && (
                                <div
                                    className="absolute bottom-3 -translate-x-1/2 bg-black/80 backdrop-blur text-white text-xs font-medium py-1 px-2 rounded border border-white/10 pointer-events-none whitespace-nowrap z-20"
                                    style={{ left: previewX }}
                                >
                                    {formatTime(previewTime)}
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
                                className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer video-progress relative z-10"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-white">
                            <div className="flex items-center space-x-4">
                                <button onClick={togglePlayPause}>{isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}</button>
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
                                    }}>{volume > 0 ? <VolumeUpIcon className="w-6 h-6" /> : <VolumeOffIcon className="w-6 h-6" />}</button>
                                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <span className="text-sm font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    <button onClick={() => { setShowQualityOptions(q => !q); setShowSpeedOptions(false); }} className={`transition-colors ${showQualityOptions ? 'text-red-500' : 'text-white hover:text-red-500'}`}>
                                        <SettingsIcon className="w-6 h-6" />
                                    </button>
                                    {showQualityOptions && (
                                        <div className="absolute bottom-full mb-2 right-0 bg-black/90 border border-gray-800 rounded-lg overflow-hidden min-w-[120px] z-50 animate-fade-in">
                                            <div className="px-4 py-2 text-xs text-gray-400 font-bold border-b border-gray-800 bg-white/5">QUALITY</div>
                                            {['4K', '1080p', '720p', '480p', 'Auto'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => { setQuality(q); setShowQualityOptions(false); }}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 flex items-center justify-between transition-colors ${quality === q ? 'text-red-500 font-bold bg-white/5' : 'text-gray-200'}`}
                                                >
                                                    <span>{q}</span>
                                                    {quality === q && <span className="text-xs bg-red-500 text-white rounded-full w-2 h-2"></span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button onClick={() => { setShowSpeedOptions(s => !s); setShowQualityOptions(false); }} className="text-sm font-bold w-12 hover:text-red-500 transition-colors">{playbackRate}x</button>
                                    {showSpeedOptions && (
                                        <ul className="absolute bottom-full mb-2 right-0 bg-black/70 rounded-md py-1">
                                            {[0.5, 1, 1.5, 2].map(rate => (
                                                <li key={rate}><button onClick={() => changePlaybackRate(rate)} className="px-4 py-1 hover:bg-red-500 w-full text-left text-sm">{rate}x</button></li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <button onClick={toggleSubtitles} className={areSubtitlesVisible ? 'text-red-500' : ''}><SubtitlesIcon className="w-6 h-6" /></button>
                                <button onClick={toggleMiniMode} title="Mini Player">
                                    <MinimizeIcon className="w-6 h-6" />
                                </button>
                                <button onClick={toggleFullScreen}><FullscreenIcon className="w-6 h-6" /></button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};




const Footer: React.FC = () => (
    <footer className="bg-black py-8 mt-12 border-t border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                <div className="flex space-x-6 mb-4 md:mb-0">
                     <a href="https://www.youtube.com/@Seiko_EsposodeGabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF0000] transition-colors"><YouTubeIcon className="w-6 h-6" /></a>
                     <a href="https://instagram.com/seikovt_esposodegabi" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E4405F] transition-colors"><InstagramIcon className="w-6 h-6" /></a>
                     <a href="https://tiktok.com/@seikovt1" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#00F2EA] transition-colors"><TikTokIcon className="w-6 h-6" /></a>
                     <a href="https://twitch.tv/seiko_vt" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#9146FF] transition-colors"><TwitchIcon className="w-6 h-6" /></a>
                     <a href="https://discord.gg/fdDkGA7MWP" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#5865F2] transition-colors"><DiscordIcon className="w-6 h-6" /></a>
                     <a href="https://x.com/Sei_EsposodeAna" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><TwitterIcon className="w-6 h-6" /></a>
                </div>
                <div className="text-center md:text-right">
                    <h4 className="text-red-500 font-bebas text-2xl tracking-wider">SEIKO VT</h4>
                    <p className="text-gray-500 text-xs mt-1">Join the community</p>
                </div>
            </div>
            
            <div className="text-center text-gray-600 text-xs leading-relaxed border-t border-gray-900 pt-8">
                <p>Copyright © 2025 - 2025 SeikoVT. 'SeikoYT', los logotipos de SeikoYT y el nombre pertenecen a SeikoVT.</p>
                <p className="mt-1">Otros nombres o marcas son marcas registradas de sus respectivos dueños.</p>
            </div>
        </div>
    </footer>
);




interface PlayerState {
    url: string;
    title: string;
    description: string;
    introStart?: number;
    introEnd?: number;
}




// --- TOP-LEVEL APP COMPONENT ---




export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [activeModal, setActiveModal] = useState<boolean>(false);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
   
    // Use a single object to track player state including metadata and intro info
    const [playerState, setPlayerState] = useState<PlayerState | null>(null);
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);




    const featuredContent = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];
    const genres = [...new Set(MOCK_CONTENT.flatMap(c => c.genre))];
   
    const filteredContent = searchQuery
      ? MOCK_CONTENT.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : [];




    const handleCardClick = (content: Content) => {
        setIsLoadingContent(true);
        // Simulate network delay for fetching details
        setTimeout(() => {
            setSelectedContent(content);
            setActiveModal(true);
            setIsLoadingContent(false);
        }, 800);
    };
   
    const handleHeroDetailsClick = () => {
        setIsLoadingContent(true);
        setTimeout(() => {
            setSelectedContent(featuredContent);
            setActiveModal(true);
            setIsLoadingContent(false);
        }, 800);
    }




    const handlePlayClick = (url: string, title: string, description: string, introStart?: number, introEnd?: number) => {
        if (url) {
            setActiveModal(false);
            setPlayerState({ url, title, description, introStart, introEnd });
            setIsMiniPlayer(false);
        }
    };




    const closeModal = () => {
        setActiveModal(false);
        setTimeout(() => setSelectedContent(null), 300);
    };
   
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            if (currentPage !== 'search') setCurrentPage('search');
            // Simulate search loading
            setIsSearching(true);
        } else {
            if (currentPage === 'search') setCurrentPage('home');
            setIsSearching(false);
        }
    };
   
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
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
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
                            onPlayClick={() => handlePlayClick(featuredContent.videoUrl || '', featuredContent.title, featuredContent.description, featuredContent.introStart, featuredContent.introEnd)}
                        />
                        <div className="relative z-20 -mt-28">
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
                ) : currentPage === 'upload' ? (
                    <UploadPage />
                ) : (
                    <MoviesPage contents={MOCK_CONTENT} onCardClick={handleCardClick} />
                )}
            </main>
           
            {playerState && (
                <VideoPlayer
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