import React, { useState } from 'react';
import { 
    Modal, 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { Check, Edit, BrainCircuit, X } from 'lucide-react-native';
import { COLORS } from '../styles/colors';

interface PreDescriptionModalProps {
    visible: boolean;
    onClose: () => void;
    preDescription: string;
    originalDescription: string; // Needed if user cancels edit
    onGenerateFinalDdid: (finalDescription: string) => void;
    isLoading: boolean;
}

const PreDescriptionModal: React.FC<PreDescriptionModalProps> = ({ 
    visible, 
    onClose, 
    preDescription, 
    originalDescription, 
    onGenerateFinalDdid,
    isLoading
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentDescriptionText, setCurrentDescriptionText] = useState(preDescription);

    // Update local state if the prop changes (when modal re-opens)
    React.useEffect(() => {
        setCurrentDescriptionText(preDescription);
        setIsEditing(false); // Reset edit mode when modal opens
    }, [preDescription, visible]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleConfirmEdit = () => {
        setIsEditing(false);
        // The description is already updated via onChangeText
    };

    const handleGenerate = () => {
        onGenerateFinalDdid(currentDescriptionText);
        // onClose(); // Keep modal open while generating?
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirm Description</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        <Text style={styles.instructionText}>
                            Review the AI's preliminary description. You can edit it before generating the final statement.
                        </Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.textInput}
                                value={currentDescriptionText}
                                onChangeText={setCurrentDescriptionText}
                                multiline
                                autoFocus={true}
                            />
                        ) : (
                            <Text style={styles.descriptionText}>{currentDescriptionText}</Text>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {isEditing ? (
                            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmEdit}>
                                <Check size={18} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Confirm Edit</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEdit}>
                                <Edit size={18} color={COLORS.primary} style={styles.buttonIcon} />
                                <Text style={[styles.buttonText, styles.editButtonText]}>Edit</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.button, styles.generateButton, isLoading && styles.buttonDisabled]} 
                            onPress={handleGenerate}
                            disabled={isLoading || isEditing} // Disable while loading or editing
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
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalView: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 15, padding: 0, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeButton: { padding: 5 },
    scrollView: { maxHeight: 300, width: '100%', paddingVertical: 15, paddingHorizontal: 20 }, // Limit height
    instructionText: { fontSize: 14, color: '#555', marginBottom: 15, textAlign: 'center' },
    descriptionText: { fontSize: 15, lineHeight: 22, color: '#333', padding: 10, backgroundColor: '#f8f9fa', borderRadius: 5 },
    textInput: { fontSize: 15, lineHeight: 22, color: '#333', padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, minHeight: 100, textAlignVertical: 'top' },
    modalFooter: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#f8f9fa' },
    button: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 5 },
    editButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.primary },
    confirmButton: { backgroundColor: COLORS.success },
    generateButton: { backgroundColor: COLORS.primary },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    editButtonText: { color: COLORS.primary },
    buttonIcon: { marginRight: 8 },
    buttonDisabled: { opacity: 0.6, backgroundColor: '#a0aec0' },
});

export default PreDescriptionModal; 