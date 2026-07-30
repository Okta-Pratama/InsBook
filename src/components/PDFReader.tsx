import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  BookmarkPlus, ChevronLeft, ChevronRight, Check, Maximize, Minimize, ZoomIn, ZoomOut, Edit3, Eye, EyeOff, Loader2, ArrowLeft, X, Menu, Lock, Unlock
} from 'lucide-react';
import { supabaseService } from '../services/supabase';
import type { Book, Highlight, HighlightRect, Bookmark } from '../services/supabase';
import { NotesPanel } from './NotesPanel';
import clsx from 'clsx';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
  const [basePageHeight, setBasePageHeight] = useState<number>(800);
  
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const bookmarkRef = useRef<Bookmark | null>(null);

  // New states for Notes and Highlights
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlights, setShowHighlights] = useState(true);
  
  // Selection handling
  const [selectionRects, setSelectionRects] = useState<HighlightRect[]>([]);
  const [selectionText, setSelectionText] = useState('');
  const [highlightTargetPage, setHighlightTargetPage] = useState<number | null>(null);
  
  // UI states
  const [isIdle, setIsIdle] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavLocked, setIsNavLocked] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetPage = searchParams.get('page');

  useEffect(() => {
    if (id) {
      supabaseService.getBook(id).then(b => {
        if (b) setBook(b);
      });
      loadHighlights();
      
      supabaseService.getBookmarks(id).then(bookmarks => {
        if (bookmarks.length > 0) {
           setBookmark(bookmarks[0]);
           bookmarkRef.current = bookmarks[0];
        }
      });

      if (targetPage) {
        setPageNumber(parseInt(targetPage, 10));
      } else {
        // Load progress from DB
        supabaseService.getReadingProgresses().then(progresses => {
          const bookProgress = progresses.find(p => p.book_id.toString() === id.toString());
          if (bookProgress && bookProgress.page_number) {
            setPageNumber(bookProgress.page_number);
          }
        });
      }
    }
  }, [id, targetPage]);

  useEffect(() => {
    if (id && pageNumber > 0) {
      // Debounce saving progress to avoid spamming the database
      const timeoutId = setTimeout(() => {
        supabaseService.saveReadingProgress(id, pageNumber);
        
        // Auto-update bookmark if it exists and we've reached a new furthest page
        if (bookmarkRef.current && pageNumber > bookmarkRef.current.page_number) {
           supabaseService.saveBookmark(id, pageNumber).then(updated => {
              if (updated) {
                setBookmark(updated);
                bookmarkRef.current = updated;
              }
           });
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [id, pageNumber]);

  const loadHighlights = async () => {
    if (id) {
      const data = await supabaseService.getHighlights(id);
      setHighlights(data);
    }
  };

  useEffect(() => {
    const resetIdle = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIsIdle(true), 3000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('scroll', resetIdle, true);
    
    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('scroll', resetIdle, true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!numPages) return;
    
    // Initial scroll jump
    if (pageNumber > 1) {
      setTimeout(() => {
        const el = document.getElementById(`page-${pageNumber}`);
        if (el) el.scrollIntoView({ behavior: 'auto' });
      }, 500);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const num = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
          setPageNumber(num);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.pdf-page-container').forEach(el => observer.observe(el));
    
    return () => observer.disconnect();
  }, [numPages]);

  const scrollToPage = (pageNum: number) => {
    if (pageNum < 1 || (numPages && pageNum > numPages)) return;
    const el = document.getElementById(`page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const toggleBookmark = async () => {
    if (!id) return;
    
    if (bookmark) {
       // Delete bookmark
       const success = await supabaseService.deleteBookmark(bookmark.id);
       if (success) {
         setBookmark(null);
         bookmarkRef.current = null;
       }
    } else {
       // Create bookmark
       const newBookmark = await supabaseService.saveBookmark(id, pageNumber);
       if (newBookmark) {
         setBookmark(newBookmark);
         bookmarkRef.current = newBookmark;
       }
    }
  };



  // Basic highlight capture logic
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    let container = selection.anchorNode?.parentElement as HTMLElement | null;
    while (container && !container.classList?.contains('pdf-page-container')) {
      container = container.parentElement;
    }
    if (!container) return;

    const pageNumStr = container.getAttribute('data-page-number');
    if (!pageNumStr) return;
    const highlightPageNum = parseInt(pageNumStr, 10);

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    if (!text.trim()) return;

    const pageRect = container.getBoundingClientRect();
    const rects = Array.from(range.getClientRects()).map(r => ({
      x: (r.left - pageRect.left) / scale,
      y: (r.top - pageRect.top) / scale,
      width: r.width / scale,
      height: r.height / scale,
      pageNumber: highlightPageNum
    }));

    setSelectionText(text);
    setSelectionRects(rects);
    setHighlightTargetPage(highlightPageNum);
  };

  const saveHighlight = async (color: string) => {
    if (!id || selectionRects.length === 0 || !highlightTargetPage) return;
    const h = await supabaseService.saveHighlight(id, highlightTargetPage, selectionText, selectionRects, color);
    if (h) {
      setHighlights([...highlights, h]);
    }
    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelectionRects([]);
    setSelectionText('');
    setHighlightTargetPage(null);
  };

  const cancelHighlight = () => {
    setSelectionRects([]);
    setSelectionText('');
    setHighlightTargetPage(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={clsx("flex flex-col bg-slate-100 transition-colors duration-300 relative", isFullscreen ? "h-screen w-screen" : "h-screen")}>
      {/* Floating Unlock Button when Nav is Locked */}
      {isNavLocked && (
        <button 
          onClick={() => setIsNavLocked(false)}
          className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 sm:p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/80 hover:text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          title="Unlock Navigation"
        >
          <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Top Nav */}
      <div className={clsx("glass-panel fixed top-0 left-0 right-0 z-40 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-[var(--color-border)] shadow-sm bg-white transition-all duration-300", (!isNavLocked && !isIdle) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none")}>
        {/* Left: Back & Title */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button onClick={() => navigate('/')} className="p-1.5 sm:p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center">
            <h1 className="font-bold text-sm lg:text-lg text-gray-900 truncate max-w-[150px] lg:max-w-xs leading-tight">{book.title}</h1>
          </div>
        </div>

        {/* Center: Pagination */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          <button disabled={pageNumber <= 1} onClick={() => scrollToPage(pageNumber - 1)} className="p-1.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 disabled:opacity-50 text-slate-700 transition-colors"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          <span className="font-medium text-xs sm:text-sm text-slate-700 whitespace-nowrap tabular-nums">Pg {pageNumber} / {numPages || '--'}</span>
          <button disabled={numPages === null || pageNumber >= numPages} onClick={() => scrollToPage(pageNumber + 1)} className="p-1.5 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 disabled:opacity-50 text-slate-700 transition-colors"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" /></button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 relative">
          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center space-x-2">
            <button onClick={toggleBookmark} className={clsx("p-1.5 sm:p-2 rounded-xl transition-all duration-300 shadow-sm border", bookmark ? "bg-green-500 text-white border-green-500" : "bg-white hover:bg-orange-50 text-orange-600 border-orange-200")} title={bookmark ? "Saved" : "Bookmark"}>
              {bookmark ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <BookmarkPlus className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => setShowHighlights(!showHighlights)} className={clsx("p-1.5 sm:p-2 rounded-xl transition-colors border hidden sm:block", showHighlights ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-slate-50 text-slate-400 border-slate-200")} title="Toggle Highlights">
              {showHighlights ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={() => setIsNotesPanelOpen(!isNotesPanelOpen)} className="p-1.5 sm:p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors border border-orange-200" title="Notes & Highlights">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button onClick={() => {
              setIsNavLocked(true);
              if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {});
            }} className="p-1.5 sm:p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors border border-orange-200" title="Lock Navigation (Zen Mode)">
              <Unlock className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-orange-100 hover:text-orange-600 rounded-lg text-slate-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-[10px] font-medium px-1 min-w-[2.5rem] text-center text-slate-700">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-orange-100 hover:text-orange-600 rounded-lg text-slate-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <button onClick={toggleFullscreen} className="p-1.5 sm:p-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-colors border border-orange-200 hidden sm:block" title="Fullscreen">
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* Mobile Actions Hamburger */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 sm:hidden rounded-xl bg-orange-50 text-orange-600 border border-orange-200 transition-colors">
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile Actions Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex flex-col space-y-1 sm:hidden">
              <button onClick={() => { toggleBookmark(); setIsMobileMenuOpen(false); }} className={clsx("flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", bookmark ? "bg-green-50 text-green-700" : "hover:bg-slate-50 text-slate-700")}>
                {bookmark ? <Check className="w-4 h-4 mr-3 text-green-500" /> : <BookmarkPlus className="w-4 h-4 mr-3 text-orange-500" />}
                {bookmark ? "Saved" : "Bookmark"}
              </button>
              <button onClick={() => { setShowHighlights(!showHighlights); setIsMobileMenuOpen(false); }} className={clsx("flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", showHighlights ? "bg-orange-50 text-orange-700" : "hover:bg-slate-50 text-slate-700")}>
                {showHighlights ? <Eye className="w-4 h-4 mr-3 text-orange-500" /> : <EyeOff className="w-4 h-4 mr-3 text-slate-400" />}
                Highlights
              </button>
              <button onClick={() => { setIsNotesPanelOpen(!isNotesPanelOpen); setIsMobileMenuOpen(false); }} className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors">
                <Edit3 className="w-4 h-4 mr-3 text-orange-500" />
                Notes & Highlights
              </button>
              <button onClick={() => { 
                setIsNavLocked(true); 
                setIsMobileMenuOpen(false); 
                if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(() => {}); 
              }} className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors">
                <Unlock className="w-4 h-4 mr-3 text-orange-500" />
                Lock Navigation
              </button>
              <button onClick={() => { toggleFullscreen(); setIsMobileMenuOpen(false); }} className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors">
                {isFullscreen ? <Minimize className="w-4 h-4 mr-3 text-orange-500" /> : <Maximize className="w-4 h-4 mr-3 text-orange-500" />}
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg mt-1 border border-slate-100">
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-orange-100 hover:text-orange-600 rounded text-slate-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-medium px-2">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-orange-100 hover:text-orange-600 rounded text-slate-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Area (Continuous Scroll) */}
      <div className="flex-1 overflow-y-auto bg-slate-100 flex justify-center p-4 pt-20 sm:pt-24 sm:p-8 relative hide-scrollbar">
        <div className="shadow-lg transition-transform duration-200 relative flex flex-col items-center" onMouseUp={handleMouseUp}>
          {!book.pdfurl ? (
            <div className="flex flex-col items-center justify-center h-96 w-64 md:w-96 bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6 text-center">
              <span className="text-2xl font-bold text-orange-500 mb-4">!</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">PDF Not Found</h3>
              <p className="text-gray-500 text-sm">Missing pdfurl in database.</p>
            </div>
          ) : (
            <Document
              file={book.pdfurl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="h-96 w-64 bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}
            >
              {numPages && Array.from(new Array(numPages), (_, index) => {
                const pageNum = index + 1;
                const isVisible = Math.abs(pageNum - pageNumber) <= 3; // Render current, 3 before, 3 after
                const pageHighlights = highlights.filter(h => h.page_number === pageNum);
                return (
                  <div 
                    key={`page_${pageNum}`} 
                    id={`page-${pageNum}`}
                    data-page-number={pageNum}
                    className="relative mb-4 pdf-page-container bg-white shadow-sm flex items-center justify-center min-w-[300px]"
                    style={{ minHeight: `${basePageHeight * scale}px` }}
                  >
                    {isVisible ? (
                      <>
                        <Page 
                          pageNumber={pageNum} 
                          scale={scale} 
                          renderTextLayer={true} 
                          renderAnnotationLayer={true} 
                          onLoadSuccess={(page: any) => {
                            if (pageNum === 1 && page.originalHeight) {
                              setBasePageHeight(page.originalHeight);
                            }
                          }}
                        />
                        
                        {/* Visual Highlights Overlay for this page */}
                        {showHighlights && pageHighlights.map(h => (
                          <React.Fragment key={h.id}>
                            {h.rects.map((rect, i) => (
                              <div
                                key={i}
                                style={{
                                  position: 'absolute',
                                  left: `${rect.x * scale}px`,
                                  top: `${rect.y * scale}px`,
                                  width: `${rect.width * scale}px`,
                                  height: `${rect.height * scale}px`,
                                  backgroundColor: h.color,
                                  opacity: 0.4,
                                  pointerEvents: 'none',
                                  mixBlendMode: 'multiply'
                                }}
                              />
                            ))}
                          </React.Fragment>
                        ))}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 space-y-2 w-full h-full min-h-[400px]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-medium">Page {pageNum}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </Document>
          )}

          {/* Highlight Action Popup */}
          {selectionRects.length > 0 && (
            <div className="absolute z-30 bg-white shadow-xl rounded-xl p-2 flex space-x-2 border border-slate-200" style={{ top: -50, left: '50%', transform: 'translateX(-50%)' }}>
              {['#fde047', '#86efac', '#f9a8d4', '#fdba74'].map(color => (
                <button
                  key={color}
                  onClick={() => saveHighlight(color)}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title="Stabilo"
                />
              ))}
              <button onClick={cancelHighlight} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <NotesPanel 
        bookId={id || ''} 
        isOpen={isNotesPanelOpen} 
        onClose={() => setIsNotesPanelOpen(false)} 
        currentPage={pageNumber} 
      />


    </div>
  );
};
