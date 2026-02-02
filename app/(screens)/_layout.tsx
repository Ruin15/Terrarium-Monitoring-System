import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
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
import { Home, LayoutDashboard, Settings } from 'lucide-react-native';
import { UserProvider } from '@/context/UserContext';
import LogoutModal from '@/components/logoutButton/headerLogout';
import { SensorProvider } from '@/context/sensorContext';
import { LogProvider } from '@/context/logContext';
import { ControlProvider } from '@/context/controlContext';
import { useProtectedRoute } from '@/_helpers/authGuard';
import { EcosystemProvider } from '@/components/ecosystemLimiter/ecosystemLimiter';
import { ConnectionProvider } from '@/context/ConnectionContext';




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
  useProtectedRoute();

  const pathname = usePathname();
  //   const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [showDrawer, setShowDrawer] = useState(false);
  const dimensions = useWindowDimensions()
  const isLargeScreen = dimensions.width >= 1280
  const isMediumScreen = dimensions.width <= 1280 && dimensions.width > 768

  return (
    <UserProvider>
      <SensorProvider>
        <LogProvider autoFetch={true} realtimeUpdates={true}>
          <ControlProvider>
            <ConnectionProvider>
              <EcosystemProvider defaultEcosystem="tropical">

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
                        headerRight: () => <LogoutModal />,
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
                        headerRight: () => <LogoutModal />,
                        // headerLeft: isLargeScreen
                        //   ? () => <HeaderButtons screen="dashboard" />
                        //   : undefined,
                        headerTintColor: 'black',
                        headerStyle: {
                          ...styles.headerSpace,
                        },
                      }}
                    />

                    <Drawer.Screen
                      name="settings"
                      options={{
                        title: 'Settings',
                        drawerIcon: ({ color }) => (
                          <Settings color={color} size={25} className="mr-2" />
                        ),
                        headerTitle: () => null,
                        headerRight: () => <LogoutModal />,
                        headerTintColor: 'black',
                        headerStyle: {
                          ...styles.headerSpace,
                        },
                      }}
                    />
                    <Drawer.Screen
                      name="account"
                      options={{
                        drawerItemStyle: { display: 'none' },
                        headerTitle: () => null,
                        headerRight: () => <LogoutModal />,
                        headerTintColor: 'black',
                        headerStyle: {
                          ...styles.headerSpace,
                        },
                      }}
                    />

                  </Drawer>

                </GluestackUIProvider>

              </EcosystemProvider>
            </ConnectionProvider>
          </ControlProvider>
        </LogProvider>
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




