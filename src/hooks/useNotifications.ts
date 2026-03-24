import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function useNotifications(uid: string | null) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // In an iframe environment, we'll simulate 'granted' if they click the button,
    // or just rely on in-app toasts which don't need permission.
    // But we still check native if available and not in strict iframe.
    try {
      if ('Notification' in window && window.self === window.top) {
        setPermission(Notification.permission);
      } else {
        // Assume granted for in-app toasts if in iframe
        const stored = localStorage.getItem('inAppNotifications');
        if (stored === 'granted') {
          setPermission('granted');
        }
      }
    } catch (e) {
      const stored = localStorage.getItem('inAppNotifications');
      if (stored === 'granted') {
        setPermission('granted');
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      if ('Notification' in window && window.self === window.top) {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          localStorage.setItem('inAppNotifications', 'granted');
        }
      } else {
        // Fallback for iframe
        setPermission('granted');
        localStorage.setItem('inAppNotifications', 'granted');
        toast.success('In-app notifikacije su omogućene!', { duration: 3000 });
      }
    } catch (e) {
      setPermission('granted');
      localStorage.setItem('inAppNotifications', 'granted');
      toast.success('In-app notifikacije su omogućene!', { duration: 3000 });
    }
  };

  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, 'shifts'), where('uid', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setShifts(data);
    }, (error) => {
      console.error("Error fetching shifts for notifications:", error);
    });

    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (permission !== 'granted' || shifts.length === 0) return;

    const checkAlarms = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      // 1. Check night before alarm for tomorrow's shift (after 20:00)
      if (currentHour >= 20) {
        const tomorrowShift = shifts.find(s => s.date === tomorrowStr);
        if (tomorrowShift) {
          const lastShownNightBefore = localStorage.getItem('lastShownNightBefore');
          if (lastShownNightBefore !== tomorrowStr) {
            const msg = tomorrowShift.type === 'slobodan_dan' 
              ? 'Sutra imate slobodan dan. Uživajte!' 
              : `Sutra radite od ${tomorrowShift.startTime} do ${tomorrowShift.endTime}.`;
            
            toast(msg, { icon: '📅', duration: 10000 });
            
            try {
              if ('Notification' in window && Notification.permission === 'granted' && window.self === window.top) {
                new Notification('Podsjetnik za sutra', { body: msg, icon: '/vite.svg' });
              }
            } catch (e) {}
            
            localStorage.setItem('lastShownNightBefore', tomorrowStr);
          }
        }
      }

      // 2. Check 30 mins before shift alarm
      const todayShift = shifts.find(s => s.date === todayStr);
      if (todayShift && todayShift.type !== 'slobodan_dan' && todayShift.startTime) {
        const [startHour, startMinute] = todayShift.startTime.split(':').map(Number);
        
        const nowMinutes = currentHour * 60 + currentMinute;
        const startMinutes = startHour * 60 + startMinute;
        const alarmMinutes = startMinutes - 30;

        // Trigger if we are within the 30-minute window before the shift
        if (nowMinutes >= alarmMinutes && nowMinutes < startMinutes) {
          const lastShown30Min = localStorage.getItem('lastShown30Min');
          if (lastShown30Min !== todayStr) {
            const minsLeft = startMinutes - nowMinutes;
            const msg = `Vaša smjena počinje za ${minsLeft} minuta (u ${todayShift.startTime}).`;
            
            toast.error(msg, { icon: '⏰', duration: 15000, style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' } });
            
            try {
              if ('Notification' in window && Notification.permission === 'granted' && window.self === window.top) {
                new Notification('Smjena počinje uskoro!', { body: msg, icon: '/vite.svg' });
              }
            } catch (e) {}
            
            // Play a sound
            try {
              const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
              audio.play().catch(e => console.error("Audio play failed:", e));
            } catch (e) {}
            
            localStorage.setItem('lastShown30Min', todayStr);
          }
        }
      }

      // 3. Check 15th to 20th of the month for Vacation Planning
      if (now.getDate() >= 15 && now.getDate() <= 20) {
        const lastShownVP = localStorage.getItem('lastShownVP');
        const currentMonthStr = `${now.getFullYear()}-${now.getMonth()}`;
        if (lastShownVP !== currentMonthStr) {
          toast('Podsjetnik: Do 20. u mjesecu potvrdite kada ćete koristiti godišnji u "vacation planning"', { icon: '🌴', duration: 15000 });
          localStorage.setItem('lastShownVP', currentMonthStr);
        }
      }

      // 4. Check 21st to 25th of the month for Peopleforce
      if (now.getDate() >= 21 && now.getDate() <= 25) {
        const lastShownPF = localStorage.getItem('lastShownPF');
        const currentMonthStr = `${now.getFullYear()}-${now.getMonth()}`;
        if (lastShownPF !== currentMonthStr) {
          toast('Podsjetnik: Do 25. u mjesecu potvrdite godišnji odmor u "peopleforce"', { icon: '✅', duration: 15000 });
          localStorage.setItem('lastShownPF', currentMonthStr);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAlarms, 60000);
    
    // Initial check
    checkAlarms();

    return () => clearInterval(interval);
  }, [shifts, permission]);

  return { permission, requestPermission };
}
