import type { Profile } from '@/_types';

export interface ControllerRestrictionConfig {
  isConnected: boolean;
  profile: Profile | null;
}

export interface ControllerState {
  enabled: boolean;
  canUpdate: boolean;
  reason: string;
}

/**
 * Restriction function for AutoMist and LightCycle controllers
 * Prevents updates when connection is not stable and fetches status from Firestore
 * 
 * @param isConnected - Boolean indicating if app is connected
 * @param profile - User profile containing ControlAutomation settings
 * @param controllerType - 'AutoMist' or 'LightCycle'
 * @returns ControllerState with enabled status, update capability, and reason
 */
export const getControllerRestriction = (
  isConnected: boolean,
  profile: Profile | null,
  controllerType: 'AutoMist' | 'LightCycle'
): ControllerState => {
  
  // If not connected, disable controller and prevent updates
  if (!isConnected) {
    // console.log(`🔒 ${controllerType}: Connection unavailable - Controller disabled`);
    return {
      enabled: false,
      canUpdate: false,
      reason: 'No connection available'
    };
  }

  // If connected but no profile, disable controller
  if (!profile) {
    // console.log(`🔒 ${controllerType}: No profile loaded - Controller disabled`);
    return {
      enabled: false,
      canUpdate: false,
      reason: 'Profile not loaded'
    };
  }

  // If connected and profile exists, fetch status from Firestore
  const automationSettings = profile.ControlAutomation;
  
  if (!automationSettings) {
    // console.log(`🔒 ${controllerType}: No automation settings found - Controller disabled`);
    return {
      enabled: false,
      canUpdate: true,
      reason: 'Automation settings not configured'
    };
  }

  // Get the appropriate status from profile
  const statusKey = controllerType === 'AutoMist' 
    ? 'AutoMistStatus' 
    : 'LightCycleStatus';
  
  const isEnabled = (automationSettings[statusKey as keyof typeof automationSettings] as boolean) ?? false;

//   console.log(`✅ ${controllerType}: Connected & synced from Firestore - enabled: ${isEnabled}`);
  
  return {
    enabled: isEnabled,
    canUpdate: true,
    reason: 'Connected and synced'
  };
};

/**
 * Validates if a controller update is allowed
 * 
 * @param isConnected - Boolean indicating if app is connected
 * @param isUpdating - Boolean indicating if an update is already in progress
 * @returns Boolean indicating if update is allowed
 */
export const canUpdateController = (
  isConnected: boolean,
  isUpdating: boolean = false
): boolean => {
  if (!isConnected) {
    // console.warn('🔒 Update blocked: Connection unavailable');
    return false;
  }

  if (isUpdating) {
    // console.warn('🔒 Update blocked: Update already in progress');
    return false;
  }

  return true;
};
