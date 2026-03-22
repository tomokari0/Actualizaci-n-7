
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { Content } from './types';
import { LANGUAGES } from './constants';
import Uploader from './Uploader';

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<'movie' | 'series' | 'episode'>('movie');
    const [seriesList, setSeriesList] = useState<Content[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState('');
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnailUrl: '',
        backdropUrl: '',
        videoUrl: '', // URL principal (fallback)
        audioTracks: [
            { lang: 'en', url: '' },
            { lang: 'es-419', url: '' }
        ],
        genre: '',
        rating: 'PG-13',
        releaseYear: new Date().getFullYear(),
        featured: false,
        status: 'ongoing', // Default status
        // Episode specific
        episodeNumber: 1,
        duration: '24m',
        skipIntro: 0
    });

    useEffect(() => {
        if (type === 'episode') {
            const fetchSeries = async () => {
                const q = query(collection(db, "content"), where("type", "==", "series"));
                const snap = await getDocs(q);
                setSeriesList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Content)));
            };
            fetchSeries();
        }
    }, [type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.title.trim()) throw new Error("El título es obligatorio.");
            if (!formData.thumbnailUrl.trim()) throw new Error("La miniatura es obligatoria.");
            
            const filteredTracks: Record<string, string> = {};
            formData.audioTracks.forEach(track => {
                if (track.lang && track.url) {
                    filteredTracks[track.lang] = track.url;
                }
            });

            if (type === 'episode') {
                if (!selectedSeriesId) throw new Error("Debes seleccionar una serie");
                
                const episodesRef = collection(db, "content", selectedSeriesId, "episodes");
                await addDoc(episodesRef, {
                    title: formData.title,
                    description: formData.description,
                    thumbnailUrl: formData.thumbnailUrl,
                    videoUrl: formData.videoUrl,
                    audioTracks: filteredTracks,
                    episodeNumber: Number(formData.episodeNumber),
                    duration: formData.duration,
                    skipIntro: Number(formData.skipIntro),
                    createdAt: serverTimestamp()
                });
                alert("¡Episodio añadido con éxito! 🎬");
            } else {
                const contentRef = collection(db, "content");
                const newContent = {
                    title: formData.title,
                    description: formData.description,
                    thumbnailUrl: formData.thumbnailUrl,
                    backdropUrl: formData.backdropUrl,
                    videoUrl: formData.videoUrl,
                    audioTracks: filteredTracks,
                    type,
                    genre: formData.genre.split(',').map(g => g.trim()),
                    releaseYear: Number(formData.releaseYear),
                    rating: formData.rating,
                    featured: formData.featured,
                    status: formData.status,
                    skipIntro: Number(formData.skipIntro),
                    createdAt: serverTimestamp(),
                };
                await addDoc(contentRef, newContent);
                alert(type === 'series' ? "¡Serie creada! 🎉" : "¡Película subida! 🎉");
            }
            onClose();
        } catch (err: any) {
            console.error("Error adding document: ", err);
            let message = "Ocurrió un error inesperado al guardar en la base de datos.";
            
            if (err.code === 'permission-denied') {
                message = "No tienes permisos suficientes para realizar esta acción.";
            } else if (err.code === 'unavailable') {
                message = "La base de datos no está disponible. Revisa tu conexión.";
            } else if (err.message) {
                message = err.message;
            }
            
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
            <div className="bg-[#121212] w-full max-w-2xl rounded-2xl border border-white/5 shadow-2xl p-6 md:p-10 my-auto">
                <div className="flex justify-between items-center mb-6 md:mb-10 border-b border-white/5 pb-4 md:pb-6">
                    <h2 className="text-2xl md:text-4xl font-bebas text-red-600 tracking-wider">Editor de Contenido</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">Cerrar</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex gap-2 mb-6 md:mb-8">
                        {['movie', 'series', 'episode'].map((t) => (
                            <button 
                                key={t}
                                type="button"
                                onClick={() => {
                                    setType(t as any);
                                    setError(null);
                                }}
                                className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl font-bold transition-all text-[8px] md:text-[10px] tracking-widest uppercase ${type === t ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                            >
                                {t === 'movie' ? 'Película' : t === 'series' ? 'Serie' : 'Episodio'}
                            </button>
                        ))}
                    </div>

                    {type === 'episode' && (
                        <div className="flex flex-col gap-2 animate-fade-in mb-4 md:mb-6">
                            <label className="text-[10px] text-red-500 uppercase font-black tracking-widest">Seleccionar Serie</label>
                            <select 
                                className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white outline-none focus:border-red-600 text-sm"
                                value={selectedSeriesId}
                                onChange={e => setSelectedSeriesId(e.target.value)}
                                required
                            >
                                <option value="" className="bg-[#121212]">-- Elige una serie --</option>
                                {seriesList.map(s => (
                                    <option key={s.id} value={s.id} className="bg-[#121212]">{s.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                {type === 'episode' ? 'Título del Capítulo' : 'Título'}
                            </label>
                            <input 
                                className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                required
                            />
                        </div>
                        {type === 'episode' ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Número de Episodio</label>
                                <input 
                                    type="number"
                                    className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm"
                                    value={formData.episodeNumber}
                                    onChange={e => setFormData({...formData, episodeNumber: parseInt(e.target.value)})}
                                    required
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Año</label>
                                <input 
                                    type="number"
                                    className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm"
                                    value={formData.releaseYear}
                                    onChange={e => setFormData({...formData, releaseYear: parseInt(e.target.value)})}
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Descripción</label>
                        <textarea 
                            className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none h-20 md:h-24 resize-none transition-all text-sm"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    {type !== 'episode' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Géneros (Separados por coma)</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm"
                                    value={formData.genre}
                                    onChange={e => setFormData({...formData, genre: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Estado</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white outline-none focus:border-red-600 text-sm"
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="ongoing" className="bg-[#121212]">En emisión</option>
                                    <option value="completed" className="bg-[#121212]">Terminado</option>
                                    <option value="cancelled" className="bg-[#121212]">Cancelado</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">URL Miniatura</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-grow bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-xs"
                                        value={formData.thumbnailUrl}
                                        onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                                        required
                                    />
                                    <Uploader onUploadSuccess={(url) => setFormData({...formData, thumbnailUrl: url})} />
                                </div>
                            </div>
                            {type !== 'episode' ? (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">URL Fondo (Hero)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-grow bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-xs"
                                            value={formData.backdropUrl}
                                            onChange={e => setFormData({...formData, backdropUrl: e.target.value})}
                                            required
                                        />
                                        <Uploader onUploadSuccess={(url) => setFormData({...formData, backdropUrl: url})} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Duración (ej: 24m)</label>
                                    <input 
                                        className="w-full bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm"
                                        value={formData.duration}
                                        onChange={e => setFormData({...formData, duration: e.target.value})}
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {type !== 'series' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-red-500 uppercase font-black tracking-widest">URL Video Principal (Fallback)</label>
                                    <input 
                                        className="w-full bg-white/5 border border-red-600/30 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-red-600 outline-none transition-all text-xs"
                                        value={formData.videoUrl}
                                        onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                                        placeholder="Ej: https://..."
                                        required={type === 'episode'}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] text-blue-400 uppercase font-black tracking-widest flex justify-between items-center">
                                        Pistas de Audio
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, audioTracks: [...formData.audioTracks, { lang: 'en', url: '' }]})}
                                            className="text-blue-400 hover:text-blue-300 text-[8px] border border-blue-400/30 px-2 py-1 rounded"
                                        >
                                            + Añadir Idioma
                                        </button>
                                    </label>
                                    
                                    {formData.audioTracks.map((track, index) => (
                                        <div key={index} className="flex gap-2 animate-fade-in">
                                            <select 
                                                className="bg-white/5 border border-white/10 p-2 rounded-lg text-white text-xs outline-none focus:border-blue-400 w-32"
                                                value={track.lang}
                                                onChange={e => {
                                                    const newTracks = [...formData.audioTracks];
                                                    newTracks[index].lang = e.target.value;
                                                    setFormData({...formData, audioTracks: newTracks});
                                                }}
                                            >
                                                {LANGUAGES.map(l => (
                                                    <option key={l.code} value={l.code} className="bg-[#121212]">{l.name}</option>
                                                ))}
                                            </select>
                                            <input 
                                                className="flex-grow bg-white/5 border border-white/10 p-2 rounded-lg text-white focus:border-blue-400 outline-none transition-all text-xs"
                                                value={track.url}
                                                onChange={e => {
                                                    const newTracks = [...formData.audioTracks];
                                                    newTracks[index].url = e.target.value;
                                                    setFormData({...formData, audioTracks: newTracks});
                                                }}
                                                placeholder="URL del video con este audio"
                                            />
                                            {formData.audioTracks.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newTracks = formData.audioTracks.filter((_, i) => i !== index);
                                                        setFormData({...formData, audioTracks: newTracks});
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {type === 'series' && (
                            <div className="p-4 bg-red-600/10 rounded-xl border border-red-600/20 animate-fade-in">
                                <p className="text-xs text-red-400 font-bold leading-relaxed">
                                    ℹ️ Las series no tienen video URL principal. Una vez creada, usa la pestaña "EPISODIO" para añadir sus capítulos.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                        <label className="text-[10px] text-yellow-500 uppercase font-black tracking-widest flex justify-between items-center">
                            Final de Intro (Segundos)
                            <span className="text-[8px] text-gray-500 normal-case font-normal">Marca el segundo exacto donde termina la intro</span>
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="number"
                                className="flex-grow bg-white/5 border border-white/10 p-3 md:p-4 rounded-lg md:rounded-xl text-white focus:border-yellow-500 outline-none transition-all text-sm"
                                value={formData.skipIntro}
                                onChange={e => setFormData({...formData, skipIntro: parseInt(e.target.value) || 0})}
                            />
                            <button 
                                type="button"
                                onClick={() => {
                                    const currentTime = (window as any).seikotv_current_time || 0;
                                    setFormData({...formData, skipIntro: Math.floor(currentTime)});
                                }}
                                className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white px-4 rounded-lg md:rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-yellow-600/30 whitespace-nowrap"
                            >
                                Marcar aquí
                            </button>
                        </div>
                    </div>

                    {type !== 'episode' && (
                        <div className="flex items-center gap-3 pt-4">
                            <input 
                                type="checkbox" 
                                id="featured" 
                                className="w-6 h-6 rounded accent-red-600 cursor-pointer"
                                checked={formData.featured}
                                onChange={e => setFormData({...formData, featured: e.target.checked})}
                            />
                            <label htmlFor="featured" className="text-gray-300 font-bold text-sm cursor-pointer">Destacar en la pantalla de inicio</label>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-600/20 border border-red-600/50 rounded-xl animate-shake">
                            <p className="text-xs text-red-500 font-bold flex items-center gap-2">
                                ⚠️ {error}
                            </p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-xl mt-6 transition-all transform active:scale-95 disabled:opacity-50 tracking-[0.4em] uppercase shadow-2xl shadow-red-600/20"
                    >
                        {loading ? "PROCESANDO..." : type === 'movie' ? "SUBIR PELÍCULA" : type === 'series' ? "CREAR SERIE" : "AÑADIR EPISODIO"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;
