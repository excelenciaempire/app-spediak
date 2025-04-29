import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert, Image, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';
import { BASE_URL } from '../config/api';
import { COLORS } from '../styles/colors';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

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

interface UserData {
    id: string;
    name: string;
    email: string;
    createdAt: string | Date;
    // inspections?: AdminInspectionData[]; // Optional: to store inspections if needed later
}

// Componente para la Lista de Inspecciones
const InspectionList = () => {
    const [inspections, setInspections] = useState<AdminInspectionData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

    const fetchData = useCallback(async () => {
        console.log('[AdminInspections] Fetching all inspections data...');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");
            setIsLoading(true);
            const response = await axios.get(`${BASE_URL}/api/admin/all-inspections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInspections(response.data || []);
        } catch (err: any) {
             console.error("[AdminInspections] Error fetching data:", err);
            let errorMessage = "Failed to fetch inspection data.";
            if (err.response) { errorMessage = err.response.data?.message || errorMessage; }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    useEffect(() => { fetchData(); }, []);

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

    if (isLoading && !isRefreshing) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;

    return (
        <FlatList
            data={inspections}
            renderItem={renderInspectionItem}
            keyExtractor={(item: AdminInspectionData) => item.id}
            style={styles.list}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No inspections found.</Text>}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
            }
        />
    );
};

// Componente para la Lista de Usuarios
const UserList = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

     const fetchUsers = useCallback(async () => {
        console.log('[AdminUsers] Fetching all users data...');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");
            setIsLoading(true);
            const response = await axios.get(`${BASE_URL}/api/admin/all-users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data || []);
        } catch (err: any) {
             console.error("[AdminUsers] Error fetching data:", err);
            let errorMessage = "Failed to fetch user data.";
            if (err.response) { errorMessage = err.response.data?.message || errorMessage; }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [getToken]);

    useEffect(() => { fetchUsers(); }, []);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchUsers();
        setIsRefreshing(false);
    }, [fetchUsers]);

     const renderUserItem = ({ item }: { item: UserData }) => (
        <TouchableOpacity style={styles.userItemContainer} onPress={() => Alert.alert('User Clicked', `ID: ${item.id}`)}> // TODO: Navigate to user detail
            <Text style={styles.userNameText}>{item.name}</Text>
            <Text style={styles.userEmailText}>{item.email}</Text>
            <Text style={styles.userDateText}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </TouchableOpacity>
    );

    if (isLoading && !isRefreshing) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;

    return (
         <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item: UserData) => item.id}
            style={styles.list}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            ListHeaderComponent={<Text style={styles.totalCountText}>Total Users: {users.length}</Text>}
            ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
            }
        />
    );
};

// Navegador de Pestañas Principal del Dashboard
const Tab = createMaterialTopTabNavigator();

const AdminDashboardScreen = () => {
    return (
        <SafeAreaView style={styles.safeAreaContainer}>
             <Text style={styles.headerTitle}>Admin Dashboard</Text>
             {/* TODO: Add totals here? */}
             <Tab.Navigator
                 screenOptions={{
                    tabBarActiveTintColor: COLORS.primary,
                    tabBarInactiveTintColor: 'gray',
                    tabBarIndicatorStyle: { backgroundColor: COLORS.primary },
                    tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
                    tabBarStyle: { backgroundColor: 'white' },
                 }}
             >
                 <Tab.Screen name="All Inspections" component={InspectionList} />
                 <Tab.Screen name="All Users" component={UserList} />
             </Tab.Navigator>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeAreaContainer: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    container: {
        flex: 1,
        // Removed padding as it's handled by list/header
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20, // Adjust top padding
        paddingBottom: 15,
        color: COLORS.primary,
        backgroundColor: 'white', // Give header a background
        borderBottomColor: '#eee',
        borderBottomWidth: 1,
    },
    loader: { marginTop: 50 },
    errorText: { color: 'red', textAlign: 'center', marginTop: 20, paddingHorizontal: 15 },
    list: { flex: 1 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#6c757d', fontSize: 16 },
    totalCountText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#555',
        textAlign: 'center',
        marginBottom: 15,
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
    userItemContainer: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    userNameText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.darkText,
        marginBottom: 3,
    },
    userEmailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 5,
    },
    userDateText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
});

export default AdminDashboardScreen; 