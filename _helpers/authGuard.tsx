// Optional: Add this to your layout or wrap your protected screens
// This ensures users are redirected to login if not authenticated

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useUser } from '@/context/UserContext';

export function useProtectedRoute() {
  const { profile, loading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedGroup = segments[0] === '(screens)';

    // console.log('🛡️ Auth Guard:', {
    //   hasUser: !!profile,
    //   loading,
    //   currentSegment: segments[0],
    //   inAuthGroup,
    //   inProtectedGroup
    // });

    if (!profile && inProtectedGroup) {
      // User is not signed in but trying to access protected route
      console.log('🚫 Redirecting to login - user not authenticated');
      router.replace('/login');
    } else if (profile && inAuthGroup) {
      // User is signed in but still on auth pages
      console.log('✅ Redirecting to app - user authenticated');
      router.replace('/(screens)');
    }
  }, [profile, loading, segments]);
}

// Usage in your _layout.tsx:
// export default function RootLayout() {
//   useProtectedRoute();
//   return <Stack />;
// }