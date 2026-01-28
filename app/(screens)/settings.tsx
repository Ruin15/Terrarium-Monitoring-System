import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Divider } from "@/components/ui/divider";
import { useColorScheme } from "@/components/useColorScheme";
import { ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Settings, User, LogOut, ChevronRight } from "lucide-react-native";
import HeaderLogout from "@/components/logoutButton/headerLogout";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";
import { EcosystemType, ECOSYSTEM_INFO } from "@/components/ecosystemLimiter/ecosystemLimiter";
import { useEcosystem } from "@/components/ecosystemLimiter/ecosystemLimiter";
import { CheckCircle } from "lucide-react-native";
import { View } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { ecosystem, setEcosystem, ranges } = useEcosystem();
    const [showEcosystemSelector, setShowEcosystemSelector] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const { profile, refreshProfile } = useUser();
    const router = useRouter();

    // Sync ecosystem with user's stored preference on mount and when profile changes
    useEffect(() => {
        if (profile?.terrariumEco && profile.terrariumEco !== ecosystem) {
            console.log("🔄 Syncing ecosystem from user profile:", profile.terrariumEco);
            setEcosystem(profile.terrariumEco as EcosystemType);
        }
    }, [profile?.terrariumEco]);

    const handleEcosystemChange = async (selectedEcosystem: EcosystemType) => {
        if (!profile?.id) {
            Alert.alert('Error', 'You must be logged in to change ecosystem settings.');
            return;
        }

        try {
            setIsUpdating(true);

            // Update local state immediately for responsive UI
            setEcosystem(selectedEcosystem);

            // Update Firestore
            const userRef = doc(db, "profile", profile.id);
            await updateDoc(userRef, {
                terrariumEco: selectedEcosystem
            });

            console.log("✅ Terrarium ecosystem updated in Firestore:", selectedEcosystem);

            // Refresh profile to ensure sync
            await refreshProfile();

            // Close the selector
            setShowEcosystemSelector(false);

            // Show success feedback
            Alert.alert(
                'Success',
                `Ecosystem changed to ${ECOSYSTEM_INFO[selectedEcosystem].name}`,
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error("❌ Error updating terrarium ecosystem:", error);
            
            // Revert local state on error
            if (profile.terrariumEco) {
                setEcosystem(profile.terrariumEco as EcosystemType);
            }

            Alert.alert(
                'Error',
                'Failed to update ecosystem. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const settingsSections = [
        {
            title: "Account",
            items: [
                {
                    icon: User,
                    label: "Manage Account",
                    description: "Edit profile, change password",
                    onPress: () => router.navigate("/(screens)/account" as any),
                },
            ],
        },
    ];

    const styles = StyleSheet.create({
        ecosystemButton: {
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ccc",
            backgroundColor: "#f9f9f9",
            alignItems: "center" as const,
            marginTop: 16,
        },
        ecosystemSelectorCard: {
            marginTop: 16,
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#ccc",
            backgroundColor: "#fff",
        },
        ecosystemOption: {
            padding: 12,
            borderRadius: 6,
            borderWidth: 2,
            marginBottom: 12,
        },
        rangeDisplay: {
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#eee",
            backgroundColor: "#fefefe",
        },
        rangeRow: {
            flexDirection: "row" as const,
            justifyContent: "space-between" as const,
            marginBottom: 4,
        },
        syncIndicator: {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            gap: 8,
            marginTop: 8,
            padding: 8,
            borderRadius: 6,
            backgroundColor: "#e0f2fe",
        },
    });

    return (
        <ScrollView
            style={{
                flex: 1,
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
        >
            <Box className="px-6 py-6 bg-white dark:bg-slate-900">
                {/* Header */}
                <VStack space="md" className="mb-6">
                    <Heading size="2xl" className="text-slate-900 dark:text-white">
                        Settings
                    </Heading>
                    {profile && (
                        <Text className="text-slate-600 dark:text-slate-400" style={{ fontSize: 16, color: isDark ? "#94a3b8" : "#475569" }}>
                            Welcome, {profile.firstName}
                        </Text>
                    )}

                    {/* Sync Status Indicator */}
                    {profile?.terrariumEco && (
                        <View style={styles.syncIndicator}>
                            <CheckCircle size={16} color="#0284c7" />
                            <Text style={{ fontSize: 11, color: "#0284c7" }}>
                                Synced with your account: {ECOSYSTEM_INFO[profile.terrariumEco as EcosystemType]?.name || profile.terrariumEco}
                            </Text>
                        </View>
                    )}

                    {/* Display current ecosystem ranges */}
                    <View style={styles.rangeDisplay}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 8 }}>
                            Current Biome: {ECOSYSTEM_INFO[ecosystem].name}
                        </Text>

                        <View style={styles.rangeRow}>
                            <Text style={{ fontSize: 11, color: "#666" }}>Temperature:</Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#33b42f" }}>
                                {ranges.temperature.min}°C - {ranges.temperature.max}°C
                            </Text>
                        </View>

                        <View style={styles.rangeRow}>
                            <Text style={{ fontSize: 11, color: "#666" }}>Humidity:</Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#33b42f" }}>
                                {ranges.humidity.min}% - {ranges.humidity.max}%
                            </Text>
                        </View>

                        <View style={styles.rangeRow}>
                            <Text style={{ fontSize: 11, color: "#666" }}>Soil Moisture:</Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#33b42f" }}>
                                {ranges.moisture.min}% - {ranges.moisture.max}%
                            </Text>
                        </View>

                        <View style={styles.rangeRow}>
                            <Text style={{ fontSize: 11, color: "#666" }}>Light:</Text>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: "#33b42f" }}>
                                {ranges.lux.understory_min} - {ranges.lux.understory_max} lux
                            </Text>
                        </View>
                    </View>
                </VStack>

                <Divider className="my-4" />

                {/* Settings Sections */}
                {settingsSections.map((section, sectionIndex) => (
                    <VStack key={sectionIndex} space="md" className="mb-8">

                        <Heading size="md" className="text-slate-700 dark:text-slate-300">Select Terrarium Biome</Heading>

                        {/* Ecosystem Selector Button */}
                        <Pressable
                            style={styles.ecosystemButton}
                            onPress={() => setShowEcosystemSelector(!showEcosystemSelector)}
                            disabled={isUpdating}
                        >
                            <Text style={{ fontSize: 20, marginBottom: 4 }}>
                                {ECOSYSTEM_INFO[ecosystem].icon}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
                                {ECOSYSTEM_INFO[ecosystem].name}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#666", textAlign: "center" }}>
                                {ECOSYSTEM_INFO[ecosystem].description}
                            </Text>
                            <Text style={{ fontSize: 10, color: "#33b42f", marginTop: 4 }}>
                                {isUpdating ? 'Updating...' : 'Tap to change ecosystem'}
                            </Text>
                        </Pressable>

                        {/* Ecosystem Selector Modal */}
                        {showEcosystemSelector && (
                            <View style={styles.ecosystemSelectorCard}>
                                <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
                                    Select Ecosystem Type
                                </Text>

                                {isUpdating && (
                                    <View style={{ alignItems: "center", padding: 16 }}>
                                        <ActivityIndicator size="small" color="#33b42f" />
                                        <Text style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                                            Updating ecosystem...
                                        </Text>
                                    </View>
                                )}

                                {!isUpdating && (['tropical', 'woodland', 'bog', 'paludarium'] as const).map((type) => (
                                    <Pressable
                                        key={type}
                                        style={{
                                            ...styles.ecosystemOption,
                                            borderColor: ecosystem === type ? '#33b42f' : '#ddd',
                                            backgroundColor: ecosystem === type ? '#f0fff4' : '#fff',
                                        }}
                                        onPress={() => handleEcosystemChange(type)}
                                    >
                                        <HStack style={{ alignItems: "center", gap: 12 }}>
                                            <Text style={{ fontSize: 24 }}>
                                                {ECOSYSTEM_INFO[type].icon}
                                            </Text>
                                            <VStack style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
                                                    {ECOSYSTEM_INFO[type].name}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: "#666" }}>
                                                    {ECOSYSTEM_INFO[type].description}
                                                </Text>
                                            </VStack>
                                            {ecosystem === type && (
                                                <CheckCircle size={20} color="#33b42f" />
                                            )}
                                        </HStack>
                                    </Pressable>
                                ))}
                            </View>
                        )}


                        <Divider className="my-6" />
                        <VStack space="sm" >
                            <Heading size="md" className="text-slate-700 dark:text-slate-300">
                                {section.title}
                            </Heading>

                            <VStack space="sm">
                                {section.items.map((item, itemIndex) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <Pressable
                                            key={itemIndex}
                                            onPress={item.onPress}
                                            className="active:opacity-70"
                                        >
                                            <Box className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <HStack className="justify-between items-center">
                                                    <HStack space="md" className="flex-1 items-center">
                                                        <Box className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                                                            <IconComponent
                                                                size={24}
                                                                color={isDark ? "#60a5fa" : "#3b82f6"}
                                                            />
                                                        </Box>
                                                        <VStack space="xs" className="flex-1">
                                                            <Text className="text-slate-900 dark:text-white font-semibold">
                                                                {item.label}
                                                            </Text>
                                                            <Text className="text-slate-500 dark:text-slate-400 text-sm">
                                                                {item.description}
                                                            </Text>
                                                        </VStack>
                                                    </HStack>
                                                    <ChevronRight
                                                        size={20}
                                                        color={isDark ? "#94a3b8" : "#cbd5e1"}
                                                    />
                                                </HStack>
                                            </Box>
                                        </Pressable>
                                    );
                                })}
                            </VStack>
                        </VStack>


                    </VStack>
                ))}

                <Divider className="my-6" />


            </Box>
        </ScrollView>
    );
}