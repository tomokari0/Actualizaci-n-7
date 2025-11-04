import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Content, ChatMessage, GroundingChunk, UserProfile } from './types';
import { MOCK_CONTENT } from './constants';
import { sendMessageToChatbot, editImageWithPrompt, generateImageWithPrompt, searchWithGrounding, generateProfilePicture } from './services/geminiService';

// --- HELPER & UTILITY ---

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.match(/:(.*?);/)?.[1] || file.type;
      resolve({ base64, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

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
const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"></path></svg>
);
const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l.59-1.22c.28-.58.89-1 1.52-1.02.7-.02 1.34.34 1.7.94l.59 1.22L18 3.5c.61.12 1.13.53 1.38 1.09l.59 1.22-1.22.59c-.58.28-1 .89-1.02 1.52-.02.7.34 1.34.94 1.7l1.22.59-1.22.59c-.58.28-1 .89-1.02 1.52s.34 1.34.94 1.7l1.22.59-.59 1.22c-.25.56-.77.97-1.38 1.09l.59 1.22c-.58.28-1 .89-1.02 1.52s.34 1.34.94 1.7l1.22.59-.59 1.22c-.25.56-.77.97-1.38 1.09L16.4 18l-1.22.59c-.58.28-1 .89-1.02 1.52c0 .7.34 1.34.94 1.7l1.22.59-1.22.59c-.58.28-1 .89-1.02 1.52s.34 1.34.94 1.7l1.22.59-.59 1.22c-.25.56-.77.97-1.38 1.09L16.4 18l-1.22.59c-.58.28-1 .89-1.02 1.52.02.7-.34 1.34-.94 1.7l-1.22.59 1.22-.59c.58-.28 1-.89 1.02-1.52s-.34-1.34-.94-1.7l-1.22-.59.59-1.22c.25-.56.77-.97 1.38-1.09L11.6 18l1.22-.59c.58-.28 1-.89 1.02-1.52s-.34-1.34-.94-1.7l-1.22-.59.59-1.22c.25-.56.77-.97 1.38-1.09L11.6 6l1.22.59c.58.28 1 .89 1.02 1.52s-.34-1.34-.94-1.7l-1.22.59-.59-1.22c-.25-.56-.77-.97-1.38-1.09L6 3.5l-1.22.59c-.61.12-1.13.53-1.38 1.09l-.59 1.22 1.22.59c.58.28 1 .89 1.02 1.52.02.7-.34 1.34-.94 1.7l-1.22.59L3.5 12l.59 1.22c.25.56.77.97 1.38 1.09L6 16.4l1.22-.59c.58-.28 1-.89 1.02-1.52s-.34-1.34-.94-1.7l-1.22-.59.59-1.22c.25-.56.77-.97 1.38-1.09L8.4 6l-1.22-.59c-.58-.28-1-.89-1.02-1.52s.34-1.34.94-1.7L7.7 2.69l.59-1.22C8.54.9,9.15.54,9.85.52c.7-.02,1.34.34,1.7.94l.45.93z"></path></svg>
);
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.04,4.73 15.3,5.46 16.25,6.45L18.88,3.81C17.02,2.19 14.84,1.27 12.19,1.27C6.42,1.27 2,6.48 2,12C2,17.52 6.42,22.73 12.19,22.73C17.96,22.73 22,18.36 22,12.27C22,11.77 21.68,11.1 21.35,11.1Z"/></svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
);

