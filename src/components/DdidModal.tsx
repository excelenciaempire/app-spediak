import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Dimensions,
    Image
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X, Copy } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display'; // For rendering bold text etc.

interface DdidModalProps {
    visible: boolean;
    onClose: () => void;
    ddidText: string;
    imageUrl?: string; // Make imageUrl prop optional
}

const { width, height } = Dimensions.get('window');

const DdidModal: React.FC<DdidModalProps> = ({ visible, onClose, ddidText, imageUrl }) => {

    // Step 32: Copy Logic
    const copyToClipboard = async () => {
        try {
            await Clipboard.setStringAsync(ddidText);
            Alert.alert('Copied!', 'DDID report copied to clipboard.');
        } catch (e) {
            Alert.alert('Error', 'Could not copy text.');
            console.error("Clipboard error:", e);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose} // Handle back button on Android
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    {/* Header with Title and Close Button */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>DDID Report</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.modalSubtitle}>Defect, Description, Implication, Direction</Text>

                    {/* Conditionally Render Image */}
                    {imageUrl && (
                        <Image source={{ uri: imageUrl }} style={styles.modalImage} resizeMode="contain" />
                    )}

                    {/* Scrollable Content Area */}
                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
                        {/* Step 31: Render DDID Text (using Markdown) */}
                        <Markdown style={markdownStyles}>
                            {ddidText || 'No content available.'}
                         </Markdown>
                    </ScrollView>

                    {/* Footer with Copy Button */}
                    <View style={styles.modalFooter}>
                         <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                             <Copy size={18} color="#fff" style={styles.copyIcon} />
                             <Text style={styles.copyButtonText}>Copy Report</Text>
                         </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Step 31: Styles
const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dimmed background
    },
    modalView: {
        width: width * 0.9, // 90% of screen width
        maxHeight: height * 0.8, // 80% of screen height
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 15, // More rounded corners
        padding: 0, // Remove padding, handle internally
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden', // Ensure children conform to rounded corners
    },
    modalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
         padding: 5, // Increase tappable area
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#6c757d',
        marginTop: 0,
        marginBottom: 15,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    scrollView: {
        width: '100%',
    },
    scrollViewContent: {
         paddingHorizontal: 20,
         paddingBottom: 20, // Space at the bottom of scroll
    },
    modalImage: { // Style for the image inside the modal
        width: '90%', // Take most of the modal width
        height: 150, // Fixed height for the image
        borderRadius: 8,
        marginBottom: 15, // Space below the image
        backgroundColor: '#eee', // Placeholder bg
    },
    modalText: { // Style for Markdown rendered text (default)
        marginBottom: 15,
        fontSize: 16,
        lineHeight: 24, // Improve readability
        color: '#333',
    },
    modalFooter: {
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'center',
        backgroundColor: '#f8f9fa' // Slight background differentiation
    },
    copyButton: {
        flexDirection: 'row',
        backgroundColor: '#2c3e50',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    copyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    copyIcon: {
        marginRight: 8,
    }
});

// Styles for Markdown rendering
const markdownStyles = StyleSheet.create({
    body: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    heading1: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#0056b3',
    },
    heading2: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
        color: '#0056b3',
    },
    strong: {
        fontWeight: 'bold',
    },
    em: {
        fontStyle: 'italic',
    },
    list_item: {
        marginVertical: 4,
    },
    bullet_list: {
        marginLeft: 15, // Indent list
    },
    ordered_list: {
         marginLeft: 15, // Indent list
    },
    // Add other markdown element styles as needed
});

export default DdidModal; 