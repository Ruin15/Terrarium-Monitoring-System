import { EcosystemRanges } from '@/components/ecosystemLimiter/ecosystemLimiter';

type data = {
    temperature: number;
    humidity: number;
    moisture: number;
    lux: number;
};

export const generateRecommendations = (data: data, ranges: EcosystemRanges) => {
    const recommendations = [];
    let healthScore = 100;

    // Temperature analysis
    if (data.temperature < ranges.temperature.critical_low) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'danger',
            title: 'CRITICAL: Temperature Too Low',
            message: `Current: ${data.temperature.toFixed(1)}°C. Below survivable range!`,
            action: 'URGENT: Add heating immediately. Risk of plant death.'
        });
        healthScore -= 30;
    } else if (data.temperature < ranges.temperature.min) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'warning',
            title: 'Temperature Below Optimal',
            message: `Current: ${data.temperature.toFixed(1)}°C. Target: ${ranges.temperature.min}-${ranges.temperature.max}°C.`,
            action: `Increase heating gradually to ${ranges.temperature.min}-${ranges.temperature.max}°C range`
        });
        healthScore -= 15;
    } else if (data.temperature > ranges.temperature.critical_high) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'danger',
            title: 'CRITICAL: Temperature Too High',
            message: `Current: ${data.temperature.toFixed(1)}°C. Extreme heat stress!`,
            action: 'URGENT: Increase ventilation and cooling immediately'
        });
        healthScore -= 30;
    } else if (data.temperature > ranges.temperature.max) {
        recommendations.push({
            icon: 'Thermometer',
            severity: 'warning',
            title: 'Temperature Above Optimal',
            message: `Current: ${data.temperature.toFixed(1)}°C. Target: ${ranges.temperature.min}-${ranges.temperature.max}°C.`,
            action: 'Improve ventilation or reduce heat sources'
        });
        healthScore -= 15;
    }

    // Humidity analysis
    if (data.humidity < ranges.humidity.critical_low) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'CRITICAL: Humidity Extremely Low',
            message: `Current: ${data.humidity.toFixed(1)}%. Target: ${ranges.humidity.min}-${ranges.humidity.max}%!`,
            action: 'URGENT: Turn on humidifier NOW. Mist plants immediately. Cover terrarium.'
        });
        healthScore -= 40;
    } else if (data.humidity < ranges.humidity.min) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'Humidity CRITICALLY LOW',
            message: `Current: ${data.humidity.toFixed(1)}%. Target: ${ranges.humidity.min}-${ranges.humidity.max}%!`,
            action: 'Turn on humidifier continuously. Mist 3-4x daily. Check terrarium seal.'
        });
        healthScore -= 30;
    } else if (data.humidity > ranges.humidity.critical_high) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'danger',
            title: 'CRITICAL: Humidity Too High',
            message: `Current: ${data.humidity.toFixed(1)}%. Risk of mold/rot!`,
            action: 'URGENT: Increase ventilation immediately. Remove excess water.'
        });
        healthScore -= 25;
    } else if (data.humidity > ranges.humidity.max) {
        recommendations.push({
            icon: 'Droplets',
            severity: 'warning',
            title: 'Humidity Above Optimal',
            message: `Current: ${data.humidity.toFixed(1)}%. Target: ${ranges.humidity.min}-${ranges.humidity.max}%.`,
            action: 'Reduce misting frequency and improve air circulation'
        });
        healthScore -= 10;
    }

    // Moisture analysis
    if (data.moisture < ranges.moisture.critical_low) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'CRITICAL: Soil Severely Dry',
            message: `Current: ${data.moisture}%. Risk of plant death!`,
            action: `URGENT: Water thoroughly NOW. Soil should be ${ranges.moisture.min}-${ranges.moisture.max}%.`
        });
        healthScore -= 35;
    } else if (data.moisture < ranges.moisture.min) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'Soil Moisture LOW',
            message: `Current: ${data.moisture}%. Target: ${ranges.moisture.min}-${ranges.moisture.max}%.`,
            action: `Water soil until moisture reaches ${ranges.moisture.min}-${ranges.moisture.max}%. Monitor daily.`
        });
        healthScore -= 25;
    } else if (data.moisture > ranges.moisture.critical_high) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'danger',
            title: 'CRITICAL: Soil Waterlogged',
            message: `Current: ${data.moisture}%. Severe risk of root rot!`,
            action: 'URGENT: Stop watering. Improve drainage. Remove standing water.'
        });
        healthScore -= 30;
    } else if (data.moisture > ranges.moisture.max) {
        recommendations.push({
            icon: 'Sprout',
            severity: 'warning',
            title: 'Soil Too Wet',
            message: `Current: ${data.moisture}%. Target: ${ranges.moisture.min}-${ranges.moisture.max}%.`,
            action: `Stop watering. Let soil dry to ${ranges.moisture.min}-${ranges.moisture.max}% range.`
        });
        healthScore -= 15;
    }

    // Light analysis
    if (data.lux < ranges.lux.critical_low) {
        recommendations.push({
            icon: 'Sun',
            severity: 'danger',
            title: 'CRITICAL: Light Too Low',
            message: `Current: ${Math.round(data.lux)} lux. Plants cannot photosynthesize!`,
            action: `URGENT: Increase lighting. Plants need ${ranges.lux.understory_min}-${ranges.lux.understory_max} lux minimum.`
        });
        healthScore -= 30;
    } else if (data.lux < ranges.lux.understory_min) {
        recommendations.push({
            icon: 'Sun',
            severity: 'warning',
            title: 'Light Insufficient',
            message: `Current: ${Math.round(data.lux)} lux. Below minimum.`,
            action: `Increase light to ${ranges.lux.understory_min}-${ranges.lux.understory_max} lux.`
        });
        healthScore -= 15;
    } else if (data.lux > ranges.lux.critical_high) {
        recommendations.push({
            icon: 'Sun',
            severity: 'danger',
            title: 'CRITICAL: Light Extremely High',
            message: `Current: ${Math.round(data.lux)} lux. Severe risk of leaf burn!`,
            action: 'URGENT: Reduce light immediately. Add shade cloth or diffuser.'
        });
        healthScore -= 30;
    } else if (ranges.lux.canopy_max && data.lux > ranges.lux.canopy_max) {
        recommendations.push({
            icon: 'Sun',
            severity: 'warning',
            title: 'Light Too Intense',
            message: `Current: ${Math.round(data.lux)} lux. Above maximum.`,
            action: `Reduce to ${ranges.lux.canopy_min}-${ranges.lux.canopy_max} lux max or provide filtered light.`
        });
        healthScore -= 15;
    } else if (ranges.lux.canopy_min && data.lux > ranges.lux.understory_max && data.lux < ranges.lux.canopy_min) {
        recommendations.push({
            icon: 'Sun',
            severity: 'info',
            title: 'Light: Between Understory & Canopy',
            message: `Current: ${Math.round(data.lux)} lux. Suitable for mid-level plants.`,
            action: 'Good for medium-light plants. Adjust based on plant type.'
        });
    } else if (data.lux > ranges.lux.understory_max) {
        // For ecosystems without canopy_min (woodland, bog, paludarium)
        recommendations.push({
            icon: 'Sun',
            severity: 'warning',
            title: 'Light Above Optimal',
            message: `Current: ${Math.round(data.lux)} lux. Above recommended range.`,
            action: `Reduce to ${ranges.lux.understory_min}-${ranges.lux.understory_max} lux for best results.`
        });
        healthScore -= 10;
    }

    // Perfect conditions
    if (recommendations.length === 0) {
        recommendations.push({
            icon: 'CheckCircle',
            severity: 'success',
            title: 'Perfect Conditions! ✨',
            message: 'All parameters match ecosystem standards!',
            action: 'Continue current care routine. Monitor regularly.'
        });
    }

    return { recommendations, healthScore: Math.max(0, healthScore) };
};