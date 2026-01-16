import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase/firebaseConfig";
import { Profile } from "@/_types";

interface UserContextType {
  user: any;
  profile: Profile | null;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    console.log("UserContext mounted");
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        if (unsubProfile) unsubProfile(); // cleanup profile listener
        return;
      }

      setUser(currentUser);

      const profileQuery = query(collection(db, "profile"), where("uid", "==", currentUser.uid));

      unsubProfile = onSnapshot(profileQuery, (snapshot) => {
        const doc = snapshot.docs[0];
        setProfile(doc ? { id: doc.id, ...(doc.data() as Omit<Profile, "id">) } : null);
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

//   useEffect(() => {
//     const unsubProfiles = onSnapshot(collection(db, "profile"), (snapshot) => {
//       const list: Profile[] = snapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...(doc.data() as Omit<Profile, "id">),
//       }));
//       setProfiles(list);
//     });

//     return () => unsubProfiles();
//   }, []);

  return (
    <UserContext.Provider
      value={{ user, profile }}
    >
      {children}
    </UserContext.Provider>
  );
};
