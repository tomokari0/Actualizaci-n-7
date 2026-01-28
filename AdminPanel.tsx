
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
        videoUrl: '',
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
            const newContent = {
                ...formData,
                type,
                genre: formData.genre.split(',').map(g => g.trim()),
                releaseYear: Number(formData.releaseYear),
                createdAt: serverTimestamp(),
            };

            await addDoc(contentRef, newContent);
            alert("¡Contenido subido con éxito! 🎉");
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
            <div className="bg-[#181818] w-full max-w-2xl rounded-xl border border-gray-800 shadow-2xl p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bebas text-red-500 tracking-wider">Panel de Administración</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">Cerrar</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4 mb-6">
                        <button 
                            type="button"
                            onClick={() => setType('movie')}
                            className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'movie' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        >
                            Película
                        </button>
                        <button 
                            type="button"
                            onClick={() => setType('series')}
                            className={`flex-1 py-2 rounded font-bold transition-colors ${type === 'series' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                        >
                            Serie
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            placeholder="Título" 
                            className="bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            required
                        />
                        <input 
                            placeholder="Año de lanzamiento" 
                            type="number"
                            className="bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                            value={formData.releaseYear}
                            onChange={e => setFormData({...formData, releaseYear: parseInt(e.target.value)})}
                            required
                        />
                    </div>

                    <textarea 
                        placeholder="Sinopsis / Descripción" 
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none h-32"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        required
                    />

                    <input 
                        placeholder="Géneros (separados por coma: Acción, Drama...)" 
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                        value={formData.genre}
                        onChange={e => setFormData({...formData, genre: e.target.value})}
                        required
                    />

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-bold">URLs de Multimedia</label>
                        <input 
                            placeholder="URL de Imagen (Miniatura)" 
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                            value={formData.thumbnailUrl}
                            onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                            required
                        />
                        <input 
                            placeholder="URL de Imagen (Fondo/Backdrop)" 
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                            value={formData.backdropUrl}
                            onChange={e => setFormData({...formData, backdropUrl: e.target.value})}
                            required
                        />
                        <input 
                            placeholder="URL del Video (.mp4)" 
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-red-500 outline-none"
                            value={formData.videoUrl}
                            onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                        <input 
                            type="checkbox" 
                            id="featured" 
                            className="w-5 h-5 accent-red-600"
                            checked={formData.featured}
                            onChange={e => setFormData({...formData, featured: e.target.checked})}
                        />
                        <label htmlFor="featured" className="text-gray-300">Marcar como Destacada (Hero Section)</label>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg mt-6 transition-all transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Subiendo..." : "SUBIR CONTENIDO"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;
