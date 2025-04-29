import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
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
        <View style={styles.itemContainer}>
            <Text style={styles.itemUser}>{item.userName} ({item.userEmail})</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
            {/* Optionally display image thumbnail, DDID snippet, etc. */}
            {/* <Image source={{ uri: item.image_url }} style={styles.itemThumbnail} /> */}
            <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</Text>
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
        padding: 15,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
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
    itemContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    itemUser: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.darkText,
        marginBottom: 5,
    },
    itemDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    itemDate: {
        fontSize: 12,
        color: '#888',
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#6c757d',
        fontSize: 16,
    },
    // Add styles for itemThumbnail if you uncomment the Image
    // itemThumbnail: {
    //     width: 50,
    //     height: 50,
    //     borderRadius: 5,
    //     marginTop: 5,
    //     marginBottom: 5,
    // },
});

export default AdminDashboardScreen; 