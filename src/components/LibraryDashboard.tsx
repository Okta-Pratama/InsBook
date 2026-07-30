import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabase';
import type { Book, Note, Highlight, Bookmark, ReadingProgress } from '../services/supabase';
import { BookOpen, User, ChevronRight, Play, FileText, Highlighter, Bookmark as BookmarkIcon, Library, LogOut, PlusCircle, Save, Trash2, ShieldAlert, Loader2, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

type DashboardTab = 'library' | 'notes' | 'highlights' | 'bookmarks' | 'admin';

export const LibraryDashboard: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [progresses, setProgresses] = useState<ReadingProgress[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('library');
  
  // Admin form state
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookUrl, setNewBookUrl] = useState('');
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const isAdmin = session?.user?.email === 'oktaiwp849@gmail.com';
  
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [fetchedBooks, fetchedNotes, fetchedHighlights, fetchedBookmarks, fetchedProgress] = await Promise.all([
          supabaseService.getBooks(),
          supabaseService.getAllNotes(),
          supabaseService.getAllHighlights(),
          supabaseService.getAllBookmarks(),
          supabaseService.getReadingProgresses()
        ]);
        const bookMap = new Map(fetchedBooks.map(b => [b.id, b]));

        // Deduplicate bookmarks (only 1 per book)
        const uniqueBookmarksMap = new Map();
        fetchedBookmarks.forEach(b => {
           if (!uniqueBookmarksMap.has(b.book_id)) {
              uniqueBookmarksMap.set(b.book_id, b);
           }
        });
        const uniqueBookmarks = Array.from(uniqueBookmarksMap.values());

        setBooks(fetchedBooks);
        setNotes(fetchedNotes.map(n => ({ ...n, books: { title: bookMap.get(n.book_id)?.title || 'Unknown Book' } })));
        setHighlights(fetchedHighlights.map(h => ({ ...h, books: { title: bookMap.get(h.book_id)?.title || 'Unknown Book' } })));
        setBookmarks(uniqueBookmarks.map(b => ({ ...b, books: { title: bookMap.get(b.book_id)?.title || 'Unknown Book' } })));
        setProgresses(fetchedProgress);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim() || !newBookAuthor.trim() || !newBookUrl.trim()) return;
    
    setIsAddingBook(true);
    try {
      if (editingBookId) {
        const updated = await supabaseService.updateBook(editingBookId, newBookTitle, newBookAuthor, newBookUrl);
        if (updated) {
          setBooks(books.map(b => b.id === editingBookId ? updated : b));
          alert('Book updated successfully!');
        }
      } else {
        const added = await supabaseService.addBook(newBookTitle, newBookAuthor, newBookUrl);
        if (added) {
          setBooks([...books, added]);
          alert('Book added successfully!');
        }
      }
      resetForm();
    } catch (err) {
      alert(`Failed to ${editingBookId ? 'update' : 'add'} book. Make sure you have RLS permissions.`);
    } finally {
      setIsAddingBook(false);
    }
  };

  const resetForm = () => {
    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookUrl('');
    setEditingBookId(null);
  };

  const handleEditClick = (book: Book) => {
    setEditingBookId(book.id);
    setNewBookTitle(book.title);
    setNewBookAuthor(book.author);
    setNewBookUrl(book.pdfurl);
    // scroll to top where form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${bookTitle}"? This cannot be undone.`)) {
      return;
    }
    
    setIsDeletingId(bookId);
    try {
      const success = await supabaseService.deleteBook(bookId);
      if (success) {
        setBooks(books.filter(b => b.id !== bookId));
      } else {
        alert('Failed to delete book. Make sure you have RLS permissions.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting book.');
    } finally {
      setIsDeletingId(null);
    }
  };

  const continueReading = progresses.length > 0 ? progresses[0] : null;

  return (
    <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header / Navbar */}
        <header className="mb-6 md:mb-10 flex items-center justify-between border-b border-[var(--color-border)] pb-4 md:pb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-500 p-2 md:p-2.5 rounded-xl shadow-sm flex-shrink-0">
              <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
              InsBook
            </h1>
          </div>

          {supabase && session && (
            <div className="flex items-center space-x-3 md:space-x-4">
              <span className="text-[11px] md:text-sm text-gray-500 font-medium truncate max-w-[120px] md:max-w-[200px]">
                {session.user.user_metadata?.full_name || session.user.email?.split('@')[0]}
              </span>
              
              {/* Mobile Logout */}
              <button 
                onClick={() => signOut()}
                className="md:hidden p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-md transition-colors shadow-sm"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              
              {/* Desktop Logout */}
              <button 
                onClick={() => signOut()}
                className="hidden md:flex px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </button>
            </div>
          )}
        </header>

        {/* Continue Reading Banner */}
        {!loading && continueReading && (
          <div className="mb-6 md:mb-10 group cursor-pointer" onClick={() => navigate(`/reader/${continueReading.book_id}`)}>
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 md:p-6 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 bg-white/10 skew-x-12 translate-x-8 pointer-events-none"></div>
              
              <div className="flex items-center space-x-3 md:space-x-4 relative z-10">
                <div className="bg-white/20 p-3 md:p-4 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current ml-0.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] md:text-xs font-bold text-orange-100 uppercase tracking-wider mb-0.5 md:mb-1">Continue Reading</span>
                  <h3 className="text-sm md:text-xl font-bold leading-tight line-clamp-1 max-w-[200px] sm:max-w-xs md:max-w-md">{continueReading.books?.title || 'Unknown Book'}</h3>
                  <p className="text-orange-100 font-medium text-[11px] md:text-sm mt-0.5">Page {continueReading.page_number}</p>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center space-x-2 text-white font-bold relative z-10 group-hover:translate-x-1 transition-transform">
                <span>Resume</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-1 border-b border-slate-200 hide-scrollbar">
          {(['library', 'notes', 'highlights', 'bookmarks', ...(isAdmin ? ['admin'] : [])] as DashboardTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "flex items-center px-4 py-2.5 text-sm font-semibold capitalize rounded-t-xl transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center",
                activeTab === tab 
                  ? "bg-white text-orange-600 border-t border-l border-r border-slate-200 -mb-[1px]" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              {tab === 'library' && <Library className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />}
              {tab === 'notes' && <FileText className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />}
              {tab === 'highlights' && <Highlighter className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />}
              {tab === 'bookmarks' && <BookmarkIcon className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />}
              {tab === 'admin' && <PlusCircle className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{tab === 'admin' ? 'Add Book' : tab}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="min-h-[400px]">
            
            {/* LIBRARY TAB */}
            {activeTab === 'library' && (
              books.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-slate-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">No Books Found</h2>
                  <p className="text-slate-500 max-w-md">
                    Your library is currently empty. Please ensure you have added books to the database and your RLS policies are correct.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {books.map((book) => (
                    <div 
                      key={book.id} 
                      onClick={() => navigate(`/reader/${book.id}`)}
                      className="group relative cursor-pointer rounded-2xl overflow-hidden aspect-[2/3] bg-slate-100 shadow-md hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 border border-slate-200 flex items-center justify-center"
                    >
                      {/* PDF Cover Image */}
                      {book.pdfurl ? (
                        <div className="absolute inset-0 w-full h-full">
                          <Document
                            file={book.pdfurl}
                            loading={<div className="w-full h-full flex items-center justify-center bg-slate-50"><BookOpen className="w-12 h-12 text-slate-200 animate-pulse" /></div>}
                            error={<div className="w-full h-full flex items-center justify-center bg-slate-50"><BookOpen className="w-12 h-12 text-slate-300" /></div>}
                            className="w-full h-full flex items-center justify-center pointer-events-none [&_.react-pdf__Page]:w-full [&_.react-pdf__Page]:h-full [&_canvas]:w-full [&_canvas]:h-full [&_canvas]:object-cover"
                          >
                            <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} />
                          </Document>
                        </div>
                      ) : (
                        <BookOpen className="w-16 h-16 text-slate-300" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 sm:p-6 z-10">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-3 leading-tight mb-2 drop-shadow-md">
                            {book.title}
                          </h3>
                          <div className="flex items-center text-orange-200 drop-shadow-md">
                            <User className="w-4 h-4 mr-2 flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{book.author}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              notes.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No notes found across any books.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.values(notes.reduce((acc, note) => {
                    if (!acc[note.book_id]) {
                      acc[note.book_id] = { bookId: note.book_id, bookTitle: note.books?.title || 'Unknown Book', notes: [] };
                    }
                    acc[note.book_id].notes.push(note);
                    return acc;
                  }, {} as Record<string, { bookId: string, bookTitle: string, notes: Note[] }>)).map(group => {
                    // Sort general notes first, then by page number
                    const sortedNotes = group.notes.sort((a, b) => {
                      if (a.is_general && !b.is_general) return -1;
                      if (!a.is_general && b.is_general) return 1;
                      return (a.page_number || 0) - (b.page_number || 0);
                    });

                    return (
                      <div key={group.bookId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-fit">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-800 line-clamp-1" title={group.bookTitle}>{group.bookTitle}</h4>
                          <button 
                            onClick={() => navigate(`/reader/${group.bookId}`)}
                            className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center bg-orange-50 px-2 py-1 rounded transition-colors hover:bg-orange-100 whitespace-nowrap ml-3"
                          >
                            Open <ChevronRight className="w-3 h-3 ml-1" />
                          </button>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          {sortedNotes.map(note => (
                            <div 
                              key={note.id} 
                              onClick={() => navigate(`/reader/${group.bookId}?page=${note.is_general ? 1 : note.page_number}`)}
                              className="relative pl-3 border-l-2 border-slate-100 hover:border-orange-300 transition-colors cursor-pointer group"
                            >
                              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-orange-300 group-hover:bg-orange-500 transition-colors"></span>
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className={clsx(
                                  "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  note.is_general 
                                    ? "text-orange-600 bg-orange-100 border border-orange-200" 
                                    : "text-slate-500 bg-slate-100 border border-slate-200"
                                )}>
                                  {note.is_general ? 'General Note' : `Page ${note.page_number}`}
                                </span>
                                <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* HIGHLIGHTS TAB */}
            {activeTab === 'highlights' && (
              highlights.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No highlights found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {highlights.map(h => (
                    <div key={h.id} onClick={() => navigate(`/reader/${h.book_id}?page=${h.page_number}`)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-shadow" style={{ borderLeftColor: h.color }}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{h.books?.title}</h4>
                        <span className="text-xs font-medium text-slate-400 ml-2">Page {h.page_number}</span>
                      </div>
                      <p className="text-slate-600 text-sm italic">"{h.text_content}"</p>
                      {h.label && <span className="inline-block mt-3 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">{h.label}</span>}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* BOOKMARKS TAB */}
            {activeTab === 'bookmarks' && (
              bookmarks.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No bookmarks found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {bookmarks.map(b => (
                    <div key={b.id} onClick={() => navigate(`/reader/${b.book_id}?page=${b.page_number}`)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md cursor-pointer transition-all flex items-center">
                      <div className="bg-orange-50 p-3 rounded-lg mr-4">
                        <BookmarkIcon className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{b.books?.title}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Page {b.page_number}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ADMIN TAB */}
            {activeTab === 'admin' && isAdmin && (
              <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
                
                {/* Add Book Section */}
                <div className="flex-1 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 self-start">
                  <div className="flex items-center mb-6">
                    <div className="bg-orange-100 p-3 rounded-xl mr-4">
                      {editingBookId ? <Edit2 className="w-6 h-6 text-orange-500" /> : <PlusCircle className="w-6 h-6 text-orange-500" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{editingBookId ? 'Edit Book' : 'Add New Book'}</h2>
                      <p className="text-slate-500 text-sm">{editingBookId ? 'Update details for this book.' : 'Add a new PDF document to the database.'}</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleSaveBook} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Book Title</label>
                      <input 
                        type="text" 
                        required
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        placeholder="e.g. Atomic Habits"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Author</label>
                      <input 
                        type="text" 
                        required
                        value={newBookAuthor}
                        onChange={(e) => setNewBookAuthor(e.target.value)}
                        placeholder="e.g. James Clear"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">PDF File URL</label>
                      <input 
                        type="url" 
                        required
                        value={newBookUrl}
                        onChange={(e) => setNewBookUrl(e.target.value)}
                        placeholder="e.g. https://example.com/book.pdf"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-shadow"
                      />
                      <p className="text-xs text-slate-500 mt-2">Must be a direct link to a PDF file that allows CORS.</p>
                    </div>
                    <div className="flex gap-3">
                    <button 
                      type="submit" 
                      disabled={isAddingBook}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70"
                    >
                      {isAddingBook ? 'Saving...' : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          {editingBookId ? 'Update Book' : 'Save to Database'}
                        </>
                      )}
                    </button>
                    {editingBookId && (
                      <button 
                        type="button" 
                        onClick={resetForm}
                        className="flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </form>
                </div>

                {/* Manage Books Section */}
                <div className="flex-1 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 self-start">
                  <div className="flex items-center mb-6">
                    <div className="bg-red-50 p-3 rounded-xl mr-4">
                      <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Manage Books</h2>
                      <p className="text-slate-500 text-sm">Delete books from the database.</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {books.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No books in database.</p>
                    ) : (
                      books.map(book => (
                        <div key={book.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-colors">
                          <div className="mr-4 overflow-hidden">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{book.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{book.author}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditClick(book)}
                              className="flex-shrink-0 p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 bg-white rounded-lg transition-colors border border-slate-200"
                              title="Edit Book"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              disabled={isDeletingId === book.id}
                              className="flex-shrink-0 p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete Book"
                            >
                              {isDeletingId === book.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
