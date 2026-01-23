import React, { useState, useEffect } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { FormControl, FormControlLabel, FormControlLabelText, FormControlHelper, FormControlHelperText, FormControlError, FormControlErrorText } from "@/components/ui/form-control";
import { Divider } from "@/components/ui/divider";
import { useUser } from "@/context/UserContext";
import { auth, db } from "@/firebase/firebaseConfig";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { AlertCircle, Check, RefreshCw } from "lucide-react-native";
import { useColorScheme } from "@/components/useColorScheme";

type EditSection = "name" | "password" | null;

export default function AccountScreen() {
  const { profile, loading, error: contextError, refreshProfile } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Edit Name States
  const [editingName, setEditingName] = useState<EditSection>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState(false);

  // Edit Password States
  const [editingPassword, setEditingPassword] = useState<EditSection>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Manual refresh state
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Debug logging with detailed info
  // useEffect(() => {
  //   console.log("🔍 AccountScreen - Context State:", {
  //     loading,
  //     hasProfile: !!profile,
  //     profileId: profile?.id,
  //     profileUid: profile?.uid,
  //     profileEmail: profile?.email,
  //     profileFirstName: profile?.firstName,
  //     profileLastName: profile?.lastName,
  //     contextError,
  //     uidMatch: profile?.uid === profile?.id,
  //     timestamp: new Date().toISOString(),
  //     authCurrentUser: auth.currentUser
  //   });

  //   // Check if UIDs match
  //   if (profile) {
  //     if (profile.uid !== profile.id) {
  //       console.warn("⚠️ UID MISMATCH DETECTED:", {
  //         profileUidField: profile.uid,
  //         documentId: profile.id,
  //         message: "The document ID does not match the profile's UID field"
  //       });
  //     } else {
  //       console.log("✅ UID MATCH: Document ID matches profile UID field");
  //     }
  //   }
  // }, [loading, profile, contextError]);

  // Initialize name fields from profile
  useEffect(() => {
    if (profile) {
      console.log("📝 Initializing name fields from profile");
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
    }
  }, [profile]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh requested");
    setManualRefreshing(true);
    try {
      await refreshProfile();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    } finally {
      setTimeout(() => setManualRefreshing(false), 1000);
    }
  };

  // Validate name
  const validateName = (): boolean => {
    setNameError("");
    if (!firstName.trim()) {
      setNameError("First name is required");
      return false;
    }
    if (!lastName.trim()) {
      setNameError("Last name is required");
      return false;
    }
    if (firstName.trim().length < 2) {
      setNameError("First name must be at least 2 characters");
      return false;
    }
    if (lastName.trim().length < 2) {
      setNameError("Last name must be at least 2 characters");
      return false;
    }
    return true;
  };

  // Validate password
  const validatePassword = (): boolean => {
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return false;
    }
    if (!newPassword) {
      setPasswordError("New password is required");
      return false;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password");
      return false;
    }
    return true;
  };

  // Handle name update
  const handleUpdateName = async () => {
    if (!validateName() || !profile) return;

    try {
      setNameLoading(true);
      setNameError("");

      console.log("💾 Updating name for profile:", {
        uid: profile.uid,
        email: profile.email,
        documentPath: `profile/${profile.uid}`
      });
      
      // Use the profile's UID as the document ID
      const profileRef = doc(db, "profile", profile.uid);
      
      // First verify the document exists
      const docSnap = await getDoc(profileRef);
      if (!docSnap.exists()) {
        throw new Error(`Profile document not found at profile/${profile.uid}`);
      }
      
      // Update the document
      await updateDoc(profileRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      console.log("✅ Name updated successfully in Firestore");
      
      // Refresh the profile to get the latest data
      await refreshProfile();
      
      setNameSuccess(true);
      setTimeout(() => {
        setNameSuccess(false);
        setEditingName(null);
      }, 2000);
    } catch (error: any) {
      console.error("❌ Error updating name:", {
        error: error.message,
        code: error.code,
        uid: profile.uid
      });
      
      if (error.code === 'permission-denied') {
        setNameError("Permission denied. You don't have access to update this profile.");
      } else if (error.message.includes('not found')) {
        setNameError("Profile not found. Please contact support.");
      } else {
        setNameError(error.message || "Failed to update name");
      }
    } finally {
      setNameLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!validatePassword() || !profile) return;

    try {
      setPasswordLoading(true);
      setPasswordError("");

      console.log("🔐 Changing password for user:", profile.email);

      // Get the current Firebase Auth user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(profile.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      console.log("✅ Password changed successfully");
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordSuccess(false);
        setEditingPassword(null);
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error changing password:", error);
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setPasswordError("Current password is incorrect");
      } else if (error.code === "auth/too-many-requests") {
        setPasswordError("Too many attempts. Please try again later.");
      } else {
        setPasswordError(error.message || "Failed to change password");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Cancel handlers
  const cancelEditName = () => {
    setEditingName(null);
    setFirstName(profile?.firstName || "");
    setLastName(profile?.lastName || "");
    setNameError("");
    setNameSuccess(false);
  };

  const cancelChangePassword = () => {
    setEditingPassword(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess(false);
  };

  // Loading state
  if (loading) {
    console.log("⏳ Showing loading state");
    return (
      <Box className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <Text className="text-slate-600 dark:text-slate-400 mt-4">
          Loading account...
        </Text>
      </Box>
    );
  }

  // Error state
  if (contextError) {
    console.log("⚠️ Showing error state:", contextError);
    return (
      <Box className="flex-1 justify-center items-center bg-white dark:bg-slate-900 px-6">
        <AlertCircle size={48} color="#ef4444" />
        <Text className="text-slate-900 dark:text-white text-xl font-bold mt-4">
          Error Loading Account
        </Text>
        <Text className="text-slate-600 dark:text-slate-400 text-center mt-2">
          {contextError}
        </Text>
        {profile && (
          <VStack space="sm" className="mt-4 w-full max-w-md">
            <Text className="text-slate-500 dark:text-slate-500 text-sm text-center">
              Profile UID: {profile.uid}
            </Text>
            <Text className="text-slate-500 dark:text-slate-500 text-sm text-center">
              Expected document: profile/{profile.uid}
            </Text>
            <Button
              action="secondary"
              size="sm"
              onPress={handleManualRefresh}
              disabled={manualRefreshing}
              className="mt-4"
            >
              <ButtonText>
                {manualRefreshing ? "Refreshing..." : "Try Again"}
              </ButtonText>
            </Button>
          </VStack>
        )}
      </Box>
    );
  }

  // No profile
  if (!profile) {
    console.log("⚠️ No profile available");
    
    return (
      <Box className="flex-1 justify-center items-center bg-white dark:bg-slate-900 px-6">
        <AlertCircle size={48} color="#f59e0b" />
        <Text className="text-slate-900 dark:text-white text-xl font-bold mt-4">
          Account Not Available
        </Text>
        <Text className="text-slate-600 dark:text-slate-400 text-center mt-2">
          Profile data not found. Please sign in again.
        </Text>
        <VStack space="sm" className="mt-4">
          <Text className="text-slate-500 dark:text-slate-500 text-sm text-center">
            Debug Info: Profile = {profile ? "✓" : "✗"}
          </Text>
          <Button
            action="secondary"
            size="sm"
            onPress={handleManualRefresh}
            disabled={manualRefreshing}
            className="mt-4"
          >
            <ButtonText>
              {manualRefreshing ? "Refreshing..." : "Refresh Profile"}
            </ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  // UID mismatch warning (document ID doesn't match profile UID field)
  const uidMismatch = profile.uid !== profile.id;

  // console.log("✅ Rendering account screen with profile:", {
  //   profileUid: profile.uid,
  //   profileDocId: profile.id,
  //   uidMismatch,
  //   firstName: profile.firstName,
  //   lastName: profile.lastName
  // });

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
      }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Box className="px-6 py-6 bg-white dark:bg-slate-900">
        {/* UID Mismatch Warning */}
        {uidMismatch && (
          <Box className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg mb-6 border border-amber-200 dark:border-amber-800">
            <HStack space="md" className="items-start">
              <AlertCircle size={20} color="#f59e0b" />
              <VStack space="xs" className="flex-1">
                <Text className="text-amber-900 dark:text-amber-100 font-semibold text-sm">
                  Configuration Issue Detected
                </Text>
                <Text className="text-amber-800 dark:text-amber-200 text-xs">
                  Your profile document ID doesn't match your UID field. Some features may not work correctly.
                </Text>
                <Text className="text-amber-700 dark:text-amber-300 text-xs mt-2">
                  Profile UID: {profile.uid}
                </Text>
                <Text className="text-amber-700 dark:text-amber-300 text-xs">
                  Document ID: {profile.id}
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}

        {/* Header with Refresh Button */}
        <HStack space="md" className="mb-6 items-center justify-between">
          <VStack space="sm" className="flex-1">
            <Heading size="2xl" className="text-slate-900 dark:text-white">
              Account Settings
            </Heading>
            <Text className="text-slate-600 dark:text-slate-400">
              Manage your account information and security
            </Text>
          </VStack>
          <Button
            action="secondary"
            size="sm"
            onPress={handleManualRefresh}
            disabled={manualRefreshing}
          >
            <RefreshCw size={16} color={isDark ? "#fff" : "#000"} />
          </Button>
        </HStack>

        <Divider className="my-4" />

        {/* Account Info Section */}
        <VStack space="lg" className="mb-8">
          <Heading size="lg" className="text-slate-900 dark:text-white">
            Account Information
          </Heading>

          {/* Email Display (Read-only) */}
          <FormControl>
            <FormControlLabel>
              <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                Email Address
              </FormControlLabelText>
            </FormControlLabel>
            <Box className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <Text className="text-slate-600 dark:text-slate-400">
                {profile.email}
              </Text>
            </Box>
            <FormControlHelper>
              <FormControlHelperText className="text-slate-500 dark:text-slate-500">
                Email cannot be changed
              </FormControlHelperText>
            </FormControlHelper>
          </FormControl>

          {/* Edit Name Section */}
          <VStack space="md">
            {editingName === "name" ? (
              <>
                <FormControl isInvalid={!!nameError}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      First Name
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <InputField
                      placeholder="Enter first name"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholderTextColor={isDark ? "#94a3b8" : "#cbd5e1"}
                      editable={!nameLoading}
                    />
                  </Input>
                </FormControl>

                <FormControl isInvalid={!!nameError}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      Last Name
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <InputField
                      placeholder="Enter last name"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholderTextColor={isDark ? "#94a3b8" : "#cbd5e1"}
                      editable={!nameLoading}
                    />
                  </Input>
                </FormControl>

                {nameError && (
                  <FormControl isInvalid>
                    <FormControlError>
                      <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                      <FormControlErrorText className="text-red-600">
                        {nameError}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                )}

                {nameSuccess && (
                  <Box className="bg-green-50 dark:bg-green-950 p-3 rounded-lg flex-row items-center">
                    <Check size={16} color="#22c55e" style={{ marginRight: 8 }} />
                    <Text className="text-green-700 dark:text-green-300">
                      Name updated successfully
                    </Text>
                  </Box>
                )}

                <HStack space="md">
                  <Button
                    action="positive"
                    className="flex-1"
                    disabled={nameLoading}
                    onPress={handleUpdateName}
                  >
                    <ButtonText>{nameLoading ? "Saving..." : "Save"}</ButtonText>
                  </Button>
                  <Button
                    action="secondary"
                    className="flex-1"
                    disabled={nameLoading}
                    onPress={cancelEditName}
                  >
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                </HStack>
              </>
            ) : (
              <>
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      Full Name
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Box className="bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Text className="text-slate-600 dark:text-slate-400">
                      {profile.firstName} {profile.lastName}
                    </Text>
                  </Box>
                </FormControl>
                <Button
                  action="secondary"
                  onPress={() => setEditingName("name")}
                >
                  <ButtonText>Edit Name</ButtonText>
                </Button>
              </>
            )}
          </VStack>
        </VStack>

        <Divider className="my-6" />

        {/* Security Section */}
        <VStack space="lg">
          <Heading size="lg" className="text-slate-900 dark:text-white">
            Security
          </Heading>

          {/* Change Password Section */}
          <VStack space="md">
            {editingPassword === "password" ? (
              <>
                <FormControl isInvalid={!!passwordError}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      Current Password
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <InputField
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholderTextColor={isDark ? "#94a3b8" : "#cbd5e1"}
                      secureTextEntry
                      editable={!passwordLoading}
                    />
                  </Input>
                </FormControl>

                <FormControl isInvalid={!!passwordError}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      New Password
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <InputField
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholderTextColor={isDark ? "#94a3b8" : "#cbd5e1"}
                      secureTextEntry
                      editable={!passwordLoading}
                    />
                  </Input>
                  <FormControlHelper>
                    <FormControlHelperText className="text-slate-500 dark:text-slate-500">
                      Minimum 6 characters
                    </FormControlHelperText>
                  </FormControlHelper>
                </FormControl>

                <FormControl isInvalid={!!passwordError}>
                  <FormControlLabel>
                    <FormControlLabelText className="text-slate-700 dark:text-slate-300 font-semibold">
                      Confirm New Password
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="md"
                    className="border-slate-300 dark:border-slate-600"
                  >
                    <InputField
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor={isDark ? "#94a3b8" : "#cbd5e1"}
                      secureTextEntry
                      editable={!passwordLoading}
                    />
                  </Input>
                </FormControl>

                {passwordError && (
                  <FormControl isInvalid>
                    <FormControlError>
                      <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                      <FormControlErrorText className="text-red-600">
                        {passwordError}
                      </FormControlErrorText>
                    </FormControlError>
                  </FormControl>
                )}

                {passwordSuccess && (
                  <Box className="bg-green-50 dark:bg-green-950 p-3 rounded-lg flex-row items-center">
                    <Check size={16} color="#22c55e" style={{ marginRight: 8 }} />
                    <Text className="text-green-700 dark:text-green-300">
                      Password changed successfully
                    </Text>
                  </Box>
                )}

                <HStack space="md">
                  <Button
                    action="positive"
                    className="flex-1"
                    disabled={passwordLoading}
                    onPress={handleChangePassword}
                  >
                    <ButtonText>{passwordLoading ? "Updating..." : "Update Password"}</ButtonText>
                  </Button>
                  <Button
                    action="secondary"
                    className="flex-1"
                    disabled={passwordLoading}
                    onPress={cancelChangePassword}
                  >
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                </HStack>
              </>
            ) : (
              <Button
                action="secondary"
                onPress={() => setEditingPassword("password")}
              >
                <ButtonText>Change Password</ButtonText>
              </Button>
            )}
          </VStack>

          {/* Security Info */}
          <Box className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-4">
            <Text className="text-blue-700 dark:text-blue-300 text-sm">
              🔒 Keep your password secure and never share it with anyone. We'll never ask for your password outside of this page.
            </Text>
          </Box>
        </VStack>
      </Box>
    </ScrollView>
  );
}