import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Platform,
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView
} from 'react-native';
import { COLORS } from '../styles/colors';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { RootDrawerParamList } from '../navigation/RootNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';

type NewInspectionScreenProps = DrawerScreenProps<RootDrawerParamList, 'NewInspection'>;

const { width } = Dimensions.get('window');
const imageSize = width * 0.9;

const NewInspectionScreen: React.FC<NewInspectionScreenProps> = ({ navigation }) => {
    const { getToken } = useAuth();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedDdid, setGeneratedDdid] = useState<string | null>(null);
    const [showDdidModal, setShowDdidModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const userState = 'North Carolina';

    useEffect(() => {
        navigation.setOptions({ title: 'New Inspection' });
    }, [navigation]);

    // Step 25: Image Picker Logic
    const pickImage = async () => {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
            Alert.alert('Permission required', 'Camera and Media Library permissions are needed to select an image.');
            return;
        }

        // Ask user for source
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
    };

    // Helper function to handle result from either picker
    const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
         if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 ?? null);
            setError(null);
        } else {
            console.log('Image selection cancelled');
        }
    };

     // Helper function to handle errors from either picker
    const handleImageError = (error: any) => {
        console.error("ImagePicker Error: ", error);
        setError('Failed to pick image. Please try again.');
        Alert.alert('Error', 'Could not pick image.');
    };

    // Step 27: Audio Recording Logic
    async function startRecording() {
        try {
            console.log('Requesting permissions..');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
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
            Alert.alert('Error', 'Could not start recording.');
        }
    }

    async function stopRecording() {
        if (!recording) return;
        console.log('Stopping recording..');
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false, // Required on iOS to allow playback
            });
            const uri = recording.getURI();
            setRecording(null);
            console.log('Recording stopped and stored at', uri);
            if (uri) {
                transcribeAudio(uri);
            } else {
                 console.error('Recording URI is null');
                 Alert.alert('Error', 'Could not get recording file.');
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            Alert.alert('Error', 'Could not stop recording.');
             // Also reset recording state if stopping fails
             setRecording(null);
             setIsRecording(false); // Ensure state is reset
        }
    }

    // Step 28: Transcription Logic
    async function transcribeAudio(audioUri: string) {
        console.log('Starting transcription for:', audioUri);
        setIsTranscribing(true);
        setError(null);

        try {
            const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const token = await getToken();
            if (!token) {
                throw new Error("Authentication token not available.")
            }

            // *** Backend Call Placeholder ***
            // Replace '/api/transcribe' with your actual backend endpoint URL
            // Ensure your backend expects { audioBase64: string } and returns { transcript: string }
            const backendUrl = '/api/transcribe'; // TODO: Replace with actual URL
            console.log(`Sending base64 audio to ${backendUrl}`);

            // Simulate backend call with a delay and dummy response
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
            const dummyTranscript = "This is a dummy transcript based on the audio.";
            console.log("Received dummy transcript:", dummyTranscript);
            setDescription(dummyTranscript); // Update description with transcript

            /*
            // --- Actual Axios Call (uncomment and configure when backend is ready) ---
            const response = await axios.post(backendUrl, {
                audioBase64: audioBase64
            }, {
                 headers: {
                     Authorization: `Bearer ${token}`
                 }
             });

             if (response.data && response.data.transcript) {
                 console.log("Received transcript:", response.data.transcript);
                 setDescription(response.data.transcript);
             } else {
                 throw new Error('Invalid response from transcription server');
             }
            // --- End Actual Axios Call ---
            */

        } catch (err: any) {
            console.error('Transcription failed', err);
            setError('Failed to transcribe audio. Please try again.');
            Alert.alert('Transcription Error', err.message || 'Could not transcribe audio.');
        } finally {
            setIsTranscribing(false);
        }
    }

    // Step 30: Reset Inspection Logic
    const resetInspection = () => {
        console.log("Resetting inspection state...");
        setImageUri(null);
        setImageBase64(null);
        setDescription('');
        setGeneratedDdid(null);
        setError(null);
        // Reset other relevant states if needed (e.g., isGenerating, isRecording)
        setIsGenerating(false);
        setIsRecording(false);
        setIsTranscribing(false);
        setRecording(null);
    };

    // Toggle recording on mic press
    const handleMicPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // Step 34: Placeholder Save Inspection Logic
    const saveInspection = async (ddid: string) => {
        console.log("Attempting to save inspection...");
        const dataToSave = {
            imageUri: imageUri, // Or a reference/URL if uploaded elsewhere
            description: description,
            ddid: ddid,
            userState: userState,
            timestamp: new Date().toISOString(),
        };
        console.log("Data to save:", dataToSave);

        try {
            const token = await getToken();
            if (!token) {
                 throw new Error("Authentication token not available.")
            }

            // *** Backend Call Placeholder ***
            const backendUrl = '/api/inspections'; // TODO: Replace with actual URL
            console.log(`Simulating POST to ${backendUrl}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save delay
            console.log("Inspection save simulated successfully.");

            /*
            // --- Actual Axios Call (uncomment and configure when backend is ready) ---
             const response = await axios.post(backendUrl, dataToSave, {
                 headers: {
                     Authorization: `Bearer ${token}`
                 }
             });
             console.log("Inspection saved successfully:", response.data);
             // Optionally show feedback to user
            // --- End Actual Axios Call ---
            */

        } catch (err: any) {
            console.error('Save inspection failed', err);
            // Optionally inform user, but maybe fail silently as DDID generation was the main goal
            Alert.alert('Save Error', 'Could not save inspection details.');
        }
    };

    // Step 29: DDID Generation Logic
    const handleGenerateDdid = async () => {
        if (!imageUri || !description || !imageBase64) {
            Alert.alert('Missing Information', 'Please select an image and provide a description.');
            return;
        }

        console.log('Starting DDID generation...');
        setIsGenerating(true);
        setError(null);
        setGeneratedDdid(null);

        try {
             const token = await getToken();
             if (!token) {
                 throw new Error("Authentication token not available.")
             }

             // *** Backend Call Placeholder ***
             const backendUrl = '/api/generate-ddid'; // TODO: Replace with actual URL
             console.log(`Sending data to ${backendUrl}`);

             // Simulate backend call
             await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate longer delay
             const dummyDdidResponse = `**Defect:** Cracked glass.\n**Description:** Multiple radial cracks emanating from a central impact point on the front windshield.\n**Implication:** Compromised structural integrity, potential for leaks, obstructs driver vision.`;
             console.log("Received dummy DDID:", dummyDdidResponse);

             setGeneratedDdid(dummyDdidResponse);
             setShowDdidModal(true);
             saveInspection(dummyDdidResponse); // Call save after generation

            /*
            // --- Actual Axios Call ---
             const response = await axios.post(backendUrl, {
                 imageBase64: imageBase64,
                 description: description,
                 userState: userState // Send user state
             }, {
                 headers: {
                     Authorization: `Bearer ${token}`
                 }
             });

             if (response.data && response.data.ddid) {
                 console.log("Received DDID:", response.data.ddid);
                 setGeneratedDdid(response.data.ddid);
                 setShowDdidModal(true);
                 saveInspection(response.data.ddid); // Call save after generation
             } else {
                 throw new Error('Invalid response from DDID generation server');
             }
            // --- End Actual Axios Call ---
             */

        } catch (err: any) {
            console.error('DDID Generation failed', err);
            setError('Failed to generate DDID. Please try again.');
            Alert.alert('Generation Error', err.message || 'Could not generate DDID response.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <Text style={styles.stateText}>{`State: ${userState}`}</Text>

                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons name="camera-outline" size={50} color={COLORS.darkText} />
                                <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.descriptionContainer}>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Describe the inspection issue..."
                            placeholderTextColor={COLORS.darkText}
                            multiline
                            value={description}
                            onChangeText={setDescription}
                            editable={!isRecording && !isTranscribing}
                        />
                        <TouchableOpacity 
                            style={styles.micButton} 
                            onPress={handleMicPress} 
                            disabled={isTranscribing}
                        >
                            {isTranscribing ? (
                                <ActivityIndicator size="small" color={COLORS.primary} /> 
                            ) : (
                                <Ionicons 
                                    name={isRecording ? "stop-circle-outline" : "mic-outline"} 
                                    size={24} 
                                    color={isRecording ? 'red' : COLORS.primary} 
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton, (!imageUri || !description || isGenerating) && styles.disabledButton]}
                        disabled={!imageUri || !description || isGenerating}
                        onPress={handleGenerateDdid}
                    >
                         {isGenerating ? (
                            <ActivityIndicator color={COLORS.white} />
                         ) : (
                            <Text style={styles.buttonText}>Generate DDID Response</Text>
                         )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={resetInspection}
                    >
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>New Chat</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContainer: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 50,
    },
    stateText: {
        fontSize: 16,
        color: COLORS.darkText,
        marginBottom: 15,
        alignSelf: 'flex-start',
    },
    imagePicker: {
        width: imageSize,
        height: imageSize,
        backgroundColor: COLORS.secondary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        marginTop: 10,
        color: COLORS.darkText,
    },
    descriptionContainer: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        minHeight: 100,
        paddingRight: 50,
    },
    descriptionInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: COLORS.darkText,
        textAlignVertical: 'top',
    },
    micButton: {
        position: 'absolute',
        right: 10,
        top: 10,
        padding: 5,
    },
    button: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
    },
    secondaryButton: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryButtonText: {
        color: COLORS.primary,
    },
    disabledButton: {
        backgroundColor: '#a0a0a0',
    },
});

export default NewInspectionScreen; 