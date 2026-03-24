# 💶 Kalkulator Plate i Bonusa

Personalna web aplikacija za praćenje i izračun plaće i bonusa — napravljena za zaposlenike koji rade po sistemu bodovanja (KPI, OTRS, CSAT).

## ✨ Funkcionalnosti

- **📱 PWA Podrška** — Instaliraj aplikaciju direktno na svoj telefon (Home Screen) ili desktop za brz pristup bez browsera.
- **Google prijava** — Sigurna autentifikacija putem Firebase-a, podaci su vezani isključivo za tvoj račun.
- **Kalkulator bonusa** — Unos sati, KPI, OTRS, grešaka i satnice; automatski izračun osnovice i bonusa.
- **AI skeniranje rasporeda** — Upload slike ili unos teksta rasporeda; Gemini AI automatski izvlači smjene i sprema ih u kalendar.
- **Odbrojavanje do isplate** — Live timer koji pokazuje koliko je ostalo do prvog radnog dana u mjesecu.
- **Povijest isplata** — Pregled svih spremljenih obračuna po mjesecima kroz Firestore bazu.
- **Višejezičnost** — Potpuna podrška za bosanski/hrvatski i engleski jezik.

## 🛠️ Tech Stack

| Tehnologija | Svrha |
|-------------|-------|
| **React + TypeScript** | Frontend logika |
| **Vite** | Build tool & PWA plugin |
| **Firebase (Auth & Firestore)** | Korisnici i baza podataka |
| **Gemini AI API** | Pametno čitanje rasporeda sa slika |
| **Tailwind CSS** | Moderan i responzivan dizajn |
| **Cloudflare Pages** | Brz i siguran hosting |

## 🚀 Pokretanje lokalno

**Preduvjeti:** Node.js 18+

1. Kloniraj repozitorij:
   ```bash
   git clone [https://github.com/Amkoo996/Kalkulator-bonusa.git](https://github.com/Amkoo996/Kalkulator-bonusa.git)
   cd Kalkulator-bonusa
   
2. Instaliraj pakete:

   Bash
   npm install

3. Kreiraj .env fajl u root folderu:

   Isječak koda
   * VITE_GEMINI_API_KEY=tvoj_gemini_api_kljuc
   * VITE_FIREBASE_API_KEY=tvoj_firebase_api_kljuc

4. Pokreni aplikaciju:

   Bash
   npm run dev

☁️ Deploy na Cloudflare Pages
   1. Poveži GitHub repozitorij na Cloudflare Pages.

   2. Build postavke:

      * Build command: npm install && npm run build

      * Output directory: dist

   3. U Settings → Environment variables dodaj:

VITE_GEMINI_API_KEY

VITE_FIREBASE_API_KEY

🔑 API ključevi
   * Gemini API → Nabavi na aistudio.google.com

   * Firebase → Postavke projekta na Firebase Console

📁 Struktura projekta
├── public/
│   └── _headers             # Sigurnosne polise za Cloudflare (COOP)
├── src/
│   ├── App.tsx              # Glavna logika i Gemini integracija
│   ├── firebase.ts          # Firebase konfiguracija
│   ├── i18n.ts              # Prijevodi (bs/en)
│   ├── components/          # UI komponente (Scanner, Modals)
│   └── hooks/               # Custom React hooks
└── vite.config.ts           # Vite & PWA konfiguracija

🔗 Demo
   Aplikacija je trenutno online: https://kalkulator-bonusa.pages.dev/

Napomena: .env fajl je sakriven (gitignore) radi sigurnosti tvojih privatnih ključeva.
