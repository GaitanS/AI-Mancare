# Ghid Deployment Hostinger Cloud Startup (Next.js)

Acest ghid documentează configurația **VALIDATĂ** pentru a rula aplicații Next.js pe Hostinger Cloud Startup (folosind panoul "Implementări" / "Deployments" și GitHub integration).

> **NOTĂ CRITICĂ:** Urmează acești pași pentru orice nouă aplicație Node.js/Next.js pe care o adaugi, pentru a evita erorile 503.

---

## 1. Configurare Cod (Repository)

### `package.json`
Comanda de start trebuie să fie cea standard de Next.js.
Evită scripturile custom (ex: `node server.js`) sau Standalone mode dacă vrei să funcționeze fișierele statice out-of-the-box.

```json
"scripts": {
  "build": "npx prisma migrate deploy && next build",
  "start": "next start"
}
```

*Nota: `npx prisma migrate deploy` asigură că baza de date e actualizată la fiecare deploy.*

### `next.config.js`
Folosește modul Standard (Default). Nu activa `output: 'standalone'` decât dacă știi sigur cum să gestionezi copierea fișierelor statice (`public/`).

```javascript
const nextConfig = {
  // output: 'standalone', // <--- Lasa comentat sau sterge aceasta linie
  // ... alte setari
};
```

### Arhitectura Imaginilor (`src/app/page.tsx`, etc.)
Pentru a evita probleme cu imaginile care nu se încarcă, **importă-le** în loc să folosești string-uri.

**NU Așa:**
```tsx
<Image src="/hero.png" ... />
```

**DA Așa:**
```tsx
import heroImg from '../../public/hero.png';
<Image src={heroImg} ... />
```

---

## 2. Configurare Hostinger (Panoul Control)

La crearea unei noi aplicații sau în setările "Implementări":

### A. Setări de Compilare (Build Settings)
*   **Preset:** Next.js (sau Node.js)
*   **Comandă de compilare:** `npm run build` (sau lăsat pe default dacă detectează `package.json`)
*   **Director de ieșire:** `.next`
*   **Director root:** `/`

### B. Variabile de Mediu (CRITIC!)
Fără aceste variabile, site-ul va da **Error 503 Service Unavailable**.

Mergi la tab-ul **Variabile de mediu** și adaugă obligatoriu:

| Cheie | Valoare | Explicație |
|-------|---------|------------|
| **HOSTNAME** | **0.0.0.0** | **OBLIGATORIU.** Permite aplicației să asculte conexiuni externe (de la Hostinger Proxy). Fără asta, ascultă doar pe localhost și dă eroare. |
| **PORT** | (Lasă gol) | Hostinger atribuie automat un port. Nu forța `3000`. |
| `DATABASE_URL` | `mysql://...` | Connection string-ul către baza de date. |
| `NEXT_PUBLIC_...` | ... | Orice variabilă publică necesară aplicației. |

---

## 3. Troubleshooting (Depanare)

### Problema: Site-ul dă "503 Service Unavailable"
**Cauza 1:** Nu ai setat `HOSTNAME=0.0.0.0`.
*   *Soluție:* Adaugă variabila și dă Redeploy.

**Cauza 2:** Build-ul a eșuat.
*   *Soluție:* Verifică "Jurnale implementare" -> "Build Logs". Caută erori de TypeScript sau dependențe lipsă.

**Cauza 3:** Dependențe grele (ex: Puppeteer).
*   *Soluție:* Scoate `puppeteer` din `package.json` dacă nu e strict necesar, sau asigură-te că ai setările pentru a evita download-ul Chromium.

### Problema: Imaginile nu se încarcă (404)
**Cauza:** Modul Standalone sau o eroare de copiere a folderului `public`.
*   *Soluție:* Treci pe Modul Standard (`next start`) și asigură-te că folosești importuri statice pentru imagini critice (vezi secțiunea 1).

### Problema: Baza de date nu se conectează
**Cauza:** IP greșit sau parolă greșită.
*   *Soluție:* Pe Hostinger Cloud, adresa bazei de date este adesea `127.0.0.1` sau `localhost` dacă baza e pe același server de hosting. Verifică parola în `DATABASE_URL`.

---

**Versiune Ghid:** 2.0 (Actualizat pentru Cloud Startup GUI)
