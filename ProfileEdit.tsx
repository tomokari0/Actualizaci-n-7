
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { db, storage } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfileEdit: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { profile } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(profile?.avatar || null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        setUploading(true);
        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);

            // Upload to Storage
            const storageRef = ref(storage, `avatars/${profile.id}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            // Update Firestore immediately
            const profileRef = doc(db, "usuarios", profile.id);
            await updateDoc(profileRef, { avatar: downloadURL });
        } catch (err) {
            console.error("Error uploading avatar:", err);
            alert("Error al subir la imagen");
        } finally {
            setUploading(false);
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
                    <div className="relative group cursor-pointer">
                        <img 
                            src={preview || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'} 
                            alt="Avatar" 
                            className={`w-32 h-32 rounded-full object-cover border-4 border-red-600/20 group-hover:border-red-600 transition-all ${uploading ? 'opacity-50' : ''}`}
                        />
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Cambiar</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                        </label>
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
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
