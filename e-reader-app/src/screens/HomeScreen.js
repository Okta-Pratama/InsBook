import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { supabase } from '../services/supabase';
import BookItem from '../components/BookItem';

const HomeScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('books').select('*');
      
      if (error) {
        console.error('Error fetching books:', error);
      } else {
        if (!data || data.length === 0) {
          // Mock data fallback if DB is empty
          setBooks([
            { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', pdf_url: 'http://samples.leanpub.com/thereactnativebook-sample.pdf' },
            { id: '2', title: '1984', author: 'George Orwell', pdf_url: 'http://samples.leanpub.com/thereactnativebook-sample.pdf' },
          ]);
        } else {
          setBooks(data);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      // Mock data fallback if Supabase is not configured yet
      setBooks([
        { id: '1', title: 'The Great Gatsby (Mock)', author: 'F. Scott Fitzgerald', pdf_url: 'http://samples.leanpub.com/thereactnativebook-sample.pdf' },
        { id: '2', title: '1984 (Mock)', author: 'George Orwell', pdf_url: 'http://samples.leanpub.com/thereactnativebook-sample.pdf' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBookPress = (book) => {
    navigation.navigate('Reader', { book });
  };

  if (loading && books.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading your library...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BookItem book={item} onPress={handleBookPress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchBooks} colors={['#4285F4']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No books found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#5f6368',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#202124',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#80868b',
  },
});

export default HomeScreen;
