
import React, { useState } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Content } from './types';

const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'movie' | 'series'>('movie');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnailUrl: '',
        backdropUrl: '',
        videoUrl: '', // URL principal (fallback)
        audioTracks: {
            es: '',
            en: ''
        },
        genre: '',
        rating: 'PG-13',
        releaseYear: new Date().getFullYear(),
        featured: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const contentRef = collection(db, "content");
            
            // Filtrar tracks vacíos
            const filteredTracks: Record<string, string> = {};
            if (formData.audioTracks.es) filteredTracks.es = formData.audioTracks.es;
            if (formData.audioTracks.en) filteredTracks.en = formData.audioTracks.en;

            const newContent = {
                ...formData,
                audioTracks: filteredTracks,
                type,
                genre: formData.genre.split(',').map(g => g.trim()),
                releaseYear: Number(formData.releaseYear),
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(contentRef, newContent);
            
            if (type === 'series') {
                alert(`¡Serie creada! 🎉\n\nID: ${docRef.id}\n\nPara añadir episodios, crea documentos en la sub-colección "episodes" dentro de este ID en Firebase.`);
            } else {
                alert("¡Película subida con éxito! 🎉");
            }
            onClose();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Error al subir el contenido. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#121212] w-full max-w-2xl rounded-2xl border border-white/5 shadow-2xl p-10">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                    <h2 className="text-4xl font-bebas text-red-600 tracking-wider">Editor de Contenido</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">Cerrar</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex gap-4 mb-8">
                        <button 
                            type="button"
                            onClick={() => setType('movie')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all tracking-widest ${type === 'movie' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                        >
                            PELÍCULA
                        </button>
                        <button 
                            type="button"
                            onClick={() => setType('series')}
                            className={`flex-1 py-4 rounded-xl font-bold transition-all tracking-widest ${type === 'series' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                        >
                            SERIE
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Título</label>
                            <input 
                                className="bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Año</label>
                            <input 
                                type="number"
                                className="bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                                value={formData.releaseYear}
                                onChange={e => setFormData({...formData, releaseYear: parseInt(e.target.value)})}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Descripción</label>
                        <textarea 
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none h-32 resize-none transition-all"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Géneros (Separados por coma)</label>
                        <input 
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                            value={formData.genre}
                            onChange={e => setFormData({...formData, genre: e.target.value})}
                            required
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">URL Miniatura</label>
                            <input 
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                                value={formData.thumbnailUrl}
                                onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">URL Fondo (Hero)</label>
                            <input 
                                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                                value={formData.backdropUrl}
                                onChange={e => setFormData({...formData, backdropUrl: e.target.value})}
                                required
                            />
                        </div>
                        {type === 'movie' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-red-500 uppercase font-black tracking-widest">URL Video Principal (Fallback)</label>
                                    <input 
                                        className="w-full bg-white/5 border border-red-600/30 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all"
                                        value={formData.videoUrl}
                                        onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                                        placeholder="Ej: https://..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] text-blue-400 uppercase font-black tracking-widest">URL Audio: Español Latino</label>
                                        <input 
                                            className="w-full bg-white/5 border border-blue-400/30 p-4 rounded-xl text-white focus:border-blue-400 outline-none transition-all"
                                            value={formData.audioTracks.es}
                                            onChange={e => setFormData({...formData, audioTracks: {...formData.audioTracks, es: e.target.value}})}
                                            placeholder="URL de video con audio ES"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] text-purple-400 uppercase font-black tracking-widest">URL Audio: Inglés</label>
                                        <input 
                                            className="w-full bg-white/5 border border-purple-400/30 p-4 rounded-xl text-white focus:border-purple-400 outline-none transition-all"
                                            value={formData.audioTracks.en}
                                            onChange={e => setFormData({...formData, audioTracks: {...formData.audioTracks, en: e.target.value}})}
                                            placeholder="URL de video con audio EN"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {type === 'series' && (
                            <div className="p-4 bg-red-600/10 rounded-xl border border-red-600/20 animate-fade-in">
                                <p className="text-xs text-red-400 font-bold leading-relaxed">
                                    ℹ️ Las series no tienen video URL principal. Los capítulos se suben por separado como documentos en la sub-colección "episodes" del ID generado.
                                </p>
                            </div>
                        )}
                    </div>

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

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-xl mt-6 transition-all transform active:scale-95 disabled:opacity-50 tracking-[0.4em] uppercase shadow-2xl shadow-red-600/20"
                    >
                        {loading ? "PROCESANDO..." : type === 'movie' ? "SUBIR PELÍCULA" : "CREAR SERIE"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;
