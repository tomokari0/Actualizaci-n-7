
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import Uploader from './Uploader';

const ProfileEdit: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { profile } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(profile?.avatar || null);

    const handleUploadSuccess = async (url: string) => {
        if (!profile) return;
        setPreview(url);
        try {
            const profileRef = doc(db, "usuarios", profile.id);
            await updateDoc(profileRef, { avatar: url });
        } catch (err) {
            console.error("Error updating profile avatar:", err);
            alert("Error al actualizar el avatar");
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        try {
            const profileRef = doc(db, "usuarios", profile.id);
            await updateDoc(profileRef, { name });
            onClose();
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Error al guardar los cambios");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[300] backdrop-blur-sm">
            <div className="bg-[#121212] w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bebas text-white tracking-widest">Editar Perfil</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div className="relative group mb-4">
                        <img 
                            src={preview || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'} 
                            alt="Avatar" 
                            className={`w-32 h-32 rounded-full object-cover border-4 border-red-600/20 group-hover:border-red-600 transition-all ${uploading ? 'opacity-50' : ''}`}
                        />
                    </div>
                    <Uploader onUploadSuccess={handleUploadSuccess} />
                    <p className="text-[10px] text-gray-500 mt-4 uppercase font-black tracking-widest">Foto de Perfil</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 block">Nombre de Usuario</label>
                        <input 
                            type="text"
                            className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-red-600 transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading || uploading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileEdit;
