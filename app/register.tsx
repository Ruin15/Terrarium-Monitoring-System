import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    ImageBackground,
    Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { Center } from "@/components/ui/center";
import {
    Toast,
    ToastTitle,
    ToastDescription,
    useToast,
} from "@/components/ui/toast";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    HelpCircleIcon,
    Icon,
} from "@/components/ui/icon";
import { ButtonText } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { addDoc, collection, setDoc, doc, getDoc} from "firebase/firestore";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [firstName, setFirstname] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isBackPressed, setIsBackPressed] = useState(false);
    const router = useRouter();
    const toastSuccess = useToast();
    const toastError = useToast();
    const toastMissingField = useToast();
    const toastConfirmPassword = useToast();
    const [toastId, setToastId] = React.useState(0);
    const handleToastSuccess = () => {
        if (!toastSuccess.isActive(String(toastId))) {
            showNewToastSuccess();
        }
    };
    const handleToastError = (error: string) => {
        if (!toastError.isActive(String(toastId))) {
            showNewToastError(error);
        }
    };
    const handleToastMissingField = () => {
        if (!toastMissingField.isActive(String(toastId))) {
            showNewToastMissingField();
        }
    };

    const handleToastConfirmPassword = () => {
        if (!toastConfirmPassword.isActive(String(toastId))) {
            showNewToastConfirmPassword();
        }
    };

    const showNewToastSuccess = () => {
        const newId = Math.random();
        setToastId(newId);
        toastSuccess.show({
            id: String(newId),
            placement: "top",
            duration: 3000,
            render: ({ id }) => {
                const uniqueToastId = "toast-" + id;
                return (
                    <Toast
                        action="success"
                        variant="solid"
                        nativeID={uniqueToastId}
                        style={{ zIndex: 9999 }}
                    >
                        <HStack space="md">
                            <Icon as={CheckCircleIcon} color="white" />
                            <VStack space="xs">
                                <ToastTitle>Success!</ToastTitle>
                                <ToastDescription size="sm">
                                    You are now registered in!
                                </ToastDescription>
                            </VStack>
                        </HStack>
                    </Toast>
                );
            },
        });
    };

    const showNewToastError = (error: string) => {
        const newId = Math.random();
        setToastId(newId);
        toastError.show({
            id: String(newId),
            placement: "top",
            duration: 3000,
            render: ({ id }) => {
                const uniqueToastId = "toast-" + id;
                return (
                    <Toast
                        action="error"
                        variant="outline"
                        nativeID={uniqueToastId}
                        className="p-4 gap-6 border-error-500 w-full shadow-hard-5 max-w-[443px] flex-row justify-between"
                    >
                        <HStack space="md">
                            <Icon as={HelpCircleIcon} className="stroke-error-500 mt-0.5" />
                            <VStack space="xs">
                                <ToastTitle className="font-semibold text-error-500">
                                    Error!
                                </ToastTitle>
                                <ToastDescription size="sm">{error}</ToastDescription>
                            </VStack>
                        </HStack>
                    </Toast>
                );
            },
        });
    };

    const showNewToastMissingField = () => {
        const newId = Math.random();
        setToastId(newId);
        toastMissingField.show({
            id: String(newId),
            placement: "top",
            duration: 3000,
            render: ({ id }) => {
                const uniqueToastId = "toast-" + id;
                return (
                    <Toast
                        action="error"
                        variant="outline"
                        nativeID={uniqueToastId}
                        className="p-4 gap-6 border-error-500 w-full shadow-hard-5 max-w-[443px] flex-row justify-between"
                    >
                        <HStack space="md">
                            <Icon as={HelpCircleIcon} className="stroke-error-500 mt-0.5" />
                            <VStack space="xs">
                                <ToastTitle className="font-semibold text-error-500">
                                    Missing fields!
                                </ToastTitle>
                                <ToastDescription size="sm">
                                    Please enter both email and password.
                                </ToastDescription>
                            </VStack>
                        </HStack>
                    </Toast>
                );
            },
        });
    };

    const showNewToastConfirmPassword = () => {
        const newId = Math.random();
        setToastId(newId);
        toastConfirmPassword.show({
            id: String(newId),
            placement: "top",
            duration: 3000,
            render: ({ id }) => {
                const uniqueToastId = "toast-" + id;
                return (
                    <Toast
                        action="error"
                        variant="outline"
                        nativeID={uniqueToastId}
                        className="p-4 gap-6 border-error-500 w-full shadow-hard-5 max-w-[443px] flex-row justify-between"
                    >
                        <HStack space="md">
                            <Icon as={HelpCircleIcon} className="stroke-error-500 mt-0.5" />
                            <VStack space="xs">
                                <ToastTitle className="font-semibold text-error-500">
                                    Error!
                                </ToastTitle>
                                <ToastDescription size="sm">
                                    Please confirm your password.
                                </ToastDescription>
                            </VStack>
                        </HStack>
                    </Toast>
                );
            },
        });
    };

 async function handleRegister() {
        if (!email || !password || !firstName || !lastName) {
            handleToastMissingField();
            return;
        }

        if (confirmPassword !== password) {
            handleToastConfirmPassword();
            return;
        }

        try {
            setLoading(true);

            // console.log("Step 1: Creating auth user...");
            const response = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            // console.log("Step 2: User registered:", response.user.uid);

            // console.log("Step 3: Creating user profile in Firestore...");

            // Add a timeout wrapper
            const firestorePromise = setDoc(doc(db, "profile", response.user.uid), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email,
                uid: response.user.uid,
                createdAt: new Date().toISOString(),
            });

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore operation timed out after 10 seconds')), 10000)
            );

            await Promise.race([firestorePromise, timeoutPromise]);

            // console.log("Step 4: Profile created successfully!");
            handleToastSuccess();

            setTimeout(() => {
                router.replace("/");
            }, 500);

        } catch (error: any) {
            console.error("Registration error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);

            handleToastError(error.message);

            // Clean up auth user if Firestore failed
            if (auth.currentUser) {
                // console.log("Cleaning up auth user...");
                try {
                    await auth.currentUser.delete();
                } catch (deleteError) {
                    console.error("Could not delete auth user:", deleteError);
                }
            }
        } finally {
            setLoading(false);
        }
    }




    return (
        <>
            <Center style={{ flex: 1, backgroundColor: "#FFFFFFff" }}>
                <Box
                    style={{
                        gap: 12,
                    }}
                >
                    <View style={{
                         padding: 12, 
                         alignContent: "center", 
                         borderRadius: 12,
                         borderWidth: 0,
                        width: 320,
                        backgroundColor: "#E2E1E1",
                          }}>
                        <VStack style={{ 
                            marginBottom: 20, 
                            gap: 12, 
                            }}>
                        <HStack>
                            <Pressable
                                onPress={() => router.replace("/")}
                                style={{ marginRight: 18, padding: 4, alignContent: "center", justifyContent: "center" }}
                            >
                                <Icon
                                    as={ArrowLeftIcon}
                                    className="text-typography-900 m-1 w-7 h-7"
                                    size="xl"
                                />
                            </Pressable>

                            
                            <HStack style={{
                                 flex: 1, 
                                 justifyContent: "center", 
                                 borderWidth: 0, 
                                 borderColor: 'black',
                                 borderRadius: 12, 
                                 backgroundColor: "#AFDE4E",
                                 paddingLeft: 28,
                                 paddingRight: 28, 
                                 paddingTop: 13,
                                 paddingBottom: 13
                                   }}>
                                <Text style={styles.title}>Terra</Text>
                            </HStack>
                                
                        </HStack>

                         <Text
                            style={{ 
                                 color: 'black', 
                                fontSize: 12, 
                                fontFamily: "lufga",
                            }}
                            >Hey! new here huh, enter proper credentials and let’s monitor your terrariums health. Better that manual.</Text>

                        </VStack>

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email} // ✅ controlled input
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <HStack>
                            <VStack>
                                <Text style={styles.label}>First Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First Name"
                                    value={firstName} // ✅ controlled input
                                    onChangeText={setFirstname}
                                    autoCapitalize="none"
                                    keyboardType="default"
                                />
                            </VStack>

                            <VStack>
                                <Text style={styles.label}>Last Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last Name"
                                    value={lastName} // ✅ controlled input
                                    onChangeText={setLastName}
                                    autoCapitalize="none"
                                    keyboardType="default"
                                />
                            </VStack>
                        </HStack>

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password} // ✅ controlled input
                            secureTextEntry
                            onChangeText={setPassword}
                        />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            value={confirmPassword} // ✅ controlled input
                            secureTextEntry
                            onChangeText={setConfirmPassword}
                        />

                        
                    </View>

                    <Box style={{ alignContent: "center", justifyContent: "center", paddingBottom: 30, paddingTop: 10, gap: 4, }}>

                        <Text style={{textAlign: "center", fontSize: 12, color: "#000000ff"}}>Let’s go and make difference</Text>
                        <Button
                            onPress={handleRegister}
                            onPressIn={() => setIsPressed(true)}
                            onPressOut={() => setIsPressed(false)}
                            style={{
                                backgroundColor: isPressed ? "#8d8d8dff" : "#AFDE4E",
                                borderRadius: 12,
                                padding: 20,
                            }}
                        >
                            <ButtonText
                                size={"lg"}
                                style={{
                                    color: "#000000ff",
                                    fontSize: 16,
                                    
                                }}
                            >
                                {loading ? (
                                    <Spinner size="small" color="white" />
                                ) : (
                                    "Register"
                                )}
                            </ButtonText>
                        </Button>

                    </Box>
                </Box>
            </Center>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        marginTop: 100,
        alignContent: "center",
    },
    title: {
        fontSize: 24,
        // marginBottom: 20,
        textAlign: "center",
        fontWeight: "bold",
        fontFamily: "lufga",
        color: "black",
    },
    input: {
        borderWidth: 1,
        borderColor: "rgb(172, 169, 169)",
        borderRadius: 12,
        padding: 10,
        marginBottom: 15,
        color: "#000000ff",
        backgroundColor: "white",
    },
    label: {
        fontSize: 13,
        marginBottom: 4,
        marginTop: 5,
        color: "Black",
    },
    error: { color: "red", marginBottom: 10, textAlign: "center" },
});
