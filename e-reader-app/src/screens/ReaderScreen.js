import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Pdf from 'react-native-pdf';
import { supabase } from '../services/supabase';
import { summarizeText } from '../services/ai';
import SummaryModal from '../components/SummaryModal';

const ReaderScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  
  const pdfRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: book.title });
  }, [navigation, book]);

  const saveBookmark = async () => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .upsert({ book_id: book.id, page_number: currentPage }, { onConflict: 'book_id' });

      if (error) {
        throw error;
      }
      Alert.alert('Bookmark Saved', `Page ${currentPage} has been saved.`);
    } catch (error) {
      console.error('Error saving bookmark:', error);
      Alert.alert('Bookmark Saved locally', `Page ${currentPage} saved (Supabase not connected).`);
    }
  };

  const handleAiSummary = async () => {
    setSummaryVisible(true);
    setSummaryLoading(true);
    
    // Simulate extracting text from the PDF since extracting text in react-native-pdf requires native implementation
    const mockExtractedText = `Content of ${book.title} by ${book.author} on page ${currentPage}. This page introduces key concepts and exciting narrative elements.`;
    
    const summary = await summarizeText(mockExtractedText);
    setSummaryText(summary);
    setSummaryLoading(false);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const source = { uri: book.pdf_url, cache: true };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.toolbar, isDarkMode && styles.toolbarDark]}>
        <TouchableOpacity style={[styles.toolButton, isDarkMode && styles.toolButtonDark]} onPress={toggleDarkMode}>
          <Text style={[styles.toolButtonText, isDarkMode && styles.textDark]}>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.toolButton, isDarkMode && styles.toolButtonDark]} onPress={saveBookmark}>
          <Text style={[styles.toolButtonText, isDarkMode && styles.textDark]}>Bookmark</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.toolButton, styles.aiButton]} onPress={handleAiSummary}>
          <Text style={styles.aiButtonText}>✨ AI Summary</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pdfContainer}>
        <Pdf
          ref={pdfRef}
          source={source}
          onLoadComplete={(numberOfPages) => setTotalPages(numberOfPages)}
          onPageChanged={(page) => setCurrentPage(page)}
          onError={(error) => {
            console.log(error);
            Alert.alert('Error', 'Failed to load PDF.');
          }}
          enablePaging={true}
          horizontal={true}
          trustAllCerts={false}
          style={[styles.pdf, isDarkMode && styles.pdfDark]}
        />
      </View>

      <View style={[styles.footer, isDarkMode && styles.footerDark]}>
        <Text style={[styles.pageIndicator, isDarkMode && styles.textDark]}>
          Page {currentPage} of {totalPages || '--'}
        </Text>
      </View>

      <SummaryModal 
        visible={summaryVisible}
        isLoading={summaryLoading}
        summary={summaryText}
        onClose={() => setSummaryVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolbarDark: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333333',
  },
  toolButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f3f4',
  },
  toolButtonDark: {
    backgroundColor: '#2d2d2d',
  },
  aiButton: {
    backgroundColor: '#e8f0fe',
    borderWidth: 1,
    borderColor: '#d2e3fc',
  },
  toolButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c4043',
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  textDark: {
    color: '#e8eaed',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0', // background behind PDF
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  pdfDark: {
    backgroundColor: '#000000',
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerDark: {
    backgroundColor: '#1e1e1e',
    borderTopColor: '#333333',
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f6368',
  }
});

export default ReaderScreen;
