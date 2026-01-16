import { ButtonText } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icon";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Text } from "react-native";
import { LogOut } from "lucide-react-native";
import { auth } from "@/firebase/firebaseConfig";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { HStack } from "@/components/ui/hstack";

type LogoutModalType = {
  visible: boolean;
  onClose: () => void;
};

export default function LogoutModal({ visible, onClose }: LogoutModalType) {
  const [cancelButtonHover, setCancelButtonHover] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log("Starting logout...");
      
      await signOut(auth);
      console.log("User signed out successfully");
      
      // Close modal first
      onClose();
      
      // Small delay to ensure auth state updates
      setTimeout(() => {
        router.dismissAll();
        router.replace("/");
        }, 100);
      
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Modal isOpen={visible} onClose={onClose} size="sm">
      <ModalBackdrop />
      <ModalContent
        style={{ backgroundColor: "#ffffffff", borderColor: "#a3a3a3ff" }}
      >
        <ModalHeader>
          <HStack style={{ alignItems: "center" }}>
            <LogOut color={"black"} strokeWidth={2} size={30} />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "500",
                color: "black",
                marginLeft: 15,
              }}
            >
              Logging Out?
            </Text>
          </HStack>
          <ModalCloseButton>
            <Icon as={CloseIcon} color="black" size="xl" />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <Text style={{ color: "black", marginTop: 15 }}>
            Are you sure you want to Log Out?
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button
            className="mr-3"
            variant="outline"
            onPress={onClose}
            onHoverIn={() => setCancelButtonHover(true)}
            onHoverOut={() => setCancelButtonHover(false)}
            isDisabled={isLoggingOut}
          >
            <ButtonText
              style={{ color: cancelButtonHover ? "#646464ff" : "black" }}
            >
              Cancel
            </ButtonText>
          </Button>
          <Button 
            onPress={handleLogout} 
            variant="solid" 
            action="secondary"
            isDisabled={isLoggingOut}
          >
            <ButtonText style={{ color: "black" }}>
              {isLoggingOut ? "Logging out..." : "Confirm"}
            </ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}