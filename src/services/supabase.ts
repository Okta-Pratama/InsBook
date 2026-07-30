import { createClient } from '@supabase/supabase-js';

export interface Book {
  id: string;
  title: string;
  author: string;
  pdfurl: string;
}

export interface Bookmark {
  id: string;
  user_id?: string;
  book_id: string;
  page_number: number;
  books?: { title: string };
}

export interface Note {
  id: string;
  user_id: string;
  book_id: string;
  page_number?: number;
  content: string;
  is_general: boolean;
  created_at: string;
  books?: { title: string };
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
}

export interface Highlight {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  rects: HighlightRect[];
  color: string;
  label: string | null;
  created_at: string;
  books?: { title: string };
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  updated_at: string;
  books?: { title: string };
}

// Initialize real Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isUrlValid = supabaseUrl.startsWith('http');
export const supabase = isUrlValid ? createClient(supabaseUrl, supabaseKey) : null;

// Helper to get current user id
const getUserId = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

// Supabase API service wrapper
export const supabaseService = {
  // Books
  getBooks: async (): Promise<Book[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').select('*');
        if (error) { console.error("Error fetching books:", error); throw error; }
        return data || [];
      } catch (e) {
        console.error("Failed to fetch from real Supabase", e);
      }
    }
    return [];
  },
  
  getBook: async (id: string): Promise<Book | undefined> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
        if (error) { console.error("Error fetching book:", error); throw error; }
        return data || undefined;
      } catch (e) {
        console.error("Failed to fetch from real Supabase", e);
      }
    }
    return undefined;
  },

  addBook: async (title: string, author: string, pdfurl: string): Promise<Book | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').insert({ title, author, pdfurl }).select().single();
        if (error) { console.error("Error adding book:", error); throw error; }
        return data;
      } catch (e) {
        console.error("Failed to add book to real Supabase", e);
        throw e;
      }
    }
    return null;
  },

  updateBook: async (id: string, title: string, author: string, pdfurl: string): Promise<Book | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('books').update({ title, author, pdfurl }).eq('id', id).select().single();
        if (error) { console.error("Error updating book:", error); throw error; }
        return data;
      } catch (e) {
        console.error("Failed to update book in real Supabase", e);
        throw e;
      }
    }
    return null;
  },

  deleteBook: async (bookId: string): Promise<boolean> => {
    if (supabase) {
      try {
        // First delete all related records to avoid foreign key constraint errors
        await Promise.all([
          supabase.from('notes').delete().eq('book_id', bookId),
          supabase.from('highlights').delete().eq('book_id', bookId),
          supabase.from('bookmarks').delete().eq('book_id', bookId)
        ]);

        // Then delete the book itself
        const { error } = await supabase.from('books').delete().eq('id', bookId);
        if (error) { console.error("Error deleting book:", error); throw error; }
        return true;
      } catch (e) {
        console.error("Failed to delete book from real Supabase", e);
      }
    }
    return false;
  },

  // Reading Progress
  getReadingProgresses: async (): Promise<ReadingProgress[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('reading_progress')
          .select('*, books(title)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        // @ts-ignore
        return data || [];
      } catch (e) {
        console.error("Failed to get reading progresses:", e);
      }
    }
    return [];
  },

  saveReadingProgress: async (bookId: string, pageNumber: number): Promise<void> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { error } = await supabase.from('reading_progress').upsert({ 
          user_id: userId, 
          book_id: bookId, 
          page_number: pageNumber,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, book_id' });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to save reading progress:", e);
      }
    }
  },

  // Bookmarks
  getBookmarks: async (bookId: string): Promise<Bookmark[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('bookmarks').select('*').eq('book_id', bookId).eq('user_id', userId);
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get bookmarks:", e);
      }
    }
    return [];
  },

  getAllBookmarks: async (): Promise<Bookmark[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('bookmarks').select('*').eq('user_id', userId);
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get all bookmarks:", e);
      }
    }
    return [];
  },

  saveBookmark: async (bookId: string, pageNumber: number): Promise<Bookmark | null> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data: existing } = await supabase.from('bookmarks').select('id').eq('book_id', bookId).eq('user_id', userId);
        
        if (existing && existing.length > 0) {
          const { data, error } = await supabase.from('bookmarks').update({ page_number: pageNumber }).eq('id', existing[0].id).select().single();
          if (error) throw error;
          
          if (existing.length > 1) {
            const idsToDelete = existing.slice(1).map(e => e.id);
            await supabase.from('bookmarks').delete().in('id', idsToDelete);
          }
          return data;
        } else {
          const { data, error } = await supabase.from('bookmarks').insert({ user_id: userId, book_id: bookId, page_number: pageNumber }).select().single();
          if (error) throw error;
          return data;
        }
      } catch (e) {
        console.error("Failed to save bookmark:", e);
        throw e;
      }
    }
    return null;
  },

  deleteBookmark: async (bookmarkId: string): Promise<boolean> => {
    if (supabase) {
      const { error } = await supabase.from('bookmarks').delete().eq('id', bookmarkId);
      return !error;
    }
    return false;
  },

  // Notes
  getNotes: async (bookId: string): Promise<Note[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('notes').select('*').eq('book_id', bookId).eq('user_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get notes:", e);
      }
    }
    return [];
  },

  getAllNotes: async (): Promise<Note[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get all notes:", e);
      }
    }
    return [];
  },

  saveNote: async (bookId: string, pageNumber: number | undefined, content: string, is_general: boolean = false): Promise<Note | null> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('notes').insert({ user_id: userId, book_id: bookId, page_number: pageNumber, content, is_general }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Failed to save note:", e);
        throw e;
      }
    }
    return null;
  },

  deleteNote: async (noteId: string): Promise<boolean> => {
    if (supabase) {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      return !error;
    }
    return false;
  },

  // Highlights
  getHighlights: async (bookId: string): Promise<Highlight[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('highlights').select('*').eq('book_id', bookId).eq('user_id', userId);
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get highlights:", e);
      }
    }
    return [];
  },

  getAllHighlights: async (): Promise<Highlight[]> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('highlights').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Failed to get all highlights:", e);
      }
    }
    return [];
  },

  saveHighlight: async (bookId: string, pageNumber: number, textContent: string, rects: HighlightRect[], color: string, label?: string): Promise<Highlight | null> => {
    const userId = await getUserId();
    if (supabase && userId) {
      try {
        const { data, error } = await supabase.from('highlights').insert({ 
          user_id: userId, book_id: bookId, page_number: pageNumber, text_content: textContent, rects, color, label 
        }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("Failed to save highlight:", e);
        throw e;
      }
    }
    return null;
  },

  deleteHighlight: async (highlightId: string): Promise<boolean> => {
    if (supabase) {
      const { error } = await supabase.from('highlights').delete().eq('id', highlightId);
      return !error;
    }
    return false;
  }
};
