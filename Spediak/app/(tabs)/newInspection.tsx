import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, Image, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Dimensions, Modal, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useUser } from "@clerk/clerk-expo";
import axios from 'axios';
import { ImagePlus, Send, BotMessageSquare, RefreshCcw, Mic, MicOff } from 'lucide-react-native';
import DdidModal from '../../src/components/DdidModal';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { BASE_URL } from '../../src/config/api'; // Import centralized BASE_URL
import { COLORS } from '../../src/styles/colors'; // Corrected import path

// --- Define Base URL (Platform Specific) ---
// const YOUR_COMPUTER_IP_ADDRESS = '<YOUR-COMPUTER-IP-ADDRESS>'; // Removed
// const YOUR_BACKEND_PORT = '<PORT>'; // Removed
// const API_BASE_URL = Platform.select({...}); // Removed Old Logic

// const BASE_URL = Platform.select({...}); // <<< REMOVE THIS BLOCK >>>
// --- End Base URL Definition ---

const { width } = Dimensions.get('window'); // Get screen width
// const imageSize = width * 0.9; // Keep this if still needed for native

// Revert to standard function declaration
export default function NewInspectionScreen() {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [description, setDescription] = useState<string>('');
    const [generatedDdid, setGeneratedDdid] = useState<string | null>(null);
    const [showDdidModal, setShowDdidModal] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [showAnalyzingPopup, setShowAnalyzingPopup] = useState<boolean>(false);
    const { getToken } = useAuth();
    const { user } = useUser();
    const [userState, setUserState] = useState<string>('NC'); // Default to NC
    const [isUploading, setIsUploading] = useState<boolean>(false); // Add upload loading state

    // --- Fetch user state from Clerk metadata ---
    useEffect(() => {
        if (user?.unsafeMetadata?.inspectionState) {
            setUserState(user.unsafeMetadata.inspectionState as string);
        }
    }, [user]);
    // --- End user state fetching ---

    const pickImage = async () => {
        if (Platform.OS === 'web') {
            // Web: Directly launch library, skip permissions and camera option
            try {
                let result = await ImagePicker.launchImageLibraryAsync({
                   mediaTypes: ImagePicker.MediaTypeOptions.Images,
                   allowsEditing: true,
                   aspect: [1, 1],
                   quality: 0.8,
                   base64: true,
               });
               handleImageResult(result);
           } catch (error) {
               handleImageError(error);
           }
        } else {
            // Native: Request permissions and show options alert
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
                Alert.alert('Permission required', 'Camera and Media Library permissions are needed to select an image.');
                return;
            }

            Alert.alert(
                "Select Image Source",
                "Choose where to get the image from:",
                [
                    {
                        text: "Take Photo",
                        onPress: async () => {
                            try {
                                let result = await ImagePicker.launchCameraAsync({
                                    allowsEditing: true,
                                    aspect: [1, 1],
                                    quality: 0.8,
                                    base64: true,
                                });
                                handleImageResult(result);
                            } catch (error) {
                                handleImageError(error);
                            }
                        }
                    },
                    {
                        text: "Choose from Library",
                        onPress: async () => {
                            try {
                                 let result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                    allowsEditing: true,
                                    aspect: [1, 1],
                                    quality: 0.8,
                                    base64: true,
                                });
                                handleImageResult(result);
                            } catch (error) {
                                handleImageError(error);
                            }
                        }
                    },
                    {
                        text: "Cancel",
                        style: "cancel"
                    }
                ]
            );
        }
    };

    // Helper function to handle result from either picker
    const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
         if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setImageUri(asset.uri);
            setImageBase64(asset.base64 ?? null);
            setGeneratedDdid(null); // Clear previous DDID
            setError(null); // Clear previous error
        } else {
            console.log('Image selection cancelled or failed');
        }
    };

     // Helper function to handle errors from either picker
    const handleImageError = (error: any) => {
        console.error("ImagePicker Error: ", error);
        setError('Failed to pick image. Please try again.');
        Alert.alert('Error', 'Could not load the image.');
    };

    // --- NEW: Function to upload image to backend (which uploads to Cloudinary) ---
    const uploadImageToCloudinary = async (base64Data: string): Promise<string | null> => {
        console.log("[uploadImageToCloudinary] Starting upload...");
        setIsUploading(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");

            console.log(`[uploadImageToCloudinary] Calling POST ${BASE_URL}/api/upload-image`);
            const response = await axios.post(`${BASE_URL}/api/upload-image`, {
                imageBase64: base64Data, // Send the base64 data
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data && response.data.imageUrl) {
                console.log("[uploadImageToCloudinary] Upload successful, URL:", response.data.imageUrl);
                return response.data.imageUrl; // Return the Cloudinary URL
            } else {
                throw new Error("Invalid response from image upload endpoint.");
            }
        } catch (err: any) {
            console.error("[uploadImageToCloudinary] Error:", err);
            const errorMessage = err.response?.data?.message || err.message || "Failed to upload image";
            setError(`Image Upload Failed: ${errorMessage}`);
            Alert.alert("Image Upload Failed", `Could not upload the image to storage: ${errorMessage}`);
            return null; // Indicate failure
        } finally {
            setIsUploading(false);
            console.log("[uploadImageToCloudinary] Upload process finished.");
        }
    };
    // --- END NEW FUNCTION ---

    // Modify saveInspection to accept Cloudinary URL
    const saveInspection = async (ddid: string, cloudinaryImageUrl: string | null) => {
        console.log("[saveInspection] Attempting to save inspection with Cloudinary URL:", cloudinaryImageUrl);
        try {
            const token = await getToken();
            if (!token) throw new Error("User not authenticated");

            const payload = {
                description,
                ddid,
                imageUrl: cloudinaryImageUrl, // Use the Cloudinary URL here
                userState
            };
            console.log(`[saveInspection] Preparing to POST to ${BASE_URL}/api/inspections with payload:`, JSON.stringify(payload));

            // Removed the imageUri check here as we now use cloudinaryImageUrl

            await axios.post(`${BASE_URL}/api/inspections`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("[saveInspection] Inspection saved successfully via API.");

        } catch (err: any) {
            // Ensure error logging is robust
            console.error("[saveInspection] Error caught during save attempt:", err);
            if (err.response) {
                 console.error("[saveInspection] Error response data:", err.response.data);
                 console.error("[saveInspection] Error response status:", err.response.status);
            }
            const errorMessage = err.response?.data?.message || err.message || "Could not save the inspection.";
            Alert.alert("Save Failed", `Error: ${errorMessage}`); // Show detailed error
        }
    };

    const handleGenerateDdid = async () => {
        console.log("[handleGenerateDdid] Function called");
        if (!imageBase64 || !description) {
            Alert.alert("Missing Information", "Please upload an image and provide a description.");
            return;
        }
        // Keep isGenerating for the whole process (upload + DDID + save)
        setIsGenerating(true);
        setShowAnalyzingPopup(true);
        setError(null);
        setGeneratedDdid(null);
        let cloudinaryUrl: string | null = null; // Variable to hold the result

        try {
            // --- Step 1: Upload Image ---
            cloudinaryUrl = await uploadImageToCloudinary(imageBase64);
            if (!cloudinaryUrl) {
                // Error handling is done within uploadImageToCloudinary, just exit
                setShowAnalyzingPopup(false); // Hide popup if upload fails
                setIsGenerating(false);
                return;
            }

            // --- Step 2: Generate DDID --- (Now uses original description)
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");
            console.log(`[handleGenerateDdid] Calling POST ${BASE_URL}/api/generate-ddid`);
            const ddidResponse = await axios.post(`${BASE_URL}/api/generate-ddid`, {
                // Send the *original* base64 for analysis, not the Cloudinary URL
                imageBase64,
                description,
                userState,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("[handleGenerateDdid] DDID API call successful, status:", ddidResponse.status);

            if (ddidResponse.data && ddidResponse.data.ddid) {
                const receivedDdid = ddidResponse.data.ddid;
                console.log("[handleGenerateDdid] Valid DDID received:", receivedDdid);
                setShowAnalyzingPopup(false);
                setGeneratedDdid(receivedDdid);
                setShowDdidModal(true);

                // --- Step 3: Save Inspection (using Cloudinary URL) ---
                console.log("[handleGenerateDdid] Attempting to call saveInspection with Cloudinary URL...");
                await saveInspection(receivedDdid, cloudinaryUrl);
                    console.log("[handleGenerateDdid] saveInspection call completed.");

            } else {
                setShowAnalyzingPopup(false);
                throw new Error("Invalid response structure from DDID server.");
            }

        } catch (err: any) {
            // Ensure error logging is robust
            console.error("[handleGenerateDdid] Error caught:", err);
            if (err.response) {
                console.error("[handleGenerateDdid] Error response data:", err.response.data);
                console.error("[handleGenerateDdid] Error response status:", err.response.status);
            }
            const errorMessage = err.response?.data?.message || err.message || "Failed to generate DDID or save inspection";
            setError(errorMessage);
            Alert.alert("Operation Failed", `An error occurred: ${errorMessage}`);
            setShowAnalyzingPopup(false); // Ensure popup hides on error
        } finally {
            console.log("[handleGenerateDdid] Setting isGenerating = false in finally block");
            setIsGenerating(false);
            // Ensure analyzing pop-up is hidden just in case
            setShowAnalyzingPopup(false);
        }
    };

    async function startRecording() {
        try {
            console.log('Requesting permissions..');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                // interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                playsInSilentModeIOS: true,
                // interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                // shouldDuckAndroid: true,
                // staysActiveInBackground: true,
                // playThroughEarpieceAndroid: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
               Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Recording Error", "Could not start recording.");
            // Reset states if recording fails to start
            setIsRecording(false);
            setRecording(null);
        }
    }

    async function stopRecording() {
        if (!recording) {
            console.warn('stopRecording called but no recording object exists.');
            return;
        }

        console.log('Stopping recording..');
        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        // await Audio.setAudioModeAsync({
        //     allowsRecordingIOS: false, // Set back to default if needed
        // });
        const uri = recording.getURI();
        setRecording(null); // Clear recording object
        console.log('Recording stopped and stored at', uri);

        if (uri) {
            transcribeAudio(uri);
        }
    }

    async function transcribeAudio(audioUri: string) {
        setIsTranscribing(true);
        setError(null); // Clear previous errors
        console.log('Attempting to transcribe audio:', audioUri);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");

            let audioBase64: string | null = null;

            if (Platform.OS === 'web') {
                // Web: Fetch the blob URI and convert to base64
                console.log("Transcribing audio on web, fetching blob data...");
                try {
                    const response = await fetch(audioUri);
                    const blob = await response.blob();
                    audioBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    // Remove the "data:*/*;base64," prefix
                    if (audioBase64) {
                        audioBase64 = audioBase64.split(',')[1];
                    }
                } catch (fetchError) {
                    console.error("Failed to fetch or convert blob:", fetchError);
                    throw new Error("Could not process audio data for web.");
                }

            } else {
                 // Native: Use FileSystem API
                 console.log("Transcribing audio on native, reading file...");
                 audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }

            if (!audioBase64) {
                 throw new Error("Failed to get Base64 audio data.");
            }

            console.log('Sending audio to backend for transcription...');
            // Replace with your actual backend endpoint if different
            const response = await axios.post(`${BASE_URL}/api/transcribe`, {
                audioBase64: audioBase64,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data && response.data.transcript) {
                console.log('Transcription received:', response.data.transcript);
                // Append transcript to existing description or replace?
                // Let's append for now, user can edit.
                setDescription(prev => prev ? `${prev} ${response.data.transcript}` : response.data.transcript);
            } else {
                throw new Error("Invalid response structure from transcription server.");
            }

        } catch (err: any) {
            console.error('Transcription failed:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to transcribe audio';
            setError(errorMessage);
            Alert.alert("Transcription Failed", errorMessage);
        } finally {
            setIsTranscribing(false);
        }
    }

    const resetInspection = () => {
        setImageUri(null);
        setImageBase64(null);
        setDescription('');
        setGeneratedDdid(null);
        setError(null);
        setShowDdidModal(false);
        setIsGenerating(false);
        if (recording) {
             recording.stopAndUnloadAsync().catch(e => console.error("Error stopping recording on reset:", e));
        }
        setRecording(null);
        setIsRecording(false);
        setIsTranscribing(false);
        console.log("Inspection reset");
    };

    useEffect(() => {
        return () => {
            if (recording) {
                console.log('Unmounting - checking if recording needs to be stopped');

                try {
                    if (recording.getStatusAsync) {
                        recording.getStatusAsync().then(status => {
                            if (status.isRecording || !status.isDoneRecording) {
                                console.log('Recording still active, stopping now...');
                                recording.stopAndUnloadAsync()
                                    .then(() => console.log("Recording stopped safely on unmount"))
                                    .catch(e => console.error("Error stopping recording on unmount:", e));
                            } else {
                                console.log("Recording already stopped or unloaded.");
                            }
                        });
                    }
                } catch (err) {
                    console.warn("Safe cleanup failed or recording was already unloaded:", err);
                }
            }
        };
    }, [recording]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
        >
            <KeyboardAvoidingView
                style={{ width: '100%' }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                enabled
            >
                <Text style={styles.userStateText}>State: {userState}</Text>

                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <ImagePlus size={50} color="#6c757d" />
                            <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Describe the image and provide details..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        editable={!isRecording && !isTranscribing}
                    />
                    <TouchableOpacity
                        style={styles.micButton}
                        onPress={isRecording ? stopRecording : startRecording}
                        disabled={isTranscribing}
                        >
                        {isRecording ? (
                             <MicOff size={24} color="#dc3545" />
                        ) : isTranscribing ? (
                             <ActivityIndicator size="small" color="#007bff" />
                        ) : (
                             <Mic size={24} color="#007bff" />
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, styles.generateButton, (!imageUri || !description || isGenerating || isUploading) && styles.buttonDisabled]}
                    onPress={handleGenerateDdid}
                    disabled={!imageUri || !description || isGenerating || isUploading}
                >
                    <Text style={styles.buttonText}>
                         {isUploading ? 'Uploading...' : isGenerating ? 'Analyzing...' : 'Generate Statement'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.newChatButton]}
                    onPress={resetInspection}
                >
                    <RefreshCcw size={20} color={COLORS.darkText} style={styles.buttonIcon} />
                    <Text style={styles.buttonTextSecondary}>New Defect</Text>
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}
            </KeyboardAvoidingView>
            <DdidModal
                visible={showDdidModal}
                onClose={() => setShowDdidModal(false)}
                ddidText={generatedDdid || ''}
             />
            <Modal
                transparent={true}
                animationType="fade"
                visible={showAnalyzingPopup}
                onRequestClose={() => {}}
            >
                <View style={styles.popupOverlay}>
                    <View style={styles.popupContainer}>
                        <ActivityIndicator size="large" color="#007bff" />
                        <Text style={styles.popupText}>Analyzing...</Text>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: Platform.OS === 'web' ? width * 0.15 : 20,
        paddingVertical: 20,
    },
    contentContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    userStateText: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 15,
        textAlign: 'center',
    },
    imagePicker: {
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ced4da',
        overflow: 'hidden',
        alignSelf: 'center',
        ...Platform.select({
            web: {
                width: '100%',
                maxWidth: 500,
                aspectRatio: 1,
            },
            default: {
                width: width * 0.9,
                height: width * 0.9,
            },
        }),
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        marginTop: 10,
        color: '#6c757d',
        fontSize: 16,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        alignItems: 'flex-start',
        marginBottom: 20,
        position: 'relative',
    },
    input: {
        flex: 1,
        height: 100,
        borderColor: '#ced4da',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
        paddingLeft: 15,
        paddingRight: 50,
        textAlignVertical: 'top',
        backgroundColor: '#ffffff',
        fontSize: 16,
    },
    micButton: {
        position: 'absolute',
        right: 8,
        top: 12,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        width: 40,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 10,
        maxWidth: 500,
        alignSelf: 'center',
        width: Platform.OS === 'web' ? '100%' : '80%',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    generateButton: {
        backgroundColor: COLORS.primary,
    },
    newChatButton: {
        backgroundColor: '#e9ecef',
        borderWidth: 1,
        borderColor: '#ced4da',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: COLORS.darkText,
        fontSize: 17,
        fontWeight: '600',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonDisabled: {
        backgroundColor: '#6c757d',
        opacity: 0.7,
    },
    errorText: {
        color: 'red',
        marginTop: 10,
        textAlign: 'center',
        width: '90%',
        alignSelf: 'center',
    },
    popupOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    popupContainer: {
        backgroundColor: 'white',
        paddingVertical: 30,
        paddingHorizontal: 40,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    popupText: {
        marginTop: 15,
        fontSize: 16,
        color: '#333',
    },
}); 