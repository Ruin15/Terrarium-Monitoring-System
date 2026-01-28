import React, { createContext, useContext, useState, ReactNode } from 'react';

// Ecosystem types
export type EcosystemType = 'tropical' | 'woodland' | 'bog' | 'paludarium';

// Range interface
export interface SensorRange {
  min: number;
  max: number;
  optimal: number;
  critical_low: number;
  critical_high: number;
}

export interface LuxRange {
  understory_min: number;
  understory_max: number;
  canopy_min?: number;
  canopy_max?: number;
  optimal: number;
  critical_low: number;
  critical_high: number;
}

export interface EcosystemRanges {
  temperature: SensorRange;
  humidity: SensorRange;
  moisture: SensorRange;
  lux: LuxRange;
}

// Define ranges for each ecosystem
const ECOSYSTEM_RANGES: Record<EcosystemType, EcosystemRanges> = {
  tropical: {
    temperature: { min: 25, max: 30, optimal: 27.5, critical_low: 20, critical_high: 35 },
    humidity: { min: 70, max: 90, optimal: 80, critical_low: 50, critical_high: 95 },
    moisture: { min: 40, max: 60, optimal: 50, critical_low: 25, critical_high: 70 },
    lux: {
      understory_min: 1000,
      understory_max: 10000,
      canopy_min: 20000,
      canopy_max: 50000,
      optimal: 5000,
      critical_low: 500,
      critical_high: 60000
    }
  },
  woodland: {
    temperature: { min: 16, max: 24, optimal: 20, critical_low: 10, critical_high: 28 },
    humidity: { min: 60, max: 85, optimal: 72.5, critical_low: 45, critical_high: 90 },
    moisture: { min: 35, max: 60, optimal: 47.5, critical_low: 20, critical_high: 70 },
    lux: {
      understory_min: 1000,
      understory_max: 5000,
      optimal: 3000,
      critical_low: 500,
      critical_high: 8000
    }
  },
  bog: {
    temperature: { min: 18, max: 30, optimal: 24, critical_low: 12, critical_high: 35 },
    humidity: { min: 70, max: 95, optimal: 82.5, critical_low: 60, critical_high: 98 },
    moisture: { min: 70, max: 100, optimal: 85, critical_low: 60, critical_high: 100 },
    lux: {
      understory_min: 5000,
      understory_max: 15000,
      optimal: 10000,
      critical_low: 3000,
      critical_high: 20000
    }
  },
  paludarium: {
    temperature: { min: 22, max: 28, optimal: 25, critical_low: 18, critical_high: 32 },
    humidity: { min: 70, max: 95, optimal: 82.5, critical_low: 60, critical_high: 98 },
    moisture: { min: 50, max: 80, optimal: 65, critical_low: 35, critical_high: 90 },
    lux: {
      understory_min: 2000,
      understory_max: 10000,
      optimal: 6000,
      critical_low: 1000,
      critical_high: 15000
    }
  }
};

// Ecosystem metadata
export const ECOSYSTEM_INFO: Record<EcosystemType, { name: string; icon: string; description: string }> = {
  tropical: {
    name: 'Tropical Understory',
    icon: '🌴',
    description: 'Warm, humid rainforest floor with filtered light'
  },
  woodland: {
    name: 'Temperate Woodland',
    icon: '🌲',
    description: 'Mild, moist forest floor with shaded canopy light'
  },
  bog: {
    name: 'Bog / Carnivorous',
    icon: '🪰',
    description: 'Very high humidity, permanently wet, bright light'
  },
  paludarium: {
    name: 'Paludarium',
    icon: '🐸',
    description: 'Semi-aquatic tropical environment with stable temps'
  }
};

// Context
interface EcosystemContextType {
  ecosystem: EcosystemType;
  setEcosystem: (type: EcosystemType) => void;
  ranges: EcosystemRanges;
}

const EcosystemContext = createContext<EcosystemContextType | undefined>(undefined);

// Provider
export const EcosystemProvider: React.FC<{ children: ReactNode; defaultEcosystem?: EcosystemType }> = ({ 
  children, 
  defaultEcosystem = 'tropical' 
}) => {
  const [ecosystem, setEcosystem] = useState<EcosystemType>(defaultEcosystem);

  return (
    <EcosystemContext.Provider 
      value={{ 
        ecosystem, 
        setEcosystem, 
        ranges: ECOSYSTEM_RANGES[ecosystem] 
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
};

// Hook
export const useEcosystem = () => {
  const context = useContext(EcosystemContext);
  if (!context) {
    throw new Error('useEcosystem must be used within EcosystemProvider');
  }
  return context;
};

// Selector Component
export const EcosystemSelector: React.FC = () => {
  const { ecosystem, setEcosystem, ranges } = useEcosystem();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Ecosystem Type</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {(Object.keys(ECOSYSTEM_INFO) as EcosystemType[]).map((type) => (
          <button
            key={type}
            onClick={() => setEcosystem(type)}
            className={`p-4 rounded-lg border-2 transition-all ${
              ecosystem === type
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="text-3xl mb-2">{ECOSYSTEM_INFO[type].icon}</div>
            <div className="font-semibold text-sm text-gray-800">
              {ECOSYSTEM_INFO[type].name}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {ECOSYSTEM_INFO[type].description}
            </div>
          </button>
        ))}
      </div>

      {/* Display current ranges */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Ideal Ranges for {ECOSYSTEM_INFO[ecosystem].name}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600 font-medium">Temperature</div>
            <div className="text-green-600">{ranges.temperature.min}°C - {ranges.temperature.max}°C</div>
            <div className="text-xs text-gray-500">Optimal: {ranges.temperature.optimal}°C</div>
          </div>
          <div>
            <div className="text-gray-600 font-medium">Humidity</div>
            <div className="text-green-600">{ranges.humidity.min}% - {ranges.humidity.max}%</div>
            <div className="text-xs text-gray-500">Optimal: {ranges.humidity.optimal}%</div>
          </div>
          <div>
            <div className="text-gray-600 font-medium">Soil Moisture</div>
            <div className="text-green-600">{ranges.moisture.min}% - {ranges.moisture.max}%</div>
            <div className="text-xs text-gray-500">Optimal: {ranges.moisture.optimal}%</div>
          </div>
          <div>
            <div className="text-gray-600 font-medium">Light</div>
            <div className="text-green-600">{ranges.lux.understory_min} - {ranges.lux.understory_max} lux</div>
            <div className="text-xs text-gray-500">Optimal: {ranges.lux.optimal} lux</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export ranges for use in other components
export { ECOSYSTEM_RANGES };

// Export a hook to get current ranges without using context
export const getEcosystemRanges = (ecosystem: EcosystemType): EcosystemRanges => {
  return ECOSYSTEM_RANGES[ecosystem];
};