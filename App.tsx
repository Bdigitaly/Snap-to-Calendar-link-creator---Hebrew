
import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { EventEditor } from './components/EventEditor';
import { extractEventFromImage } from './services/geminiService';
import { EventDetails, ProcessingState } from './types';
import { Sparkles, Zap } from 'lucide-react';

export default function App() {
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [eventData, setEventData] = useState<EventDetails | null>(null);

  const handleFileSelect = async (file: File) => {
    setProcessingState({ status: 'processing' });
    setEventData(null);

    try {
      const extractedData = await extractEventFromImage(file);
      setEventData(extractedData);
      setProcessingState({ status: 'success' });
    } catch (error: any) {
      console.error(error);
      setProcessingState({ 
        status: 'error', 
        errorMessage: error.message || "עיבוד התמונה נכשל. אנא נסו שנית."
      });
    }
  };

  const handleReset = () => {
    setProcessingState({ status: 'idle' });
    setEventData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 font-sans selection:bg-primary-200 selection:text-primary-900">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">SnapToCal</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Powered by Segev From Bdigitali.com
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        
        {/* Hero / Intro */}
        {processingState.status === 'idle' && (
          <div className="text-center max-w-2xl mx-auto mb-12 animate-in fade-in zoom-in duration-500">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
              הפכו צילומי מסך <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                לאירועים ביומן
              </span>
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              העלו תמונה של פלייר, אימייל או פוסט, והבינה המלאכותית שלנו תחלץ את הפרטים ותיצור קישור ליומן גוגל באופן מיידי.
            </p>
          </div>
        )}

        {/* Upload Section */}
        {processingState.status !== 'success' && (
          <div className="flex flex-col items-center justify-center">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              isLoading={processingState.status === 'processing'} 
            />
            
            {processingState.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm max-w-md w-full text-center animate-in shake">
                {processingState.errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Loading State Overlay */}
        {processingState.status === 'processing' && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-100">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">מנתח את האירוע...</h3>
              <p className="text-sm text-slate-500 mt-2">מחלץ כותרת, תאריכים ומיקום</p>
            </div>
          </div>
        )}

        {/* Success / Editor State */}
        {processingState.status === 'success' && eventData && (
          <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
            <EventEditor initialData={eventData} onReset={handleReset} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} SnaptoCalendar by Segev from Bdigitaly.com. נוצר באמצעות AI.</p>
      </footer>
    </div>
  );
}