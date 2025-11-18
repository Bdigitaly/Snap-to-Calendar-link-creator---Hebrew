
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, FileText, ExternalLink, ArrowRight, Copy, Check, Download, Mail, Repeat } from 'lucide-react';
import { EventDetails, RecurrenceFrequency } from '../types';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl, generateIcsFileContent } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

interface EventEditorProps {
  initialData: EventDetails;
  onReset: () => void;
}

export const EventEditor: React.FC<EventEditorProps> = ({ initialData, onReset }) => {
  const [formData, setFormData] = useState<EventDetails>({ 
    ...initialData, 
    recurrence: initialData.recurrence || 'NONE',
    recurrenceInterval: initialData.recurrenceInterval || 1,
    recurrenceEnds: initialData.recurrenceEnds || 'NEVER',
    recurrenceCount: initialData.recurrenceCount || 1,
    recurrenceUntil: initialData.recurrenceUntil || ''
  });
  const [calendarUrl, setCalendarUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAllDay, setIsAllDay] = useState(initialData.allDay || false);

  useEffect(() => {
    // Update formData allDay when local state changes
    setFormData(prev => ({ ...prev, allDay: isAllDay }));
  }, [isAllDay]);

  useEffect(() => {
    // Regenerate URL whenever form data changes
    const url = generateGoogleCalendarUrl(formData);
    setCalendarUrl(url);
    setCopied(false);
  }, [formData]);

  const handleChange = (field: keyof EventDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to safely format date for input value
  const getInputValue = (isoString: string, forDateOnly: boolean) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      
      if (forDateOnly) {
        // Return YYYY-MM-DD (UTC-based date part for our purposes)
        return date.toISOString().split('T')[0];
      } else {
        // Return YYYY-MM-DDThh:mm (Local time)
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
      }
    } catch (e) {
      return '';
    }
  };

  // Helper to handle date changes safely
  const handleDateChange = (field: keyof EventDetails, value: string) => {
    // If user clears the input, set to empty string
    if (!value) {
      handleChange(field, '');
      return;
    }
    
    const date = new Date(value);
    // Only update state if the date is valid
    if (isNaN(date.getTime())) return;

    // If it's an ISO string from a Date object, it's already in the format we want (UTC)
    handleChange(field, date.toISOString());
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddToCalendar = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b'],
      zIndex: 9999,
    });
  };

  const handleOutlook = () => {
    const url = generateOutlookCalendarUrl(formData);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = () => {
    const content = generateIcsFileContent(formData);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${formData.title || 'event'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary-600 p-6 text-white flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          פרטי האירוע
        </h2>
        <button 
          onClick={onReset}
          className="text-primary-100 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          התחל מחדש
        </button>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">כותרת האירוע</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-medium text-slate-900"
            placeholder="כותרת האירוע"
          />
        </div>

        {/* Date & Time Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
             <label className="block text-sm font-medium text-slate-700">תאריך ושעה</label>
             <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-600 select-none">אירוע של יום שלם</span>
             </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> התחלה
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                step={isAllDay ? undefined : "60"}
                value={getInputValue(formData.startDate, isAllDay)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600"
                aria-label={isAllDay ? "תאריך התחלה" : "תאריך ושעת התחלה"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> סיום
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                step={isAllDay ? undefined : "60"}
                value={getInputValue(formData.endDate, isAllDay)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600"
                aria-label={isAllDay ? "תאריך סיום" : "תאריך ושעת סיום"}
              />
            </div>
          </div>

          {/* Recurrence Section */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Repeat className="w-3 h-3" /> חזרתיות
              </label>
              
              <div className="space-y-4">
                  {/* Frequency */}
                  <div>
                      <select
                          value={formData.recurrence}
                          onChange={(e) => handleChange('recurrence', e.target.value as RecurrenceFrequency)}
                          className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600 bg-white"
                      >
                          <option value="NONE">ללא חזרה</option>
                          <option value="DAILY">יומי</option>
                          <option value="WEEKLY">שבועי</option>
                          <option value="MONTHLY">חודשי</option>
                          <option value="YEARLY">שנתי</option>
                      </select>
                  </div>

                  {formData.recurrence !== 'NONE' && (
                      <>
                          {/* Interval */}
                          <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-600 whitespace-nowrap">חזור כל</span>
                              <input 
                                  type="number" 
                                  min="1" 
                                  value={formData.recurrenceInterval || 1}
                                  onChange={(e) => handleChange('recurrenceInterval', parseInt(e.target.value) || 1)}
                                  className="w-20 px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600"
                              />
                              <span className="text-sm text-slate-600 lowercase">
                                  {formData.recurrence === 'DAILY' ? 'ימים' : 
                                   formData.recurrence === 'WEEKLY' ? 'שבועות' : 
                                   formData.recurrence === 'MONTHLY' ? 'חודשים' : 'שנים'}
                              </span>
                          </div>

                          {/* Ends */}
                          <div>
                              <label className="block text-sm text-slate-600 mb-2">סיום חזרה</label>
                              <div className="space-y-3">
                                  {/* Never */}
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          name="recurrenceEnds"
                                          checked={formData.recurrenceEnds === 'NEVER'}
                                          onChange={() => handleChange('recurrenceEnds', 'NEVER')}
                                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                                      />
                                      <span className="text-sm text-slate-700">לעולם לא</span>
                                  </label>

                                  {/* On Date */}
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          name="recurrenceEnds"
                                          checked={formData.recurrenceEnds === 'ON'}
                                          onChange={() => handleChange('recurrenceEnds', 'ON')}
                                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                                      />
                                      <span className="text-sm text-slate-700 w-16">בתאריך</span>
                                      <input 
                                          type="date"
                                          value={getInputValue(formData.recurrenceUntil || '', true)}
                                          onChange={(e) => handleDateChange('recurrenceUntil', e.target.value)}
                                          disabled={formData.recurrenceEnds !== 'ON'}
                                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:bg-slate-100 disabled:text-slate-400 transition-colors outline-none focus:border-primary-500"
                                      />
                                  </label>

                                  {/* After Count */}
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="radio" 
                                          name="recurrenceEnds"
                                          checked={formData.recurrenceEnds === 'AFTER'}
                                          onChange={() => handleChange('recurrenceEnds', 'AFTER')}
                                          className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                                      />
                                      <span className="text-sm text-slate-700 w-16">לאחר</span>
                                      <div className="flex items-center gap-2 flex-1">
                                          <input 
                                              type="number"
                                              min="1"
                                              value={formData.recurrenceCount || 1}
                                              onChange={(e) => handleChange('recurrenceCount', parseInt(e.target.value) || 1)}
                                              disabled={formData.recurrenceEnds !== 'AFTER'}
                                              className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:bg-slate-100 disabled:text-slate-400 transition-colors outline-none focus:border-primary-500"
                                          />
                                          <span className={`text-sm ${formData.recurrenceEnds === 'AFTER' ? 'text-slate-700' : 'text-slate-400'}`}>פעמים</span>
                                      </div>
                                  </label>
                              </div>
                          </div>
                      </>
                  )}
              </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" /> מיקום
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600"
            placeholder="הוסף מיקום או קישור"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-4 h-4 text-slate-400" /> תיאור
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-slate-600 resize-none"
            placeholder="תיאור האירוע..."
          />
          <p className="text-xs text-slate-400 mt-1 text-start">
            *הערה לגבי מגבלות עיצוב טקסט תתווסף לאירוע ביומן.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyUrl}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all hover:border-slate-300 active:bg-slate-100"
              title="העתק קישור"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'הועתק' : 'העתק קישור'}</span>
            </button>

            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAddToCalendar}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary-200 hover:shadow-primary-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>הוסף ליומן גוגל</span>
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-4 pt-1">
             <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">אפשרויות נוספות</span>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <div className="flex items-center justify-center gap-3">
             <button 
               onClick={handleOutlook}
               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors"
             >
               <Mail className="w-4 h-4" />
               Outlook Web
             </button>
             <button 
               onClick={handleDownloadIcs}
               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
             >
               <Download className="w-4 h-4" />
               Apple / ICS
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};