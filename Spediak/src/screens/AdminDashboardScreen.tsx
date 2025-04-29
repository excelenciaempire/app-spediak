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
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <View style={styles.userInfoContainer}>
                     <Text style={styles.itemUser}>{item.userName}</Text>
                     <Text style={styles.itemEmail}>{item.userEmail}</Text>
                </View>
                <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
            <View style={styles.itemBody}>
                {item.image_url && (
                     <Image source={{ uri: item.image_url }} style={styles.itemThumbnail} resizeMode="cover"/>
                )}
                <View style={styles.itemDetails}>
                     <Text style={styles.itemDescriptionLabel}>Description:</Text>
                     <Text style={styles.itemDescription}>{item.description}</Text>
                     <Text style={styles.itemDdidLabel}>DDID:</Text>
                     <Text style={styles.itemDdid} numberOfLines={3} ellipsizeMode="tail">{item.ddid || 'N/A'}</Text>
                </View>
            </View>
            {/* Optionally add state or ID if needed */}
            {/* <Text style={styles.itemId}>ID: {item.id}</Text> */}
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
    itemContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.22,
        elevation: 3,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    userInfoContainer: {
        flex: 1,
        marginRight: 10,
    },
    itemUser: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.darkText,
    },
    itemEmail: {
        fontSize: 13,
        color: '#666',
    },
    itemDate: {
        fontSize: 12,
        color: '#888',
        textAlign: 'right',
        flexShrink: 0,
    },
    itemBody: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 15,
        backgroundColor: '#eee',
    },
    itemDetails: {
        flex: 1,
    },
    itemDescriptionLabel: {
        fontSize: 12,
        color: '#555',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    itemDescription: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
    },
    itemDdidLabel: {
        fontSize: 12,
        color: '#555',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    itemDdid: {
        fontSize: 13,
        color: '#444',
        fontStyle: 'italic',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#6c757d',
        fontSize: 16,
    },
});

export default AdminDashboardScreen; 