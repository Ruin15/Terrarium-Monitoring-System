import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
// import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { router, Slot, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  AvatarBadge,
} from '@/components/ui/avatar';
import { useWindowDimensions, StyleSheet } from 'react-native'
import { Drawer } from 'expo-router/drawer'
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerToggleButton,
} from '@react-navigation/drawer'
import { Home, LayoutDashboard } from 'lucide-react-native';
import {UserProvider} from '@/context/UserContext';
import HeaderLogout from '@/components/logoutButton/headerLogout';
import { SensorProvider } from '@/context/sensorContext';






// export {
//   ErrorBoundary,
// } from 'expo-router';

// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
// //   const [loaded, error] = useFonts({
// //     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
// //     ...FontAwesome.font,
// //   });

// //   useEffect(() => {
// //     if (error) throw error;
// //   }, [error]);

// //   useEffect(() => {
// //     if (loaded) {
// //       SplashScreen.hideAsync();
// //     }
// //   }, [loaded]);

//   return <RootLayoutNav />;
// }

export default function RootLayoutNav() {
  const pathname = usePathname();
//   const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [showDrawer, setShowDrawer] = useState(false);
  const dimensions = useWindowDimensions()
  const isLargeScreen = dimensions.width >= 1280
  const isMediumScreen = dimensions.width <= 1280 && dimensions.width > 768

  return (
    <UserProvider>
      <SensorProvider>
    <GluestackUIProvider mode={'light'}>
        <Drawer
              screenOptions={{
                drawerType: isLargeScreen
                  ? 'permanent'
                  : isMediumScreen
                    ? 'slide'
                    : 'slide',
                drawerStyle: isLargeScreen
                  ? {
                      width: 240,
                      backgroundColor: '#ffffffff',
                      borderRightWidth: 0,
                    }
                  : {
                      width: '70%',
                      backgroundColor: '#ffffffff',
                    },
                headerShown: true,
                drawerActiveTintColor: '#000',
                drawerInactiveTintColor: '#000000ff',
                drawerActiveBackgroundColor: '#afafafff',
                drawerInactiveBackgroundColor: 'transparent',
                drawerItemStyle: {
                  borderRadius: 8,
                  marginHorizontal: 12,
                  marginVertical: 4,
                  paddingLeft: 8,
                },
                drawerLabelStyle: {
                  fontSize: 15,
                  fontWeight: '600',
                  marginLeft: -16,
                },
                // Add these two props to remove hover effect
                overlayColor: 'transparent',
                // For web - removes ripple effect
                sceneStyle: { backgroundColor: 'transparent' },
                headerStyle: {
                  backgroundColor: '#ffffffff',
                  borderColor: '#ffffffff',
                },
                headerTitleStyle: {
                  fontWeight: 'bold',
                  fontSize: 24,
                  color: '#000000ff',
                },
              }}
            >

              <Drawer.Screen
                name="index"
                options={{
                  title: 'Home',
                  drawerIcon: ({ color }) => (
                    <Home color={color} size={25} className="mr-2" />
                  ),
                  headerTitle: () => null,
                  headerRight: () => <HeaderLogout />,
                  // headerLeft: () => <HeaderButtons />,
                  headerTintColor: 'black',
                  headerStyle: {
                    ...styles.headerSpace,
                  },
                }}
              />

              <Drawer.Screen
                name="analytics"
                options={{
                  title: 'Analytics',
                  drawerIcon: ({ color }) => (
                    <LayoutDashboard color={color} size={25} className="mr-2" />
                  ),
                  headerTitle: () => null,
                  headerRight: () => <HeaderLogout />,
                  // headerLeft: isLargeScreen
                  //   ? () => <HeaderButtons screen="dashboard" />
                  //   : undefined,
                  headerTintColor: 'black',
                  headerStyle: {
                    ...styles.headerSpace,
                  },
                }}
              />


            {/* <DrawerHeader style={{ padding: 12,}}>
              <VStack style={{ 
                justifyContent: 'center', 
                alignItems: 'center', 
                width: '100%', 
                gap: 12,
                }}>
                <Avatar size="2xl">
                    <AvatarFallbackText>User</AvatarFallbackText>
                </Avatar>
                <Text style={{ textAlign: 'center', fontFamily: 'lufga',  }}>User Name</Text>
              </VStack>
            </DrawerHeader>
            
            <DrawerBody>
              <VStack space="lg" className="mt-4 rounded-2xl">
                <Button
                  onPress={() => {
                    // Navigate to home
                    setShowDrawer(false);
                    router.push(`/`);
                  }}
                >
                  <ButtonText>Home</ButtonText>
                </Button>
                
                <Button
                  onPress={() => {
                    // Navigate to settings
                    setShowDrawer(false);
                    router.push(`/analytics`);
                  }}
                >
                  <ButtonText>Analysis</ButtonText>
                </Button>
                

              </VStack>
            </DrawerBody> */}
            
            {/* <DrawerFooter>
              <Text size="sm" className="text-center">
                Version 1.0.0
              </Text>
            </DrawerFooter>
          </DrawerContent> */}
        </Drawer>
    
    </GluestackUIProvider>
      </SensorProvider>
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  headerSpace: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 28,
    paddingBottom: 28,
    // backgroundColor: 'black',
    // color: 'black',
    alignContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
  },
})