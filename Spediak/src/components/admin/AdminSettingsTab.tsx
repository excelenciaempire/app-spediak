import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Image, Platform, TextInput
} from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { COLORS } from '../../styles/colors';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Upload, Save } from 'lucide-react-native'; // Added icons
import axios from 'axios'; // Added axios
import { BASE_URL } from '../../config/api'; // Added BASE_URL

// Interface for UI settings (optional but good practice)
interface UISettings {
    primaryColor?: string;
    generateButtonText?: string;
    // Add other customizable fields here
}

const AdminSettingsTab: React.FC = () => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth(); // Get getToken function
    const [isAdmin, setIsAdmin] = useState(false);
    // Logo State
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [logoImageUri, setLogoImageUri] = useState<string | null>(null); // Local URI for preview
    const [logoImageBase64, setLogoImageBase64] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);

    // UI Customization State
    const [uiSettings, setUiSettings] = useState<UISettings>({});
    const [primaryColorInput, setPrimaryColorInput] = useState('');
    const [generateButtonTextInput, setGenerateButtonTextInput] = useState('');
    const [isSavingUISettings, setIsSavingUISettings] = useState(false);
    const [uiSettingsError, setUiSettingsError] = useState<string | null>(null);

    // Fetch current settings and check admin role
    useEffect(() => {
        if (isLoaded && user) {
            const role = user.unsafeMetadata?.role;
            setIsAdmin(role === 'admin');

            // Fetch current logo URL from metadata
            const metaLogoUrl = user.unsafeMetadata?.logoUrl as string | undefined;
            if (metaLogoUrl) {
                setCurrentLogoUrl(metaLogoUrl);
            }

            // Fetch current UI settings from metadata
            const metaSettings = user.unsafeMetadata?.uiSettings as UISettings | undefined;
            if (metaSettings) {
                setUiSettings(metaSettings);
                // Initialize input fields with fetched values
                setPrimaryColorInput(metaSettings.primaryColor || '');
                setGenerateButtonTextInput(metaSettings.generateButtonText || '');
            }
        }
    }, [isLoaded, user]);

    // --- Image Picker Logic --- START ---
    const pickLogoImage = async () => {
        setLogoError(null);
        // On web, use library directly
        if (Platform.OS === 'web') {
            try {
                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true, // Optional: Allow editing
                    aspect: [4, 3], // Optional: Define aspect ratio
                    quality: 0.8,
                    base64: true,
                });
                handleImageResult(result);
            } catch (error) {
                handleImageError(error);
            }
        } else {
            // Native: Request permissions
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libraryPermission.status !== 'granted') {
                Alert.alert('Permission required', 'Media Library permission is needed to select an image.');
                return;
            }
            try {
                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3], // Keep consistent aspect ratio if needed
                    quality: 0.8,
                    base64: true,
                });
                handleImageResult(result);
            } catch (error) {
                handleImageError(error);
            }
        }
    };

    const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setLogoImageUri(asset.uri);
            setLogoImageBase64(asset.base64 ?? null);
        } else {
            console.log('Logo selection cancelled or failed');
        }
    };

    const handleImageError = (error: any) => {
        console.error("ImagePicker Error: ", error);
        setLogoError('Failed to pick image. Please try again.');
        Alert.alert('Error', 'Could not load the image.');
    };
    // --- Image Picker Logic --- END ---

    const handleSaveLogo = async () => {
        if (!logoImageBase64) {
            Alert.alert('No Image', 'Please select a logo image first.');
            return;
        }
        if (!user) {
             Alert.alert('Error', 'User data not available.');
             return;
        }
        setIsUploadingLogo(true);
        setLogoError(null);
        console.log('[AdminSettings] Starting logo save process...');

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");

            // --- Backend Call --- 
            console.log(`[AdminSettings] Calling POST ${BASE_URL}/api/admin/upload-logo`);
            const response = await axios.post(`${BASE_URL}/api/admin/upload-logo`, {
                imageBase64: logoImageBase64,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.data || !response.data.imageUrl) {
                throw new Error("Invalid response from logo upload endpoint.");
            }

            const cloudinaryUrl = response.data.imageUrl;
            console.log(`[AdminSettings] Logo uploaded to Cloudinary: ${cloudinaryUrl}`);

            // --- Clerk Update --- 
            console.log('[AdminSettings] Updating user metadata with new logo URL...');
            await user.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    logoUrl: cloudinaryUrl
                }
            });

            console.log('[AdminSettings] Logo URL updated in Clerk metadata.');
            setCurrentLogoUrl(cloudinaryUrl); // Update displayed logo
            setLogoImageUri(null); // Clear local preview
            setLogoImageBase64(null);
            Alert.alert('Success', 'Logo updated successfully!');

        } catch (err: any) {
            console.error("[AdminSettings] Error saving logo:", err);
            const message = err.response?.data?.message || err.errors?.[0]?.message || err.message || 'Failed to save logo.';
            setLogoError(`Save Failed: ${message}`);
            Alert.alert('Error', `Could not save the logo: ${message}`);
        } finally {
            setIsUploadingLogo(false);
            console.log('[AdminSettings] Logo save process finished.');
        }
    };

    const handleSaveUISettings = async () => {
        setIsSavingUISettings(true);
        setUiSettingsError(null);
        console.log('[AdminSettings] Saving UI settings...');

        const newSettings: UISettings = {
            // Use input state values, fallback to original if input is empty (or handle validation)
            primaryColor: primaryColorInput || uiSettings.primaryColor,
            generateButtonText: generateButtonTextInput || uiSettings.generateButtonText,
            // Add other settings here
        };

        try {
            if (!user) throw new Error("User not found");

            await user.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    uiSettings: newSettings
                }
            });

            setUiSettings(newSettings); // Update local state
            Alert.alert('Success', 'UI Settings updated successfully!');

        } catch (err: any) {
            console.error("[AdminSettings] Error saving UI settings:", err);
            const message = err.errors ? err.errors[0].message : (err.message || 'Failed to save UI settings.');
            setUiSettingsError(`Save Failed: ${message}`);
            Alert.alert('Error', `Could not save UI settings: ${message}`);
        } finally {
            setIsSavingUISettings(false);
        }
    };

    if (!isLoaded) {
        return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />;
    }

    if (!isAdmin) {
        return (
            <View style={styles.containerCentered}>
                <Text style={styles.errorText}>Access Denied. Admin privileges required.</Text>
            </View>
        );
    }

    // Admin Controls UI
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Admin Settings</Text>

            {/* --- Logo Upload Section --- */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Company Logo</Text>

                <View style={styles.logoPreviewContainer}>
                    <Text style={styles.subtleLabel}>Current Logo:</Text>
                    {currentLogoUrl ? (
                        <Image source={{ uri: currentLogoUrl }} style={styles.logoPreview} resizeMode="contain" />
                    ) : (
                        <Text style={styles.placeholderSmall}>No logo set</Text>
                    )}
                </View>

                <TouchableOpacity style={styles.imagePickerButton} onPress={pickLogoImage}>
                    {logoImageUri ? (
                        <Image source={{ uri: logoImageUri }} style={styles.logoPickerPreview} resizeMode="contain" />
                    ) : (
                        <View style={styles.imagePickerPlaceholder}>
                            <ImagePlus size={30} color="#6c757d" />
                            <Text style={styles.imagePickerText}>Select New Logo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {logoImageUri && (
                    <TouchableOpacity
                        style={[styles.button, styles.saveButton, isUploadingLogo && styles.buttonDisabled]}
                        onPress={handleSaveLogo}
                        disabled={isUploadingLogo}
                    >
                        {isUploadingLogo ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Upload size={18} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Save New Logo</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
                {logoError && <Text style={styles.errorTextSmall}>{logoError}</Text>}
            </View>

            {/* --- UI Customization Section --- */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>UI Customization</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Primary Color (Hex)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., #0D47A1"
                        value={primaryColorInput}
                        onChangeText={setPrimaryColorInput}
                        autoCapitalize="none"
                    />
                    {/* TODO: Add color validation or picker */}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>"Generate Statement" Button Text</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Generate"
                        value={generateButtonTextInput}
                        onChangeText={setGenerateButtonTextInput}
                    />
                </View>

                {/* Add more input groups for other settings here */}

                <TouchableOpacity
                    style={[styles.button, styles.saveButton, isSavingUISettings && styles.buttonDisabled]}
                    onPress={handleSaveUISettings}
                    disabled={isSavingUISettings}
                >
                    {isSavingUISettings ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={18} color="#fff" style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Save UI Settings</Text>
                        </>
                    )}
                </TouchableOpacity>
                {uiSettingsError && <Text style={styles.errorTextSmall}>{uiSettingsError}</Text>}
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    contentContainer: {
        padding: 20,
    },
    containerCentered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loader: {
        marginTop: 50,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 20,
    },
    sectionContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.darkText,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
    },
    placeholderSmall: {
        fontSize: 13,
        color: '#aaa',
        fontStyle: 'italic',
    },
    logoPreviewContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    subtleLabel: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 5,
    },
    logoPreview: {
        width: 150,
        height: 80,
        borderRadius: 4,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#eee',
    },
    imagePickerButton: {
        width: '100%',
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        marginBottom: 15,
    },
    logoPickerPreview: {
        width: '95%',
        height: '95%',
        borderRadius: 6,
    },
    imagePickerPlaceholder: {
        alignItems: 'center',
    },
    imagePickerText: {
        marginTop: 8,
        color: '#6c757d',
        fontSize: 14,
    },
    button: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    buttonDisabled: {
        backgroundColor: '#adb5bd',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 8,
    },
    errorTextSmall: {
        color: 'red',
        fontSize: 13,
        marginTop: 10,
        textAlign: 'center',
    },
    placeholder: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        paddingVertical: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: COLORS.darkText,
    },
});

export default AdminSettingsTab; 