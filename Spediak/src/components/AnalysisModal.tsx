import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput, // Added for editing
    ActivityIndicator
} from 'react-native';
import { X, Edit, Save, Send } from 'lucide-react-native';
import { COLORS } from '../styles/colors';

interface AnalysisModalProps {
    visible: boolean;
    analysisText: string | null;
    onClose: () => void;
    onEditSave: (editedText: string) => void; // Callback to save edited text
    onGenerateStatement: (analysisToUse: string) => void; // Callback to trigger final generation
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
    visible, 
    analysisText,
    onClose, 
    onEditSave,
    onGenerateStatement
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState('');
    const [currentAnalysis, setCurrentAnalysis] = useState('');

    useEffect(() => {
        // Reset state when modal becomes visible or analysis changes
        if (visible && analysisText) {
            setIsEditing(false);
            setCurrentAnalysis(analysisText);
            setEditedText(analysisText); // Pre-fill editor
        } else if (!visible) {
            // Clear state when modal closes
            setIsEditing(false);
            setCurrentAnalysis('');
            setEditedText('');
        }
    }, [visible, analysisText]);

    const handleEdit = () => {
        setEditedText(currentAnalysis); // Ensure editor has latest saved text
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedText(currentAnalysis); // Reset editor text
    };

    const handleSave = () => {
        setCurrentAnalysis(editedText); // Update the displayed analysis
        onEditSave(editedText); // Pass edited text back to parent state
        setIsEditing(false);
    };

    const handleGenerate = () => {
        // Use the currently displayed (potentially edited) analysis
        onGenerateStatement(currentAnalysis);
        onClose(); // Close modal after triggering generation
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
                        <Text style={styles.modalTitle}>AI Analysis</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#6c757d" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
                        {isEditing ? (
                             <TextInput
                                style={styles.textInput}
                                value={editedText}
                                onChangeText={setEditedText}
                                multiline
                                autoFocus
                            />
                        ) : (
                             <Text selectable style={styles.analysisTextContent}>
                                {currentAnalysis || 'Analysis not available.'}
                            </Text>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {isEditing ? (
                            <>
                                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
                                     <Save size={18} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Save Analysis</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                                     <X size={18} color={COLORS.darkText} style={styles.buttonIcon} />
                                    <Text style={styles.buttonTextSecondary}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                             <>
                                <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEdit}>
                                     <Edit size={18} color={COLORS.primary} style={styles.buttonIcon} />
                                    <Text style={styles.buttonTextAction}>Edit Analysis</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.generateButton]} onPress={handleGenerate}>
                                     <Send size={18} color="#fff" style={styles.buttonIcon} />
                                    <Text style={styles.buttonText}>Generate Statement</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// Styles (similar to DdidModal, adjusted for Analysis)
const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)'},
    modalView: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 15, padding: 0, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, overflow: 'hidden' },
    modalHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    closeButton: { padding: 5 },
    scrollView: { width: '100%' },
    scrollViewContent: { padding: 20 },
    analysisTextContent: { fontSize: 15, lineHeight: 22, color: '#333' },
    textInput: {
        fontSize: 15,
        lineHeight: 22,
        color: '#333',
        borderColor: COLORS.secondary,
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        minHeight: 150, // Give some space for editing
        textAlignVertical: 'top',
    },
    modalFooter: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#f8f9fa' },
    button: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5 },
    editButton: {
        backgroundColor: '#e9ecef',
        borderColor: '#ced4da',
        borderWidth: 1,
    },
    generateButton: {
        backgroundColor: COLORS.primary,
    },
    saveButton: { backgroundColor: COLORS.primary },
    cancelButton: { backgroundColor: '#e9ecef', borderColor: '#ced4da', borderWidth: 1 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    buttonTextSecondary: { color: COLORS.darkText, fontWeight: 'bold', fontSize: 14 },
    buttonTextAction: {
        color: COLORS.darkText,
        fontWeight: 'bold',
        fontSize: 14
    },
    buttonIcon: { marginRight: 8 },
});

export default AnalysisModal; 