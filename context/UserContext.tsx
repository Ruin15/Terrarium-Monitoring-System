import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/firebaseConfig";
import { Profile } from "@/_types";
import { useRouter, useSegments } from "expo-router";

interface UserContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [internalUser, setInternalUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Manual profile refresh function
  const refreshProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("⚠️ Cannot refresh: No authenticated user");
      return;
    }

    try {
      console.log("🔄 Refreshing profile for UID:", currentUser.uid);
      const profileRef = doc(db, "profile", currentUser.uid);
      const docSnap = await getDoc(profileRef);
      
      if (docSnap.exists()) {
        const profileData = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<Profile, "id">),
        };
        console.log("✅ Profile refreshed successfully:", {
          id: profileData.id,
          firstName: profileData.firstName,
          lastName: profileData.lastName
        });
        setProfile(profileData);
        setError(null);
      } else {
        console.error("❌ Profile document not found");
        setError("Profile not found");
      }
    } catch (err: any) {
      console.error("❌ Error refreshing profile:", err);
      setError(err.message || "Failed to refresh profile");
    }
  };

  // Auth guard for navigation
  useEffect(() => {
    // Wait until auth is initialized and loading is complete
    if (!authInitialized || loading) {
      return;
    }

    const inAuthPage = segments[0] === 'login' || segments[0] === 'register';
    const inProtectedScreens = segments[0] === '(screens)';

    console.log('🛡️ Auth Guard:', {
      hasProfile: !!profile,
      segments: segments[0],
      inAuthPage,
      inProtectedScreens
    });

    if (!profile && inProtectedScreens) {
      console.log('🚫 Redirecting to login - no profile');
      router.replace('/login');
    } else if (profile && inAuthPage) {
      console.log('✅ Redirecting to app - profile loaded');
      router.replace('/(screens)');
    }
  }, [profile, loading, authInitialized, segments]);

  useEffect(() => {
    console.log("🔵 ProfileContext initializing");
    
    let profileUnsubscribe: (() => void) | null = null;

    // Setup profile listener for authenticated user
    const setupProfileListener = (authUser: User) => {
      console.log("🎯 Setting up profile listener for:", {
        uid: authUser.uid,
        email: authUser.email
      });

      // Clean up any existing listener
      if (profileUnsubscribe) {
        console.log("🧹 Cleaning up previous profile listener");
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      const profileRef = doc(db, "profile", authUser.uid);

      // Fetch initial profile data
      getDoc(profileRef)
        .then((docSnap) => {
          if (!docSnap.exists()) {
            console.error("❌ Profile document not found at:", `profile/${authUser.uid}`);
            setError(`Profile not found for user: ${authUser.uid}`);
            setProfile(null);
            setLoading(false);
            return;
          }

          const profileData = {
            id: docSnap.id,
            ...(docSnap.data() as Omit<Profile, "id">),
          };

          console.log("✅ Profile loaded:", {
            id: profileData.id,
            uid: profileData.uid,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            email: profileData.email,
            documentIdMatchesUid: profileData.id === profileData.uid
          });

          setProfile(profileData);
          setError(null);
          setLoading(false);

          // Set up real-time listener for updates
          console.log("👂 Setting up real-time profile listener");
          profileUnsubscribe = onSnapshot(
            profileRef,
            (snapshot) => {
              if (snapshot.exists()) {
                const updatedProfile = {
                  id: snapshot.id,
                  ...(snapshot.data() as Omit<Profile, "id">),
                };
                console.log("📥 Profile updated:", {
                  firstName: updatedProfile.firstName,
                  lastName: updatedProfile.lastName
                });
                setProfile(updatedProfile);
                setError(null);
              } else {
                console.warn("⚠️ Profile document deleted");
                setProfile(null);
                setError("Profile not found");
              }
            },
            (err) => {
              console.error("🔴 Profile listener error:", err);
              if (err.code === 'permission-denied') {
                setError("Permission denied. Please check your authentication.");
              } else {
                setError(err.message || "Failed to listen to profile updates");
              }
            }
          );
        })
        .catch((err) => {
          console.error("🔴 Error fetching initial profile:", err);
          if (err.code === 'permission-denied') {
            setError("Permission denied. Please check Firestore security rules.");
          } else {
            setError(err.message || "Failed to load profile");
          }
          setProfile(null);
          setLoading(false);
        });
    };

    // Listen to auth state changes
    console.log("👂 Setting up auth state listener");
    const authUnsubscribe = onAuthStateChanged(
      auth,
      (authUser) => {
        console.log("🟢 Auth state changed:", {
          hasUser: !!authUser,
          uid: authUser?.uid,
          email: authUser?.email,
          timestamp: new Date().toISOString()
        });

        // Mark auth as initialized
        if (!authInitialized) {
          console.log("✅ Auth initialized");
          setAuthInitialized(true);
        }

        if (!authUser) {
          console.log("⚪ No user - clearing state");
          
          // Clean up profile listener
          if (profileUnsubscribe) {
            profileUnsubscribe();
            profileUnsubscribe = null;
          }

          setInternalUser(null);
          setProfile(null);
          setLoading(false);
          setError(null);
          return;
        }

        // Set the authenticated user internally
        setInternalUser(authUser);
        
        // Set up profile listener
        setupProfileListener(authUser);
      },
      (err) => {
        console.error("🔴 Auth state listener error:", err);
        setAuthInitialized(true);
        setLoading(false);
        setError("Authentication error: " + err.message);
      }
    );

    // Cleanup on unmount
    return () => {
      console.log("🔴 ProfileContext unmounting");
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("📊 Context State:", {
      authInitialized,
      loading,
      hasProfile: !!profile,
      profileId: profile?.id,
      profileUid: profile?.uid,
      profileEmail: profile?.email,
      error,
    });
  }, [authInitialized, loading, profile, error]);

  return (
    <UserContext.Provider value={{ profile, loading, error, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
};