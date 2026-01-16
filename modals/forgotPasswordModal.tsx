import { Button, ButtonText } from '@/components/ui/button'
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
} from '@/components/ui/form-control'
import { Heading } from '@/components/ui/heading'
import { AlertCircleIcon, CloseIcon, Icon } from '@/components/ui/icon'
import { Input, InputField } from '@/components/ui/input'
import {
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Modal,
} from '@/components/ui/modal'
import React, { useState } from 'react'
import { Text, useWindowDimensions } from 'react-native'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase/firebaseConfig'
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from '@/components/ui/toast'
import { HStack } from '@/components/ui/hstack'
import { CheckCircleIcon, HelpCircleIcon } from 'lucide-react-native'
import { VStack } from '@/components/ui/vstack'
import { Spinner } from '@/components/ui/spinner'

type ForgotPasswordModalType = {
  visible: boolean
  onClose: () => void
}

export default function ForgotPasswordModal({
  visible,
  onClose,
}: ForgotPasswordModalType) {
  const dimensions = useWindowDimensions()
  const isMobile = dimensions.width <= 768
  const isDesktop = dimensions.width >= 1280
  const [isInvalid, setIsInvalid] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const toastError = useToast()
  const toastSuccess = useToast()
  const [toastId, setToastId] = useState(0)
  const handleToastError = (error: string) => {
    if (!toastError.isActive(String(toastId))) {
      showNewToastError(error)
    }
  }
  const handleToastSuccess = (error: string) => {
    if (!toastSuccess.isActive(String(toastId))) {
      showNewToastSuccess(error)
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

  const showNewToastSuccess = (message: string) => {
    const newId = Math.random()
    setToastId(newId)

    toastSuccess.show({
      id: String(newId),
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        const uniqueToastId = 'toast-' + id
        return (
          <Toast
            action="success"
            variant="outline"
            nativeID={uniqueToastId}
            className="p-4 gap-6 border-success-500 w-full shadow-hard-5 max-w-[443px] flex-row justify-between"
          >
            <HStack space="md">
              <Icon
                as={CheckCircleIcon}
                className="stroke-success-500 mt-0.5"
              />
              <VStack space="xs">
                <ToastTitle className="font-semibold text-success-500">
                  Success!
                </ToastTitle>
                <ToastDescription size="sm">{message}</ToastDescription>
              </VStack>
            </HStack>
          </Toast>
        )
      },
    })
  }

  const handleSubmit = async () => {
    // Validation
    if (!inputValue) {
      setIsInvalid(true)
      return
    }

    try {
      setIsSaving(true) // optional loading state

      await sendPasswordResetEmail(auth, inputValue)

      // Notify user
      handleToastSuccess(
        'A password reset email has been sent. Please check your inbox.'
      )

      // Clear input & close modal if needed
      setInputValue('')
      onClose && onClose()
    } catch (error: any) {
      console.log('Error sending password reset email:', error)

      // Friendly error messaging
      let message = 'Failed to send password reset email.'

      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.'
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email format.'
      }

      handleToastError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Modal isOpen={visible} onClose={onClose} size="md">
        <ModalBackdrop />
        <ModalContent
          style={{
            borderColor: 'red',
            borderWidth: 0,
            backgroundColor: '#000000',
          }}
        >
          <ModalHeader>
            <Heading size={isMobile ? 'sm' : 'xl'} style={{ color: 'white' }}>
              Passsword reset
            </Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} color="white" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <FormControl
              isInvalid={isInvalid}
              size="md"
              isDisabled={false}
              isReadOnly={false}
              isRequired={false}
              style={{ marginTop: 10 }}
            >
              <FormControlLabel>
                <FormControlLabelText
                  className="text-[#FFFFFF]"
                  style={{ fontSize: isMobile ? 12 : 16 }}
                >
                  Email
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                className="data-[focus=true]:border-transparent data-[focus=true]:shadow-none bg-[#FFFFFF] border-none rounded-md"
                size={isMobile ? 'sm' : 'md'}
              >
                <InputField
                  type="text"
                  placeholder="Enter email"
                  value={inputValue}
                  onChangeText={(text) => {
                    setInputValue(text)
                    setIsInvalid(false)
                  }}
                  style={{ fontSize: isMobile ? 12 : 16 }}
                />
              </Input>
              <FormControlError>
                <FormControlErrorIcon
                  as={AlertCircleIcon}
                  className="text-red-500"
                />
                <FormControlErrorText className="text-red-500">
                  Email is required.
                </FormControlErrorText>
              </FormControlError>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            {isMobile ? (
              <VStack style={{ flex: 1 }} space="sm">
                <Button variant="outline" action="secondary" onPress={onClose}>
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button onPress={handleSubmit}>
                  <ButtonText>
                    {isSaving ? (
                      <Spinner
                        size="small"
                        color="white"
                        style={{ marginTop: 6 }}
                      />
                    ) : (
                      'Submit'
                    )}
                  </ButtonText>
                </Button>
              </VStack>
            ) : (
              <>
                <Button
                  variant="outline"
                  action="secondary"
                  className="mr-3"
                  onPress={onClose}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button onPress={handleSubmit}>
                  <ButtonText>
                    {isSaving ? (
                      <Spinner
                        size="small"
                        color="white"
                        style={{ marginTop: 6 }}
                      />
                    ) : (
                      'Submit'
                    )}
                  </ButtonText>
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
