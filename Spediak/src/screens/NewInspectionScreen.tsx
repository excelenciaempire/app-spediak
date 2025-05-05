// Contains feature logic: Drag/Drop, Image Picker, Mic Recording, API Calls
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
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Mic, RefreshCcw, BrainCircuit } from 'lucide-react-native';
import { COLORS } from '../styles/colors'; 
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from 'axios'; 
import { BASE_URL } from '../config/api';
import PreDescriptionModal from '../components/PreDescriptionModal';
import DdidModal from '../components/DdidModal';

export default function NewInspectionScreen() { 
    const { user } = useUser();
    const { getToken } = useAuth(); 
    const userState = user?.publicMetadata?.state as string || 'N/A'; 

    // State Variables
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [description, setDescription] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false); 
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false); 
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false); 
    const [recording, setRecording] = useState<Audio.Recording | null>(null); 
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false); 
    const [preDescriptionText, setPreDescriptionText] = useState<string | null>(null);
    const [originalDescription, setOriginalDescription] = useState<string | null>(null);
    const [isPreDescriptionModalVisible, setIsPreDescriptionModalVisible] = useState<boolean>(false);
    const [isGeneratingFinalDdid, setIsGeneratingFinalDdid] = useState<boolean>(false);
    const [finalDdidText, setFinalDdidText] = useState<string | null>(null);
    const [isDdidModalVisible, setIsDdidModalVisible] = useState<boolean>(false);

    // --- Drag and Drop Logic (Web Only) --- START ---
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (Platform.OS !== 'web') return;
        event.preventDefault(); 
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

            if (!file.type.startsWith('image/')) {
                setError('Invalid file type. Please drop an image file.');
                Alert.alert('Invalid File', 'Please drop an image file (e.g., JPG, PNG).');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1]; 
                const uri = reader.result as string; 
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
        setError(null); 
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        };

        try {
            let result: ImagePicker.ImagePickerResult;
            if (Platform.OS === 'web') {
                result = await ImagePicker.launchImageLibraryAsync(options);
            } else {
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
                    Alert.alert('Permission required', 'Camera and Media Library permissions are needed.');
                    return;
                }
                result = await new Promise((resolve) => {
                     Alert.alert(
                         "Select Image Source",
                         "Choose where to get the image from:",
                         [
                             { text: "Take Photo", onPress: async () => resolve(await ImagePicker.launchCameraAsync(options)) },
                             { text: "Choose from Library", onPress: async () => resolve(await ImagePicker.launchImageLibraryAsync(options)) },
                             { text: "Cancel", style: "cancel", onPress: () => resolve({ canceled: true, assets: null }) },
                         ],
                         { cancelable: true, onDismiss: () => resolve({ canceled: true, assets: null }) }
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

    // --- Microphone Recording Logic --- START ---
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
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); 
            console.log('Starting recording...');
            const { recording: newRecording } = await Audio.Recording.createAsync(
               Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsRecording(true);
            console.log('Recording started successfully.');
        } catch (err: any) {
            console.error('Failed to start recording', err);
            setError(`Failed to start recording: ${err.message}`);
            Alert.alert('Recording Error', `Could not start recording: ${err.message}`);
            setIsRecording(false);
            setRecording(null);
        }
    };

    const stopRecording = async () => {
        if (!recording) {
            console.warn('Stop recording called but no recording object exists.');
            setIsRecording(false); 
            return;
        }
        console.log('Stopping recording...');
        setIsRecording(false);
        setIsTranscribing(true); 
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);
            setRecording(null); 
            if (uri) {
                try {
                    let base64Audio: string | null = null;
                    if (Platform.OS === 'web') {
                        console.log('Fetching blob for web...');
                        const response = await fetch(uri);
                        const blob = await response.blob();
                        base64Audio = await new Promise((resolve, reject) => {
                           const reader = new FileReader();
                           reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                           reader.onerror = reject;
                           reader.readAsDataURL(blob);
                        });
                        console.log('Web blob read successfully.');
                    } else {
                         base64Audio = await FileSystem.readAsStringAsync(uri, {
                             encoding: FileSystem.EncodingType.Base64,
                         });
                    }
                    if (base64Audio) {
                         console.log('Successfully got Base64 audio data.');
                         await transcribeAudio(base64Audio);
                    } else {
                         throw new Error('Failed to obtain base64 audio data.');
                    }
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
            setRecording(null); 
        }
    };

    const transcribeAudio = async (base64Audio: string) => {
        setIsTranscribing(true); 
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            console.log('Sending audio for transcription...');
            const response = await axios.post(`${BASE_URL}/api/transcribe`, 
                { audioBase64: base64Audio },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data && response.data.transcription) {
                console.log('Transcription successful:', response.data.transcription);
                setDescription(prev => (prev ? prev + ' ' : '') + response.data.transcription);
            } else {
                throw new Error('Invalid transcription response from server.');
            }
        } catch (err: any) {
            console.error('Transcription Error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to transcribe audio.';
            setError(errorMessage);
            Alert.alert('Transcription Failed', errorMessage);
        } finally {
            setIsTranscribing(false); 
        }
    };
    // --- Microphone Recording Logic --- END ---

    const handleAnalyzeRequest = async () => { 
        console.log("Analyze button pressed");
        if (!imageBase64 || !description) { 
             Alert.alert("Missing Info", "Please provide an image and description.");
             return;
        }
        setIsAnalyzing(true);
        setError(null);
        setPreDescriptionText(null);
        setOriginalDescription(description);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            console.log("Sending image/description for pre-description analysis...");
            const analyzeResponse = await axios.post(`${BASE_URL}/api/analyze-defect`, 
                { imageBase64, description, userState },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (analyzeResponse.data && analyzeResponse.data.preDescription) {
                console.log("Pre-description received:", analyzeResponse.data.preDescription);
                setPreDescriptionText(analyzeResponse.data.preDescription);
                setIsPreDescriptionModalVisible(true);
            } else {
                throw new Error('Invalid pre-description response from server.');
            }
        } catch (err: any) {
            console.error('Pre-description Analysis Error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to get pre-description.';
            setError(errorMessage);
            Alert.alert('Analysis Failed', errorMessage);
        } finally {
            setIsAnalyzing(false); 
        }
    };

    const handleGenerateFinalDdid = async (finalDescription: string) => { 
        console.log("Generate Final DDID requested with description:", finalDescription);
        if (!imageBase64) {
             Alert.alert("Missing Image", "Image data is missing.");
             return;
        }
        setIsPreDescriptionModalVisible(false);
        setIsGeneratingFinalDdid(true);
        setError(null);
        setFinalDdidText(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log("Sending analysis for final DDID generation and save...");
            const generateResponse = await axios.post(`${BASE_URL}/api/generate-ddid`, 
                { 
                    imageBase64, 
                    finalDescription,
                    userState, 
                    imageUrl: imageUri,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const ddid = generateResponse.data?.ddid;
            const inspectionId = generateResponse.data?.inspectionId;

            if (!ddid || inspectionId === undefined) {
                 throw new Error('Invalid final DDID response from server.');
            }
            console.log("Final DDID generated and saved:", inspectionId);

            setFinalDdidText(ddid);
            setIsDdidModalVisible(true); 

        } catch (err: any) {
            console.error('Generate Final DDID Error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to generate final statement.';
            setError(errorMessage);
            Alert.alert('Generation Failed', errorMessage);
        } finally {
            setIsGeneratingFinalDdid(false); 
        }
    };

    const handleNewDefect = () => {
        console.log("New Defect pressed");
        setImageUri(null);
        setImageBase64(null);
        setDescription('');
        setError(null);
        setIsRecording(false);
        setIsAnalyzing(false);
        setIsGeneratingFinalDdid(false);
        setPreDescriptionText(null);
        setOriginalDescription(null);
        setFinalDdidText(null);
        setIsPreDescriptionModalVisible(false);
        setIsDdidModalVisible(false);
        Alert.alert("New Defect", "Form cleared.");
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            <Text style={styles.stateText}>State: {userState}</Text>
            <TouchableOpacity 
                style={[styles.imagePicker, isDragging && styles.imagePickerDragging]} 
                onPress={pickImage}
                {...(Platform.OS === 'web' ? { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop } : {})}
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
            <TouchableOpacity 
                style={[styles.button, styles.generateButton, (isAnalyzing || !imageBase64 || !description) && styles.buttonDisabled]} 
                onPress={handleAnalyzeRequest}
                disabled={isAnalyzing || !imageBase64 || !description}
            >
                {isAnalyzing ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                     <>
                        <BrainCircuit size={18} color="#fff" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>Analyze</Text>
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
            <PreDescriptionModal 
                visible={isPreDescriptionModalVisible}
                onClose={() => setIsPreDescriptionModalVisible(false)}
                preDescription={preDescriptionText ?? ''}
                originalDescription={originalDescription ?? ''}
                onGenerateFinalDdid={handleGenerateFinalDdid}
                isLoading={isGeneratingFinalDdid}
            />
            <DdidModal 
                visible={isDdidModalVisible}
                onClose={() => setIsDdidModalVisible(false)}
                ddidText={finalDdidText ?? ''}
                imageUrl={imageUri || undefined}
            />
            {isGeneratingFinalDdid && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Generating Final Statement...</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    contentContainer: { padding: 20, alignItems: 'center' },
    stateText: { fontSize: 14, color: '#6c757d', position: 'absolute', top: 10, right: 20, fontWeight: '500' },
    imagePicker: { width: '100%', maxWidth: 500, height: 250, backgroundColor: '#e9ecef', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#ced4da', borderStyle: 'dashed', overflow: 'hidden' },
    imagePickerDragging: { borderColor: COLORS.primary, borderWidth: 3 },
    imagePlaceholder: { alignItems: 'center' },
    imagePlaceholderText: { marginTop: 10, color: '#6c757d', fontSize: 16 },
    imagePreview: { width: '100%', height: '100%' },
    descriptionContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 500, marginBottom: 20, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ced4da' },
    textInput: { flex: 1, minHeight: 100, padding: 15, fontSize: 16, textAlignVertical: 'top', color: '#333' },
    micButton: { padding: 15 },
    button: { flexDirection: 'row', width: '100%', maxWidth: 500, paddingVertical: 15, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
    generateButton: { backgroundColor: COLORS.primary },
    newDefectButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.primary },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    newDefectButtonText: { color: COLORS.primary },
    buttonIcon: { marginRight: 8 },
    buttonDisabled: { opacity: 0.6, backgroundColor: '#a0aec0' },
    errorText: { color: COLORS.danger, marginBottom: 15, textAlign: 'center' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.darkText,
    }
}); 