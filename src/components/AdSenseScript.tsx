import React, { useEffect } from 'react';

/**
 * AdSenseScript component
 * Enables dynamic, non-blocking lazy loading of Google AdSense and automatically 
 * provisions the required AdSense Account Verification Meta tag.
 * 
 * It employs 'requestIdleCallback' and deferred execution to ensure that 
 * the main thread remains clear for critical assets such as players, images, and fonts.
 */
const AdSenseScript: React.FC = () => {
    useEffect(() => {
        // 1. Immediately inject the lightweight verification Meta Tag (needed for AdSense validation crawlers)
        const injectMetaTag = () => {
            const metaId = 'google-adsense-meta';
            if (!document.getElementById(metaId)) {
                const meta = document.createElement('meta');
                meta.id = metaId;
                meta.name = 'google-adsense-account';
                meta.content = 'ca-pub-8922860413075053';
                document.head.appendChild(meta);
                console.log('⚡ [SeikoTV-SEO] Google AdSense verification meta tag injected instantly.');
            }
        };
        
        injectMetaTag();

        // 2. Load the main adsbygoogle.js script asynchronously to protect Core Web Vitals
        const loadAdSenseScript = () => {
            const scriptId = 'google-adsense-script';
            if (document.getElementById(scriptId)) return;

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8922860413075053';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('⚡ [SeikoTV-SEO] Google AdSense script loaded gracefully.');
            };

            document.head.appendChild(script);
        };

        // LazyLoad strategy to secure the Performance Score
        if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
                if (document.readyState === 'complete') {
                    loadAdSenseScript();
                } else {
                    window.addEventListener('load', loadAdSenseScript);
                }
            }, { timeout: 2500 }); // Main video engines execute with high priority within 2.5s
        } else {
            // Backward-compatible fallback
            setTimeout(() => {
                if (document.readyState === 'complete') {
                    loadAdSenseScript();
                } else {
                    window.addEventListener('load', loadAdSenseScript);
                }
            }, 2000);
        }

        return () => {
            window.removeEventListener('load', loadAdSenseScript);
        };
    }, []);

    return null;
};

export default AdSenseScript;
