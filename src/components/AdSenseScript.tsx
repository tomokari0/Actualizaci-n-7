import React, { useEffect } from 'react';

/**
 * AdSenseScript component
 * Enables dynamic, non-blocking lazy loading of Google AdSense.
 * 
 * It employs 'requestIdleCallback' and deferred execution to ensure that 
 * the main thread remains clear for critical assets such as players, images, and fonts.
 */
const AdSenseScript: React.FC = () => {
    useEffect(() => {
        const loadAdSense = () => {
            // Guarantee singleton execution
            if (document.getElementById('google-adsense-script')) return;

            const script = document.createElement('script');
            script.id = 'google-adsense-script';
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8922860413075053';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('⚡ [SeikoTV-SEO] Google AdSense loaded gracefully on requestIdleCallback.');
            };

            document.head.appendChild(script);
        };

        // LazyLoad strategy to secure the Performance Score
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
                if (document.readyState === 'complete') {
                    loadAdSense();
                } else {
                    window.addEventListener('load', loadAdSense);
                }
            }, { timeout: 2500 }); // High-priority tasks (player engines) execute within the first 2.5s
        } else {
            // Backward-compatible lazy fallback
            setTimeout(() => {
                if (document.readyState === 'complete') {
                    loadAdSense();
                } else {
                    window.addEventListener('load', loadAdSense);
                }
            }, 2000);
        }

        return () => {
            window.removeEventListener('load', loadAdSense);
        };
    }, []);

    return null;
};

export default AdSenseScript;
