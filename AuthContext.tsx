
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import { handleFirestoreError, OperationType } from './src/lib/firestoreErrorHandler';

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
        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (!firebaseUser) {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const profileRef = doc(db, "usuarios", user.uid);
        
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
            if (docSnap.exists()) {
                setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
                setLoading(false);
            } else {
                try {
                    const isAdminUser = user.email === 'tomokari07@gmail.com';
                    const newProfile: UserProfile = {
                        id: user.uid,
                        name: user.displayName || 'Usuario',
                        avatar: user.photoURL || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
                        role: isAdminUser ? 'admin' : 'user',
                        email: user.email || '',
                    };
                    await setDoc(profileRef, newProfile);
                } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, profileRef.path);
                    setLoading(false);
                }
            }
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, profileRef.path);
            setLoading(false);
        });

        return () => unsubscribeProfile();
    }, [user]);

    const isAdmin = profile?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
