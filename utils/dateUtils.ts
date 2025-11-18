
import { EventDetails } from "../types";

/**
 * Formats a date string into the format required by Google Calendar URL: YYYYMMDDThhmmssZ
 * or YYYYMMDDThhmmss if purely local. We will default to UTC (Z) to be safe.
 * 
 * Google Calendar format: 20230101T100000Z
 */
export const formatToGCalDate = (isoDate: string): string => {
  if (!isoDate) return '';
  
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  // Format to UTC string manually to match YYYYMMDDThhmmssZ
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
};

export const formatToGCalDateAllDay = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  
  // Use UTC parts to align with how we save 'date' inputs
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate())
  );
};

const buildRRule = (details: EventDetails): string | null => {
  if (!details.recurrence || details.recurrence === 'NONE') return null;

  const parts = [`FREQ=${details.recurrence}`];

  if (details.recurrenceInterval && details.recurrenceInterval > 1) {
    parts.push(`INTERVAL=${details.recurrenceInterval}`);
  }

  if (details.recurrenceEnds === 'AFTER' && details.recurrenceCount) {
    parts.push(`COUNT=${details.recurrenceCount}`);
  } else if (details.recurrenceEnds === 'ON' && details.recurrenceUntil) {
    let untilStr = '';
    if (details.allDay) {
      untilStr = formatToGCalDateAllDay(details.recurrenceUntil);
    } else {
      // For timed events, UNTIL must be UTC.
      // We take the date provided and set it to the end of that day in UTC to be inclusive
      const uDate = new Date(details.recurrenceUntil);
      if (!isNaN(uDate.getTime())) {
         const pad = (n: number) => (n < 10 ? '0' + n : n);
         const y = uDate.getUTCFullYear();
         const m = uDate.getUTCMonth() + 1;
         const d = uDate.getUTCDate();
         untilStr = `${y}${pad(m)}${pad(d)}T235959Z`;
      }
    }
    if (untilStr) parts.push(`UNTIL=${untilStr}`);
  }

  return `RRULE:${parts.join(';')}`;
};

export const generateGoogleCalendarUrl = (details: EventDetails): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const action = 'TEMPLATE';
  
  let dates = '';

  if (details.allDay) {
    const start = formatToGCalDateAllDay(details.startDate);
    
    // For all-day events, Google expects end date to be exclusive.
    // Since our input 'endDate' is inclusive (the day the event ends),
    // we must always add 1 day to it for the API.
    // E.g. Start Jan 1, End Jan 1 (1 day) -> API: Jan 1 / Jan 2
    // E.g. Start Jan 1, End Jan 2 (2 days) -> API: Jan 1 / Jan 3
    const eDate = new Date(details.endDate || details.startDate);
    eDate.setUTCDate(eDate.getUTCDate() + 1);
    const end = formatToGCalDateAllDay(eDate.toISOString());
    
    dates = `${start}/${end}`;
  } else {
    const start = formatToGCalDate(details.startDate);
    // If end date is missing or same as start, add 1 hour default
    let end = formatToGCalDate(details.endDate);
    
    if (!details.endDate || details.endDate === details.startDate) {
       const sDate = new Date(details.startDate);
       sDate.setHours(sDate.getHours() + 1);
       end = formatToGCalDate(sDate.toISOString());
    }
    dates = `${start}/${end}`;
  }
  
  const footerNote = `\n\n(נוצר על ידי SnapCal. ייתכנו מגבלות בעיצוב טקסט.)`;
  const fullDescription = (details.description || '') + footerNote;

  const params = new URLSearchParams({
    action: action,
    text: details.title,
    dates: dates,
    details: fullDescription,
    location: details.location || '',
  });

  const rrule = buildRRule(details);
  if (rrule) {
    params.append('recur', rrule);
  }

  return `${baseUrl}?${params.toString()}`;
};

export const generateOutlookCalendarUrl = (details: EventDetails): string => {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  
  const footerNote = `\n\n(נוצר על ידי SnaptoCalendar by Segev from Bdigitaly.com)`;
  const fullDescription = (details.description || '') + footerNote;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: details.title,
    body: fullDescription,
    location: details.location || '',
  });

  if (details.allDay) {
    params.append('allday', 'true');
    // Outlook also behaves better with exclusive end dates for full day in some versions, 
    // but standard ISO dates usually work. 
    // We will use the raw ISO strings; Outlook Web handles them relatively well.
    params.append('startdt', details.startDate);
    
    // For consistency with GCal, if user selected inclusive end date, passing it directly 
    // to Outlook Web usually implies inclusive there too for All Day checkbox.
    params.append('enddt', details.endDate || details.startDate);
  } else {
    params.append('startdt', details.startDate);
    
    let end = details.endDate;
    if (!end || end === details.startDate) {
        const sDate = new Date(details.startDate);
        sDate.setHours(sDate.getHours() + 1);
        end = sDate.toISOString();
    }
    params.append('enddt', end);
  }

  // Note: Outlook Web deep links via 'compose' do not robustly support complex RRULEs 
  // via query parameters. We omit recurrence here to avoid errors.

  return `${baseUrl}?${params.toString()}`;
};

export const generateIcsFileContent = (details: EventDetails): string => {
  const escape = (str: string) => (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  
  const now = formatToGCalDate(new Date().toISOString());
  let start = '';
  let end = '';
  let dateParams = '';

  if (details.allDay) {
    start = formatToGCalDateAllDay(details.startDate);
    
    // ICS standard: DTEND is exclusive for all-day DATE values.
    const eDate = new Date(details.endDate || details.startDate);
    eDate.setUTCDate(eDate.getUTCDate() + 1);
    end = formatToGCalDateAllDay(eDate.toISOString());
    
    // VALUE=DATE is required for all-day
    dateParams = `DTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}`;
  } else {
    start = formatToGCalDate(details.startDate);
    
    let eDate = details.endDate ? new Date(details.endDate) : null;
    if (!eDate || eDate.getTime() === new Date(details.startDate).getTime()) {
        eDate = new Date(details.startDate);
        eDate.setHours(eDate.getHours() + 1);
    }
    end = formatToGCalDate(eDate.toISOString());
    
    dateParams = `DTSTART:${start}\r\nDTEND:${end}`;
  }

  const footerNote = `\n\n(נוצר על ידי SnaptoCalendar by Segev from Bdigitaly.com)`;
  const fullDescription = (details.description || '') + footerNote;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SnapCal//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`,
    `DTSTAMP:${now}`,
    dateParams,
    `SUMMARY:${escape(details.title)}`,
    `DESCRIPTION:${escape(fullDescription)}`,
    `LOCATION:${escape(details.location || '')}`,
  ];

  const rrule = buildRRule(details);
  if (rrule) {
    lines.push(rrule);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Use CRLF for ICS line endings
  return lines.join('\r\n');
};

export const formatDisplayDate = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};