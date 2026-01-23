// app/_layout.tsx
import { useRouter, Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
// import { irBlack } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useProtectedRoute } from "@/_helpers/authGuard";

export default function RootLayout() {
  // useProtectedRoute();
  return (
    <GluestackUIProvider mode="light">
      <Stack>
        <Stack.Screen name="index" options={{ title: "Login", headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Register", headerShown: false }} />
        <Stack.Screen name="(screens)" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}
