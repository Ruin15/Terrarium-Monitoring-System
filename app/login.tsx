import React, { useState } from 'react'
import {
  Text,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth'
import { auth, db, realtimeDb } from '@/firebase/firebaseConfig'
import { useRouter } from 'expo-router'
import { ref, set } from 'firebase/database'
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast,
} from '@/components/ui/toast'
import { HStack } from '@/components/ui/hstack'
import { VStack } from '@/components/ui/vstack'
import { CloseIcon, HelpCircleIcon, Icon } from '@/components/ui/icon'
import { Box } from '@/components/ui/box'
import { ButtonText } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { collection, query, where, getDoc, doc } from 'firebase/firestore'
import ForgotPasswordModal from '@/modals/forgotPasswordModal'
import ESP32TokenManager from '@/_helpers/esp32TokenManager'


export default function LoginScreen() {
  ESP32TokenManager() // Initialize ESP32 Token Manager
  const dimensions = useWindowDimensions()
  const isMobile = dimensions.width <= 1000
  const isDesktop = dimensions.width >= 1280
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toastError = useToast()
  const toastMissingField = useToast()
  const [toastId, setToastId] = useState(0)
  
  const handleToastError = (error: string) => {
    if (!toastError.isActive(String(toastId))) {
      showNewToastError(error)
    }
  }
  
  const handleToastMissingField = () => {
    if (!toastMissingField.isActive(String(toastId))) {
      showNewToastMissingField()
    }
  }

  const showNewToastError = (error: string) => {
    const newId = Math.random()
    setToastId(newId)
    toastError.show({
      id: String(newId),
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        const uniqueToastId = 'toast-' + id
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
        )
      },
    })
  }

  const showNewToastMissingField = () => {
    const newId = Math.random()
    setToastId(newId)
    toastMissingField.show({
      id: String(newId),
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        const uniqueToastId = 'toast-' + id
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
        )
      },
    })
  }

  // Wait for auth state to propagate
  const waitForAuthState = (maxWaitTime = 3000): Promise<User | null> => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
      
      // Timeout fallback
      setTimeout(() => {
        unsubscribe()
        resolve(auth.currentUser)
      }, maxWaitTime)
    })
  }

  // ✅ NEW: Store ESP32 authentication token in RTDB
  const storeESP32AuthToken = async (user: User) => {
    try {
      console.log("🔐 Storing ESP32 auth token for user:", user.email)
      
      // Get fresh ID token
      const idToken = await user.getIdToken(true)
      
      // Store in RTDB for ESP32 to consume
      const tokenRef = ref(realtimeDb, 'esp32Auth/currentUser')
      
      await set(tokenRef, {
        uid: user.uid,
        email: user.email,
        idToken: idToken,
        timestamp: Date.now(),
        expiresAt: Date.now() + (3600 * 1000), // Token expires in 1 hour
        lastLogin: new Date().toISOString(),
      })
      
      console.log("✅ ESP32 auth token stored successfully")
      console.log("   UID:", user.uid)
      console.log("   Email:", user.email)
      console.log("   Token length:", idToken.length)
      
    } catch (error) {
      console.error("❌ Failed to store ESP32 auth token:", error)
      // Don't throw - login should succeed even if ESP32 token storage fails
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      handleToastMissingField()
      return
    }

    try {
      setLoading(true)
      
      console.log("🔐 Attempting login for:", email)
      const response = await signInWithEmailAndPassword(auth, email, password)
      
      console.log("🔐 Login successful:", {
        uid: response.user.uid,
        email: response.user.email,
      })
      
      // Validate user status
      const isValid = await handleUserValidation(response.user.uid)

      if (isValid !== 'Valid') {
        console.log("❌ User validation failed - account disabled")
        await auth.signOut()
        handleToastError('This account is currently disabled.')
        return
      }
      
      console.log("✅ User validated")
      
      // ✅ Store ESP32 authentication token
      await storeESP32AuthToken(response.user)
      
      // Wait for auth state to propagate before redirecting
      console.log("⏳ Waiting for auth state to propagate...")
      await waitForAuthState(2000)
      
      console.log("✅ Auth state confirmed, current user:", auth.currentUser?.uid)
      console.log("🚀 Redirecting to /(screens)")
      
      router.replace('/(screens)')
      
    } catch (error: any) {
      console.error("❌ Login error:", error)
      
      // Handle specific Firebase auth errors
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password'
      ) {
        handleToastError('Invalid email or password.')
      } else if (error.code === 'auth/user-not-found') {
        handleToastError('No account found with this email.')
      } else if (error.code === 'auth/too-many-requests') {
        handleToastError('Too many failed attempts. Please try again later.')
      } else {
        handleToastError(error.message)
      }
    } finally {
      setLoading(false)
    }
  };

  const handleUserValidation = async (uid: string) => {
    try {
      // Use direct document access instead of query
      const profileRef = doc(db, 'profile', uid)
      const profileSnap = await getDoc(profileRef)

      console.log("🔍 User validation - fetched profile document for UID:", uid)
      if (!profileSnap.exists()) {
        return 'Invalid' // User not found in database
      }

      const userData = profileSnap.data()
      if (userData?.status === 'Disabled') {
        return 'Invalid'
      }

      return 'Valid'
    } catch (error) {
      console.error('Error validating user:', error)
      return 'Invalid' // Default to invalid on error
    }
  }

  const [showModal, setShowModal] = React.useState(false)

  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: '#E2E1E1 ',
        borderWidth: 0,
        alignItems: 'center',
        padding: 20,
        justifyContent: 'center',
      }}
    >

      {/* Header */}
      <HStack style={{ 
        gap: 12, 
        alignItems: 'center', 
        borderWidth: 3 }}> 
      <Box
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: 28,
          borderRadius: 12,
          backgroundColor: "#AFDE4E",
          flex: 1
        }}
      >
        <Text 
        style={{ 
          color: 'black', 
          fontSize: 24, 
          fontFamily: "lufga",
          fontWeight: 'bold',
          }}>Terra</Text>
      </Box>
        <Box
          style={{
            marginBottom: 20,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 2
          }}
        >
          <Text 
          style={{ 
            color: 'black', 
            fontSize: 15, 
            fontFamily: "lufga",
            }}>welcome to Terra App, let us monitor your terrarium better</Text>
        </Box>
      </HStack>

      {/* Inputs */}
      <Box style={{ borderWidth: 0, width: 320 }}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter Your Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.inputs}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Enter Your Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={handleLogin}
          autoCapitalize="none"
          style={styles.inputs}
        />
      </Box>

      {/* Forgot Password Button */}
      <Box
        style={{
          width: 320,
          alignItems: 'flex-end',
          borderWidth: 0,
          marginTop: 10,
        }}
      >
        <Button variant="link" onPress={() => setShowModal(true)}>
          <ButtonText style={{ color: 'black', fontSize: 14 }}>
            Forgot Password?
          </ButtonText>
        </Button>
      </Box>

      {/* Login Button */}
      <Box
        style={{
          width: 320,
          borderWidth: 0,
          marginTop: 30,
          marginBottom: 30,
        }}
      >
        <Button
          style={{ backgroundColor: '#CDCCCC', borderRadius: 8, height: 36 }}
          onPress={handleLogin}
        >
          <ButtonText style={{ color: 'black', fontSize: 14 }}>
            {loading ? (
              <Spinner size="small" color="black" style={{ marginTop: 7 }} />
            ) : (
              'Log in'
            )}
          </ButtonText>
        </Button>

        <Button
          style={{ backgroundColor: '#CDCCCC', borderRadius: 8, height: 36, marginTop: 8 }}
          onPress={() => router.push('/register')}
        >
          <ButtonText style={{ color: 'black', fontSize: 14 }}>
            Register
          </ButtonText>
        </Button>
      </Box>

      <ForgotPasswordModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </Box>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 10,
  },
  text: {
    color: '#000000ff',
    fontSize: 24,
  },
  blurContainer: {
    width: 320,
    height: 340,
    borderRadius: 50,
    overflow: 'hidden',
  },
  buttonFeedback: {
    backgroundColor: 'gray',
  },
  inputs: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    padding: 8,
    color: '#000000ff',
  },
  label: {
    fontSize: 14,
    marginVertical: 10,
    color: 'black',
  },
})
