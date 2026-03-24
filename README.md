# 💶 Kalkulator Plate i Bonusa

Personalna web aplikacija za praćenje i izračun plaće i bonusa — napravljena za zaposlenike koji rade po sistemu bodovanja (KPI, OTRS, CSAT).

## ✨ Funkcionalnosti

- **Google prijava** — sigurna autentifikacija, podaci vezani za tvoj račun
- **Kalkulator bonusa** — unos sati, KPI, OTRS, grešaka, complaints i satnice; automatski izračun osnovice i bonusa
- **Odbrojavanje do isplate** — live timer koji pokazuje koliko je ostalo do prvog radnog dana u mjesecu
- **AI skeniranje rasporeda** — upload slike ili unos teksta rasporeda, Gemini AI automatski izvlači smjene i sprema ih
- **Povijest isplata** — pregled svih spremljenih obračuna po mjesecima
- **Notifikacije** — podsjetnici vezani za isplatu i raspored
- **Višejezičnost** — podrška za bosanski/hrvatski i engleski jezik

## 🛠️ Tech Stack

| Tehnologija | Svrha |
|-------------|-------|
| React + TypeScript | Frontend |
| Vite | Build tool |
| Firebase Auth | Google prijava |
| Firestore | Baza podataka |
| Gemini AI API | AI skeniranje rasporeda |
| Tailwind CSS | Stilizacija |
| Cloudflare Pages | Hosting |

## 🚀 Pokretanje lokalno

**Preduvjeti:** Node.js 18+

1. Kloniraj repozitorij:
   ```bash
   git clone https://github.com/Amkoo996/Kalkulator-bonusa.git
   cd Kalkulator-bonusa
   ```

2. Instaliraj dependencies:
   ```bash
   npm install
   ```

3. Kreiraj `.env` fajl:
   ```env
   VITE_GEMINI_API_KEY=tvoj_gemini_api_kljuc
   VITE_FIREBASE_API_KEY=tvoj_firebase_api_kljuc
   ```

4. Pokreni razvojni server:
   ```bash
   npm run dev
   ```

## ☁️ Deploy na Cloudflare Pages

1. Poveži GitHub repozitorij u Cloudflare Pages
2. Build postavke:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Dodaj environment varijable u **Settings → Environment variables**:
   - `VITE_GEMINI_API_KEY`
   - `VITE_FIREBASE_API_KEY`

## 🔑 API ključevi

- **Gemini API** → [aistudio.google.com](https://aistudio.google.com) → API Keys
- **Firebase** → [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps

## 📁 Struktura projekta

```
├── src/
│   ├── App.tsx                  # Glavna komponenta
│   ├── firebase.ts              # Firebase konfiguracija
│   ├── i18n.ts                  # Prijevodi (bs/en)
│   ├── components/
│   │   └── ScheduleScanner.tsx  # AI skeniranje rasporeda
│   └── hooks/
│       └── useNotifications.ts  # Notifikacije
├── .env                         # API ključevi (nije u git-u)
└── firestore.rules              # Firebase sigurnosna pravila
```

## 📝 Napomena

`.env` fajl **nije** commitovan u repozitorij. Svaki developer treba kreirati vlastiti `.env` lokalno.

Stranica je trenutno online, te primjer možete vidjeti na demo linku - https://4e8d7ece.kalkulator-bonusa.pages.dev/
