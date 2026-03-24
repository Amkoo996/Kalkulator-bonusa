import React, { useState, useEffect } from 'react';
import { Calculator, Clock, Percent, Euro, Target, MessageSquareWarning, FileWarning, Info, Save, History, LogOut, CalendarDays, Globe, Bell, BellRing } from 'lucide-react';
import { auth, db, loginWithGoogle, logoutUser } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, setDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { translations, Language } from './i18n';
import ManualSchedule from './components/ManualSchedule';
import { useNotifications } from './hooks/useNotifications';
import { Toaster } from 'react-hot-toast';

// Helper to get first working day of a given year and month
function getFirstWorkingDay(year: number, month: number) {
  let date = new Date(year, month, 1);
  while (date.getDay() === 0 || date.getDay() === 6) { // 0 is Sunday, 6 is Saturday
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function useSalaryCountdown(lang: Language) {
  const [timeLeft, setTimeLeft] = useState('');
  const t = translations[lang];

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      let targetDate = getFirstWorkingDay(now.getFullYear(), now.getMonth());
      targetDate.setHours(0, 0, 0, 0);

      // If today is past the first working day, target next month
      if (now.getTime() >= targetDate.getTime() + 24 * 60 * 60 * 1000) {
        let nextMonth = now.getMonth() + 1;
        let year = now.getFullYear();
        if (nextMonth > 11) {
          nextMonth = 0;
          year += 1;
        }
        targetDate = getFirstWorkingDay(year, nextMonth);
        targetDate.setHours(0, 0, 0, 0);
      }

      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0 && diff > -24 * 60 * 60 * 1000) {
        return t.paydayToday;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculate());
    const interval = setInterval(() => {
      setTimeLeft(calculate());
    }, 1000);

    return () => clearInterval(interval);
  }, [lang]);

  return timeLeft;
}

interface SavedRecord {
  id?: string;
  month: string;
  baseSalary: number;
  bonus: number;
  totalPay: number;
  createdAt: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('bs');
  const [loading, setLoading] = useState(true);
  const t = translations[lang];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const loggedInUser = await loginWithGoogle();
      if (loggedInUser) {
        // Save user profile
        await setDoc(doc(db, 'users', loggedInUser.uid), {
          uid: loggedInUser.uid,
          name: loggedInUser.displayName || 'User',
          email: loggedInUser.email || '',
          language: lang
        }, { merge: true });
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Učitavanje...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Calculator className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.loginTitle}</h1>
          <p className="text-slate-500 mb-8">{t.loginDesc}</p>
          
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {t.loginBtn}
          </button>

          <div className="mt-6 flex justify-center gap-4">
            <button onClick={() => setLang('bs')} className={`text-sm font-medium ${lang === 'bs' ? 'text-indigo-600' : 'text-slate-400'}`}>BS</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => setLang('en')} className={`text-sm font-medium ${lang === 'en' ? 'text-indigo-600' : 'text-slate-400'}`}>EN</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <BonusCalculator user={user} lang={lang} setLang={setLang} />
    </>
  );
}

