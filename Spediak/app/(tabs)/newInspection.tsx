import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Button, Image, TextInput, StyleSheet, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Dimensions, Modal, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useUser } from "@clerk/clerk-expo";
import axios from 'axios';
import { ImagePlus, Send, BotMessageSquare, RefreshCcw, Mic, MicOff, Camera, Edit, Save, RotateCcw, X, Eye, BrainCircuit } from 'lucide-react-native';
import DdidModal from '../../src/components/DdidModal';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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
    const [originalDdid, setOriginalDdid] = useState<string | null>(null);
    const [generatedDdid, setGeneratedDdid] = useState<string | null>(null);
    const [showDdidModal, setShowDdidModal] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [isGeneratingFinal, setIsGeneratingFinal] = useState<boolean>(false);
    const [analysisText, setAnalysisText] = useState<string | null>(null);
    const [showGenerateFinalButton, setShowGenerateFinalButton] = useState<boolean>(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [showAnalyzingPopup, setShowAnalyzingPopup] = useState<boolean>(false);
    const { getToken } = useAuth();
    const { user } = useUser();
    const [userState, setUserState] = useState<string>('NC'); // Default to NC
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isEditingDdid, setIsEditingDdid] = useState<boolean>(false);
    const [editedDdid, setEditedDdid] = useState<string>('');
    const [inspectionId, setInspectionId] = useState<string | null>(null); // State for the saved inspection ID

    // --- Fetch user state from Clerk metadata ---
    useEffect(() => {
        if (user?.unsafeMetadata?.inspectionState) {
            setUserState(user.unsafeMetadata.inspectionState as string);
        }
    }, [user]);
    // --- End user state fetching ---

    const pickFromLibrary = async () => {
        if (Platform.OS === 'web') {
            // Web: Directly launch library
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
            // Native: Request library permissions and launch library
            const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (libraryPermission.status !== 'granted') {
                Alert.alert('Permission required', 'Media Library permission is needed to select an image.');
                return;
            }

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
    };

    // NEW function to specifically take a photo (Native only)
    const takePhoto = async () => {
        if (Platform.OS === 'web') return; // Should not be callable on web

        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

        if (cameraPermission.status !== 'granted') {
            Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
            return;
        }

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
    };

    // Helper function to handle result from picker/drop
    const handleImageResult = async (result: ImagePicker.ImagePickerResult | { assets: { uri: string; base64?: string }[] }) => {
        if (!('canceled' in result && result.canceled) && result.assets && result.assets.length > 0) {
           const asset = result.assets[0];
           // Check if width/height exist before logging (Type Guard)
           if ('width' in asset && 'height' in asset) {
                console.log(`[Image Handling] Original image URI: ${asset.uri}, size: ${asset.width}x${asset.height}`);
           } else {
                console.log(`[Image Handling] Original image URI: ${asset.uri} (dimensions not available)`);
           }

           try {
                console.log('[Image Handling] Resizing and compressing image...');
                const manipResult = await manipulateAsync(
                    asset.uri, // Use the original URI from picker
                    [
                        { resize: { width: 1024 } } // Resize width to max 1024px (height adjusts automatically)
                        // Or use { resize: { height: 1024 } }
                    ],
                    {
                         compress: 0.7, // Apply compression (0.0 - 1.0)
                         format: SaveFormat.JPEG, // Save as JPEG
                         base64: true // Get base64 data after manipulation
                    }
                );
                console.log(`[Image Handling] Manipulated image URI: ${manipResult.uri}, size: ${manipResult.width}x${manipResult.height}`);

                // Use the manipulated image data
                setImageUri(manipResult.uri); // Show the resized preview
                setImageBase64(manipResult.base64 ?? null);
                setOriginalDdid(null);
                setGeneratedDdid(null);
                setError(null);

           } catch (manipError) {
                console.error("[Image Handling] Error manipulating image:", manipError);
                setError('Failed to process image. Please try again.');
                // Fallback maybe? Or just show error. For now, clear state.
                setImageUri(null);
                setImageBase64(null);
           }
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

    // --- Handler for Initial Analysis ---
    const handleAnalyzeDefect = useCallback(async () => {
        console.log("[handleAnalyzeDefect] Function called");
        if (!imageBase64 || !description) {
            Alert.alert("Missing Information", "Please upload an image and provide a description.");
            return;
        }
        // Reset previous results
        setAnalysisText(null);
        setGeneratedDdid(null);
        setOriginalDdid(null);
        setIsEditingDdid(false);
        setShowGenerateFinalButton(false);
        setError(null);
        setIsAnalyzing(true);
        setShowAnalyzingPopup(true); // Show popup for analysis

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");

            // --- Backend Call for Analysis ONLY ---
            console.log(`[handleAnalyzeDefect] Calling POST ${BASE_URL}/api/analyze-defect`);
            // !! IMPORTANT: We need to create this endpoint on the backend !!
            const analysisResponse = await axios.post(`${BASE_URL}/api/analyze-defect`, {
                imageBase64,
                description,
                userState,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (analysisResponse.data && analysisResponse.data.analysis) {
                setAnalysisText(analysisResponse.data.analysis);
                setShowGenerateFinalButton(true);
            } else {
                throw new Error("Invalid response structure from analysis server.");
            }

        } catch (err: any) {
            console.error("[handleAnalyzeDefect] Error:", err);
            const message = err.response?.data?.message || err.message || "Failed to analyze defect";
            setError(message);
            Alert.alert("Analysis Failed", message);
        } finally {
            setIsAnalyzing(false);
            setShowAnalyzingPopup(false);
        }
    }, [imageBase64, description, userState, getToken]);

    // --- Handler for Final Statement Generation & Save ---
    const handleGenerateFinalStatement = useCallback(async () => {
        console.log("[handleGenerateFinalStatement] Function called");
        if (!imageBase64 || !description || !analysisText) { // Might use analysisText in prompt later
            Alert.alert("Missing Information", "Analysis must be completed first.");
            return;
        }
        setIsGeneratingFinal(true);
        setShowAnalyzingPopup(true); // Show popup for final generation
        setError(null);
        let cloudinaryUrl: string | null = null;

        try {
            // --- Step 1: Upload Image (if not already uploaded - might optimize later) ---
            // For now, re-uploading simplifies flow
            cloudinaryUrl = await uploadImageToCloudinary(imageBase64);
            if (!cloudinaryUrl) {
                setShowAnalyzingPopup(false);
                setIsGeneratingFinal(false);
                return;
            }

            // --- Step 2: Generate Final DDID Statement --- 
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");
            console.log(`[handleGenerateFinalStatement] Calling POST ${BASE_URL}/api/generate-ddid`);
            // This calls the ORIGINAL endpoint which includes saving
            const ddidResponse = await axios.post(`${BASE_URL}/api/generate-ddid`, {
                imageBase64, // Send image again for context
                description, // Original description
                // Optionally pass analysisText if the backend prompt uses it
                // analysis: analysisText,
                userState,
                imageUrl: cloudinaryUrl, // Provide URL for saving
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (ddidResponse.data && ddidResponse.data.ddid && ddidResponse.data.inspectionId) {
                const receivedDdid = ddidResponse.data.ddid;
                const receivedInspectionId = ddidResponse.data.inspectionId;
                console.log(`[handleGenerateFinalStatement] Final DDID received: ${receivedDdid}, Inspection ID: ${receivedInspectionId}`);
                setGeneratedDdid(receivedDdid);
                setOriginalDdid(receivedDdid);
                setInspectionId(receivedInspectionId); // <-- Store the ID
                setShowGenerateFinalButton(false);
                setAnalysisText(null);
            } else {
                // Handle cases where ID might be missing even if DDID exists (e.g., DB error on backend)
                if(ddidResponse.data && ddidResponse.data.ddid) {
                    setGeneratedDdid(ddidResponse.data.ddid);
                     setOriginalDdid(ddidResponse.data.ddid);
                    console.warn('[handleGenerateFinalStatement] DDID generated but failed to get Inspection ID from response.');
                    setError('Statement generated, but failed to retrieve saved record ID. Cannot edit.');
                } else {
                     throw new Error("Invalid response structure from DDID server.");
                }
                setInspectionId(null); // Ensure ID is null if something went wrong
                setShowGenerateFinalButton(false);
                setAnalysisText(null);
            }

        } catch (err: any) {
            console.error("[handleGenerateFinalStatement] Error:", err);
            const message = err.response?.data?.message || err.message || "Failed to generate final statement or save inspection";
            setError(message);
            Alert.alert("Operation Failed", message);
        } finally {
            setIsGeneratingFinal(false);
            setShowAnalyzingPopup(false);
        }
    }, [imageBase64, description, userState, analysisText, getToken, uploadImageToCloudinary]);

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
                Audio.RecordingOptionsPresets.LOW_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            console.log('[Audio] Recording started successfully with LOW quality preset.');
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
        setOriginalDdid(null);
        setGeneratedDdid(null);
        setError(null);
        setShowDdidModal(false);
        setIsAnalyzing(false);
        setIsGeneratingFinal(false);
        setAnalysisText(null);
        setShowGenerateFinalButton(false);
        setIsEditingDdid(false);
        setEditedDdid('');
        setInspectionId(null); // Reset inspection ID
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

    // --- Edit/Save/Regenerate Handlers --- 
    const handleEditStatement = () => {
        if (generatedDdid) {
            setEditedDdid(generatedDdid); // Initialize editor with generated text
            setIsEditingDdid(true);
            console.log("Editing statement...");
        }
    };

    const handleSaveEditedStatement = async () => {
        if (!editedDdid || !originalDdid || !inspectionId) {
            Alert.alert('Error', 'Cannot save edit. Missing original data or record ID.');
            return;
        }
        console.log(`Attempting to save edited statement for inspection ID: ${inspectionId}...`);
        // Add loading state?
        // setIsLoading(true); // Need to add this state if desired

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not found.");

            // 1. Update the inspection in the database
            console.log(`Calling PUT ${BASE_URL}/api/inspections/${inspectionId}`);
            await axios.put(`${BASE_URL}/api/inspections/${inspectionId}`, 
                { ddid: editedDdid }, // Send the edited DDID in the body
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log(`Inspection ${inspectionId} updated successfully.`);

            // 2. Log the edit for training (Optional but recommended)
            try {
                 console.log(`Calling POST ${BASE_URL}/api/log-statement-edit`);
                 await axios.post(`${BASE_URL}/api/log-statement-edit`, 
                    { 
                        inspectionId: inspectionId,
                        originalDdid: originalDdid,
                        editedDdid: editedDdid
                    }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                 console.log(`Edit for inspection ${inspectionId} logged successfully.`);
            } catch (logError: any) {
                 console.warn("[handleSaveEditedStatement] Failed to log edit:", logError.response?.data || logError.message);
                 // Don't block user if logging fails, but maybe notify?
            }

            // Update local state on success
            setGeneratedDdid(editedDdid); // Reflect the saved edit
            setIsEditingDdid(false);
            Alert.alert("Success", "Statement updated successfully.");

        } catch (error: any) {
            console.error("[handleSaveEditedStatement] Error saving edit:", error);
            const message = error.response?.data?.message || error.message || 'Failed to save edited statement.';
            Alert.alert('Save Error', message);
            // Maybe revert local state or keep edit mode open?
        } finally {
            // setIsLoading(false);
        }
    };

    const handleRegenerateStatement = () => {
        console.log("Regenerating final statement...");
        // Reset edit state and call the final generation function again
        setIsEditingDdid(false);
        setEditedDdid('');
        handleGenerateFinalStatement();
    };
    // --- End Edit/Save/Regenerate Handlers ---

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
                        <TouchableOpacity style={styles.imagePicker} onPress={pickFromLibrary}>
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
                    <View style={styles.imagePickerContainer}>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickFromLibrary}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <ImagePlus size={50} color="#6c757d" />
                                    <Text style={styles.imagePlaceholderText}>Tap to choose from library</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {!imageUri && (
                             <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                                 <Camera size={24} color={COLORS.white} style={styles.cameraIcon}/>
                             </TouchableOpacity>
                        )}
                    </View>
                 )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, isEditingDdid && styles.editingInput]}
                        placeholder={isEditingDdid ? "Edit the generated statement..." : "Describe the image and provide details..."}
                        value={isEditingDdid ? editedDdid : description}
                        onChangeText={isEditingDdid ? setEditedDdid : setDescription}
                        multiline
                        editable={!isAnalyzing && !isGeneratingFinal && !isUploading && !isRecording && !isTranscribing}
                        selectTextOnFocus={isEditingDdid}
                    />
                    {!isEditingDdid && (
                        <TouchableOpacity
                            style={styles.micButton}
                            onPress={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                        >
                            {isRecording ? (
                                 <MicOff size={24} color={COLORS.success} />
                            ) : isTranscribing ? (
                                 <ActivityIndicator size="small" color="#007bff" />
                            ) : (
                                 <Mic size={24} color={COLORS.primary} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Display Analysis Text if available */} 
                {analysisText && !isEditingDdid && (
                    <View style={styles.analysisContainer}>
                        <Text style={styles.analysisTitle}>AI Analysis:</Text>
                        <Text style={styles.analysisContent}>{analysisText}</Text>
                    </View>
                )}

                {/* --- Button Section --- */} 
                {/* Initial State: Show Analyze Button */} 
                {!analysisText && !generatedDdid && !isAnalyzing && (
                    <TouchableOpacity
                        style={[styles.button, styles.analyzeButton, (!imageUri || !description || isAnalyzing) && styles.buttonDisabled]}
                        onPress={handleAnalyzeDefect}
                        disabled={!imageUri || !description || isAnalyzing}
                    >
                        <BrainCircuit size={18} color="#fff" style={{marginRight: 8}} />
                        <Text style={styles.buttonText}>Analyze</Text>
                    </TouchableOpacity>
                )}

                {/* Analyzing State */} 
                {(isAnalyzing || isGeneratingFinal || isUploading) && (
                     <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>
                            {isUploading ? 'Uploading...' : isAnalyzing ? 'Analyzing Defect...' : 'Generating Statement...'}
                        </Text>
                     </View>
                 )}

                 {/* Post-Analysis State: Show Generate Final Statement Button */} 
                 {analysisText && showGenerateFinalButton && !isGeneratingFinal && !generatedDdid && (
                     <TouchableOpacity
                         style={[styles.button, styles.generateFinalButton]}
                         onPress={handleGenerateFinalStatement}
                     >
                         {/* Use Send or different icon? */} 
                         <Send size={18} color="#fff" style={{marginRight: 8}} />
                         <Text style={styles.buttonText}>Generate Statement</Text>
                     </TouchableOpacity>
                 )}

                {/* Post-Final Generation State: Show Edit/Regenerate/View */} 
                {generatedDdid && !isAnalyzing && !isGeneratingFinal && !isUploading && (
                    <View style={styles.postGenButtonContainer}>
                        {isEditingDdid ? (
                             <>
                                <TouchableOpacity
                                    style={[styles.button, styles.saveEditButton, styles.buttonThird]}
                                    onPress={handleSaveEditedStatement}
                                >
                                    <Save size={18} color="#fff" />
                                    <Text style={[styles.buttonText, {marginLeft: 8}]}>Save Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelEditButton, styles.buttonThird]}
                                    onPress={() => setIsEditingDdid(false)}
                                >
                                    <X size={18} color={COLORS.darkText} />
                                    <Text style={[styles.buttonTextSecondary, {marginLeft: 8}]}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                         ) : (
                             <>
                                 <TouchableOpacity
                                     style={[styles.button, styles.editButton, styles.buttonThird]}
                                     onPress={handleEditStatement}
                                 >
                                     <Edit size={18} color={COLORS.primary} />
                                     <Text style={[styles.buttonTextAction, {marginLeft: 8}]}>Edit</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity
                                     style={[styles.button, styles.regenerateButton, styles.buttonThird]}
                                     onPress={handleRegenerateStatement}
                                 >
                                      <RotateCcw size={18} color={COLORS.primary} />
                                     <Text style={[styles.buttonTextAction, {marginLeft: 8}]}>Regenerate</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity
                                     style={[styles.button, styles.viewButton, styles.buttonThird]}
                                     onPress={() => setShowDdidModal(true)}
                                 >
                                      <Eye size={18} color={COLORS.primary} />
                                     <Text style={[styles.buttonTextAction, {marginLeft: 8}]}>View</Text>
                                 </TouchableOpacity>
                             </>
                         )}
                    </View>
                )}

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
    width: '100%', // Take full width
    maxWidth: 400, // Max width for the square picker
    aspectRatio: 1, // Make the drop zone square
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 20,
    alignSelf: 'center', // Center the drop zone itself
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center', // Center content horizontally
        flexGrow: 1, // Ensure content can grow to fill space
        justifyContent: 'space-between' // Push elements apart vertically
    },
    userStateText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 15,
        alignSelf: 'flex-end', // Position to the right
    },
    imagePickerContainer: {
        width: width * 0.85,
        alignSelf: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    imagePicker: {
        width: '100%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        ...Platform.select({
             native: {
             },
             web: {
                 maxWidth: '100%',
             }
         }),
    },
    imagePreview: {
        width: '100%',
        height: '100%', // Fill the square picker area
        borderRadius: 8, // Match inner content radius
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: {
        marginTop: 10,
        color: '#6c757d',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 500, // Max width for input area
        marginBottom: 15,
        alignItems: 'center',
        alignSelf: 'center',
        position: 'relative' // Added for absolute positioning of mic
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 15,
        paddingRight: 50, // Add padding to make space for the mic
        minHeight: 100,
        fontSize: 16,
        marginRight: 0, // Adjusted in previous step
        textAlignVertical: 'top',
    },
    editingInput: {
        borderColor: COLORS.primary, // Highlight when editing
        backgroundColor: '#eef4ff',
        minHeight: 150, // Maybe taller for editing
    },
    micButton: {
        position: 'absolute', // Position absolutely within the container
        right: 10, // Position from the right
        top: '50%', // Attempt to vertically center (might need adjustment)
        transform: [{ translateY: -12 }], // Adjust based on icon size (assuming 24)
        padding: 0, // Remove padding if not needed for touch area
        // Ensure touch area is sufficient if padding is removed
    },
    button: {
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        marginHorizontal: '1%',
    },
    buttonHalf: {
        flex: 1, // Takes half space in initial container
    },
    buttonThird: {
        flex: 1, // Takes third space in post-gen container
        paddingHorizontal: 10, // Adjust padding if needed
    },
    buttonText: {
        color: '#fff',
        fontSize: 16, // Slightly smaller text might be needed
        fontWeight: 'bold',
        textAlign: 'center', // Ensure text centers if it wraps
    },
    generateButton: {
        backgroundColor: COLORS.primary,
    },
    resetButton: {
        backgroundColor: '#6c757d',
    },
    buttonDisabled: {
        backgroundColor: '#adb5bd',
    },
    // Add other styles as needed
    newChatButton: {
        backgroundColor: '#e9ecef',
        borderWidth: 1,
        borderColor: '#ced4da',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonTextSecondary: {
        color: COLORS.darkText,
        fontSize: 16, // Slightly smaller text might be needed
        fontWeight: '600',
        textAlign: 'center',
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
    buttonContainer: { // For Initial Generate/New
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        marginBottom: 15,
    },
    postGenButtonContainer: { // For Edit/Save/Regenerate
        flexDirection: 'row',
        justifyContent: 'space-around', // Space buttons evenly
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        marginBottom: 15,
    },
    editButton: {
        backgroundColor: '#e9ecef',
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    saveEditButton: {
        backgroundColor: COLORS.success, // Green for save
    },
    cancelEditButton: {
        backgroundColor: '#e9ecef',
        borderColor: '#ced4da',
        borderWidth: 1,
    },
    regenerateButton: {
        backgroundColor: '#e9ecef',
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    viewButton: {
        backgroundColor: '#e9ecef',
        borderColor: COLORS.primary,
        borderWidth: 1,
    },
    buttonTextAction: { // For Edit, Regenerate, View buttons
        color: COLORS.primary,
        fontSize: 14, // Smaller text for smaller buttons
        fontWeight: '600',
        textAlign: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 25,
        padding: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    cameraIcon: {
        // Currently no specific style needed beyond size/color
    },
    analysisContainer: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        backgroundColor: '#e9f5ff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    analysisTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 5,
    },
    analysisContent: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.primary,
    },
    analyzeButton: {
        backgroundColor: COLORS.primary, // Or a different color?
    },
    generateFinalButton: {
        backgroundColor: COLORS.success, // Green for final step?
    },
});