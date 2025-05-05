import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    TextInput, 
    ScrollView, 
    ActivityIndicator,
    Alert,
    Platform 
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Mic, RefreshCcw, BrainCircuit } from 'lucide-react-native'; // Or other appropriate icons
import { COLORS } from '../../../src/styles/colors'; // Assuming colors are defined here
import { Audio } from 'expo-av'; // Import Expo AV
import * as FileSystem from 'expo-file-system'; // Import Expo File System

export default function NewInspectionScreen() {
    const { user } = useUser();
    const userState = user?.publicMetadata?.state as string || 'N/A'; // Get user state

    // State Variables
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [description, setDescription] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false); // Placeholder
    const [isLoading, setIsLoading] = useState<boolean>(false); // For generate button
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false); // State for drag-over visual feedback
    const [recording, setRecording] = useState<Audio.Recording | null>(null); // State for recording object
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false); // State for transcription loading

    // --- Drag and Drop Logic (Web Only) --- START ---
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (Platform.OS !== 'web') return;
        event.preventDefault(); // Necessary to allow drop
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        if (Platform.OS !== 'web') return;
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        if (Platform.OS !== 'web') return;
        event.preventDefault();
        setIsDragging(false);
        setError(null);

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            console.log("File dropped:", file.name, file.type);

            // Basic image type check
            if (!file.type.startsWith('image/')) {
                setError('Invalid file type. Please drop an image file.');
                Alert.alert('Invalid File', 'Please drop an image file (e.g., JPG, PNG).');
                return;
            }

            // Read the file as Base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1]; // Remove data:image/...;base64,
                const uri = reader.result as string; // Keep the full Data URI for preview
                setImageUri(uri); 
                setImageBase64(base64String ?? null); 
                console.log("Image dropped and processed.");
            };
            reader.onerror = () => {
                console.error("FileReader error");
                setError('Failed to read the dropped file.');
                Alert.alert('Error', 'Could not read the dropped file.');
            };
            reader.readAsDataURL(file);

            event.dataTransfer.clearData();
        }
    };
    // --- Drag and Drop Logic (Web Only) --- END ---

    // Image Picker Logic
    const pickImage = async () => {
        setError(null); // Clear previous errors
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            // aspect: [4, 3], // Or your desired aspect ratio
            quality: 0.7,
            base64: true,
        };

        try {
            let result: ImagePicker.ImagePickerResult;
            if (Platform.OS === 'web') {
                result = await ImagePicker.launchImageLibraryAsync(options);
            } else {
                // Native: Request permissions first
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
                    Alert.alert('Permission required', 'Camera and Media Library permissions are needed.');
                    return;
                }

                // Ask user for source on native
                result = await new Promise((resolve) => {
                     Alert.alert(
                         "Select Image Source",
                         "Choose where to get the image from:",
                         [
                             {
                                 text: "Take Photo",
                                 onPress: async () => resolve(await ImagePicker.launchCameraAsync(options)),
                             },
                             {
                                 text: "Choose from Library",
                                 onPress: async () => resolve(await ImagePicker.launchImageLibraryAsync(options)),
                             },
                             { text: "Cancel", style: "cancel", onPress: () => resolve({ canceled: true, assets: null }) }, // Resolve promise on cancel
                         ],
                         { cancelable: true, onDismiss: () => resolve({ canceled: true, assets: null }) } // Resolve on dismiss
                     );
                });
            }
            
            handleImageResult(result);

        } catch (err: any) {
            console.error("ImagePicker Error: ", err);
            setError('Failed to pick image. Please try again.');
            Alert.alert('Error', 'Could not load the image.');
        }
    };

    const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            setImageUri(asset.uri); 
            setImageBase64(asset.base64 ?? null); 
            console.log("Image selected:", asset.uri);
        } else {
            console.log('Image selection cancelled or failed');
        }
    };

    // Placeholder Functions
    const handleMicPress = async () => {
        setError(null);
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const startRecording = async () => {
        try {
            console.log('Requesting microphone permissions...');
            const permissionResponse = await Audio.requestPermissionsAsync();
            if (permissionResponse.status !== 'granted') {
                setError('Microphone permission is required to record audio.');
                Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
                return;
            }
            console.log('Microphone permissions granted.');

            // Set audio mode for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                // Add Android configuration if needed
            }); 

            console.log('Starting recording...');
            const { recording: newRecording } = await Audio.Recording.createAsync(
               Audio.RecordingOptionsPresets.HIGH_QUALITY // Use a preset for simplicity
            );
            setRecording(newRecording);
            setIsRecording(true);
            console.log('Recording started successfully.');

        } catch (err: any) {
            console.error('Failed to start recording', err);
            setError(`Failed to start recording: ${err.message}`);
            Alert.alert('Recording Error', `Could not start recording: ${err.message}`);
            // Clean up state if start fails
            setIsRecording(false);
            setRecording(null);
        }
    };

    const stopRecording = async () => {
        if (!recording) {
            console.warn('Stop recording called but no recording object exists.');
            setIsRecording(false); // Ensure state is consistent
            return;
        }

        console.log('Stopping recording...');
        setIsRecording(false);
        setIsTranscribing(true); // Indicate processing
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);
            setRecording(null); // Clear the recording object from state

            if (uri) {
                 // Get Base64 data
                try {
                    const base64Audio = await FileSystem.readAsStringAsync(uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    console.log('Successfully got Base64 audio data.');
                    setIsTranscribing(false);

                    // *** TODO: Send base64Audio to backend /api/transcribe ***
                    // For now, just show an alert or update description
                    Alert.alert("Recording Complete", "Audio ready for transcription (placeholder).");
                    // Example: setDescription(prev => prev + " [Audio Recorded]"); 
                    // Or call backend: await transcribeAudio(base64Audio);

                } catch (readError: any) {
                     console.error('Failed to read audio file as Base64', readError);
                     setError(`Failed to process recording: ${readError.message}`);
                     Alert.alert('Processing Error', `Could not process the recorded audio: ${readError.message}`);
                     setIsTranscribing(false);
                }
            } else {
                 console.warn('Recording URI is null after stopping.');
                 setError('Failed to get recording file path.');
                 Alert.alert('Recording Error', 'Could not retrieve the recording file path.');
                 setIsTranscribing(false);
            }
        } catch (err: any) {
            console.error('Failed to stop recording', err);
            setError(`Failed to stop recording: ${err.message}`);
            Alert.alert('Recording Error', `Could not stop recording properly: ${err.message}`);
            setIsTranscribing(false);
            setRecording(null); // Attempt cleanup
        }
    };

    const handleGenerateStatement = () => {
        // TODO: Implement API call to backend /api/analyze-defect and /api/generate-ddid
        console.log("Generate Statement pressed");
        if (!imageUri || !description) {
             Alert.alert("Missing Info", "Please provide an image and description.");
             return;
        }
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
             Alert.alert("Statement Generated", "Placeholder for generated statement display.");
             // Reset form or show modal...
        }, 1500);
    };

    const handleNewDefect = () => {
        // TODO: Clear the form state
        console.log("New Defect pressed");
        setImageUri(null);
        setImageBase64(null);
        setDescription('');
        setError(null);
        setIsRecording(false);
        setIsLoading(false);
         Alert.alert("New Defect", "Form cleared.");
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            {/* State Display */}
            <Text style={styles.stateText}>State: {userState}</Text>

            {/* Image Upload Area - Modified for Drag/Drop */}
            <TouchableOpacity 
                style={[styles.imagePicker, isDragging && styles.imagePickerDragging]} 
                onPress={pickImage}
                // Add web-specific drag/drop handlers directly to the View component for React Native Web compatibility
                // We need to cast the style prop for web-specific event handlers
                {...(Platform.OS === 'web' ? {
                    onDragOver: handleDragOver,
                    onDragLeave: handleDragLeave,
                    onDrop: handleDrop,
                } : {})}
            >
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <ImagePlus size={48} color={COLORS.primary} />
                        <Text style={styles.imagePlaceholderText}>Tap or drop image here</Text> 
                    </View>
                )}
            </TouchableOpacity>

            {/* Description Input */}
            <View style={styles.descriptionContainer}>
                 <TextInput
                    style={styles.textInput}
                    placeholder="Describe the image and provide details..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholderTextColor="#888"
                />
                 <TouchableOpacity style={styles.micButton} onPress={handleMicPress} disabled={isTranscribing}>
                      {isTranscribing ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                          <Mic size={24} color={isRecording ? COLORS.danger : COLORS.primary} />
                      )}
                 </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Action Buttons */}
            <TouchableOpacity 
                style={[styles.button, styles.generateButton, (isLoading || !imageUri || !description) && styles.buttonDisabled]} 
                onPress={handleGenerateStatement}
                disabled={isLoading || !imageUri || !description}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                     <>
                        <BrainCircuit size={18} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Generate Statement</Text>
                     </>
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, styles.newDefectButton]} 
                onPress={handleNewDefect}
            >
                <RefreshCcw size={18} color={COLORS.primary} style={styles.buttonIcon} />
                <Text style={[styles.buttonText, styles.newDefectButtonText]}>New Defect</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

