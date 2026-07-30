import { createClient } from '@supabase/supabase-js';

export interface Book {
  id: string;
  title: string;
  author: string;
  pdfurl: string;
}

export interface Bookmark {
  id: string;
  book_id: string;
  page_number: number;
}

// Mocked data for fallback
const MOCK_BOOKS: Book[] = [
  {
    id: '1',
    title: 'The Principles of Scientific Management',
    author: 'Frederick Winslow Taylor',
    pdfurl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    id: '2',
    title: 'Strategic Marketing: Laplace Criteria',
    author: 'Dr. Emily Chen',
    pdfurl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    id: '3',
    title: 'Decision-Making Theories: Maximax vs Maximin',
    author: 'Prof. John Smith',
    pdfurl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
  }
];

let MOCK_BOOKMARKS: Bookmark[] = [];

// Initialize real Supabase client
const supabaseUrl = 'https://dyqvlxpfgdxmrvrlwymd.supabase.co';
const supabaseKey = 'sb_publishable_bIA3PtpncZv9ksIMrxALNQ_3ylwiIYm';

// Only create client if URL is valid (not the placeholder)
const isUrlValid = supabaseUrl.startsWith('http');
export const supabase = isUrlValid ? createClient(supabaseUrl, supabaseKey) : null;

// Supabase API service wrapper
export const supabaseService = {
  getBooks: async (): Promise<Book[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').select('*');
        if (!error && data) return data;
      } catch (e) {
        console.error("Failed to fetch from real Supabase, falling back to mock", e);
      }
    }
    // Fallback to mock
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_BOOKS), 500));
  },
  
  getBook: async (id: string): Promise<Book | undefined> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {
        console.error("Failed to fetch from real Supabase, falling back to mock", e);
      }
    }
    // Fallback
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_BOOKS.find(b => b.id === id)), 300));
  },

  getBookmarks: async (bookId: string): Promise<Bookmark[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('bookmarks').select('*').eq('book_id', bookId);
        if (!error && data) return data;
      } catch (e) {
        console.error("Failed to fetch from real Supabase, falling back to mock", e);
      }
    }
    // Fallback
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_BOOKMARKS.filter(b => b.book_id === bookId)), 300));
  },

  saveBookmark: async (bookId: string, pageNumber: number): Promise<Bookmark> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('bookmarks').insert({ book_id: bookId, page_number: pageNumber }).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.error("Failed to fetch from real Supabase, falling back to mock", e);
      }
    }
    // Fallback
    return new Promise((resolve) => {
      setTimeout(() => {
        const newBookmark: Bookmark = {
          id: Math.random().toString(36).substring(7),
          book_id: bookId,
          page_number: pageNumber
        };
        MOCK_BOOKMARKS.push(newBookmark);
        resolve(newBookmark);
      }, 500);
    });
  }
};
