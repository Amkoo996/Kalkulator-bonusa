import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Edit2, X, Check, CalendarDays } from 'lucide-react';
import { collection, doc, setDoc, query, where, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Language, translations } from '../i18n';
import toast from 'react-hot-toast';
import { addEventToCalendar, deleteEventFromCalendar, getCalendarToken } from '../googleCalendar';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'regular' | 'slobodan_dan';
  googleEventId?: string;
}

interface ManualScheduleProps {
  uid: string;
  lang: Language;
  onHoursCalculated: (workedHours: number, paidDaysOff: number) => void;
}

const STANDARD_SHIFTS = [
  { label: '07:00 - 19:00', start: '07:00', end: '19:00' },
  { label: '09:00 - 21:00', start: '09:00', end: '21:00' },
  { label: '13:00 - 01:00', start: '13:00', end: '01:00' },
];

export default function ManualSchedule({ uid, lang, onHoursCalculated }: ManualScheduleProps) {
  const t = translations[lang];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Custom shift state
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('16:00');
  
  // Google Calendar Sync
  const [syncEnabled, setSyncEnabled] = useState(() => {
    return localStorage.getItem('gcal_sync_enabled') === 'true';
  });

  const toggleSync = async () => {
    if (!syncEnabled) {
      const token = await getCalendarToken();
      if (token) {
        setSyncEnabled(true);
        localStorage.setItem('gcal_sync_enabled', 'true');
        toast.success('Google Kalendar uspješno povezan!');
      } else {
        toast.error('Nije uspjelo povezivanje sa Google Kalendarom.');
      }
    } else {
      setSyncEnabled(false);
      localStorage.setItem('gcal_sync_enabled', 'false');
      toast.success('Sinhronizacija sa kalendarom isključena.');
    }
  };

  useEffect(() => {
    if (!uid) return;

    // Get first and last day of current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    const q = query(
      collection(db, 'shifts'),
      where('uid', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
      
      // Filter for current month in memory to avoid needing a composite index in Firestore
      const data = allData.filter(shift => shift.date >= firstDayStr && shift.date <= lastDayStr);
      
      setShifts(data);
      
      // Calculate hours
      let totalWorkedHours = 0;
      let totalPaidDaysOff = 0;

      data.forEach(shift => {
        if (shift.type === 'slobodan_dan') {
          totalPaidDaysOff += 1;
        } else if (shift.startTime && shift.endTime) {
          const start = new Date(`2000-01-01T${shift.startTime}`);
          let end = new Date(`2000-01-01T${shift.endTime}`);
          
          // Handle overnight shifts
          if (end < start) {
            end.setDate(end.getDate() + 1);
          }
          
          const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalWorkedHours += diffHours;
        }
      });

      onHoursCalculated(totalWorkedHours, totalPaidDaysOff);
    }, (error) => {
      console.error("Error fetching shifts:", error);
      toast.error("Greška pri učitavanju kalendara.");
    });

    return () => unsubscribe();
  }, [uid, currentDate, onHoursCalculated]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust so Monday is 0
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsCustom(false);
    setIsModalOpen(true);
  };

  const handleSaveShift = async (type: 'regular' | 'slobodan_dan', start: string = '', end: string = '') => {
    if (!selectedDate || !uid) return;

    const shiftId = `${uid}_${selectedDate}`;
    
    try {
      let googleEventId = null;
      
      if (syncEnabled) {
        const loadingToast = toast.loading('Sinhronizacija sa kalendarom...');
        try {
          googleEventId = await addEventToCalendar(selectedDate, start, end, type);
          toast.dismiss(loadingToast);
        } catch (err: any) {
          toast.dismiss(loadingToast);
          toast.error(`Kalendar greška: ${err.message}`, { duration: 6000 });
          if (err.message.includes('omogućen')) {
            setSyncEnabled(false);
            localStorage.setItem('gcal_sync_enabled', 'false');
          }
          return; // Stop saving if calendar sync fails
        }
      }

      const shiftData: any = {
        uid,
        date: selectedDate,
        startTime: start,
        endTime: end,
        type,
        createdAt: new Date().toISOString()
      };

      if (googleEventId) {
        shiftData.googleEventId = googleEventId;
      }

      await setDoc(doc(db, 'shifts', shiftId), shiftData);
      setIsModalOpen(false);
      toast.success('Smjena uspješno spašena!');
    } catch (error) {
      console.error("Error saving shift:", error);
      toast.error('Greška pri spašavanju smjene.');
    }
  };

  const handleDeleteShift = async (dateStr: string) => {
    if (!uid) return;
    const shiftId = `${uid}_${dateStr}`;
    try {
      // Get shift first to check for googleEventId
      const shiftDoc = await getDoc(doc(db, 'shifts', shiftId));
      if (shiftDoc.exists()) {
        const data = shiftDoc.data();
        if (data.googleEventId && syncEnabled) {
          await deleteEventFromCalendar(data.googleEventId);
        }
      }

      await deleteDoc(doc(db, 'shifts', shiftId));
      toast.success('Smjena obrisana!');
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast.error('Greška pri brisanju smjene.');
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    const weekDays = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

    // Headers
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="text-center font-semibold text-slate-500 text-[10px] sm:text-sm py-1 sm:py-2 truncate">
          {day}
        </div>
      );
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 sm:p-2"></div>);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const shift = shifts.find(s => s.date === dateStr);
      
      days.push(
        <div 
          key={i} 
          onClick={() => handleDayClick(i)}
          className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border border-slate-100 rounded-lg sm:rounded-xl cursor-pointer transition-all hover:border-indigo-300 hover:shadow-sm flex flex-col ${
            shift ? (shift.type === 'slobodan_dan' ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200') : 'bg-white'
          }`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`font-medium text-xs sm:text-sm ${shift ? 'text-slate-900' : 'text-slate-500'}`}>{i}</span>
            {shift && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteShift(dateStr); }}
                className="text-slate-400 hover:text-red-500 transition-colors p-0.5 sm:p-0"
                title="Obriši"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          
          {shift && (
            <div className="mt-auto text-[9px] sm:text-xs font-medium text-center py-0.5 sm:py-1 rounded bg-white/60 leading-none sm:leading-tight">
              {shift.type === 'slobodan_dan' ? (
                <span className="text-emerald-600 block truncate" title="Slobodan dan">Slob.</span>
              ) : (
                <span className="text-indigo-600 flex flex-col sm:block">
                  <span>{shift.startTime}</span>
                  <span className="hidden sm:inline"> - </span>
                  <span>{shift.endTime}</span>
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni', 'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/60 p-3 sm:p-8 mt-6 sm:mt-8 overflow-hidden text-center">
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
          <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2 text-center">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            Raspored smjena
          </h2>
          
          <button 
            onClick={toggleSync}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              syncEnabled 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            {syncEnabled ? 'Kalendar Povezan' : 'Poveži Google Kalendar'}
          </button>
        </div>
        
        <div className="flex items-center justify-center w-full sm:w-auto gap-2 sm:gap-4 bg-slate-50 p-1 rounded-xl border border-slate-100 mx-auto">
          <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm">
            &larr;
          </button>
          <span className="font-medium text-slate-700 min-w-[100px] sm:min-w-[120px] text-center text-sm sm:text-base">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-colors shadow-sm">
            &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
        {renderCalendar()}
      </div>

      {/* Modal for adding shift */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Dodaj smjenu za {selectedDate}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isCustom ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-2 text-center">Standardne smjene:</p>
                {STANDARD_SHIFTS.map((shift, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSaveShift('regular', shift.start, shift.end)}
                    className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-slate-700">{shift.label}</span>
                  </button>
                ))}
                
                <div className="my-4 border-t border-slate-100"></div>
                
                <button
                  onClick={() => handleSaveShift('slobodan_dan')}
                  className="w-full text-center px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-3"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                  <span className="font-medium text-emerald-800">Slobodan dan (Plaćeno 9h)</span>
                </button>

                <button
                  onClick={() => setIsCustom(true)}
                  className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mt-2"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Prilagođeno vrijeme</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Početak</label>
                    <input 
                      id="customStart"
                      name="customStart"
                      type="time" 
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Kraj</label>
                    <input 
                      id="customEnd"
                      name="customEnd"
                      type="time" 
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setIsCustom(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                  >
                    Nazad
                  </button>
                  <button 
                    onClick={() => handleSaveShift('regular', customStart, customEnd)}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors"
                  >
                    Spremi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