// Basic Styles (adapt as needed from your existing styles)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
    },
    stateText: {
        fontSize: 14,
        color: '#6c757d',
        position: 'absolute',
        top: 10,
        right: 20,
        fontWeight: '500',
    },
    imagePicker: {
        width: '100%',
        maxWidth: 500, // Max width for larger screens
        height: 250,
        backgroundColor: '#e9ecef',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#ced4da',
        borderStyle: 'dashed',
        overflow: 'hidden', // Ensure image preview respects border radius
        transition: 'border-color 0.2s ease-in-out', // Add transition for visual feedback
    },
    imagePickerDragging: { // Style for when dragging over
         borderColor: COLORS.primary, 
         borderWidth: 3, // Make border thicker
    },
    imagePlaceholder: {
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
    descriptionContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Align items vertically
        width: '100%',
        maxWidth: 500,
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ced4da',
    },
    textInput: {
        flex: 1, // Take remaining space
        minHeight: 100,
        padding: 15,
        fontSize: 16,
        textAlignVertical: 'top', // Align text to top for multiline
        color: '#333',
    },
    micButton: {
        padding: 15, 
    },
    button: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 500,
        paddingVertical: 15,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    generateButton: {
        backgroundColor: COLORS.primary,
    },
    newDefectButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
     newDefectButtonText: {
        color: COLORS.primary,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
        backgroundColor: '#a0aec0', // Example disabled color
    },
    errorText: {
        color: COLORS.danger,
        marginBottom: 15,
        textAlign: 'center',
    },
});
