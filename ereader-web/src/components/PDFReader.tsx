import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ArrowLeft, Maximize, Minimize, ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, BookmarkPlus, 
  Sparkles, Check
} from 'lucide-react';
import { supabaseService } from '../services/supabase';
import type { Book } from '../services/supabase';
import { aiService } from '../services/ai';
import { AISummaryModal } from './AISummaryModal';
import clsx from 'clsx';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [book, setBook] = useState<Book | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Bookmarking
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // AI Summary
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      supabaseService.getBook(id).then(b => {
        if (b) setBook(b);
      });
    }
  }, [id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const saveBookmark = async () => {
    if (!id) return;
    setIsBookmarked(true);
    await supabaseService.saveBookmark(id, pageNumber);
    setTimeout(() => setIsBookmarked(false), 2000);
  };

  const handleGenerateSummary = async () => {
    setIsModalOpen(true);
    setIsAILoading(true);
    try {
      const textToSummarize = `Content of page ${pageNumber} of ${book?.title || 'the document'}.`;
      const summary = await aiService.summarizeText(textToSummarize);
      setAiSummary(summary);
    } catch (error) {
      console.error(error);
      setAiSummary("An error occurred while generating the summary.");
    } finally {
      setIsAILoading(false);
    }
  };

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--color-text-light)]">Loading Document...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "flex flex-col bg-[var(--color-background)] transition-colors duration-300",
        isFullscreen ? "h-screen w-screen" : "min-h-screen"
      )}
    >
      {/* Top Navigation Bar */}
      <div className="glass-panel sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)] shadow-sm bg-white">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors text-[var(--color-text)]"
            title="Back to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center space-x-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-bold text-lg text-[var(--color-text)] truncate max-w-md leading-tight">
                {book.title}
              </h1>
              <p className="text-xs text-[var(--color-text-light)]">{book.author}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors text-[var(--color-text-light)]">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center text-[var(--color-text)]">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-2 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors text-[var(--color-text-light)]">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={toggleFullscreen} 
            className="p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-colors border border-orange-200 hidden sm:block"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Reading Area */}
      <div className="flex-1 overflow-auto bg-slate-100 flex justify-center p-4 sm:p-8">
        <div className="shadow-lg transition-transform duration-200">
          {!book.pdfurl ? (
            <div className="flex flex-col items-center justify-center h-96 w-64 md:w-96 bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6 text-center">
              <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">PDF Not Found</h3>
              <p className="text-gray-500 text-sm">
                The <code className="bg-slate-100 px-1 py-0.5 rounded">pdfurl</code> for this document is missing in your Supabase database. Please ensure the book entry has a valid PDF link.
              </p>
            </div>
          ) : (
            <Document
              file={book.pdfurl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96 w-64 bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Bottom Navigation & Controls */}
      <div className="glass-panel sticky bottom-0 z-10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--color-border)] bg-white">
        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
          <button 
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => p - 1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 disabled:opacity-50 transition-colors text-[var(--color-text)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-sm text-[var(--color-text)]">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button 
            disabled={numPages === null || pageNumber >= numPages}
            onClick={() => setPageNumber(p => p + 1)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 disabled:opacity-50 transition-colors text-[var(--color-text)]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={saveBookmark}
            className={clsx(
              "flex items-center px-4 py-2 rounded-xl transition-all duration-300 font-medium text-sm shadow-sm border",
              isBookmarked 
                ? "bg-green-500 text-white border-green-500" 
                : "bg-white hover:bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300"
            )}
          >
            {isBookmarked ? (
              <><Check className="w-4 h-4 mr-2" /> Saved</>
            ) : (
              <><BookmarkPlus className="w-4 h-4 mr-2" /> Bookmark Page</>
            )}
          </button>
        </div>
      </div>

      {/* Floating Action Button for AI Summary */}
      <button
        onClick={handleGenerateSummary}
        className="fixed bottom-24 sm:bottom-20 right-6 sm:right-8 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] hover:-translate-y-1 transition-all duration-300 group flex items-center justify-center z-40"
        title="AI Summary"
      >
        <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* AI Summary Modal */}
      <AISummaryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={aiSummary}
        loading={isAILoading}
      />
    </div>
  );
};
