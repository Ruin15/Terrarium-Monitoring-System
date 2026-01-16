import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { HStack } from "../ui/hstack";
import { useUser } from "@/context/profileContext";
import LogoutModal from "@/modals/logoutModal";
import { LogOut } from "lucide-react-native";
import { VStack } from "../ui/vstack";

export default function HeaderLogout() {
  const { profile } = useUser();
  const [isLogoutPress, setIsLogoutPress] = useState(false);
  return (
    <>
      <HStack style={{ alignItems: "center", marginRight: 20 }}>
        <VStack style={{ alignItems: "flex-end", marginRight: 20 }}>
          <Text style={{ color: "black", fontSize: 12, fontWeight: "bold" }}>
            {profile?.firstName} {profile?.lastName}
          </Text>
          <Text style={{ color: "black", fontSize: 12 }}>{profile?.email}</Text>
        </VStack>
        <Pressable onPress={() => setIsLogoutPress(true)}>
          <LogOut color={"black"} />
        </Pressable>
      </HStack>

      <LogoutModal
        visible={isLogoutPress}
        onClose={() => setIsLogoutPress(false)}
      />
    </>
  );
}
