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

    const renderInspectionItem = ({ item }: { item: AdminInspectionData }) => (
        <View style={styles.cardContainer}>
            {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover"/>
            )}
            <View style={styles.cardContent}>
                <View style={styles.userInfoRow}>
                    <Text style={styles.cardUserText}>{item.userName}</Text>
                    <Text style={styles.cardEmailText}>({item.userEmail})</Text>
                </View>
                <Text style={styles.cardDateText}>{new Date(item.created_at).toLocaleString()}</Text>
                <Text style={styles.cardDescriptionLabel}>Description:</Text>
                <Text style={styles.cardDescriptionText}>{item.description}</Text>
                <Text style={styles.cardDdidLabel}>DDID:</Text>
                <Text style={styles.cardDdidText} numberOfLines={2} ellipsizeMode="tail">{item.ddid || 'N/A'}</Text>
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
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 4,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: 180,
    },
    cardContent: {
        padding: 15,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    cardUserText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.darkText,
        marginRight: 5,
    },
    cardEmailText: {
        fontSize: 14,
        color: '#555',
    },
    cardDateText: {
        fontSize: 12,
        color: '#777',
        marginBottom: 12,
        textAlign: 'right',
    },
    cardDescriptionLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 3,
    },
    cardDescriptionText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardDdidLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 3,
    },
    cardDdidText: {
        fontSize: 14,
        color: '#555',
        fontStyle: 'italic',
        lineHeight: 19,
    },
});

export default AdminDashboardScreen; 