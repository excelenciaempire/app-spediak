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
import AdminSettingsTab from '../components/admin/AdminSettingsTab';

// Interface for the combined data expected from the admin endpoint
interface AdminInspectionData {
    id: string;
    user_id: string;
    image_url: string | null;
    description: string;
    ddid: string;
    state: string | null; // Inspection state
    created_at: string;
    userName: string;
    userEmail: string;
    userState: string | null; // Added back
    userProfilePhoto: string | null; // Added back
}

interface UserData {
    id: string;
    name: string;
    email: string;
    createdAt: string | Date;
    state: string | null; // Added back
    profilePhoto: string | null; // Added back
    inspectionCount: number; // Added inspection count
}

// Updated Interface for API response
interface PaginatedResponse<T> {
    data: T[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
}

// Component for the Inspection List
const InspectionList: React.FC = () => {
    const [inspections, setInspections] = useState<AdminInspectionData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // State for loading more
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedInspection, setSelectedInspection] = useState<AdminInspectionData | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { getToken } = useAuth();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10; // Items per page

    const fetchData = useCallback(async (page = 1, refreshing = false) => {
        console.log(`[AdminInspections] Fetching inspections page ${page}...`);
        setError(null);
        if (page === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");

            const response = await axios.get<PaginatedResponse<AdminInspectionData>>(
                `${BASE_URL}/api/admin/all-inspections?page=${page}&limit=${limit}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const { data, currentPage: fetchedPage, totalPages: fetchedTotalPages } = response.data;

            setInspections(prev => (page === 1 || refreshing ? data : [...prev, ...data]));
            setCurrentPage(fetchedPage);
            setTotalPages(fetchedTotalPages);

        } catch (err: any) {
             console.error("[AdminInspections] Error fetching data:", err);
            let errorMessage = "Failed to fetch inspection data.";
            if (err.response) { errorMessage = err.response.data?.message || errorMessage; }
            setError(errorMessage);
        } finally {
            if (page === 1) setIsLoading(false);
            else setIsLoadingMore(false);
            if (refreshing) setIsRefreshing(false);
        }
    }, [getToken, limit]); // Added limit to dependencies

    useEffect(() => { fetchData(1); }, [fetchData]); // Fetch initial page

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        setCurrentPage(1); // Reset page on refresh
        setTotalPages(1);
        await fetchData(1, true); // Pass refreshing flag
        // setIsRefreshing(false); // Handled in fetchData finally block
    }, [fetchData]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && currentPage < totalPages) {
            console.log('[AdminInspections] Loading more inspections...');
            fetchData(currentPage + 1);
        }
    }, [isLoadingMore, currentPage, totalPages, fetchData]);

    const processedInspections = useMemo(() => {
        // Ensure inspections is an array before processing
        if (!Array.isArray(inspections)) {
            console.warn('[processedInspections] inspections state is not an array:', inspections);
            return []; // Return empty array if state is invalid
        }

        let filtered = [...inspections]; // Create a shallow copy to avoid sorting the original state directly
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(insp => // Filter the copy
                insp.userName?.toLowerCase().includes(lowerCaseQuery) ||
                insp.userEmail?.toLowerCase().includes(lowerCaseQuery) ||
                insp.description?.toLowerCase().includes(lowerCaseQuery) ||
                insp.ddid?.toLowerCase().includes(lowerCaseQuery)
            );
        }

        // Sort the filtered copy
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            // Handle potential invalid dates (though unlikely if data is good)
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return filtered;
    }, [inspections, searchQuery, sortBy]);

    const renderInspectionItem = ({ item, index }: { item: AdminInspectionData; index: number }) => (
        <View style={styles.cardContainer}>
            <View style={styles.cardContent}>
                 <View style={styles.cardHeaderInfo}> 
                     {/* User Info with Photo */}
                     <View style={styles.userInfoRow}> 
                        {item.userProfilePhoto ? (
                            <Image source={{ uri: item.userProfilePhoto }} style={styles.userImageSmall} />
                        ) : (
                             <View style={styles.userImagePlaceholderSmall}>
                                <UserCircle size={20} color={COLORS.secondary} />
                             </View>
                        )}
                        <View style={styles.userInfoTextContainer}> 
                            <Text style={styles.cardUserText} numberOfLines={1}>{item.userName || 'Unknown User'}</Text>
                            <Text style={styles.cardDetailText} numberOfLines={1}>
                                {item.userEmail} {item.userState ? `(${item.userState})` : ''}
                            </Text>
                        </View>
                     </View>
                    <Text style={styles.cardDateText}>{new Date(item.created_at).toLocaleString()}</Text>
                 </View>

                {/* Inspection Details Section */}
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
                        <Text style={styles.cardDescriptionText} numberOfLines={1}>{item.description}</Text>
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

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={COLORS.primary} />;
    };

    if (isLoading && !isRefreshing && !error) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
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
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userSearchQuery, setUserSearchQuery] = useState<string>('');
    const { getToken } = useAuth();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 15; // Maybe more users per page

    const fetchUsers = useCallback(async (page = 1, refreshing = false) => {
        console.log(`[AdminUsers] Fetching users page ${page}...`);
        setError(null);
        if (page === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");

            const response = await axios.get<PaginatedResponse<UserData>>(
                `${BASE_URL}/api/admin/all-users?page=${page}&limit=${limit}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const { data, currentPage: fetchedPage, totalPages: fetchedTotalPages } = response.data;

            setUsers(prev => (page === 1 || refreshing ? data : [...prev, ...data]));
            setCurrentPage(fetchedPage);
            setTotalPages(fetchedTotalPages);

        } catch (err: any) {
             console.error("[AdminUsers] Error fetching data:", err);
            let errorMessage = "Failed to fetch user data.";
            if (err.response) { errorMessage = err.response.data?.message || errorMessage; }
            setError(errorMessage);
        } finally {
             if (page === 1) setIsLoading(false);
             else setIsLoadingMore(false);
             if (refreshing) setIsRefreshing(false);
        }
    }, [getToken, limit]);

    useEffect(() => { fetchUsers(1); }, [fetchUsers]); // Fetch initial page

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        setCurrentPage(1); // Reset page on refresh
        setTotalPages(1);
        await fetchUsers(1, true);
        // setIsRefreshing(false); // Handled in fetchUsers finally block
    }, [fetchUsers]);

    const handleLoadMore = useCallback(() => {
        if (!isLoadingMore && currentPage < totalPages) {
            console.log('[AdminUsers] Loading more users...');
            fetchUsers(currentPage + 1);
        }
    }, [isLoadingMore, currentPage, totalPages, fetchUsers]);

    // Filter users based on search query
    const processedUsers = useMemo(() => {
        if (!userSearchQuery) {
            return users;
        }
        const lowerCaseQuery = userSearchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(lowerCaseQuery) ||
            user.email?.toLowerCase().includes(lowerCaseQuery)
        );
    }, [users, userSearchQuery]);

    const renderUserItem = ({ item }: { item: UserData }) => {
        return (
            <TouchableOpacity style={styles.userItemContainer} onPress={() => Alert.alert('User Profile', `User ID: ${item.id}`)}>
                <View style={styles.userItemContent}>
                     {/* User Image */}
                     <View style={styles.userListImageContainer}>
                        {item.profilePhoto ? (
                            <Image source={{ uri: item.profilePhoto }} style={styles.userListImage} />
                        ) : (
                             <View style={styles.userListImagePlaceholder}>
                                <UserCircle size={32} color={COLORS.secondary} />
                             </View>
                        )}
                    </View>
                    {/* User Info */}
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userNameText}>{item.name}</Text>
                        <Text style={styles.userEmailText}>{item.email}</Text>
                        <Text style={styles.userDetailText}>State: {item.state || 'N/A'}</Text>
                        <Text style={styles.userDetailText}>Statements: {item.inspectionCount}</Text> 
                    </View>
                     <Text style={styles.userDateText}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
                 </View>
             </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={COLORS.primary} />;
    };

    if (isLoading && !isRefreshing) return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;

    return (
        <View style={{flex: 1}}>
            {/* Search Input for Users */}
            <View style={styles.userSearchContainer}> 
                <Search size={18} color="#888" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                    placeholderTextColor="#999"
                />
            </View>

            <FlatList
                data={processedUsers}
                renderItem={renderUserItem}
                keyExtractor={(item: UserData) => item.id}
                style={styles.list}
                contentContainerStyle={{ padding: 15, paddingTop: 0 }}
                ListHeaderComponent={<Text style={styles.totalCountText}>Total Users: {processedUsers.length}</Text>}
                ListEmptyComponent={<Text style={styles.emptyText}>{userSearchQuery ? 'No matching users found.' : 'No users found.'}</Text>}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
            />
        </View>
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
                 <Tab.Screen name="Inspections" component={InspectionList} />
                 <Tab.Screen name="Users" component={UserList} />
                 <Tab.Screen name="Settings" component={AdminSettingsTab} />
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
        flexDirection: 'column', // Keep as column
    },
    cardContent: { // Contains everything now
        flex: 1,
        padding: 12, // Use slightly more padding
    },
    cardHeaderInfo: { 
        marginBottom: 10, 
        paddingBottom: 8,
    },
    userInfoRow: { // New style for horizontal layout of image and text
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4, // Space below user info row before date
    },
    userImageSmall: {
        width: 30, // Smaller image for inspection card header
        height: 30,
        borderRadius: 15,
        marginRight: 8,
    },
    userImagePlaceholderSmall: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    userInfoTextContainer: { // Container for Name/Email/State text
        flex: 1, // Allow text to take available space
    },
    cardUserText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.darkText,
        // Remove margin bottom as spacing is handled by userInfoTextContainer
    },
    cardDetailText: { // For email & state
        fontSize: 12,
        color: '#555',
        // Remove margin bottom
    },
    cardDateText: {
        fontSize: 10,
        color: '#777',
        marginTop: 0, // Reset margin top
        textAlign: 'right', // Align date to the right below user info
    },
    inspectionDetailsContainer: {
        flexDirection: 'row',
        marginTop: 0, // Remove margin top, handled by header spacing
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
    cardDescriptionLabel: { 
        fontSize: 11, // Make labels smaller
        fontWeight: '600', // Bolder labels
        color: '#666', // Darker gray label
        marginBottom: 2, // Less space below label
        marginTop: 5, // Add space above labels (except first)
    },
    cardDescriptionText: { 
        fontSize: 13,
        color: '#444',
        lineHeight: 18,
        marginBottom: 5, // Space below text block
    },
    placeholderText: {
        fontSize: 12,
        color: '#aaa',
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
        marginRight: 10,
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
    userDetailText: { // Style for State and Inspection Count
        fontSize: 13,
        color: '#777',
        marginTop: 2, // Add small space between detail lines
    },
    userDateText: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginLeft: 0, 
    },
    userSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginHorizontal: 15,
        marginTop: 15, // Add space above search
        marginBottom: 15, // Add space below search
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
});

export default AdminDashboardScreen; 