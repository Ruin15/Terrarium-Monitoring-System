import React, { useState } from "react";
import { Pressable } from "react-native";
import { 
  Modal, 
  ModalBackdrop, 
  ModalContent, 
  ModalHeader, 
  ModalCloseButton,
  ModalBody,
  ModalFooter 
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { auth, realtimeDb } from "@/firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { ref, remove } from "firebase/database";
import { useRouter } from "expo-router";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, LogOut } from "lucide-react-native";
import { useUser } from "@/context/UserContext";

export default function LogoutModal() {
  const { profile } = useUser();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: Clear ESP32 authentication token from RTDB
  const clearESP32AuthToken = async () => {
    try {
      console.log("🧹 Clearing ESP32 auth token...");
      
      const tokenRef = ref(realtimeDb, 'esp32Auth/currentUser');
      await remove(tokenRef);
      
      console.log("✅ ESP32 auth token cleared successfully");
      console.log("   ESP32 will no longer have authenticated access");
      
    } catch (error) {
      console.error("❌ Failed to clear ESP32 auth token:", error);
      // Don't throw - logout should succeed even if token cleanup fails
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🚪 Logging out user...");
      console.log("   Current user:", auth.currentUser?.email);
      
      // ✅ Clear ESP32 authentication token first
      await clearESP32AuthToken();
      
      // Sign out from Firebase
      await signOut(auth);
      
      console.log("✅ User signed out successfully");
      console.log("   ESP32 access has been revoked");
      
      // Close modal
      setVisible(false);
      
      // Navigate to login screen
      router.replace("/login");
      
    } catch (err: any) {
      console.error("❌ Error logging out:", err);
      setError(err.message || "Failed to log out");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    setVisible(false);
  };

  return (
    <>
      {/* Header Button */}
      <HStack style={{ alignItems: "center", marginRight: 20 }}>
        <VStack style={{ alignItems: "flex-end", marginRight: 20 }}>
          <Text style={{ color: "black", fontSize: 12, fontWeight: "bold" }}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text style={{ color: "black", fontSize: 12 }}>{profile?.email}</Text>
        </VStack>
        <Pressable onPress={() => setVisible(true)}>
          <LogOut color={"black"} />
        </Pressable>
      </HStack>

      {/* Modal */}
      <Modal isOpen={visible} onClose={handleCancel}>
        <ModalBackdrop />
        <ModalContent className="max-w-md">
          <ModalHeader>
            <Heading size="lg" className="text-slate-900">
              Confirm Logout
            </Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} className="stroke-slate-400" />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            <VStack space="md">
              <Text className="text-slate-600">
                Are you sure you want to log out of your account?
              </Text>
              
              <Text className="text-slate-500 text-sm">
                Note: Logging out will revoke ESP32 device access until you log back in.
              </Text>

              {error && (
                <HStack 
                  space="sm" 
                  className="bg-red-50 p-3 rounded-lg items-center"
                >
                  <AlertCircle size={20} color="#dc2626" />
                  <Text className="text-red-600 flex-1">
                    {error}
                  </Text>
                </HStack>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack space="md" className="w-full">
              <Button
                variant="outline"
                action="secondary"
                onPress={handleCancel}
                disabled={loading}
                className="flex-1"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>

              <Button
                action="negative"
                onPress={handleLogout}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Spinner size="small" color="white" />
                ) : (
                  <ButtonText>Log Out</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}