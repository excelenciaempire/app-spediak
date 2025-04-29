import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';
import { BASE_URL } from '../config/api';
import { COLORS } from '../styles/colors';

// Interface for the combined data expected from the admin endpoint
interface AdminInspectionData {
    id: string;
    user_id: string;
    image_url: string | null;
    description: string;
    ddid: string;
    state: string | null;
    created_at: string;
    userName: string; // Added from backend
    userEmail: string; // Added from backend
}

const AdminDashboardScreen: React.FC = () => {
    const [inspections, setInspections] = useState<AdminInspectionData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

    const fetchData = useCallback(async () => {
        console.log('[AdminDashboard] Fetching all inspections data...');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");

            setIsLoading(true); // Set loading true only before the API call
            const response = await axios.get(`${BASE_URL}/api/admin/all-inspections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[AdminDashboard] Data received:', response.data);
            setInspections(response.data || []);

        } catch (err: any) {
            console.error("[AdminDashboard] Error fetching data:", err);
            let errorMessage = "Failed to fetch admin data.";
            if (err.response) {
                console.error("[AdminDashboard] Error response:", err.response.data);
                errorMessage = err.response.data?.message || errorMessage;
                if (err.response.status === 403) {
                     errorMessage = "Access Denied: Admin privileges required.";
                }
            }
            setError(errorMessage);
            // Alert.alert("Error", errorMessage); // Optionally alert user
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    }, [fetchData]);

    const renderInspectionItem = ({ item, index }: { item: AdminInspectionData; index: number }) => (
        <View style={[styles.cardContainer, index % 2 !== 0 && styles.cardAlternate]}>
            <View style={styles.cardTopSection}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover"/>
                ) : (
                    <View style={styles.cardImagePlaceholder} />
                )}
                <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardUserText} numberOfLines={1} ellipsizeMode="tail">{item.userName}</Text>
                    <Text style={styles.cardEmailText} numberOfLines={1} ellipsizeMode="tail">{item.userEmail}</Text>
                    <Text style={styles.cardDateText}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.cardBottomSection}>
                <Text style={styles.cardDescriptionLabel}>Description:</Text>
                <Text style={styles.cardDescriptionText}>{item.description}</Text>
                <Text style={styles.cardDdidLabel}>DDID:</Text>
                <Text style={styles.cardDdidText} numberOfLines={3} ellipsizeMode="tail">{item.ddid || 'N/A'}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Admin Dashboard - All Inspections</Text>
            {isLoading && !isRefreshing ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : (
                <FlatList
                    data={inspections}
                    renderItem={renderInspectionItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No inspections found.</Text>}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                            tintColor={COLORS.primary}
                        />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: COLORS.primary,
    },
    loader: {
        marginTop: 50,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    list: {
        flex: 1,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#6c757d',
        fontSize: 16,
    },
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#eee',
    },
    cardAlternate: {
        backgroundColor: '#fdfdfd',
    },
    cardTopSection: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'flex-start',
    },
    cardImage: {
        width: 65,
        height: 65,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#e0e0e0',
    },
    cardImagePlaceholder: {
        width: 65,
        height: 65,
        borderRadius: 6,
        marginRight: 12,
        backgroundColor: '#f0f2f5',
    },
    cardHeaderInfo: {
        flex: 1,
    },
    cardUserText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.darkText,
        marginBottom: 2,
    },
    cardEmailText: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    cardDateText: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    cardBottomSection: {
        padding: 12,
    },
    cardDescriptionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 3,
    },
    cardDescriptionText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 10,
    },
    cardDdidLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 3,
    },
    cardDdidText: {
        fontSize: 13,
        color: '#555',
        fontStyle: 'italic',
        lineHeight: 18,
    },
});

export default AdminDashboardScreen; 