// --- AUTHENTICATION & PROFILE SETUP ---

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const featuredContent = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin();
    };

    return (
        <div className="relative h-screen w-screen bg-black flex items-center justify-center">
            <img src={featuredContent.backdropUrl} alt="background" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            
            <header className="absolute top-0 left-0 right-0 z-20">
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                     <h1 className="text-3xl md:text-4xl text-red-600 font-bebas tracking-wider">SEIKOYT</h1>
                 </div>
            </header>
            
            <div className="relative z-10 bg-black/70 p-8 sm:p-12 rounded-lg max-w-md w-full">
                <h2 className="text-white text-3xl font-bold mb-6">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        required
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        required
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 transition-colors">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <div className="mt-4 text-center text-gray-400">or</div>
                <button onClick={onLogin} className="w-full mt-4 bg-white/90 text-black font-medium py-3 rounded flex items-center justify-center hover:bg-white transition-colors">
                    <GoogleIcon className="w-6 h-6 mr-2" />
                    Sign in with Google
                </button>
                <p className="mt-8 text-center text-gray-400">
                    {isSignUp ? 'Already have an account?' : 'New to SeikoYT?'}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-white font-bold ml-2 hover:underline">
                        {isSignUp ? 'Sign in now.' : 'Sign up now.'}
                    </button>
                </p>
                <p className="mt-6 text-xs text-gray-500 text-center">
                    By signing in, you agree to our <a href="#" className="underline hover:text-gray-300">Terms of Service</a> and <a href="#" className="underline hover:text-gray-300">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
};

