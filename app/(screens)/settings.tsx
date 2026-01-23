import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Divider } from "@/components/ui/divider";
import { useColorScheme } from "@/components/useColorScheme";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Settings, User, LogOut, ChevronRight } from "lucide-react-native";
import HeaderLogout from "@/components/logoutButton/headerLogout";
import { useUser } from "@/context/UserContext";

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useUser();
    const router = useRouter();

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
                </VStack>

                <Divider className="my-4" />

                {/* Settings Sections */}
                {settingsSections.map((section, sectionIndex) => (
                    <VStack key={sectionIndex} space="md" className="mb-8">
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
                ))}

                <Divider className="my-6" />

             
            </Box>
        </ScrollView>
    );
}
