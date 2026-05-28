import React, { useEffect, useState } from 'react';

interface AdBlockProps {
    slot: string; // AdSense Slot ID
    client?: string; // AdSense Pub ID
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
    responsive?: 'true' | 'false';
    minHeightClass: string; // CLS Prevention
    label?: string; // Subtle header text
    className?: string; // Tailored styling overrides
    type: 'leaderboard' | 'sidebar' | 'in-feed';
}

const AdBlock: React.FC<AdBlockProps> = ({
    slot,
    client = 'ca-pub-8922860413075053', // Primary Client ID from layout
    format = 'auto',
    responsive = 'true',
    minHeightClass,
    label = 'Publicidad',
    className = '',
    type
}) => {
    const [adFailed, setAdFailed] = useState(false);

    useEffect(() => {
        // Trigger AdSense push logic on mount
        try {
            const adsbygoogle = (window as any).adsbygoogle;
            if (adsbygoogle) {
                adsbygoogle.push({});
            }
        } catch (err) {
            console.warn('AdSense push failed or blocked:', err);
            setAdFailed(true);
        }
    }, []);

    // Layout configuration depending on type
    const layoutStyles = {
        leaderboard: 'w-full max-w-7xl mx-auto my-6',
        sidebar: 'w-full h-full min-w-[280px] max-w-[340px] my-4 sticky top-24',
        'in-feed': 'w-full my-6'
    };

    return (
        <div 
            id={`adsense-panel-${slot}`}
            className={`group relative bg-[#121212] border border-red-600/20 hover:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.03)] hover:shadow-[0_0_25px_rgba(239,68,68,0.12)] rounded-[10px] flex flex-col justify-center items-center overflow-hidden transition-all duration-500 ${minHeightClass} ${layoutStyles[type]} ${className}`}
        >
            {/* Ambient Red Neon laser glow lines in upper and lower margins */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-70 group-hover:via-red-500 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-900/20 to-transparent" />

            {/* Subtle disclaimer in grey */}
            <div className="absolute top-2 left-4 text-[9px] uppercase tracking-[0.2em] font-black text-gray-500 select-none z-10 group-hover:text-red-500/60 transition-colors">
                {label}
            </div>

            {/* AdSense tag container */}
            <div className="w-full h-full flex items-center justify-center p-4 z-0">
                <ins
                    className="adsbygoogle"
                    style={{ display: 'block', width: '100%', height: '100%' }}
                    data-ad-client={client}
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive={responsive}
                />
            </div>

            {/* Dynamic Background subtle grid decoration to look cohesive if slow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

            {/* Visual Dev placeholder to show active layout during local test if ad block is empty */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 group-hover:opacity-65 transition-all pointer-events-none bg-gradient-to-b from-[#121212] to-[#0a0a0a] z-[1]">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/5 border border-red-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Ad</span>
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-[#ef4444] uppercase">
                        {type === 'leaderboard' ? 'Banner Superior' : type === 'sidebar' ? 'Sidebar Ad (Vertical)' : 'In-Feed Ad (Comunidad)'}
                    </span>
                    <span className="text-[8px] tracking-[0.1em] text-gray-500 font-mono">
                        Slot: {slot} • ID de Editor: {client}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AdBlock;