const ProfileSetupPage: React.FC<{ onProfileSave: (profile: UserProfile) => void }> = ({ onProfileSave }) => {
    const [username, setUsername] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateAvatar = async () => {
        if (!username.trim()) {
            setError('Please enter a username first.');
            return;
        }
        setIsLoading(true);
        setError('');
        const result = await generateProfilePicture(username);
        if (result) {
            setProfilePictureUrl(`data:image/jpeg;base64,${result}`);
        } else {
            setError('Could not generate an avatar. Please try again.');
        }
        setIsLoading(false);
    };

    const handleSave = () => {
        if (!username.trim() || !profilePictureUrl) {
            setError('Please enter a username and generate an avatar.');
            return;
        }
        onProfileSave({ username, profilePictureUrl });
    };

    return (
        <div className="relative h-screen w-screen bg-black flex items-center justify-center p-4">
             <img src={MOCK_CONTENT[0].backdropUrl} alt="background" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            
            <header className="absolute top-0 left-0 right-0 z-20">
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                     <h1 className="text-3xl md:text-4xl text-red-600 font-bebas tracking-wider">SEIKOYT</h1>
                 </div>
            </header>

            <div className="relative z-10 bg-black/70 p-8 sm:p-12 rounded-lg max-w-md w-full text-white">
                <h2 className="text-3xl font-bold mb-6 text-center">Create Your Profile</h2>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g., CinemaFan99"
                            className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                    </div>
                    <div className="flex flex-col items-center space-y-4">
                         <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                           {isLoading ? (
                                <div className="text-sm text-gray-400">Generating...</div>
                            ) : profilePictureUrl ? (
                                <img src={profilePictureUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-20 h-20 text-gray-500" />
                            )}
                        </div>
                        <button onClick={handleGenerateAvatar} disabled={isLoading || !username} className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {isLoading ? 'Generating...' : 'Generate AI Avatar'}
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-center">{error}</p>}
                    
                    <button onClick={handleSave} disabled={!username || !profilePictureUrl} className="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 transition-colors disabled:bg-red-900 disabled:cursor-not-allowed">
                        Save and Continue
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProfileModalContent: React.FC<{ userProfile: UserProfile; onProfileUpdate: (profile: UserProfile) => void; onClose: () => void }> = ({ userProfile, onProfileUpdate, onClose }) => {
    const [username, setUsername] = useState(userProfile.username);
    const [profilePictureUrl, setProfilePictureUrl] = useState(userProfile.profilePictureUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateAvatar = async () => {
        setIsLoading(true);
        setError('');
        const result = await generateProfilePicture(username || 'user');
        if (result) {
            setProfilePictureUrl(`data:image/jpeg;base64,${result}`);
        } else {
            setError('Could not generate a new avatar. Please try again.');
        }
        setIsLoading(false);
    };

    const handleSave = () => {
        if (!username.trim()) {
            setError('Username cannot be empty.');
            return;
        }
        onProfileUpdate({ username, profilePictureUrl });
        onClose();
    };

    return (
        <div className="text-white space-y-6">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden relative group">
                   {isLoading ? (
                        <div className="text-sm text-gray-400">Generating...</div>
                    ) : (
                        <img src={profilePictureUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                    )}
                </div>
                <button onClick={handleGenerateAvatar} disabled={isLoading} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded text-sm disabled:bg-gray-500">
                    {isLoading ? 'Generating...' : 'Generate New Avatar'}
                </button>
            </div>
             <div>
                <label htmlFor="edit-username" className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                    id="edit-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <button onClick={handleSave} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 transition-colors">
                Save Changes
            </button>
        </div>
    );
};

// --- UI COMPONENTS (for the main app) ---

type Page = 'home' | 'movies';

const Header: React.FC<{ 
    onSearchClick: (query: string) => void; 
    onAiToolsClick: () => void; 
    onLogout: () => void;
    onNavigate: (page: Page) => void;
    currentPage: Page;
    userProfile: UserProfile;
    onProfileClick: () => void;
}> = ({ onSearchClick, onAiToolsClick, onLogout, onNavigate, currentPage, userProfile, onProfileClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearchClick(searchQuery.trim());
        }
    };
    
    const navLinkClasses = (page: Page) => 
        `cursor-pointer transition-colors ${currentPage === page ? 'text-white font-bold' : 'text-gray-300 hover:text-gray-100'}`;


    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${isScrolled ? 'bg-black/90 backdrop-blur-sm' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
                <div className="flex items-center space-x-8">
                    <h1 className="text-3xl md:text-4xl text-red-600 font-bebas tracking-wider">SEIKOYT</h1>
                    <nav className="hidden md:flex items-center space-x-6 font-medium">
                        <button onClick={() => onNavigate('home')} className={navLinkClasses('home')}>Home</button>
                        <button onClick={() => onNavigate('movies')} className={navLinkClasses('movies')}>Movies</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <form onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            placeholder="Ask Gemini about movies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/50 border border-gray-700 rounded-full px-4 py-1.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 w-32 sm:w-64 transition-all duration-300"
                        />
                    </form>
                    <button onClick={onAiToolsClick} className="bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full transition-colors" aria-label="AI Tools">
                        <SparklesIcon className="w-5 h-5" />
                    </button>
                    <div className="relative" ref={dropdownRef}>
                         <button onClick={() => setProfileDropdownOpen(o => !o)} className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-red-500 transition-colors">
                             <img src={userProfile.profilePictureUrl} alt={userProfile.username} className="w-full h-full object-cover" />
                         </button>
                        {profileDropdownOpen && (
                             <div className="absolute right-0 mt-2 w-48 bg-black/90 rounded-md shadow-lg py-1 text-white animate-fade-in">
                                 <div className="px-4 py-2 border-b border-gray-700">
                                     <p className="font-bold truncate">{userProfile.username}</p>
                                 </div>
                                 <button onClick={() => { onProfileClick(); setProfileDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-800">Profile</button>
                                 <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-800">Sign Out</button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

const HeroBanner: React.FC<{ content: Content; onDetailsClick: () => void; onPlayClick: () => void }> = ({ content, onDetailsClick, onPlayClick }) => (
    <div className="relative h-screen -mb-32">
        <img src={content.backdropUrl} alt={content.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        <div className="relative z-10 h-full flex flex-col justify-end pb-40 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
                <h2 className="text-5xl md:text-7xl font-bebas text-white tracking-wide">{content.title}</h2>
                <p className="mt-4 text-gray-200 text-lg max-w-lg">{content.description}</p>
                <div className="mt-6 flex space-x-4">
                    <button onClick={onPlayClick} className="flex items-center bg-white text-black font-bold px-6 py-2.5 rounded-md hover:bg-gray-200 transition-colors">
                        <PlayIcon className="w-6 h-6 mr-2" />
                        Play
                    </button>
                    <button onClick={onDetailsClick} className="flex items-center bg-gray-600/70 text-white font-bold px-6 py-2.5 rounded-md hover:bg-gray-600/90 transition-colors">
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
        <div className="aspect-[2/3] overflow-hidden rounded-md">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300" />
        </div>
    </div>
);


const ContentRow: React.FC<{ title: string; contents: Content[]; onCardClick: (content: Content) => void }> = ({ title, contents, onCardClick }) => (
    <div className="mb-8">
        <h3 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 sm:px-6 lg:px-8">{title}</h3>
        <div className="grid grid-flow-col auto-cols-[10rem] sm:auto-cols-[12rem] md:auto-cols-[14rem] gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 scrollbar-hide">
            {contents.map(content => (
                <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
            ))}
        </div>
    </div>
);

const MoviesPage: React.FC<{ contents: Content[]; onCardClick: (content: Content) => void }> = ({ contents, onCardClick }) => (
    <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white mb-8">All Movies</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {contents.map(content => (
                <ContentCard key={content.id} content={content} onCardClick={() => onCardClick(content)} />
            ))}
        </div>
    </div>
);

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#141414] text-white rounded-lg overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
            <header className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-2xl font-bebas">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="overflow-y-auto p-6">
                {children}
            </div>
        </div>
    </div>
);

const DetailModalContent: React.FC<{ content: Content; onPlayTrailer: (url: string) => void; onPlayMovie: (url: string) => void }> = ({ content, onPlayTrailer, onPlayMovie }) => (
    <div>
        <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
            <img src={content.backdropUrl} alt={content.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <h2 className="absolute bottom-4 left-4 text-4xl font-bebas text-white">{content.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <p className="text-gray-300">{content.description}</p>
                <div className="mt-4 flex items-center space-x-4">
                     <button
                        onClick={() => content.videoUrl && onPlayMovie(content.videoUrl)}
                        className="flex items-center bg-white text-black font-bold px-6 py-2.5 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        <PlayIcon className="w-6 h-6 mr-2" />
                        Play Movie
                    </button>
                    <button
                        onClick={() => content.trailerUrl && onPlayTrailer(content.trailerUrl)}
                        className="flex items-center bg-gray-600/70 text-white font-bold px-6 py-2.5 rounded-md hover:bg-gray-600/90 transition-colors"
                    >
                        <PlayIcon className="w-6 h-6 mr-2" />
                        Play Trailer
                    </button>
                </div>
            </div>
            <div>
                <p><span className="font-bold text-gray-500">Genres:</span> {content.genre.join(', ')}</p>
                <p><span className="font-bold text-gray-500">Release Year:</span> {content.releaseYear}</p>
                <p><span className="font-bold text-gray-500">Rating:</span> {content.rating}</p>
            </div>
        </div>
    </div>
);

const SearchResultsContent: React.FC<{ query: string; results: { text: string; sources: GroundingChunk[] } | null; isLoading: boolean }> = ({ query, results, isLoading }) => {
    if (isLoading) {
        return <div className="text-center p-8">Searching the web with Gemini...</div>;
    }
    if (!results) return null;

    return (
        <div>
            <p className="mb-4 text-lg text-gray-300">{results.text}</p>
            {results.sources.length > 0 && (
                <div>
                    <h4 className="font-bold mb-2 text-gray-400">Sources:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {results.sources.map((source, index) => source.web && (
                            <li key={index}>
                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">
                                    {source.web.title || source.web.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const ImageEditor: React.FC<{}> = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditedImage(null);
            setError('');
            const reader = new FileReader();
            reader.onload = (event) => setOriginalImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = async () => {
        if (!originalImage || !prompt) {
            setError('Please upload an image and provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setEditedImage(null);

        const base64 = originalImage.split(',')[1];
        const mimeType = originalImage.match(/:(.*?);/)?.[1] || 'image/jpeg';

        const result = await editImageWithPrompt(base64, mimeType, prompt);
        if (result) {
            setEditedImage(`data:image/jpeg;base64,${result}`);
        } else {
            setError('Failed to edit the image. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold">Image Editor</h3>
            <p className="text-gray-400">Upload an image and tell Gemini how to edit it.</p>
            <div>
                <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Upload Image</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold mb-2">Original</h4>
                    <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center">
                        {originalImage ? <img src={originalImage} alt="Original" className="max-h-full max-w-full object-contain rounded-lg" /> : <span className="text-gray-500">Upload an image</span>}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Edited</h4>
                    <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center">
                        {isLoading ? <div className="text-gray-400">Editing...</div> :
                         editedImage ? <img src={editedImage} alt="Edited" className="max-h-full max-w-full object-contain rounded-lg" /> : <span className="text-gray-500">Your edited image will appear here</span>}
                    </div>
                </div>
            </div>
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g., "Add a retro filter" or "Make it black and white"'
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button onClick={handleEdit} disabled={isLoading || !originalImage || !prompt} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isLoading ? 'Editing...' : 'Edit with Gemini'}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
};

const ImageGenerator: React.FC<{}> = () => {
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please provide a prompt.');
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedImage(null);

        const result = await generateImageWithPrompt(prompt);
        if (result) {
            setGeneratedImage(`data:image/jpeg;base64,${result}`);
        } else {
            setError('Failed to generate the image. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold">Poster Generator</h3>
            <p className="text-gray-400">Describe a movie poster and let Gemini create it for you.</p>
            <div className="aspect-[9/16] bg-gray-900 rounded-lg flex items-center justify-center w-full max-w-sm mx-auto">
                {isLoading ? <div className="text-gray-400">Generating...</div> :
                 generatedImage ? <img src={generatedImage} alt="Generated Poster" className="max-h-full max-w-full object-contain rounded-lg" /> : <span className="text-gray-500">Your poster will appear here</span>}
            </div>
            <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g., "A lone astronaut looking at a swirling galaxy"'
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isLoading ? 'Generating...' : 'Generate with Gemini'}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
};

const Chatbot: React.FC<{}> = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "Hi! I'm SeikoBot. How can I help you find your next favorite movie?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        
        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const responseText = await sendMessageToChatbot(input);
        
        const modelMessage: ChatMessage = { role: 'model', text: responseText };
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);
    };

    return (
        <div className="fixed bottom-5 right-5 z-50">
            {isOpen && (
                <div className="w-80 h-[28rem] bg-gray-900/80 backdrop-blur-md rounded-lg shadow-2xl flex flex-col mb-4 animate-fade-in">
                    <header className="bg-gray-800 p-3 rounded-t-lg">
                        <h3 className="text-white font-bold">SeikoBot Assistant</h3>
                    </header>
                    <div className="flex-1 p-3 overflow-y-auto">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                                <div className={`px-3 py-2 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex justify-start mb-2">
                                <div className="px-3 py-2 rounded-lg bg-gray-700 text-gray-200">
                                    <div className="flex items-center space-x-1">
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></span>
                                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-400"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSend} className="p-3 border-t border-gray-700 flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <button type="submit" className="ml-2 text-red-500 p-2 rounded-full hover:bg-gray-700 disabled:text-gray-500" disabled={isLoading}>
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="bg-red-600 text-white rounded-full p-4 shadow-lg hover:bg-red-700 transition-transform hover:scale-110">
                {isOpen ? <CloseIcon className="w-7 h-7" /> : <ChatIcon className="w-7 h-7" />}
            </button>
        </div>
    );
};

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
                // Ensure subtitles are loaded but hidden by default
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
        <div ref={containerRef} className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in" onMouseMove={handleMouseMove}>
            <video ref={videoRef} src={src} className="w-full h-auto max-h-full" onClick={togglePlayPause} crossOrigin="anonymous">
                <track default kind="subtitles" srcLang="en" label="English" src={VTT_TRACK_SRC} />
            </video>
            <button onClick={onClose} className={`absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <CloseIcon className="w-7 h-7" />
            </button>
            <div className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <input type="range" min="0" max="100" value={progress} onChange={handleScrub} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm" style={{ backgroundSize: `${progress}% 100%` }} />
                <div className="flex items-center justify-between mt-2 text-white">
                    <div className="flex items-center space-x-4">
                        <button onClick={togglePlayPause}>{isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}</button>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setVolume(v => v > 0 ? 0 : 1)}>{volume > 0 ? <VolumeUpIcon className="w-6 h-6" /> : <VolumeOffIcon className="w-6 h-6" />}</button>
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
                                        <li key={rate}><button onClick={() => changePlaybackRate(rate)} className="px-4 py-1 hover:bg-red-600 w-full text-left text-sm">{rate}x</button></li>
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


// --- MAIN APP LOGIC WRAPPER ---

const MainApp: React.FC<{ onLogout: () => void; userProfile: UserProfile; onProfileUpdate: (profile: UserProfile) => void; }> = ({ onLogout, userProfile, onProfileUpdate }) => {
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [activeModal, setActiveModal] = useState<'search' | 'ai' | 'details' | 'profile' | null>(null);
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ text: string; sources: GroundingChunk[] } | null>(null);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

    const featuredContent = MOCK_CONTENT.find(c => c.featured) || MOCK_CONTENT[0];
    const genres = [...new Set(MOCK_CONTENT.flatMap(c => c.genre))];

    const handleCardClick = (content: Content) => {
        setSelectedContent(content);
        setActiveModal('details');
    };
    
    const handleHeroDetailsClick = () => {
        setSelectedContent(featuredContent);
        setActiveModal('details');
    }

    const handlePlayClick = (url?: string) => {
        if (url) {
            setActiveModal(null);
            setPlayingVideoUrl(url);
        }
    };

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        setActiveModal('search');
        setIsSearchLoading(true);
        setSearchResults(null);
        const results = await searchWithGrounding(query);
        setSearchResults(results);
        setIsSearchLoading(false);
    }, []);

    const handleAiToolsClick = () => {
        setActiveModal('ai');
    };
    
    const handleProfileClick = () => {
        setActiveModal('profile');
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedContent(null);
    };

    return (
        <div className="bg-black min-h-screen text-white">
            <Header 
                onSearchClick={handleSearch} 
                onAiToolsClick={handleAiToolsClick} 
                onLogout={onLogout}
                onNavigate={setCurrentPage}
                currentPage={currentPage}
                userProfile={userProfile}
                onProfileClick={handleProfileClick}
            />
            <main>
                {currentPage === 'home' ? (
                    <>
                        <HeroBanner 
                            content={featuredContent} 
                            onDetailsClick={handleHeroDetailsClick} 
                            onPlayClick={() => handlePlayClick(featuredContent.videoUrl)}
                        />
                        <div className="relative z-20 -mt-20">
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
            
            <Chatbot />
            
            {playingVideoUrl && <VideoPlayer src={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />}

            {activeModal === 'details' && selectedContent && (
                <Modal onClose={closeModal} title="Details">
                    <DetailModalContent 
                        content={selectedContent} 
                        onPlayTrailer={handlePlayClick}
                        onPlayMovie={handlePlayClick}
                    />
                </Modal>
            )}
            
            {activeModal === 'search' && (
                <Modal onClose={closeModal} title={`Gemini Results for: "${searchQuery}"`}>
                    <SearchResultsContent query={searchQuery} results={searchResults} isLoading={isSearchLoading} />
                </Modal>
            )}

            {activeModal === 'ai' && (
                <Modal onClose={closeModal} title="SeikoYT AI Studio">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ImageEditor />
                        <ImageGenerator />
                    </div>
                </Modal>
            )}

            {activeModal === 'profile' && (
                <Modal onClose={closeModal} title="Edit Profile">
                    <ProfileModalContent userProfile={userProfile} onProfileUpdate={onProfileUpdate} onClose={closeModal} />
                </Modal>
            )}
        </div>
    );
}

// --- TOP-LEVEL APP COMPONENT WITH AUTHENTICATION ---

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            const storedProfile = localStorage.getItem('seikoYTUserProfile');
            if (storedProfile) {
                try {
                    setUserProfile(JSON.parse(storedProfile));
                } catch (e) {
                    console.error("Failed to parse user profile from localStorage", e);
                    localStorage.removeItem('seikoYTUserProfile');
                }
            }
        }
    }, [isAuthenticated]);

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('seikoYTUserProfile');
        setUserProfile(null);
        setIsAuthenticated(false);
    };

    const handleProfileSave = (profile: UserProfile) => {
        localStorage.setItem('seikoYTUserProfile', JSON.stringify(profile));
        setUserProfile(profile);
    };

    if (!isAuthenticated) {
        return <LoginPage onLogin={handleLogin} />;
    }

    if (!userProfile) {
        return <ProfileSetupPage onProfileSave={handleProfileSave} />;
    }

    return <MainApp onLogout={handleLogout} userProfile={userProfile} onProfileUpdate={handleProfileSave} />;
}