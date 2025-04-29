import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert, Image, SafeAreaView, TouchableOpacity, Platform, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';
import { BASE_URL } from '../config/api';
import { COLORS } from '../styles/colors';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Search, Eye, UserCircle } from 'lucide-react-native';
import DdidModal from '../components/DdidModal';

// Interface for the combined data expected from the admin endpoint
interface AdminInspectionData {
    id: string;
    user_id: string;
    image_url: string | null;
    description: string;
    ddid: string;
    state: string | null;
    created_at: string;
    userName: string;
    userEmail: string;
    userState: string | null;
    userProfilePhoto: string | null;
}

interface UserData {
    id: string;
    name: string;
    email: string;
    createdAt: string | Date;
    state: string | null;
    profilePhoto: string | null;
    // inspections?: AdminInspectionData[]; // Optional: to store inspections if needed later
}

// Component for the Inspection List
const InspectionList: React.FC = () => {
    const [inspections, setInspections] = useState<AdminInspectionData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedInspection, setSelectedInspection] = useState<AdminInspectionData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { getToken } = useAuth();

    const fetchData = useCallback(async () => {
        console.log('[AdminInspections] Fetching all inspections data...');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");
            setIsLoading(true);
            const response = await axios.get<{ inspections: AdminInspectionData[] }>(`${BASE_URL}/api/admin/all-inspections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInspections(response.data.inspections || []);
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

    const processedInspections = useMemo(() => {
        let filtered = inspections;
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = inspections.filter(insp =>
                insp.userName?.toLowerCase().includes(lowerCaseQuery) ||
                insp.userEmail?.toLowerCase().includes(lowerCaseQuery) ||
                insp.description?.toLowerCase().includes(lowerCaseQuery) ||
                insp.ddid?.toLowerCase().includes(lowerCaseQuery)
            );
        }
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });
        return filtered;
    }, [inspections, searchQuery, sortBy]);

    const renderInspectionItem = ({ item, index }: { item: AdminInspectionData; index: number }) => (
        <View style={styles.cardContainer}>
            <View style={styles.cardUserImageContainer}>
                {item.userProfilePhoto ? (
                    <Image source={{ uri: item.userProfilePhoto }} style={styles.userImage} resizeMode="cover"/>
                ) : (
                    <View style={styles.userImagePlaceholder}>
                        <UserCircle size={24} color={COLORS.secondary} />
                    </View>
                )}
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardUserText} numberOfLines={1}>{item.userName || 'Unknown User'}</Text>
                <Text style={styles.cardDetailText} numberOfLines={1}>{item.userEmail} {item.userState ? `(${item.userState})` : ''}</Text>
                <Text style={styles.cardDateText}>{new Date(item.created_at).toLocaleString()}</Text>
                <View style={styles.inspectionDetailsContainer}>
                    <View style={styles.inspectionImageContainer}>
                        {item.image_url ? (
                            <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover"/>
                        ) : (
                            <View style={styles.cardImagePlaceholder}><Text style={styles.placeholderText}>No image</Text></View>
                        )}
                    </View>
                    <View style={styles.inspectionTextContainer}>
                        <Text style={styles.cardDescriptionLabel}>Description:</Text>
                        <Text style={styles.cardDescriptionText} numberOfLines={2}>{item.description}</Text>
                        <TouchableOpacity
                            style={styles.viewReportButton}
                            onPress={() => {
                                setSelectedInspection(item);
                                setIsModalVisible(true);
                            }}
                        >
                            <Eye size={16} color={COLORS.primary} />
                            <Text style={styles.viewReportButtonText}>View Report</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    if (isLoading && !isRefreshing) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;

    return (
        <View style={{flex: 1}}>
            <View style={styles.controlsContainer}>
                <View style={styles.searchWrapper}>
                     <Search size={18} color="#888" style={styles.searchIcon} />
                     <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, email, description..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#999"
                     />
                </View>
                <View style={styles.sortWrapper}>
                    <Picker
                        selectedValue={sortBy}
                        onValueChange={(itemValue) => setSortBy(itemValue)}
                        style={styles.sortPicker}
                        mode="dropdown"
                    >
                        <Picker.Item label="Newest first" value="newest" />
                        <Picker.Item label="Oldest first" value="oldest" />
                    </Picker>
                </View>
            </View>

            <FlatList
                data={processedInspections}
                renderItem={renderInspectionItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 20 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No inspections found.</Text>}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                }
            />
             <DdidModal
                 visible={isModalVisible}
                 onClose={() => setIsModalVisible(false)}
                 ddidText={selectedInspection?.ddid || ''}
                 imageUrl={selectedInspection?.image_url || undefined}
                 description={selectedInspection?.description}
                 userName={selectedInspection?.userName}
                 userEmail={selectedInspection?.userEmail}
            />
        </View>
    );
};

// Component for the User List
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
            const response = await axios.get<{ users: UserData[] }>(`${BASE_URL}/api/admin/all-users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
             setUsers(response.data.users || []);
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
         <TouchableOpacity style={styles.userItemContainer} onPress={() => Alert.alert('User Profile', `Navigate to profile for ${item.name}?`)}>
            <View style={styles.userItemContent}>
                 <View style={styles.userListImageContainer}>
                    {item.profilePhoto ? (
                        <Image source={{ uri: item.profilePhoto }} style={styles.userListImage} />
                    ) : (
                         <View style={styles.userListImagePlaceholder}>
                            <UserCircle size={32} color={COLORS.secondary} />
                         </View>
                    )}
                </View>
                <View style={styles.userInfoContainer}>
                    <Text style={styles.userNameText}>{item.name}</Text>
                    <Text style={styles.userEmailText}>{item.email}</Text>
                    <Text style={styles.userDetailText}>State: {item.state || 'N/A'}</Text>
                </View>
                 <Text style={styles.userDateText}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
             </View>
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
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
        backgroundColor: 'white',
        borderBottomColor: '#eee',
        borderBottomWidth: 1,
    },
    searchWrapper: {
        flex: 0.6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
    },
    sortWrapper: {
        flex: 0.4,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        justifyContent: 'center',
    },
    sortPicker: {
        height: 40,
    },
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 15,
        marginHorizontal: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.5,
        elevation: 2,
        flexDirection: 'column',
        overflow: 'hidden',
    },
    cardUserImageContainer: {
        padding: 10,
        alignItems: 'center',
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    userImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    cardUserText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.darkText,
        marginBottom: 1,
    },
    cardDetailText: {
        fontSize: 12,
        color: '#555',
        marginBottom: 4,
    },
    cardDateText: {
        fontSize: 10,
        color: '#777',
    },
    inspectionDetailsContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    inspectionImageContainer: {
        width: 80,
        height: 80,
        marginRight: 10,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    inspectionTextContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    placeholderText: {
        fontSize: 12,
        color: '#aaa',
    },
    cardDescriptionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 3,
    },
    cardDescriptionText: {
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
        marginBottom: 5,
    },
    viewReportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.primary + '15',
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginTop: 'auto',
    },
    viewReportButtonText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 5,
    },
    userItemContainer: {
        backgroundColor: '#fff',
        marginBottom: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    userItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userListImageContainer: {
        marginRight: 15,
    },
    userListImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userListImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfoContainer: {
        flex: 1,
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
        marginBottom: 3,
    },
    userDetailText: {
        fontSize: 13,
        color: '#777',
    },
    userDateText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginLeft: 10,
    },
});

export default AdminDashboardScreen; 