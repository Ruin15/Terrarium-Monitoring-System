// Make sure your Profile type in @/_types includes at minimum:


export interface ControlAutomation {
  AutoMistStatus: boolean;
  LightCycleStatus: boolean;
  daylightBrightness: number; // User's preferred daytime brightness (0-255)
  nightlightBrightness: number; // Night brightness (always 0)
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  uid: string;
  status?: string;
  createdAt?: any;
  terrariumEco?: 'tropical' | 'woodland' | 'bog' | 'paludarium';
  ControlAutomation?: ControlAutomation; 
  // Add any other fields your profile documents have
}

export interface SensorData {
  id: string;
  uid: string; // user ID
  timestamp: any; // Firestore timestamp
  temperature: number; // in °C
  humidity: number; // in %
  moisture: number; // in %
  lux: number; // in lux
  // Add any other fields your sensor readings have
}

export interface DailySummary {
  date: string; // e.g. '2024-06-15'
  avgTemperature: number;
  avgHumidity: number;
  avgMoisture: number;
  avgLux: number;
  readingCount: number;
  // Add any other summary fields you need
}

export interface AuthContextType {
  user: {
    uid: string;
    email: string | null;
  } | null;
  loading: boolean;
  error: string | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export interface ReportData {
  startDate: string; // e.g. '2024-06-01'
  endDate: string;   // e.g. '2024-06-30'
  averageTemperature: number;
  averageHumidity: number;
  averageMoisture: number;
  averageLux: number;
  maxTemperature: number;
  minTemperature: number;
  maxHumidity: number;
  minHumidity: number;
  maxMoisture: number;
  minMoisture: number;
  maxLux: number;
  minLux: number;
  // Add any other aggregated fields you need
}


