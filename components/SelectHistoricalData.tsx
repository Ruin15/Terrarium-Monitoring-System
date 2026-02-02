import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Modal,
    useWindowDimensions,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface DateDropdownProps {
    selectedValue: string;
    onValueChange: (date: string) => void;
    dates: string[];
    formatDate: (date: string) => string;
    loading?: boolean;
    placeholder?: string;
}

export const SelectHistoricalData: React.FC<DateDropdownProps> = ({
    selectedValue,
    onValueChange,
    dates,
    formatDate,
    loading = false,
    placeholder = "Select Day",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const { height: windowHeight } = useWindowDimensions();

    const handleSelect = useCallback((date: string) => {
        onValueChange(date);
        setIsOpen(false);
    }, [onValueChange]);

    const displayValue = selectedValue ? formatDate(selectedValue) : placeholder;

    return (
        <View style={styles.container}>
            {/* Trigger Button */}
            <Pressable
                style={[styles.trigger, isOpen && styles.triggerActive]}
                onPress={() => setIsOpen(!isOpen)}
                disabled={loading}
            >
                <View style={styles.triggerContent}>
                    <Text
                        style={[
                            styles.triggerText,
                            !selectedValue && styles.placeholderText,
                        ]}
                        numberOfLines={1}
                    >
                        {displayValue}
                    </Text>
                </View>
                <View
                    style={[
                        styles.chevronContainer,
                        isOpen && styles.chevronRotated,
                    ]}
                >
                    <ChevronDown size={20} color="#666" />
                </View>
            </Pressable>

            {/* Dropdown Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                {/* Backdrop */}
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setIsOpen(false)}
                >
                    {/* Menu Container */}
                    <Pressable
                        style={[
                            styles.menu,
                            {
                                maxHeight: windowHeight * 0.6,
                            },
                        ]}
                        onPress={() => { }} // Prevent closing when clicking on menu
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerText}>Select Date</Text>
                        </View>

                        {/* Scrollable Content */}
                        <ScrollView
                            style={styles.scrollContent}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                        >
                            {loading ? (
                                <View style={styles.itemContainer}>
                                    <Text style={styles.itemText}>Loading...</Text>
                                </View>
                            ) : dates.length === 0 ? (
                                <View style={styles.itemContainer}>
                                    <Text style={styles.itemText}>No data available</Text>
                                </View>
                            ) : (
                                dates.map((date) => {
                                    const isSelected = selectedValue === date;
                                    return (
                                        <Pressable
                                            key={date}
                                            style={[
                                                styles.item,
                                                isSelected && styles.itemSelected,
                                            ]}
                                            onPress={() => handleSelect(date)}
                                        >
                                            <Text
                                                style={[
                                                    styles.itemText,
                                                    isSelected && styles.itemTextSelected,
                                                ]}
                                            >
                                                {formatDate(date)}
                                            </Text>
                                            {isSelected && <View style={styles.selectedDot} />}
                                        </Pressable>
                                    );
                                })
                            )}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#ddd',
        borderRadius: 12,
    },
    triggerActive: {
        borderColor: '#000',
    },
    triggerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    triggerText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    placeholderText: {
        color: '#999',
    },
    chevronContainer: {
        marginLeft: 8,
    },
    chevronRotated: {
        transform: [{ rotate: '180deg' }],
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menu: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    scrollContent: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    itemContainer: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 4,
        borderRadius: 10,
        backgroundColor: '#fafafa',
    },
    itemSelected: {
        backgroundColor: '#000',
    },
    itemText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    itemTextSelected: {
        color: '#fff',
    },
    selectedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
        marginLeft: 8,
    },
});

export default SelectHistoricalData;