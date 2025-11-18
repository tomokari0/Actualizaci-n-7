// FIX: Import useState, useEffect, and useRef from React to resolve multiple 'Cannot find name' errors.
import React, { useState, useEffect, useRef } from 'react';
import { Content } from './types';
import { MOCK_CONTENT } from './constants';
// Gemini service imports removed as features are deactivated.

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


// --- UI COMPONENTS ---

type Page = 'home' | 'movies';

const Header: React.FC<{ 
    onNavigate: (page: Page) => void;
    currentPage: Page;
}> = ({ onNavigate, currentPage }) => {
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
                    <h1 className="text-3xl md:text-4xl text-red-500 font-bebas tracking-wider">SEIKOYT</h1>
                    <nav className="hidden md:flex items-center space-x-6 font-medium">
                        <button onClick={() => onNavigate('home')} className={navLinkClasses('home')}>Home</button>
                        <button onClick={() => onNavigate('movies')} className={navLinkClasses('movies')}>Movies</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <a 
                        href="https://www.patreon.com/c/SeikoVT?vanity=user" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 border border-red-500 text-red-500 font-medium px-4 py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors transform hover:scale-105"
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

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-[#181818] text-white rounded-xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-end p-2 flex-shrink-0">
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors rounded-full p-2 hover:bg-gray-800">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="overflow-y-auto px-8 pb-8">
                {children}
            </div>
        </div>
    </div>
);

const DetailModalContent: React.FC<{ content: Content; onPlayTrailer: (url: string) => void; onPlayMovie: (url: string) => void }> = ({ content, onPlayTrailer, onPlayMovie }) => (
    <div>
        <div className="relative aspect-video rounded-lg overflow-hidden -mt-12 mb-6">
            <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                 <h2 className="text-5xl font-bebas text-white">{content.title}</h2>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <div className="flex items-baseline space-x-4 mb-4 text-gray-400">
                    <span className="font-bold text-green-400">97% Match</span>
                    <span>{content.releaseYear}</span>
                    <span className="border border-gray-500 px-1 text-sm">{content.rating}</span>
                </div>
                <p className="text-gray-300 leading-relaxed">{content.description}</p>
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
         <div className="mt-8 pt-6 border-t border-gray-800 flex flex-wrap gap-4">
            <button
                onClick={() => content.videoUrl && onPlayMovie(content.videoUrl)}
                className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/30 transition-all transform hover:scale-105"
            >
                <PlayIcon className="w-6 h-6 mr-2" />
                Play Movie
            </button>
            <button
                onClick={() => content.trailerUrl && onPlayTrailer(content.trailerUrl)}
                className="flex items-center bg-black/20 backdrop-blur-sm border border-white/30 text-white font-bold px-6 py-3 rounded-lg hover:bg-white/40 transition-all transform hover:scale-105"
            >
                <PlayIcon className="w-6 h-6 mr-2" />
                Play Trailer
            </button>
        </div>
    </div>
);

const VideoPlayer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
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
    const controlsTimeoutRef = useRef<number | null>(null);
    const preMuteVolumeRef = useRef<number>(1);
    const VTT_TRACK_SRC = `data:text/vtt;base64,V0VCVlRUCgowMDowMDowMS4wMDAgLS0+IDAwOjAwOjA0LjAwMwpUaGlzIGlzIGEgc2FtcGxlIHN1YnRpdGxlIGZvciBkZW1vbnN0cmF0aW9uLgoKMDA6MDA6MDUuMDAwIC0tPiAwMDowMDowOS4wMDAKUGxheWJhY2sgc3BlZWQgYW5kIHN1YnRpdGxlcyBhcmUgbm93IGZ1bGx5IGZ1bmN0aW9uYWwu`;


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
    }, [src]);

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

    const togglePlayPause = () => setIsPlaying(prev => !prev);
    useEffect(() => {
        if (videoRef.current) {
            isPlaying ? videoRef.current.play() : videoRef.current.pause();
        }
    }, [isPlaying]);

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const newTime = (Number(e.target.value) / 100) * duration;
        videoRef.current.currentTime = newTime;
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

    return (
        <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in" onMouseMove={handleMouseMove} onMouseLeave={() => setShowControls(false)}>
            <video ref={videoRef} src={src} className="w-full h-auto max-h-full" onClick={togglePlayPause} crossOrigin="anonymous">
                <track default kind="subtitles" srcLang="en" label="English" src={VTT_TRACK_SRC} />
            </video>
            <button onClick={onClose} className={`absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <CloseIcon className="w-7 h-7" />
            </button>
            <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <input type="range" min="0" max="100" value={progress} onChange={handleScrub} className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer video-progress" />
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
                            <button onClick={() => setShowSpeedOptions(s => !s)} className="text-sm font-bold w-12">{playbackRate}x</button>
                            {showSpeedOptions && (
                                <ul className="absolute bottom-full mb-2 right-0 bg-black/70 rounded-md py-1">
                                    {[0.5, 1, 1.5, 2].map(rate => (
                                        <li key={rate}><button onClick={() => changePlaybackRate(rate)} className="px-4 py-1 hover:bg-red-500 w-full text-left text-sm">{rate}x</button></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button onClick={toggleSubtitles} className={areSubtitlesVisible ? 'text-red-500' : ''}><SubtitlesIcon className="w-6 h-6" /></button>
                        <button onClick={toggleFullScreen}><FullscreenIcon className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-black py-8 mt-12 border-t border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-xs leading-relaxed">
            <p>Copyright © 2025 - 2025 SeikoVT. 'SeikoYT', los logotipos de SeikoYT y el nombre pertenecen a SeikoVT.</p>
            <p className="mt-1">Otros nombres o marcas son marcas registradas de sus respectivos dueños.</p>
        </div>
    </footer>
);

// --- TOP-LEVEL APP COMPONENT ---

export default function App() {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [activeModal, setActiveModal] = useState<boolean>(false);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

    const featuredContent = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];
    const genres = [...new Set(MOCK_CONTENT.flatMap(c => c.genre))];

    const handleCardClick = (content: Content) => {
        setSelectedContent(content);
        setActiveModal(true);
    };
    
    const handleHeroDetailsClick = () => {
        setSelectedContent(featuredContent);
        setActiveModal(true);
    }

    const handlePlayClick = (url?: string) => {
        if (url) {
            setActiveModal(false);
            setPlayingVideoUrl(url);
        }
    };

    const closeModal = () => {
        setActiveModal(false);
        setTimeout(() => setSelectedContent(null), 300);
    };
    
    return (
        <div className="bg-black min-h-screen text-white">
            <Header 
                onNavigate={setCurrentPage}
                currentPage={currentPage}
            />
            <main>
                {currentPage === 'home' ? (
                    <>
                        <HeroBanner 
                            content={featuredContent} 
                            onDetailsClick={handleHeroDetailsClick} 
                            onPlayClick={() => handlePlayClick(featuredContent.videoUrl)}
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
                ) : (
                    <MoviesPage contents={MOCK_CONTENT} onCardClick={handleCardClick} />
                )}
            </main>
            
            {playingVideoUrl && <VideoPlayer src={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />}

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