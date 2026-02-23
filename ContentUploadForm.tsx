
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ContentUploadFormProps {
    onClose: () => void;
}

const ContentUploadForm: React.FC<ContentUploadFormProps> = ({ onClose }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'movie' | 'series'>('movie');
    const [movieLink, setMovieLink] = useState('');
    const [chapters, setChapters] = useState<string[]>(['']);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&.*)?$/;

    const validateLink = (link: string) => {
        if (!link) return false;
        return youtubeRegex.test(link);
    };

    const toggleType = (newType: 'movie' | 'series') => {
        setType(newType);
        setErrors({});
        if (newType === 'movie') {
            setChapters(['']);
        } else {
            setMovieLink('');
        }
    };

    const handleChapterChange = (index: number, value: string) => {
        const newChapters = [...chapters];
        newChapters[index] = value;
        setChapters(newChapters);

        const newErrors = { ...errors };
        if (value && !validateLink(value)) {
            newErrors[`chapter_${index}`] = true;
        } else {
            delete newErrors[`chapter_${index}`];
        }
        setErrors(newErrors);
    };

    const handleMovieLinkChange = (value: string) => {
        setMovieLink(value);
        const newErrors = { ...errors };
        if (value && !validateLink(value)) {
            newErrors['movie'] = true;
        } else {
            delete newErrors['movie'];
        }
        setErrors(newErrors);
    };

    const addChapter = () => {
        if (validateLink(chapters[chapters.length - 1])) {
            setChapters([...chapters, '']);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Final validation
        if (type === 'movie' && !validateLink(movieLink)) {
            alert("Por favor, ingresa un link de YouTube válido para la película.");
            return;
        }
        if (type === 'series') {
            const invalidChapters = chapters.some(c => !validateLink(c));
            if (invalidChapters) {
                alert("Por favor, asegúrate de que todos los capítulos tengan links de YouTube válidos.");
                return;
            }
        }

        setLoading(true);
        try {
            const payload = {
                title,
                description,
                type,
                links: type === 'movie' ? [movieLink] : chapters,
                status: 'pending',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, "postulaciones"), payload);
            alert("¡Contenido enviado con éxito! Revisaremos tu postulación pronto. 🚀");
            onClose();
        } catch (error) {
            console.error("Error submitting postulation:", error);
            alert("Hubo un error al enviar tu postulación. Por favor, inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const canAddNext = type === 'series' && validateLink(chapters[chapters.length - 1]);

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-[#0a0a0a] w-full max-w-xl rounded-2xl border border-red-600/30 shadow-[0_0_50px_rgba(220,38,38,0.1)] p-8 md:p-12 relative">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <div className="mb-10 text-center">
                    <h2 className="text-3xl md:text-4xl font-bebas text-red-600 tracking-[0.2em] uppercase mb-2">Subir Contenido</h2>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Postula tu obra a SeikoYT</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Nombre de la Obra</label>
                        <input 
                            className="bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none transition-all text-sm placeholder:text-gray-700"
                            placeholder="Ej: El Despertar de los Gachas"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Descripción (Opcional)</label>
                        <textarea 
                            className="bg-white/5 border border-white/10 p-4 rounded-xl text-white focus:border-red-600 outline-none h-24 resize-none transition-all text-sm placeholder:text-gray-700"
                            placeholder="Cuéntanos un poco sobre tu historia..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Tipo de Contenido</label>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                            <button 
                                type="button"
                                onClick={() => toggleType('movie')}
                                className={`flex-1 py-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all ${type === 'movie' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Película
                            </button>
                            <button 
                                type="button"
                                onClick={() => toggleType('series')}
                                className={`flex-1 py-3 rounded-lg font-bold text-[10px] tracking-widest uppercase transition-all ${type === 'series' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Serie
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {type === 'movie' ? (
                            <div className="flex flex-col gap-2 animate-fade-in">
                                <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Link de YouTube</label>
                                <input 
                                    className={`bg-white/5 border p-4 rounded-xl text-white outline-none transition-all text-sm ${errors['movie'] ? 'border-red-600 bg-red-600/5' : 'border-white/10 focus:border-red-600'}`}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={movieLink}
                                    onChange={e => handleMovieLinkChange(e.target.value)}
                                    required
                                />
                                {errors['movie'] && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">Link no válido. Debe ser de YouTube.</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {chapters.map((link, index) => (
                                    <div key={index} className="flex flex-col gap-2 animate-slide-up">
                                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Capítulo {index + 1}</label>
                                        <input 
                                            className={`bg-white/5 border p-4 rounded-xl text-white outline-none transition-all text-sm ${errors[`chapter_${index}`] ? 'border-red-600 bg-red-600/5' : 'border-white/10 focus:border-red-600'}`}
                                            placeholder={`Link del capítulo ${index + 1}`}
                                            value={link}
                                            onChange={e => handleChapterChange(index, e.target.value)}
                                            required
                                        />
                                        {errors[`chapter_${index}`] && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tighter">Link no válido.</p>}
                                    </div>
                                ))}
                                
                                {canAddNext && (
                                    <button 
                                        type="button"
                                        onClick={addChapter}
                                        className="w-full py-3 border border-dashed border-red-600/30 rounded-xl text-red-500 text-[10px] font-black tracking-widest uppercase hover:bg-red-600/5 transition-all animate-fade-in"
                                    >
                                        + Añadir siguiente capítulo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || Object.keys(errors).length > 0}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-xl mt-8 transition-all transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed tracking-[0.4em] uppercase shadow-2xl shadow-red-600/20"
                    >
                        {loading ? "ENVIANDO..." : "ENVIAR POSTULACIÓN"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ContentUploadForm;
