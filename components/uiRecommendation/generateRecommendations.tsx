import { IDEAL_RANGES } from '../sensorRangeLimiter/sensorRangeLimiter';


type data = {
    temperature: number;
    humidity: number;
    moisture: number;
    lux: number;
};


export const generateRecommendations = (data: data) => {
    const recommendations = [];
    let healthScore = 100;

    // Temperature analysis (25-30°C optimal)
    if (data.temperature < IDEAL_RANGES.temperature.critical_low) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'danger',
            title: 'CRITICAL: Temperature Too Low',
            message: `Current: ${data.temperature.toFixed(1)}°C. Below survivable range!`,
            action: 'URGENT: Add heating immediately. Risk of plant death.'
        });
        healthScore -= 30;
    } else if (data.temperature < IDEAL_RANGES.temperature.min) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'warning',
            title: 'Temperature Below Optimal',
            message: `Current: ${data.temperature.toFixed(1)}°C. Target: 25-30°C.`,
            action: 'Increase heating gradually to 25-30°C range'
        });
        healthScore -= 15;
    } else if (data.temperature > IDEAL_RANGES.temperature.critical_high) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'danger',
            title: 'CRITICAL: Temperature Too High',
            message: `Current: ${data.temperature.toFixed(1)}°C. Extreme heat stress!`,
            action: 'URGENT: Increase ventilation and cooling immediately'
        });
        healthScore -= 30;
    } else if (data.temperature > IDEAL_RANGES.temperature.max) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'warning',
            title: 'Temperature Above Optimal',
            message: `Current: ${data.temperature.toFixed(1)}°C. Target: 25-30°C.`,
            action: 'Improve ventilation or reduce heat sources'
        });
        healthScore -= 15;
    }

    // Humidity analysis (70-90% optimal for tropical forest)
    if (data.humidity < IDEAL_RANGES.humidity.critical_low) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'CRITICAL: Humidity Extremely Low',
            message: `Current: ${data.humidity.toFixed(1)}%. Tropical plants need 70-90%!`,
            action: 'URGENT: Turn on humidifier NOW. Mist plants immediately. Cover terrarium.'
        });
        healthScore -= 40;
    } else if (data.humidity < IDEAL_RANGES.humidity.min) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'Humidity CRITICALLY LOW',
            message: `Current: ${data.humidity.toFixed(1)}%. Tropical forest needs 70-90%!`,
            action: 'Turn on humidifier continuously. Mist 3-4x daily. Check terrarium seal.'
        });
        healthScore -= 30;
    } else if (data.humidity > IDEAL_RANGES.humidity.critical_high) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'CRITICAL: Humidity Too High',
            message: `Current: ${data.humidity.toFixed(1)}%. Risk of mold/rot!`,
            action: 'URGENT: Increase ventilation immediately. Remove excess water.'
        });
        healthScore -= 25;
    } else if (data.humidity > IDEAL_RANGES.humidity.max) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'warning',
            title: 'Humidity Above Optimal',
            message: `Current: ${data.humidity.toFixed(1)}%. Target: 70-90%.`,
            action: 'Reduce misting frequency and improve air circulation'
        });
        healthScore -= 10;
    }

    // Moisture analysis (40-60% optimal)
    if (data.moisture < IDEAL_RANGES.moisture.critical_low) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'CRITICAL: Soil Severely Dry',
            message: `Current: ${data.moisture}%. Risk of plant death!`,
            action: 'URGENT: Water thoroughly NOW. Soil should be 40-60%.'
        });
        healthScore -= 35;
    } else if (data.moisture < IDEAL_RANGES.moisture.min) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'Soil Moisture LOW',
            message: `Current: ${data.moisture}%. Tropical plants need 40-60%.`,
            action: 'Water soil until moisture reaches 40-60%. Monitor daily.'
        });
        healthScore -= 25;
    } else if (data.moisture > IDEAL_RANGES.moisture.critical_high) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'CRITICAL: Soil Waterlogged',
            message: `Current: ${data.moisture}%. Severe risk of root rot!`,
            action: 'URGENT: Stop watering. Improve drainage. Remove standing water.'
        });
        healthScore -= 30;
    } else if (data.moisture > IDEAL_RANGES.moisture.max) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'warning',
            title: 'Soil Too Wet',
            message: `Current: ${data.moisture}%. Target: 40-60%.`,
            action: 'Stop watering. Let soil dry to 40-60% range.'
        });
        healthScore -= 15;
    }

    // Light analysis (understory: 1,000-10,000 lux, canopy gaps: 20,000-50,000 lux)
    if (data.lux < IDEAL_RANGES.lux.critical_low) {
        recommendations.push({
            icon: 'Sun',
            severity: 'danger',
            title: 'CRITICAL: Light Too Low',
            message: `Current: ${Math.round(data.lux)} lux. Plants cannot photosynthesize!`,
            action: 'URGENT: Increase lighting. Understory plants need 1,000-10,000 lux minimum.'
        });
        healthScore -= 30;
    } else if (data.lux < IDEAL_RANGES.lux.understory_min) {
        recommendations.push({
            icon: 'Sun',
            severity: 'warning',
            title: 'Light Insufficient',
            message: `Current: ${Math.round(data.lux)} lux. Below understory minimum.`,
            action: 'Increase light to 1,000-10,000 lux for understory plants.'
        });
        healthScore -= 15;
    } else if (data.lux > IDEAL_RANGES.lux.critical_high) {
        recommendations.push({
            icon: 'Sun',
            severity: 'danger',
            title: 'CRITICAL: Light Extremely High',
            message: `Current: ${Math.round(data.lux)} lux. Severe risk of leaf burn!`,
            action: 'URGENT: Reduce light immediately. Add shade cloth or diffuser.'
        });
        healthScore -= 30;
    } else if (data.lux > IDEAL_RANGES.lux.canopy_max) {
        recommendations.push({
            icon: 'Sun',
            severity: 'warning',
            title: 'Light Too Intense',
            message: `Current: ${Math.round(data.lux)} lux. Above canopy gap maximum.`,
            action: 'Reduce to 20,000-50,000 lux max or provide filtered light.'
        });
        healthScore -= 15;
    } else if (data.lux > IDEAL_RANGES.lux.understory_max && data.lux < IDEAL_RANGES.lux.canopy_min) {
        recommendations.push({
            icon: 'Sun',
            severity: 'info',
            title: 'Light: Between Understory & Canopy',
            message: `Current: ${Math.round(data.lux)} lux. Suitable for mid-level plants.`,
            action: 'Good for medium-light plants. Adjust based on plant type.'
        });
    }

    // Perfect conditions for tropical forest
    if (recommendations.length === 0) {
        recommendations.push({
            icon: 'CheckCircle',
            severity: 'success',
            title: 'Perfect Tropical Forest Conditions! 🌴',
            message: 'All parameters match tropical forest standards!',
            action: 'Continue current care routine. Monitor 2-3x daily.'
        });
    }

    return { recommendations, healthScore: Math.max(0, healthScore) };
};
