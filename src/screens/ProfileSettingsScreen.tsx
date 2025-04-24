import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Button, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Pencil, X, Camera, LogOut } from 'lucide-react-native';

// Define the states available for selection
const availableStates = [
    { label: 'North Carolina', value: 'NC' },
    { label: 'South Carolina', value: 'SC' },
    // Add other states as needed
];

export default function ProfileSettingsScreen() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useAuth();
    const [isEditing, setIsEditing] = useState<boolean>(false); // Step 44

    // State for editable fields
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null); // For local display during edit
    const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null); // For upload

    const [isLoading, setIsLoading] = useState<boolean>(false); // For save/logout operations
    const [error, setError] = useState<string | null>(null);

    // Initialize form fields when user data loads or edit mode starts
    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');

            // Be very explicit for the type checker
            let stateToSet: string | null = null;
            const inspectionStateFromMeta = user.unsafeMetadata?.inspectionState;
            if (typeof inspectionStateFromMeta === 'string') {
                stateToSet = inspectionStateFromMeta;
            } else {
                stateToSet = availableStates[0].value; // Default if null, undefined, or not a string
            }
            setSelectedState(stateToSet);

            setProfileImageUri(user.imageUrl || null); // Use Clerk's image URL initially
            setProfileImageBase64(null); // Clear base64 on initial load/mode switch
        }
    }, [user, isEditing]); // Rerun when user loads OR when switching to edit mode

    // Step 48: Profile Picture Update Logic
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Sorry, we need camera roll permissions to change your profile picture.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square aspect ratio for profile pics
            quality: 0.7,
            base64: true, // Needed for Clerk upload potentially
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setProfileImageUri(asset.uri); // Show selected image locally
            // Explicitly check if base64 exists before setting state
            setProfileImageBase64(asset.base64 ?? null);
        }
    };

    // Step 51 & 48, 49, 50: Save Changes Logic
    const handleSaveChanges = async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);

        try {
            const updates: any = {};
            let needsUpdate = false;

            // Check Name Change (Step 49)
            if (firstName !== user.firstName || lastName !== user.lastName) {
                updates.firstName = firstName;
                updates.lastName = lastName;
                needsUpdate = true;
            }

            // Check State Change (Step 50)
            if (selectedState !== user.unsafeMetadata?.inspectionState) {
                updates.unsafeMetadata = { ...user.unsafeMetadata, inspectionState: selectedState };
                 needsUpdate = true;
            }

            // Handle Profile Image Update (Step 48) - Needs base64 or blob
            if (profileImageBase64) {
                 // Clerk's setProfileImage expects a File object (Web) or specific format (Native)
                // Creating a Blob/File might be complex in RN. Let's log for now.
                // A backend endpoint might be needed to handle base64 upload and then update Clerk via backend SDK.
                 console.log("Profile image selected (base64 length):", profileImageBase64.length);
                 Alert.alert("Image Update", "Updating profile image via direct base64 upload from client is complex. This feature requires further implementation, possibly via a backend.");
                 // Placeholder: await user.setProfileImage({ file: /* Need to create File/Blob */ });
                 // needsUpdate = true; // Uncomment if image update is implemented
            }


            if (needsUpdate) {
                 console.log("Updating user profile with:", updates);
                 await user.update(updates);
                 Alert.alert("Success", "Profile updated successfully!");
            } else {
                console.log("No changes detected to save.");
            }

            setIsEditing(false); // Exit edit mode on successful save or no changes

        } catch (err: any) {
            console.error("Error saving profile:", err);
            setError(`Failed to save profile: ${err.message || 'Unknown error'}`);
            Alert.alert("Error", `Failed to save profile: ${err.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 52: Log Out Logic
    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await signOut();
            // Navigation should automatically handle redirecting to login screen via RootLayout/ClerkProvider
        } catch (err: any) {
            console.error("Error signing out: ", err);
            Alert.alert("Logout Error", err.errors?.[0]?.message || "An unexpected error occurred during logout.");
            setIsLoading(false); // Only stop loading if sign out failed
        }
        // No finally block, as successful signout unmounts the component
    };


    if (!isLoaded) {
        return <View style={styles.container}><ActivityIndicator size="large" color="#007bff" /></View>;
    }

    if (!isSignedIn || !user) {
        // This shouldn't happen if navigation is set up correctly, but good practice
        return <View style={styles.container}><Text>Please sign in.</Text></View>;
    }

    return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
                {/* Step 47: Edit/Close Icons */}
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
                    {isEditing ? <X size={24} color="#333" /> : <Pencil size={24} color="#333" />}
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Step 45 & 46: Conditional Rendering */}
            {isEditing ? (
                // --- Edit Mode UI (Step 46) ---
                <View style={styles.content}>
                    <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                        <Image
                            source={{ uri: profileImageUri || 'https://via.placeholder.com/150' }}
                            style={styles.profileImage}
                        />
                        <View style={styles.cameraOverlay}>
                            <Camera size={24} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                    />

                    {/* State Picker (Step 50) */}
                    <Text style={styles.label}>Inspection State:</Text>
                     <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedState}
                            onValueChange={(itemValue) => setSelectedState(itemValue)}
                            style={styles.picker}
                            itemStyle={styles.pickerItem} // iOS specific styling
                        >
                            {availableStates.map(state => (
                                <Picker.Item key={state.value} label={state.label} value={state.value} />
                            ))}
                        </Picker>
                     </View>

                    <TouchableOpacity
                         style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
                         onPress={handleSaveChanges}
                         disabled={isLoading} >
                         {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
                     </TouchableOpacity>

                </View>
            ) : (
                // --- View Mode UI (Step 45) ---
                <View style={styles.content}>
                    <View style={styles.profileImageContainer}>
                         <Image
                            source={{ uri: user.imageUrl || 'https://via.placeholder.com/150' }}
                            style={styles.profileImage}
                        />
                    </View>

                    <Text style={styles.nameText}>{user.fullName || 'User Name'}</Text>
                    <Text style={styles.emailText}>{user.primaryEmailAddress?.emailAddress || 'No email'}</Text>
                    <Text style={styles.infoText}>
                        Default State: {availableStates.find(s => s.value === user.unsafeMetadata?.inspectionState)?.label || 'Not Set'}
                    </Text>

                     {/* Step 52: Log Out Button */}
                     <TouchableOpacity
                         style={[styles.button, styles.logoutButton, isLoading && styles.buttonDisabled]}
                         onPress={handleLogout}
                         disabled={isLoading} >
                         {isLoading ? <ActivityIndicator color="#dc3545" /> :
                             <>
                                <LogOut size={18} color="#dc3545" style={styles.buttonIcon} />
                                <Text style={styles.logoutButtonText}>Log Out</Text>
                             </>
                         }
                     </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

// Styles (Combined for View & Edit)
const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        padding: 20,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginTop: Platform.OS === 'android' ? 10 : 0, // Adjust for status bar
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    iconButton: {
        padding: 8,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    profileImageContainer: {
        marginBottom: 20,
        position: 'relative', // For camera overlay positioning
    },
    profileImage: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 3,
        borderColor: '#007bff',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 8,
        borderRadius: 20,
    },
    nameText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    emailText: {
        fontSize: 16,
        color: '#6c757d',
        marginBottom: 15,
    },
    infoText: {
        fontSize: 16,
        color: '#495057',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        height: 50,
        borderColor: '#ced4da',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        backgroundColor: '#ffffff',
        fontSize: 16,
    },
    label: {
        fontSize: 16,
        color: '#495057',
        alignSelf: 'flex-start',
        marginBottom: 5,
        marginLeft: 5, // Align with input padding
    },
    pickerContainer: {
        width: '100%',
        height: 50,
        borderColor: '#ced4da',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center', // Center picker text vertically
    },
    picker: {
        width: '100%',
        height: '100%', // Needs height for Android?
         color: '#333', // Ensure text color is visible
         // Note: Picker styling is limited, especially cross-platform.
    },
     pickerItem: {
        // iOS only: affects the items in the dropdown wheel
        // height: 120, // Example
        // fontSize: 18, // Example
     },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        width: '80%',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    saveButton: {
        backgroundColor: '#28a745', // Green for save
    },
    logoutButton: {
         marginTop: 40,
         backgroundColor: 'transparent', // Transparent background
         borderWidth: 1,
         borderColor: '#dc3545', // Red border
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButtonText: {
        color: '#dc3545', // Red text
        fontSize: 16,
        fontWeight: 'bold',
    },
     buttonIcon: {
        marginRight: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    errorText: {
        color: 'red',
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
    },
}); 