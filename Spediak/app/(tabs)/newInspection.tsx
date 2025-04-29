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

    // Helper function to handle result from either picker or drag/drop
    const handleImageResult = (result: ImagePicker.ImagePickerResult | { assets: { uri: string; base64?: string }[] }) => {
         if (!('canceled' in result && result.canceled) && result.assets && result.assets.length > 0) {
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
        console.log('[Audio] Requesting permissions...');
        try {
            const permissionResponse = await Audio.requestPermissionsAsync();
            if (!permissionResponse.granted) {
                console.error('[Audio] Microphone permission not granted.');
                Alert.alert("Permission Required", "Microphone access is needed to record audio descriptions.");
                return; // Exit if permission denied
            }
            console.log('[Audio] Permissions granted.');

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                // interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Consider defaults unless issues arise
                // interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            });
            console.log('[Audio] Audio mode set.');

            console.log('[Audio] Starting recording instance creation...');
            const { recording } = await Audio.Recording.createAsync(
               Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('[Audio] Recording started successfully.');
        } catch (err) {
            console.error('[Audio] Failed to start recording', err);
            const message = err instanceof Error ? err.message : String(err);
            Alert.alert("Recording Error", `Could not start recording. Please ensure your microphone is connected and permissions are granted. Error: ${message}`);
            setIsRecording(false);
            setRecording(null);
        }
    }

    async function stopRecording() {
        if (!recording) {
            console.warn('[Audio] stopRecording called but no recording object exists.');
            return;
        }
        console.log('[Audio] Attempting to stop recording...');
        setIsRecording(false); // Optimistically set recording state off

        try {
             await recording.stopAndUnloadAsync();
             console.log('[Audio] Recording stopped and unloaded.');
             const uri = recording.getURI();
             setRecording(null); // Clear recording object AFTER getting URI
             console.log('[Audio] Recording URI:', uri);

             if (uri) {
                transcribeAudio(uri);
            } else {
                 console.error('[Audio] Failed to get recording URI after stopping.');
                 Alert.alert("Recording Error", "Could not retrieve the recorded audio file path.");
            }
        } catch(err) {
             console.error('[Audio] Error stopping recording or getting URI:', err);
             const message = err instanceof Error ? err.message : String(err);
             Alert.alert("Recording Error", `Failed to stop recording properly. Error: ${message}`);
             setRecording(null); // Ensure recording object is cleared on error too
        }
    }

    async function transcribeAudio(audioUri: string) {
        setIsTranscribing(true);
        setError(null);
        console.log('[Transcribe] Starting transcription for URI:', audioUri);
        let audioBase64: string | null = null;

        try {
            // --- Get Base64 Data ---
            console.log('[Transcribe] Attempting to read audio file to Base64...');
            if (Platform.OS === 'web') {
                console.log("[Transcribe] Reading audio on web...");
                try {
                    const response = await fetch(audioUri);
                    if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
                    const blob = await response.blob();
                    audioBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]); // Extract Base64
                        reader.onerror = (error) => reject(new Error(`FileReader error: ${error}`));
                        reader.readAsDataURL(blob);
                    });
                     console.log("[Transcribe] Web audio read successfully.");
                } catch (fetchError) {
                    console.error("[Transcribe] Web fetch/read error:", fetchError);
                    const message = fetchError instanceof Error ? fetchError.message : String(fetchError);
                    throw new Error(`Could not process web audio: ${message}`);
                }
            } else {
                console.log("[Transcribe] Reading audio on native...");
                try {
                     audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                     console.log("[Transcribe] Native audio read successfully.");
                 } catch (readError) {
                    console.error("[Transcribe] Native file read error:", readError);
                    const message = readError instanceof Error ? readError.message : String(readError);
                    throw new Error(`Could not read native audio file: ${message}`);
                 }
            }

            if (!audioBase64) {
                 throw new Error("Failed to get Base64 audio data after read attempts.");
            }
             console.log('[Transcribe] Audio Base64 obtained successfully.');

            // --- Transcribe API Call ---
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");
            console.log('[Transcribe] Sending audio to backend...');
            const response = await axios.post(`${BASE_URL}/api/transcribe`, {
                audioBase64: audioBase64,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('[Transcribe] Backend response status:', response.status);

            if (response.data && response.data.transcript) {
                console.log('[Transcribe] Transcription received:', response.data.transcript);
                setDescription(prev => prev ? `${prev} ${response.data.transcript}` : response.data.transcript);
            } else {
                 console.error('[Transcribe] Invalid response from backend:', response.data);
                throw new Error("Invalid response from transcription server.");
            }

        } catch (err: any) {
            console.error('[Transcribe] Full transcription process failed:', err);
            const errorMessage = err.response?.data?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to transcribe audio';
            setError(errorMessage);
            Alert.alert("Transcription Failed", `Could not transcribe audio. Please try again. Error: ${errorMessage}`);
        } finally {
            setIsTranscribing(false);
            console.log('[Transcribe] Transcription process finished.');
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

    // --- Web Drag and Drop Handlers ---
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Necessary to allow dropping
        event.stopPropagation();
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('File dropped!');

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            console.log('Dropped file:', file.name, file.type);

            if (file.type.startsWith('image/')) {
                try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const uri = reader.result as string; // data: URL
                        const base64 = uri.split(',')[1]; // Extract base64 part
                        handleImageResult({ assets: [{ uri, base64 }] });
                    };
                    reader.onerror = (error) => {
                        console.error("Error reading dropped file:", error);
                        setError('Failed to read dropped image.');
                        Alert.alert('Error', 'Could not read the dropped image.');
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    handleImageError(error);
                }
            } else {
                Alert.alert('Invalid File Type', 'Please drop an image file.');
            }
            event.dataTransfer.clearData();
        }
    };
    // --- End Web Drag and Drop Handlers ---

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

                {Platform.OS === 'web' ? (
                    // Use an HTML div for web drag-and-drop events
                    <div
                        onDragOver={handleDragOver as any} // Cast type for web-only props
                        onDrop={handleDrop as any}       // Cast type for web-only props
                        style={webDropZoneStyle} // Use web-specific style object
                    >
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <ImagePlus size={50} color="#6c757d" />
                                    <Text style={styles.imagePlaceholderText}>Tap or drop image here</Text> {/* Updated text */}
                                </View>
                            )}
                        </TouchableOpacity>
                    </div>
                 ) : (
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
                 )}

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

// Define web-specific style outside StyleSheet.create
const webDropZoneStyle: React.CSSProperties = {
    width: '100%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 20, // Match imagePicker margin
};

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
        width: '100%', // Occupy full width of parent (dropzone on web)
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
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