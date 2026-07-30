import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabase';
import type { Note, Highlight } from '../services/supabase';
import { X, Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
import clsx from 'clsx';

interface NotesPanelProps {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
}

type TabType = 'notes' | 'highlights';

export const NotesPanel: React.FC<NotesPanelProps> = ({ bookId, isOpen, onClose, currentPage }) => {
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isGeneralNote, setIsGeneralNote] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) loadData();
    const savedLabels = localStorage.getItem('highlightLabels');
    if (savedLabels) setLabels(JSON.parse(savedLabels));
  }, [isOpen, bookId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedNotes, fetchedHighlights] = await Promise.all([
        supabaseService.getNotes(bookId),
        supabaseService.getHighlights(bookId)
      ]);
      setNotes(fetchedNotes);
      setHighlights(fetchedHighlights);
    } catch (e: any) {
      console.error("Error loading panel data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelChange = (color: string, label: string) => {
    const newLabels = { ...labels, [color]: label };
    setLabels(newLabels);
    localStorage.setItem('highlightLabels', JSON.stringify(newLabels));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    
    try {
      const note = await supabaseService.saveNote(bookId, isGeneralNote ? 0 : currentPage, newNote.trim(), isGeneralNote);
      if (note) {
        setNotes([note, ...notes]);
        setNewNote('');
        setIsGeneralNote(false);
      } else {
        alert("Failed to save. Please check your Supabase configuration and RLS policies.");
      }
    } catch (e: any) {
      alert(`Error saving: ${e.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const success = await supabaseService.deleteNote(id);
    if (success) setNotes(notes.filter(n => n.id !== id));
  };

  const handleDeleteHighlight = async (id: string) => {
    const success = await supabaseService.deleteHighlight(id);
    if (success) setHighlights(highlights.filter(h => h.id !== id));
  };


  const renderNotes = () => {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">
              {isGeneralNote ? 'Add Note (Entire Book)' : `Add Note (Page ${currentPage})`}
            </h3>
            <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isGeneralNote} 
                onChange={(e) => setIsGeneralNote(e.target.checked)} 
                className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span>General Note</span>
            </label>
          </div>
          <textarea
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm mb-3 resize-none bg-white"
            rows={3}
            placeholder={isGeneralNote ? "Write a summary or review for the whole book..." : "Write your thoughts..."}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button
            onClick={handleAddNote}
            disabled={isAdding || !newNote.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Save</>}
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No notes yet. Start writing!
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className="p-3 bg-orange-50 border border-orange-100 rounded-lg shadow-sm">
                <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">{n.content}</p>
                <div className="flex justify-between items-center text-xs text-orange-400/80">
                  <span>{n.is_general ? 'Entire Book' : `Page ${n.page_number}`}</span>
                  <button onClick={() => handleDeleteNote(n.id)} className="hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHighlights = () => {
    if (highlights.length === 0) {
      return (
        <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No highlights yet. Select text in the PDF to highlight.
        </p>
      );
    }

    const groupedHighlights = highlights.reduce((acc, h) => {
      if (!acc[h.color]) acc[h.color] = [];
      acc[h.color].push(h);
      return acc;
    }, {} as Record<string, Highlight[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedHighlights).map(([color, items]) => (
          <div key={color} className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
              <input 
                type="text" 
                value={labels[color] || ''} 
                onChange={(e) => handleLabelChange(color, e.target.value)}
                placeholder="Name this label..."
                className="text-xs font-semibold uppercase tracking-wider text-slate-600 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-orange-500 pb-0.5"
              />
            </div>
            {items.map(h => (
              <div key={h.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm border-l-4" style={{ borderLeftColor: h.color }}>
                <p className="text-sm text-slate-600 italic mb-2">"{h.text_content}"</p>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Page {h.page_number}</span>
                  <button onClick={() => handleDeleteHighlight(h.id)} className="hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-orange-500" />
          Study Panel
        </h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2">
        {(['notes', 'highlights'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "flex-1 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              activeTab === tab 
                ? "border-orange-500 text-orange-600" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {activeTab === 'notes' && renderNotes()}
            {activeTab === 'highlights' && renderHighlights()}

          </>
        )}
      </div>
    </div>
  );
};
