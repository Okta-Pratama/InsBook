import React from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string | null;
  loading: boolean;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-orange-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header orange bar */}
        <div className="h-1.5 w-full bg-orange-500" />
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                AI Summary
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-orange-50 transition-colors text-gray-400 hover:text-orange-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="min-h-[200px] flex flex-col justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="animate-pulse font-medium">Extracting strategic insights...</p>
              </div>
            ) : summary ? (
              <div className="prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-gray-700">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {summary}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                No summary available.
              </p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        {!loading && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
