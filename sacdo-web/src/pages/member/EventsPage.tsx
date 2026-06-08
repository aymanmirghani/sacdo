import { useEffect, useState } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { getEvents } from '../../services/members';
import type { Event } from '../../types';

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function MemberEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    getEvents().then((data) => { setEvents(data); setLoading(false); });
  }, []);

  const markedDays = new Set(events.map((e) => toDateStr(e.startDate)));

  const displayed = selectedDate
    ? events.filter((e) => toDateStr(e.startDate) === selectedDate)
    : events;

  // Build a simple month calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="bg-[#1a3a5c] px-4 py-4 safe-top">
        <h1 className="text-xl font-bold text-white">Events</h1>
      </div>

      {/* Calendar */}
      <div className="bg-white mx-0 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={prevMonth} className="p-1 text-gray-500">‹</button>
          <span className="font-semibold text-gray-800">{monthName}</span>
          <button onClick={nextMonth} className="p-1 text-gray-500">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 pb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 text-center pb-3 px-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvent = markedDays.has(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === toDateStr(today);
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? '' : dateStr)}
                className={`relative mx-auto w-8 h-8 rounded-full text-sm flex items-center justify-center
                  ${isSelected ? 'bg-[#1a3a5c] text-white' : isToday ? 'border border-[#1a3a5c] text-[#1a3a5c]' : 'text-gray-700'}`}
              >
                {day}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c8a951]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event list */}
      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))
        ) : displayed.length === 0 ? (
          <p className="text-center text-gray-400 mt-8">
            {selectedDate ? 'No events on this date.' : 'No upcoming events.'}
          </p>
        ) : (
          displayed.map((event) => (
            <div key={event.id} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-semibold text-gray-800 mb-1">{event.title}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Calendar size={12} />
                <span>{event.startDate.toLocaleDateString()}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <MapPin size={12} />
                  <span>{event.location}</span>
                </div>
              )}
              {event.description && (
                <p className="text-sm text-gray-600">{event.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