function BonusCalculator({ user, lang, setLang }: { user: User, lang: Language, setLang: (l: Language) => void }) {
  const t = translations[lang];
  const [maxHours, setMaxHours] = useState<string>(() => localStorage.getItem(`maxHours_${user.uid}`) || '180');
  const [workedHours, setWorkedHours] = useState<string>('180');
  const [manualHours, setManualHours] = useState<string>(() => localStorage.getItem(`manualHours_${user.uid}`) || '0');
  const [kpi, setKpi] = useState<string>(() => localStorage.getItem(`kpi_${user.uid}`) || '95');
  const [otrs, setOtrs] = useState<string>(() => localStorage.getItem(`otrs_${user.uid}`) || '95');
  const [complaints, setComplaints] = useState<string>(() => localStorage.getItem(`complaints_${user.uid}`) || '0');
  const [mistakes, setMistakes] = useState<string>(() => localStorage.getItem(`mistakes_${user.uid}`) || '0');
  const [hourlyRate, setHourlyRate] = useState<string>(() => localStorage.getItem(`hourlyRate_${user.uid}`) || '5');
  const [paidDaysOff, setPaidDaysOff] = useState<string>('0');
  const [additionalBonus, setAdditionalBonus] = useState<string>(() => localStorage.getItem(`additionalBonus_${user.uid}`) || '0');

  const [kpiPoints, setKpiPoints] = useState<number>(0);
  const [otrsPoints, setOtrsPoints] = useState<number>(0);
  const [csatPoints, setCsatPoints] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [totalPay, setTotalPay] = useState<number>(0);

  const [history, setHistory] = useState<SavedRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>('');

  const countdown = useSalaryCountdown(lang);
  const { permission, requestPermission } = useNotifications(user.uid);

  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(monthStr);

    const q = query(collection(db, 'salaryHistory'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: SavedRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as SavedRecord);
      });
      records.sort((a, b) => b.month.localeCompare(a.month));
      setHistory(records);
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    localStorage.setItem(`maxHours_${user.uid}`, maxHours);
    localStorage.setItem(`kpi_${user.uid}`, kpi);
    localStorage.setItem(`otrs_${user.uid}`, otrs);
    localStorage.setItem(`complaints_${user.uid}`, complaints);
    localStorage.setItem(`mistakes_${user.uid}`, mistakes);
    localStorage.setItem(`hourlyRate_${user.uid}`, hourlyRate);
    localStorage.setItem(`manualHours_${user.uid}`, manualHours);
    localStorage.setItem(`additionalBonus_${user.uid}`, additionalBonus);
  }, [maxHours, kpi, otrs, complaints, mistakes, hourlyRate, manualHours, additionalBonus, user.uid]);

  const handleNumberChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/^0+(?=\d)/, '');
    setter(val);
  };

  useEffect(() => {
    const numMaxHours = Number(maxHours) || 0;
    const numWorkedHours = Number(workedHours) || 0;
    const numManualHours = Number(manualHours) || 0;
    const numKpi = Number(kpi) || 0;
    const numOtrs = Number(otrs) || 0;
    const numComplaints = Number(complaints) || 0;
    const numMistakes = Number(mistakes) || 0;
    const numHourlyRate = Number(hourlyRate) || 0;
    const numPaidDaysOff = Number(paidDaysOff) || 0;
    const numAdditionalBonus = Number(additionalBonus) || 0;

    const totalWorkedHours = numWorkedHours + numManualHours;

    // KPI Points
    let kp = 0;
    if (numKpi >= 95) kp = 500;
    else if (numKpi >= 92) kp = 400;
    else if (numKpi >= 89) kp = 300;
    else if (numKpi >= 86) kp = 150;
    else kp = 0;
    setKpiPoints(kp);

    // OTRS Points
    let op = 0;
    if (numOtrs >= 95) op = 300;
    else if (numOtrs >= 92) op = 240;
    else if (numOtrs >= 89) op = 180;
    else if (numOtrs >= 86) op = 90;
    else op = 0;
    setOtrsPoints(op);

    // CSAT Points
    let cp = 0;
    if (numComplaints === 0) cp = 200;
    else if (numComplaints === 1) cp = 140;
    else if (numComplaints === 2) cp = 100;
    else if (numComplaints === 3) cp = 60;
    else cp = 0;
    setCsatPoints(cp);

    // Total Points
    const tp = kp + op + cp - numMistakes;
    setTotalPoints(tp);

    // Bonus
    const hourRatio = numMaxHours > 0 ? totalWorkedHours / numMaxHours : 0;
    const finalBonus = Math.max(0, tp * 0.5 * hourRatio);
    setBonus(finalBonus);

    // Salary (Worked Hours + Manual Hours + Paid Days Off * 9) * Hourly Rate
    const calculatedBaseSalary = (totalWorkedHours + (numPaidDaysOff * 9)) * numHourlyRate;
    setBaseSalary(calculatedBaseSalary);
    setTotalPay(calculatedBaseSalary + finalBonus + numAdditionalBonus);
  }, [maxHours, workedHours, manualHours, kpi, otrs, complaints, mistakes, hourlyRate, paidDaysOff, additionalBonus]);

  const saveCurrentMonth = async () => {
    const recordId = `${user.uid}_${currentMonth}`;
    try {
      await setDoc(doc(db, 'salaryHistory', recordId), {
        uid: user.uid,
        month: currentMonth,
        baseSalary,
        bonus,
        totalPay,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving record", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-sm flex items-center justify-center">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t.greeting}, {user.displayName?.split(' ')[0]}</h1>
              <p className="text-slate-500 mt-1">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === 'bs' ? 'en' : 'bs')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </button>
            <button 
              onClick={logoutUser}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* Countdown Banner */}
        <div className="mb-8 bg-white border border-indigo-100 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-indigo-600">
            <CalendarDays className="w-6 h-6" />
            <span className="font-medium">{t.countdownPrefix}</span>
          </div>
          <div className="bg-indigo-50 text-indigo-700 font-mono font-bold text-lg px-4 py-2 rounded-xl border border-indigo-100">
            {countdown}
          </div>
        </div>

        {/* Notifications Banner */}
        {permission !== 'granted' && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-700">
              <Bell className="w-6 h-6" />
              <span className="font-medium">{t.notifications}</span>
            </div>
            <button 
              onClick={requestPermission}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {t.enableNotifications}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" />
                {t.dataEntry} {currentMonth}
              </h2>
              
              <div className="space-y-6">
                {/* Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {t.maxHours}
                    </label>
                    <input
                      type="number"
                      value={maxHours}
                      onChange={handleNumberChange(setMaxHours)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {t.workedHours}
                    </label>
                    <input
                      type="number"
                      value={workedHours}
                      onChange={handleNumberChange(setWorkedHours)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {t.manualHours}
                    </label>
                    <input
                      type="number"
                      value={manualHours}
                      onChange={handleNumberChange(setManualHours)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {t.paidDaysOff}
                    </label>
                    <input
                      type="number"
                      value={paidDaysOff}
                      onChange={handleNumberChange(setPaidDaysOff)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-slate-400" />
                      {t.kpi}
                    </label>
                    <input
                      type="number"
                      value={kpi}
                      onChange={handleNumberChange(setKpi)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-slate-400" />
                      {t.otrs}
                    </label>
                    <input
                      type="number"
                      value={otrs}
                      onChange={handleNumberChange(setOtrs)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <MessageSquareWarning className="w-4 h-4 text-slate-400" />
                      {t.complaints}
                    </label>
                    <input
                      type="number"
                      value={complaints}
                      onChange={handleNumberChange(setComplaints)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <FileWarning className="w-4 h-4 text-slate-400" />
                      {t.mistakes}
                    </label>
                    <input
                      type="number"
                      value={mistakes}
                      onChange={handleNumberChange(setMistakes)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:red-500 focus:border-red-500 transition-all outline-none"
                      min="0"
                    />
                    <p className="text-xs text-slate-500 mt-2">{t.mistakesHint}</p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Salary Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Euro className="w-4 h-4 text-slate-400" />
                      {t.hourlyRate}
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={handleNumberChange(setHourlyRate)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Euro className="w-4 h-4 text-slate-400" />
                      {t.additionalBonus}
                    </label>
                    <input
                      type="number"
                      value={additionalBonus}
                      onChange={handleNumberChange(setAdditionalBonus)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Schedule */}
            <ManualSchedule 
              uid={user.uid} 
              lang={lang} 
              onHoursCalculated={(hours, daysOff) => {
                setWorkedHours(hours.toString());
                setPaidDaysOff(daysOff.toString());
              }} 
            />
            
            {/* History Section */}
            {history.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 sm:p-8 mt-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  {t.history}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="pb-3 font-medium">{t.month}</th>
                        <th className="pb-3 font-medium text-right">{t.baseSalary}</th>
                        <th className="pb-3 font-medium text-right">{t.bonus}</th>
                        <th className="pb-3 font-medium text-right">{t.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 font-medium text-slate-700">{record.month}</td>
                          <td className="py-4 text-right text-slate-600">{record.baseSalary.toFixed(2)} €</td>
                          <td className="py-4 text-right text-emerald-600">+{record.bonus.toFixed(2)} €</td>
                          <td className="py-4 text-right font-bold text-indigo-600">{record.totalPay.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 rounded-3xl shadow-xl p-6 sm:p-8 text-white sticky top-8">
              <h2 className="text-xl font-semibold mb-6 text-slate-100 flex items-center gap-2">
                {t.results}
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.kpiPoints}</span>
                  <span className="font-mono text-lg">{kpiPoints}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.otrsPoints}</span>
                  <span className="font-mono text-lg">{otrsPoints}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.csatPoints}</span>
                  <span className="font-mono text-lg">{csatPoints}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.mistakes}</span>
                  <span className="font-mono text-lg text-red-400">-{mistakes || 0}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-300 font-medium">{t.totalPoints}</span>
                  <span className="font-mono text-xl font-bold text-indigo-400">{totalPoints}</span>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">{t.hoursFactor}</span>
                    <span className="font-mono text-slate-300">
                      {Number(workedHours) + Number(manualHours)} / {maxHours || 0} ({(Number(maxHours) > 0 ? ((Number(workedHours) + Number(manualHours)) / Number(maxHours)) * 100 : 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.baseSalary}</span>
                  <span className="font-mono text-lg">{baseSalary.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">{t.bonus}</span>
                  <span className="font-mono text-lg text-emerald-400">+{bonus.toFixed(2)} €</span>
                </div>
                {Number(additionalBonus) > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400">{t.additionalBonus}</span>
                    <span className="font-mono text-lg text-emerald-400">+{Number(additionalBonus).toFixed(2)} €</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 shadow-inner relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
                <p className="text-indigo-100 text-sm font-medium mb-1">{t.totalPay}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    {totalPay.toFixed(2)}
                  </span>
                  <Euro className="w-6 h-6 text-indigo-200" />
                </div>
              </div>

              <button
                onClick={saveCurrentMonth}
                className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-4 px-4 rounded-xl transition-colors"
              >
                <Save className="w-5 h-5" />
                {t.saveFor} {currentMonth}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

