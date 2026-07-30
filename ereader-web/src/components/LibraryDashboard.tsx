import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabase';
import type { Book } from '../services/supabase';
import { BookOpen, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const LibraryDashboard: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const data = await supabaseService.getBooks();
        setBooks(data);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-[var(--color-border)] pb-8">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--color-text)]">
                My Library
              </h1>
              <p className="text-sm md:text-base text-[var(--color-text-light)] mt-1">
                Your collection of academic papers and strategic insights.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="glass-panel rounded-xl p-6 animate-pulse">
                <div className="h-48 bg-slate-100 rounded-lg mb-6"></div>
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book) => (
              <div
                key={book.id}
                className={clsx(
                  "glass-panel rounded-xl p-6 group flex flex-col h-full"
                )}
              >
                <div className="h-48 bg-slate-50 rounded-lg mb-6 flex items-center justify-center border border-slate-100 group-hover:bg-orange-50/50 transition-colors duration-300 overflow-hidden relative">
                  {book.pdfurl ? (
                    <Document
                      file={book.pdfurl}
                      loading={<BookOpen className="w-16 h-16 text-slate-200 animate-pulse" />}
                      error={<BookOpen className="w-16 h-16 text-slate-300 group-hover:text-orange-300 transition-colors" />}
                      className="flex items-center justify-center pointer-events-none scale-[0.35] origin-center shadow-lg"
                    >
                      <Page
                        pageNumber={1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  ) : (
                    <BookOpen className="w-16 h-16 text-slate-300 group-hover:text-orange-300 transition-colors" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-[var(--color-text)] line-clamp-2 leading-tight">
                    {book.title}
                  </h3>
                  <div className="flex items-center text-[var(--color-text-light)] mb-6">
                    <User className="w-4 h-4 mr-2" />
                    <p className="text-sm font-medium truncate">{book.author}</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/reader/${book.id}`)}
                  className="w-full flex items-center justify-center space-x-2 bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-500 hover:text-white transition-colors duration-300 py-2.5 rounded-lg font-semibold"
                >
                  <span>Read Document</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
