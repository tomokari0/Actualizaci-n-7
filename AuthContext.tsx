
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            
            if (firebaseUser) {
                // Check if profile exists in Firestore
                const profileRef = doc(db, "usuarios", firebaseUser.uid);
                
                // Set up a real-time listener for the profile
                const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
                    } else {
                        // Create profile if it doesn't exist
                        const isAdmin = firebaseUser.email === 'tomokari07@gmail.com';
                        const newProfile: UserProfile = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'Usuario',
                            avatar: firebaseUser.photoURL || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
                            role: isAdmin ? 'admin' : 'user',
                            email: firebaseUser.email || '',
                        };
                        await setDoc(profileRef, newProfile);
                        setProfile(newProfile);
                    }
                    setLoading(false);
                });

                return () => unsubscribeProfile();
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const isAdmin = profile?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
