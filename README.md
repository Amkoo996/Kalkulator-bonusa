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
Instaliraj pakete:

Bash
npm install
Kreiraj .env fajl u root folderu:

Isječak koda
VITE_GEMINI_API_KEY=tvoj_gemini_api_kljuc
VITE_FIREBASE_API_KEY=tvoj_firebase_api_kljuc
Pokreni aplikaciju:

Bash
npm run dev
☁️ Deploy na Cloudflare Pages
Poveži GitHub repozitorij na Cloudflare Pages.

Build postavke:

Build command: npm install && npm run build

Output directory: dist

U Settings → Environment variables dodaj:

VITE_GEMINI_API_KEY

VITE_FIREBASE_API_KEY

🔗 Demo
Aplikacija je dostupna na: https://kalkulator-bonusa.pages.dev/
