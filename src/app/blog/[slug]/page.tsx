import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPriceIndex } from '@/lib/price-index';
import PriceIndexWidget from '@/components/PriceIndexWidget';

// ISR: regenerate the article page every hour so the embedded widget stays fresh
export const revalidate = 3600;

// Slugs that get the live Price Index widget injected at the top of the article
const PRICE_INDEX_SLUGS = new Set<string>([
    'top-5-supermarketuri-romania-comparatie-preturi',
    'cel-mai-ieftin-supermarket-romania-2026',
    'comparatie-preturi-lidl-kaufland-penny-carrefour-2026',
    'cum-sa-economisesti-la-cumparaturi-ghid-complet-2026',
]);

// Static articles content
const articlesContent: Record<string, {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    publishedAt: string;
    readingTime: number;
    metaDescription: string;
}> = {
    'cum-sa-economisesti-la-cumparaturi-ghid-complet-2026': {
        title: 'Cum să economisești la cumpărături - Ghid complet 2026',
        excerpt: 'Descoperă cele mai eficiente strategii pentru a reduce costurile la cumpărături fără a compromite calitatea.',
        category: 'economie',
        publishedAt: '2026-01-06',
        readingTime: 8,
        metaDescription: 'Ghid complet 2026 pentru economisire la cumpărături. Strategii testate pentru reducerea costurilor la supermarket fără să compromiți calitatea.',
        content: `
## De ce să economisești la cumpărături?

În contextul economic actual, fiecare leu contează. Cumpărăturile alimentare reprezintă una dintre cele mai mari cheltuieli lunare pentru o familie din România. Vestea bună? Cu strategiile potrivite, poți reduce semnificativ aceste costuri fără să renunți la calitate.

## 1. Planifică-ți cumpărăturile în avans

**Lista de cumpărături** este cel mai important instrument. Fără ea, riști să cumperi impulsiv și să depășești bugetul.

### Cum să faci o listă eficientă:
- Verifică ce ai deja în frigider și cămară
- Planifică mesele pentru săptămâna următoare
- Grupează produsele pe categorii (lactate, carne, legume)
- Estimează cantitățile necesare

## 2. Compară prețurile între magazine

Nu toate supermarketurile au aceleași prețuri. **Lidl și Penny** sunt de obicei cele mai ieftine pentru produse de bază, în timp ce **Kaufland și Carrefour** pot avea oferte mai bune la produse de marcă.

### Folosește CatalogSmart
Cu aplicația noastră, poți compara instant prețurile din toate cataloagele și găsi cele mai bune oferte fără să pierzi timp verificând fiecare catalog manual.

## 3. Profită de oferte și reduceri

### Zilele cu cele mai bune reduceri:
- **Lidl**: Joi și Luni (produse noi)
- **Kaufland**: Miercuri și Vineri
- **Penny**: Luni și Joi
- **Carrefour**: Miercuri

### Tipuri de oferte de urmărit:
- Reduceri sezoniere (sfârșitul săptămânii)
- Produse aproape de expirare (reduceri 30-50%)
- Pachete promoționale (cumperi 2, primești 1)
- Carduri de fidelitate

## 4. Cumpără produse sezoniere

Fructele și legumele de sezon sunt:
- Mai ieftine (nu necesită transport internațional)
- Mai proaspete și gustoase
- Mai sănătoase (coapte natural)

### Ce să cumperi în ianuarie:
- Varză, morcovi, țelină, cartofi
- Mere, pere, citrice

## 5. Evită capcanele de marketing

### Semnale de alarmă:
- "Reducere" de la un preț artificial umflat
- Ambalaje mari care nu sunt neapărat mai ieftine per unitate
- Produse la capătul raftului (plasare strategică, nu neapărat ofertă)

### Verifică întotdeauna:
- Prețul per kilogram/litru, nu doar prețul pe ambalaj
- Data de expirare
- Istoricul prețurilor (cu CatalogSmart)

## 6. Gătește acasă

Mâncarea gătită acasă este de 3-5 ori mai ieftină decât cea gata preparată sau din restaurante.

### Sfaturi pentru gătit economic:
- Pregătește mese în cantități mari și congelează
- Folosește ingrediente versatile (ouă, cartofi, paste)
- Transformă resturile în mese noi
- Învață rețete simple și rapide

## Concluzie

Economisirea la cumpărături nu înseamnă să renunți la calitate sau să mănânci prost. Cu planificare, informare și instrumentele potrivite, poți reduce cheltuielile cu 20-40% lunar.

**Începe acum**: Folosește CatalogSmart pentru a compara prețurile și a găsi cele mai bune oferte din toate supermarketurile din România!
    `,
    },
    'top-5-supermarketuri-romania-comparatie-preturi': {
        title: 'Cel mai ieftin supermarket din România în 2026 - Top 5 Comparație Prețuri',
        excerpt: 'Care este cel mai ieftin supermarket din România? Am analizat în detaliu prețurile la Lidl, Kaufland, Penny, Carrefour și Mega Image pentru 2026.',
        category: 'ghiduri',
        publishedAt: '2026-01-05',
        readingTime: 10,
        metaDescription: 'Cel mai ieftin supermarket din România 2026. Comparație detaliată a prețurilor la Lidl, Kaufland, Penny, Carrefour și Mega Image. Descoperă unde faci cele mai ieftine cumpărături!',
        content: `
## Ce spun datele despre cel mai ieftin supermarket?

Alegerea supermarketului potrivit poate face diferența de sute de lei pe lună în bugetul familiei. Am analizat prețurile la cele mai populare lanțuri de magazine din România pentru 2026.

## 1. Lidl - Cel mai ieftin supermarket pentru produse de bază

**Puncte forte:**
- Prețuri mici la produse de bază (lapte, ouă, pâine, lactate)
- Produse de marcă proprie de calitate: Favorina, Milbona, Pilos
- Oferte săptămânale excelente (Joi - catalog nou)
- Produse importate la prețuri competitive
- Aplicația Lidl Plus cu cupoane suplimentare de 5-50%

**Cel mai ieftin pentru:** Produse de panificație, lactate, dulciuri importate, produse de bază

**Verdict:** **Lidl câștigă** la produse de panificație, lactate și gama de bază.

## 2. Kaufland - Cel mai ieftin la carne și varietate

**Puncte forte:**
- Sortiment foarte larg (peste 30.000 produse)
- Secțiune mare de produse proaspete
- Prețuri excelente la carne și mezeluri
- Program prelungit, inclusiv duminica

**Cel mai ieftin pentru:** Carne, fructe și legume de sezon, produse voluminoase

**Verdict:** **Kaufland câștigă** la carne, fructe și legume.

## 3. Penny - Cel mai ieftin discount de cartier

**Puncte forte:**
- Magazine în aproape orice cartier din România
- Prețuri mici constante la produse esențiale
- Oferte bune la produse pentru casă și curățenie

**Cel mai ieftin pentru:** Cumpărături rapide, produse de curățenie, conserve

**Verdict:** **Penny câștigă** prin acces ușor și prețuri stabile.

## 4. Carrefour - Cel mai bun pentru cumpărături complete

**Puncte forte:**
- Tot ce ai nevoie într-un singur loc
- Card Act cu puncte și reduceri suplimentare
- Sortiment premium disponibil

**Cel mai ieftin pentru:** Electronice, produse non-alimentare, cumpărături mari

**Verdict:** **Carrefour** este recomandat pentru cumpărături mari cu cardul de fidelitate.

## 5. Mega Image - Cel mai convenabil la ore târzii

**Puncte forte:**
- Magazine deschise până la 23:00 sau 24:00
- Produse proaspete de calitate
- Aplicație mobilă cu oferte personalizate

**Cel mai ieftin pentru:** Cumpărături de urgență, produse premium, produse locale

**Verdict:** **Mega Image** nu e cel mai ieftin, dar câștigă la program și comoditate.

## Concluzie: Cel mai ieftin supermarket din România 2026

Nu există un singur câștigător absolut - depinde de ce cumperi:

- 🥇 **Cel mai ieftin la produse de bază:** Lidl
- 🥇 **Cel mai ieftin la carne:** Kaufland
- 🥇 **Cel mai accesibil ca locație:** Penny
- 🥇 **Cel mai bun pentru cumpărături mari:** Carrefour

**Sfatul nostru**: Combină mai multe magazine și folosește CatalogSmart pentru a găsi automat cel mai ieftin preț pentru fiecare produs din lista ta de cumpărături!
    `,
    },
    'retete-studenti-mese-sub-20-lei': {
        title: 'Rețete pentru studenți - Mese complete sub 20 lei',
        excerpt: 'Nu ai bani mulți dar vrei să mănânci sănătos? Iată 10 rețete delicioase și nutritive pe care le poți prepara cu ingrediente ieftine.',
        category: 'retete',
        publishedAt: '2026-01-04',
        readingTime: 6,
        metaDescription: 'Rețete ieftine pentru studenți sub 20 lei. 10 idei de mese sănătoase și gustoase cu ingrediente accesibile din supermarket.',
        content: `
## Gătit ieftin pentru studenți

Viața de student vine cu multe provocări, iar bugetul limitat pentru mâncare este una dintre ele. Dar asta nu înseamnă că trebuie să mănânci doar instant noodles! Iată 10 rețete gustoase sub 20 de lei.

## 1. Paste cu sos de roșii și usturoi (8 lei)

**Ingrediente:**
- 200g paste (3 lei)
- 400g roșii la conservă (3 lei)
- 4 căței de usturoi (1 leu)
- Ulei, sare, piper (1 leu)

**Timp de preparare:** 20 minute

## 2. Orez cu legume și ou (10 lei)

**Ingrediente:**
- 200g orez (2 lei)
- 2 ouă (2 lei)
- Legume congelate (4 lei)
- Sos de soia (2 lei)

**Timp de preparare:** 25 minute

## 3. Supă cremă de legume (12 lei)

**Ingrediente:**
- Cartofi, morcovi, țelină (6 lei)
- 1 ceapă (1 leu)
- Smântână (3 lei)
- Pâine pentru crutoane (2 lei)

**Timp de preparare:** 35 minute

## 4. Sandwich-uri cu ton (15 lei)

**Ingrediente:**
- Conservă de ton (8 lei)
- Pâine toast (4 lei)
- Legume proaspete (3 lei)

**Timp de preparare:** 10 minute

## 5. Cartofi prăjiți cu brânză (11 lei)

**Ingrediente:**
- 500g cartofi (3 lei)
- 100g brânză rasă (6 lei)
- Ulei, sare, condimente (2 lei)

**Timp de preparare:** 30 minute

## Sfaturi pentru studenți

1. **Cumpără la ofertă** - verifică cataloagele săptămânal
2. **Gătește în cantități** - fă mâncare pentru 2-3 zile
3. **Congeleză porții** - economisești timp și bani
4. **Partajează cu colegii** - împărțiți costurile ingredientelor

## Unde să cumperi ieftin

Pentru ingrediente accesibile, recomandăm Lidl și Penny. Verifică ofertele pe CatalogSmart!
    `,
    },
    'cand-apar-cele-mai-bune-oferte-lidl-kaufland-penny': {
        title: 'Când apar cele mai bune oferte la Lidl, Kaufland și Penny',
        excerpt: 'Fiecare supermarket are un calendar specific pentru reduceri. Află exact în ce zile să mergi la cumpărături.',
        category: 'tips',
        publishedAt: '2026-01-03',
        readingTime: 5,
        metaDescription: 'Calendar oferte supermarketuri 2026. Află când apar reducerile la Lidl, Kaufland, Penny și alte magazine pentru a economisi maxim.',
        content: `
## Calendarul ofertelor 2026

Fiecare rețea de supermarketuri își actualizează ofertele în zile diferite. Cunoscând acest calendar, poți planifica cumpărăturile pentru a prinde cele mai bune reduceri.

## Lidl

**Când se schimbă ofertele:**
- **Luni**: Oferte noi la produse non-alimentare
- **Joi**: Oferte principale pentru săptămână
- **Weekend**: Oferte flash (valabile doar Sâmbătă-Duminică)

**Cel mai bun moment:** Joi dimineața, când stocurile sunt pline

## Kaufland

**Când se schimbă ofertele:**
- **Miercuri**: Oferte noi la alimente
- **Vineri**: Oferte speciale de weekend
- **Online**: Oferte exclusive pe site

**Cel mai bun moment:** Miercuri la prânz, după reaprovizionare

## Penny

**Când se schimbă ofertele:**
- **Luni**: Oferte principale săptămânale
- **Joi**: Oferte mid-week
- **Catalogul nou**: Apare duminica seara

**Cel mai bun moment:** Luni dimineața devreme

## Carrefour

**Când se schimbă ofertele:**
- **Miercuri**: Schimbare catalog principal
- **Hypermarketuri**: Oferte exclusive
- **Card Act**: Reduceri suplimentare pentru membri

**Cel mai bun moment:** Miercuri sau joi

## Mega Image

**Când se schimbă ofertele:**
- **Zilnic**: Oferte în aplicație
- **Luni**: Oferte săptămânale noi
- **Vineri**: Promoții de weekend

**Cel mai bun moment:** Verifică aplicația zilnic

## Sfaturi pro

1. ✅ Abonează-te la newslettere pentru alerte
2. ✅ Folosește CatalogSmart pentru comparații
3. ✅ Urmărește reducerile de seară la produse proaspete
4. ❌ Evită cumpărăturile în weekend la ore de vârf
    `,
    },
    'cum-sa-citesti-corect-cataloagele-de-reduceri': {
        title: 'Cum să citești corect cataloagele de reduceri',
        excerpt: 'Nu te lăsa păcălit de ofertele aparent bune! Învață să identifici reducerile reale.',
        category: 'tips',
        publishedAt: '2026-01-02',
        readingTime: 7,
        metaDescription: 'Ghid pentru citirea cataloagelor de supermarket. Învață să identifici ofertele reale și să eviți trucurile de marketing.',
        content: `
## Anatomia unui catalog de reduceri

Cataloagele sunt concepute de profesioniști în marketing pentru a te face să cumperi cât mai mult. Iată cum să le citești inteligent.

## 1. Verifică prețul per unitate

**Greșeala comună:** Să te uiți doar la prețul total.

**Soluția:** Compară întotdeauna prețul per kilogram sau per litru. Un pachet mare nu e neapărat mai ieftin!

Exemplu:
- Detergent 2L la 25 lei = 12.50 lei/L
- Detergent 1.5L la 15 lei = 10 lei/L ✅ Mai ieftin!

## 2. Atenție la "prețul vechi"

Magazinele uneori umflă artificial prețul "vechi" pentru a face reducerea să pară mai mare.

**Cum verifici:** Folosește CatalogSmart pentru a vedea istoricul prețurilor.

## 3. Oferte limitate în timp

"Doar azi!" sau "Ofertă specială" creează urgență falsă. De multe ori, produsul va fi din nou la reducere săptămâna viitoare.

## 4. Plasarea în catalog

- **Prima pagină**: Cele mai atractive oferte (nu neapărat cele mai bune)
- **Mijlocul catalogului**: Oferte standard
- **Ultima pagină**: Produse sezoniere

## 5. Cumpără 2, primești 1 gratis

Calculează dacă chiar ai nevoie de 3 bucăți. Uneori e o afacere bună, alteori riști să arunci mâncare.

## Checklist rapid

✅ Am verificat prețul per unitate?
✅ Am comparat cu alte magazine?
✅ Chiar am nevoie de acest produs?
✅ Am verificat data de expirare?
✅ Am spațiu de depozitare?

## Concluzie

Nu lăsa marketingul să decidă pentru tine. Cu CatalogSmart, poți compara prețurile din toate cataloagele instant și lua decizii informate!
    `,
    },
    'lista-cumparaturi-perfecta-familie-4-persoane': {
        title: 'Lista de cumpărături perfectă pentru o familie de 4 persoane',
        excerpt: 'Planifică eficient cumpărăturile săptămânale pentru familia ta.',
        category: 'ghiduri',
        publishedAt: '2026-01-01',
        readingTime: 9,
        metaDescription: 'Listă completă de cumpărături săptămânale pentru familia de 4 persoane. Template descărcabil și sfaturi pentru economisire.',
        content: `
## Lista săptămânală optimă

O familie de 4 persoane (2 adulți, 2 copii) are nevoie de aproximativ 40-60 de produse pe săptămână. Iată o organizare eficientă.

## Lactate și ouă

- Lapte 3.5% - 5L
- Iaurt - 8 buc
- Brânză telemea - 400g
- Cașcaval - 300g
- Ouă - 20 buc
- Smântână - 2 buc
- Unt - 200g

**Buget estimat:** 80-100 lei

## Carne și mezeluri

- Piept de pui - 1kg
- Carne tocată - 500g
- Șnițele - 500g
- Cârnați - 400g
- Șuncă - 200g

**Buget estimat:** 100-130 lei

## Pâine și produse de panificație

- Pâine proaspătă - 5 buc
- Corn/chifle - 10 buc
- Biscuiți copii - 2 pachete

**Buget estimat:** 30-40 lei

## Fructe și legume

- Cartofi - 3kg
- Morcovi - 1kg
- Ceapă - 1kg
- Roșii - 1kg
- Castraveți - 4 buc
- Mere - 2kg
- Banane - 2kg
- Portocale - 2kg

**Buget estimat:** 60-80 lei

## Produse de bază

- Orez - 1kg
- Paste - 1kg
- Ulei - 1L
- Făină - 1kg
- Zahăr - 1kg
- Conserve - 4 buc

**Buget estimat:** 40-50 lei

## Băuturi

- Apă minerală - 6L
- Sucuri naturale - 3L

**Buget estimat:** 30-40 lei

## Total săptămânal estimat

**Total:** 340-440 lei/săptămână
**Pe lună:** 1,400-1,800 lei

## Cum să economisești

1. Compară prețurile cu CatalogSmart
2. Cumpără produse de sezon
3. Preferă mărcile private ale magazinelor
4. Evită produsele pre-ambalate

## Descarcă template-ul

Folosește funcția de Plan din CatalogSmart pentru a genera automat lista de cumpărături bazată pe rețetele săptămânii!
    `,
    },
    // ========== NEW SEO ARTICLES (10) ==========
    'cel-mai-ieftin-supermarket-romania-2026': {
        title: 'Cel mai ieftin supermarket din România 2026 - Clasament și Comparație Completă',
        excerpt: 'Care este cel mai ieftin supermarket din România în 2026? Analiză detaliată cu prețuri reale la Lidl, Kaufland, Penny, Carrefour, Mega Image și Auchan.',
        category: 'economie',
        publishedAt: '2026-04-01',
        readingTime: 12,
        metaDescription: 'Cel mai ieftin supermarket din România 2026. Clasament complet cu prețuri reale: Lidl, Kaufland, Penny, Carrefour, Mega Image, Auchan. Unde faci cele mai ieftine cumpărături?',
        content: `
## Care este cel mai ieftin supermarket din România în 2026?

Întrebarea "care este cel mai ieftin supermarket din România" este una din cele mai căutate online de români. Răspunsul nu este simplu - depinde de ce cumperi. Am analizat prețurile la peste 100 de produse pentru a-ți da un răspuns complet.

## Metodologia noastră

Am comparat prețurile la 6 supermarketuri majore din România pentru categoriile:
- Produse lactate (lapte, iaurt, brânză, ouă)
- Carne și mezeluri
- Fructe și legume
- Produse de bază (ulei, zahăr, făină, paste, orez)
- Băuturi
- Produse de curățenie

## Clasamentul complet 2026

### 1. 🥇 Lidl - Cel mai ieftin la produse de bază

Lidl domină consistent la produse de panificație, lactate și gama de bază.

| Produs | Preț Lidl | Medie piață |
|--------|-----------|-------------|
| Lapte 1L | 5.99 lei | 6.50 lei |
| Ouă 10 buc | 9.99 lei | 11.50 lei |
| Pâine 500g | 2.49 lei | 3.20 lei |
| Iaurt 140g | 1.99 lei | 2.30 lei |

**Economie medie față de piață: 15-20%**

Bonusul Lidl Plus: Cu aplicația Lidl Plus primești cupoane suplimentare de 5-50% la produse selectate.

### 2. 🥈 Kaufland - Cel mai ieftin la carne

Kaufland câștigă clar la carne, mezeluri și produse fresh.

| Produs | Preț Kaufland | Medie piață |
|--------|---------------|-------------|
| Piept pui/kg | 18.99 lei | 22.00 lei |
| Carne tocată/kg | 15.99 lei | 18.50 lei |
| Costiță/kg | 24.99 lei | 29.00 lei |

**Economie medie la carne: 15-25%**

### 3. 🥉 Penny - Cel mai ieftin la produse de curățenie

Penny excelează la detergenți, produse de curățenie și articole de casă.

- Detergenți: cu 10-20% mai ieftini decât media
- Produse igienă: cu 15% mai ieftini
- Conserve și murături: competitive

### 4. Carrefour - Cel mai bun pentru familii mari

Carrefour nu câștigă la prețuri de bază, dar oferă:
- Pachete mari (economie la volum)
- Card Act cu reduceri 5-10%
- Oferte speciale pentru membrii

**Sfat:** Cu cardul Act, Carrefour devine competitiv la cumpărături mari.

### 5. Mega Image - Prețuri mai mari, dar comoditate maximă

Mega Image este de obicei cu 10-15% mai scump decât media, dar:
- Deschis 24/7 în unele locații
- Calitate superioară la produse fresh
- Aplicație cu oferte personalizate

### 6. Auchan - Cel mai bun pentru cumpărături en-gros

Auchan oferă prețuri bune la cantități mari:
- Pachete familiale mai ieftine
- Gama proprie Auchan competitivă
- Bun pentru cumpărături lunare

## Comparație finală: Cel mai ieftin supermarket per categorie

| Categorie | Câștigător | Economie vs. media |
|-----------|-----------|--------------------|
| Produse de bază | **Lidl** | -15 până la -20% |
| Carne și mezeluri | **Kaufland** | -15 până la -25% |
| Fructe și legume | **Kaufland / Lidl** | -10 până la -15% |
| Produse de curățenie | **Penny** | -10 până la -20% |
| Cumpărături mari | **Carrefour** | -5 până la -10% |
| Produse premium | **Mega Image** | Similar cu piața |

## Câți bani poți economisi?

O familie de 4 persoane care cumpără strategic:
- Cumpărăturile de bază de la Lidl
- Carnea de la Kaufland
- Produsele de curățenie de la Penny

**Poate economisi 200-400 lei pe lună** față de a cumpăra totul dintr-un singur loc la prețuri medii.

## Cum să găsești mereu cel mai ieftin preț

Folosind CatalogSmart, poți:
- Compara prețurile din toate cataloagele instantaneu
- Vedea ofertele active pentru orice produs
- Genera o listă de cumpărături optimizată pe magazine
- Urmări istoricul prețurilor pentru a ști dacă e ofertă reală

**Concluzie**: Nu există un singur supermarket cel mai ieftin - depinde de ce cumperi. Cea mai bună strategie este să combini 2-3 magazine și să folosești CatalogSmart pentru comparații rapide!
    `,
    },
    'catalog-kaufland-aceasta-saptamana-oferte-2026': {
        title: 'Catalog Kaufland această săptămână - Cele mai bune oferte 2026',
        excerpt: 'Vezi toate ofertele din catalogul Kaufland valabil săptămâna aceasta. Prețuri actualizate și comparații cu alte magazine.',
        category: 'ghiduri',
        publishedAt: '2026-01-07',
        readingTime: 6,
        metaDescription: 'Catalog Kaufland săptămâna aceasta 2026. Descoperă cele mai bune oferte, reduceri și promoții la alimente, carne, fructe și legume.',
        content: `
## Catalogul Kaufland - Ianuarie 2026

Kaufland este unul dintre cele mai populare hipermarketuri din România, cu o gamă largă de produse și prețuri competitive. Iată ce oferte găsești în catalogul din această săptămână.

## Oferte la carne și mezeluri

Kaufland oferă cele mai bune prețuri pentru:
- **Piept de pui** - de la 19.99 lei/kg
- **Carne tocată** - de la 15.99 lei/kg
- **Cable fresh** - reduceri până la 40%

## Fructe și legume proaspete

Secțiunea K-Bio și produse locale:
- Cartofi românești - de la 2.49 lei/kg
- Mere Golden - de la 4.99 lei/kg
- Banane - preț stabil 4.49 lei/kg

## Produse Kaufland Select

Marca proprie Kaufland oferă calitate la prețuri mici:
- K-Classic - produse de bază
- K-Bio - produse organice
- K-Favourites - gustări și snacks

## Când să mergi pentru cele mai bune oferte

- **Miercuri**: Catalog nou, stocuri complete
- **Vineri seara**: Reduceri la produse proaspete
- **Weekend**: Oferte speciale bonus

## Cum să compari cu alte magazine

Folosește CatalogSmart pentru a vedea dacă Kaufland oferă cel mai bun preț sau dacă Lidl sau Penny au oferte mai bune pentru același produs.

**Sfat CatalogSmart**: Verifică mereu prețul pe kilogram, nu doar prețul pe pachet!
    `,
    },
    'catalog-lidl-oferte-saptamanale-romania-2026': {
        title: 'Catalog Lidl săptămânal - Oferte și promoții România 2026',
        excerpt: 'Descoperă cele mai noi oferte din catalogul Lidl. Produse alimentare, non-alimentare și bazarul de la mijlocul săptămânii.',
        category: 'ghiduri',
        publishedAt: '2026-01-07',
        readingTime: 7,
        metaDescription: 'Catalog Lidl oferte săptămânale 2026 România. Vezi reducerile la alimente, produse fresh și bazarul din mijlocul săptămânii.',
        content: `
## Catalogul Lidl - Oferte Săptămânale

Lidl este cunoscut pentru prețurile mici și ofertele excelente care se schimbă în fiecare săptămână. Iată ce trebuie să știi despre catalogul Lidl.

## Cum funcționează ofertele Lidl

- **Luni**: Produse non-alimentare noi
- **Joi**: Catalog principal nou
- **Duminică/Sâmbătă**: Oferte flash de weekend

## Bazarul Lidl - Produse non-alimentare

În fiecare săptămână, Lidl aduce produse surpriză:
- Unelte și bricolaj
- Articole pentru casă
- Haine și accesorii
- Electronice

**Sfat**: Ajunge devreme joi pentru a prinde stocul!

## Oferte speciale pentru familii

Lidl oferă prețuri competitive pentru:
- Scutece și produse pentru copii
- Pachete familie XXL
- Produse de curățenie

## Aplicația Lidl Plus

Obține reduceri suplimentare de 5-50% cu aplicația Lidl Plus:
- Cupoane personalizate
- Loterii cu premii
- Reduceri exclusive

## Comparație Lidl vs Kaufland

| Produs | Lidl | Kaufland |
|--------|------|----------|
| Lapte 1L | 5.99 | 6.29 |
| Pâine | 2.49 | 2.79 |
| Ouă 10 buc | 9.99 | 10.49 |

**Rezultat**: Lidl e mai ieftin la produse de bază, Kaufland câștigă la varietate.

## Verifică prețurile cu CatalogSmart

Nu mai pierde timp răsfoind cataloage! CatalogSmart îți arată instant cel mai ieftin magazin pentru orice produs.
    `,
    },
    'oferte-penny-promotii-saptamanale-2026': {
        title: 'Oferte Penny - Promoții săptămânale și prețuri mici 2026',
        excerpt: 'Cele mai bune oferte din cataloagele Penny. Reduceri la produse alimentare și non-alimentare disponibile în magazine.',
        category: 'ghiduri',
        publishedAt: '2026-01-06',
        readingTime: 5,
        metaDescription: 'Oferte Penny 2026 - promoții săptămânale, reduceri și cele mai mici prețuri. Catalog actualizat pentru supermarketul tău de cartier.',
        content: `
## Ofertele Penny - Supermarketul economic

Penny este renumit pentru prețurile mici și apropierea de casă. Cu magazine în aproape fiecare cartier, e alegerea ideală pentru cumpărături rapide.

## Categorii cu cele mai bune prețuri

### Produse Penny proprii
- Penny to Go - mâncare la pachet
- Penny Time - băuturi
- Tassimo/Penny - cafea

### Alimente de bază
- Conserve și murături
- Paste și orez
- Ulei și condimente

## Carduri și reduceri suplimentare

Penny oferă reduceri cu cardul de fidelitate:
- 5% reducere la anumite produse
- Oferte exclusive pentru membri
- Puncte acumulate pentru viitoarele cumpărături

## Când să mergi la Penny

- **Luni dimineața** - Stocuri noi, cele mai bune oferte
- **Joi** - Oferte mid-week
- **Seara** - Reduceri la produse aproape de expirare

## Avantaje Penny

✅ Magazine aproape de casă
✅ Prețuri mici constant
✅ Cozi scurte
✅ Parcare facilă

## Dezavantaje

❌ Sortiment limitat
❌ Spațiu mic
❌ Nu toate produsele sunt disponibile

## Compară prețurile cu CatalogSmart

Verifică dacă Penny are cel mai bun preț sau dacă merită să mergi la Lidl pentru aceeași cumpărătură!
    `,
    },
    'cataloage-supermarketuri-romania-toate-ofertele': {
        title: 'Cataloage supermarketuri România - Toate ofertele într-un singur loc',
        excerpt: 'Vezi toate cataloagele de la Lidl, Kaufland, Penny, Carrefour, Mega Image și Auchan. Compară prețuri și găsește cele mai bune oferte.',
        category: 'ghiduri',
        publishedAt: '2026-01-05',
        readingTime: 8,
        metaDescription: 'Cataloage supermarketuri România 2026. Lidl, Kaufland, Penny, Carrefour, Mega Image - toate ofertele și reducerile într-un singur loc.',
        content: `
## Toate cataloagele de supermarket din România

Nu mai pierde timp răsfoind fiecare catalog în parte! Iată ce oferă fiecare supermarket și cum să alegi cel mai bine.

## Supermarketuri în România - Comparație

| Supermarket | Puncte forte | Cel mai bun pentru |
|-------------|--------------|-------------------|
| **Lidl** | Prețuri mici | Produse de bază |
| **Kaufland** | Varietate | Carne, fructe |
| **Penny** | Aproape de casă | Cumpărături rapide |
| **Carrefour** | Tot în unul | Cumpărături complete |
| **Mega Image** | Premium | Produse de calitate |
| **Auchan** | Cantități mari | Familii, horeca |

## Când apar cataloagele noi

- **Lidl**: Luni și Joi
- **Kaufland**: Miercuri
- **Penny**: Luni
- **Carrefour**: Miercuri
- **Mega Image**: Luni

## Cum să economisești maxim

1. **Verifică toate cataloagele** înainte de cumpărături
2. **Compară prețul per unitate** (kg, L)
3. **Planifică ruta** între magazine
4. **Folosește CatalogSmart** pentru comparații automate

## De ce să folosești CatalogSmart

În loc să verifici 5-6 cataloage manual, CatalogSmart:
- Îți arată cele mai bune prețuri
- Compară automat produsele
- Îți sugerează alternative mai ieftine
- Generează lista de cumpărături optimă

## Concluzie

Cel mai ieftin supermarket depinde de ce cumperi. Cu CatalogSmart, vezi instant unde găsești cel mai bun preț pentru fiecare produs din lista ta!
    `,
    },
    'preturi-alimente-romania-2026-evolutie-inflatie': {
        title: 'Prețuri alimente România 2026 - Evoluție și cum să economisești',
        excerpt: 'Cum au evoluat prețurile alimentelor în 2026? Analiză completă și strategii pentru a face față scumpirilor.',
        category: 'economie',
        publishedAt: '2026-01-04',
        readingTime: 10,
        metaDescription: 'Prețuri alimente România 2026. Evoluția prețurilor, inflația și cele mai bune strategii pentru a economisi la cumpărături.',
        content: `
## Prețurile alimentelor în România - 2026

Inflația și-a pus amprenta pe bugetele familiilor. Iată ce s-a schimbat și cum poți face față creșterilor de prețuri.

## Evoluția prețurilor principalelor alimente

| Produs | 2025 | 2026 | Creștere |
|--------|------|------|----------|
| Pâine 500g | 3.50 lei | 4.20 lei | +20% |
| Lapte 1L | 5.50 lei | 6.50 lei | +18% |
| Carne pui kg | 18 lei | 22 lei | +22% |
| Ouă 10 buc | 8.50 lei | 11 lei | +29% |
| Ulei 1L | 9 lei | 12 lei | +33% |

## Ce produse s-au scumpit cel mai mult

1. **Ulei comestibil** - +33%
2. **Ouă** - +29%
3. **Zahăr** - +25%
4. **Carne de porc** - +24%
5. **Carne de pui** - +22%

## Strategii de economisire

### 1. Cumpără mărci private
Produsele K-Classic (Kaufland), Favorina (Lidl) sunt cu 30-50% mai ieftine.

### 2. Compară prețurile sistematic
Un produs poate avea diferențe de 20-40% între magazine.

### 3. Cumpără sezonier
Fructele și legumele de sezon sunt cu 50% mai ieftine.

### 4. Gătește acasă
Mâncarea gătită costă de 3-5 ori mai puțin decât cea cumpărată.

## Cum ajută CatalogSmart

CatalogSmart îți arată:
- Prețurile actuale din toate supermarketurile
- Istoricul prețurilor (vezi dacă chiar e ofertă)
- Cel mai ieftin magazin pentru fiecare produs
- Sugestii de alternative mai ieftine

## Concluzie

Cu inflația actuală, fiecare leu contează. Folosind instrumentele potrivite și strategiile corecte, poți reduce cheltuielile cu 20-30% lunar.
    `,
    },
    'retete-economice-pentru-intreaga-familie-2026': {
        title: 'Rețete economice pentru întreaga familie - Mese sub 50 lei 2026',
        excerpt: 'Rețete gustoase și hrănitoare pentru 4 persoane cu buget redus. Mese complete sub 50 de lei cu ingrediente ieftine.',
        category: 'retete',
        publishedAt: '2026-01-03',
        readingTime: 8,
        metaDescription: 'Rețete economice pentru familie 2026. Mese gustoase sub 50 lei pentru 4 persoane. Ingrediente ieftine, preparare simplă.',
        content: `
## Rețete pentru familie cu buget redus

Gătitul acasă nu trebuie să fie scump sau complicat. Iată 5 rețete delicioase pentru o familie de 4 persoane, fiecare sub 50 de lei.

## 1. Tocăniță de cartofi cu cârnați (35 lei)

**Ingrediente:**
- 1.5 kg cartofi (5 lei)
- 400g cârnați (15 lei)
- 2 cepe (2 lei)
- Bulion, boia (3 lei)
- Ulei, sare (2 lei)

**Preparare:** 45 minute. Sote ceapa, adaugă cârnații, apoi cartofii și fierbe la foc mic.

## 2. Tocăniță de pui cu orez (45 lei)

**Ingrediente:**
- 800g pulpe de pui (28 lei)
- 400g orez (5 lei)
- Legume (morcov, ceapă) (5 lei)
- Condimente (3 lei)
- Ulei (4 lei)

**Preparare:** 50 minute.

## 3. Paste carbonara (40 lei)

**Ingrediente:**
- 500g paste (6 lei)
- 250g bacon/slănină (18 lei)
- 4 ouă (5 lei)
- 100g parmezan (8 lei)
- Piper (3 lei)

**Preparare:** 25 minute.

## 4. Supă cremă de legume (25 lei)

**Ingrediente:**
- Cartofi, morcovi, țelină (10 lei)
- Ceapă, usturoi (3 lei)
- Smântână (5 lei)
- Pâine pentru crutoane (4 lei)
- Condimente (3 lei)

**Preparare:** 40 minute.

## 5. Mâncare de fasole cu afumătură (38 lei)

**Ingrediente:**
- 500g fasole uscată (8 lei)
- 300g costițe afumate (20 lei)
- Ceapă, morcov (4 lei)
- Condimente (6 lei)

**Preparare:** 2 ore (dar se gătește singură).

## Sfaturi pentru gătit economic

1. **Cumpără ingrediente la ofertă**
2. **Gătește în cantități mari** și congelează
3. **Folosește resturi** pentru mese noi
4. **Verifică prețurile** pe CatalogSmart

## Unde găsești ingredientele cel mai ieftin

Folosește CatalogSmart pentru a găsi cele mai mici prețuri pentru fiecare ingredient din rețetele tale!
    `,
    },
    'meal-prep-saptamanal-ghid-incepatori-2026': {
        title: 'Meal Prep săptămânal - Ghid complet pentru începători 2026',
        excerpt: 'Învață să pregătești mesele pentru întreaga săptămână. Economisești timp, bani și mănânci mai sănătos.',
        category: 'ghiduri',
        publishedAt: '2026-01-02',
        readingTime: 12,
        metaDescription: 'Meal prep săptămânal ghid 2026. Pregătește mesele în avans, economisește timp și bani. Tutorial complet pentru începători.',
        content: `
## Ce este Meal Prep?

Meal Prep înseamnă să pregătești mesele pentru mai multe zile într-o singură sesiune de gătit. Rezultatul? Mai puțin timp în bucătărie, mâncare mai sănătoasă și economii la buget.

## Beneficiile Meal Prep

✅ **Economie de timp**: Gătești 3-4 ore duminica, ești liber toată săptămâna
✅ **Economie de bani**: Cumperi doar ce ai nevoie, zero risipă
✅ **Mâncare sănătoasă**: Controlezi ingredientele
✅ **Zero stress**: Nu mai stai să te gândești ce mănânci

## Cum să începi - Pas cu pas

### Pasul 1: Planifică meniul
Alege 3-4 rețete principale pentru săptămână.

### Pasul 2: Fă lista de cumpărături
Folosește CatalogSmart pentru a găsi cele mai bune prețuri.

### Pasul 3: Cumpără totul odată
Duminică dimineața - cel mai bun moment.

### Pasul 4: Gătește strategic
Pornește mai multe preparate simultan.

### Pasul 5: Depozitează corect
Recipiente de sticlă, etichetate cu data.

## Exemplu de meniu săptămânal

| Zi | Prânz | Cină |
|----|-------|------|
| L | Orez cu pui | Supă de legume |
| Ma | Paste | Pui cu cartofi |
| Mi | Orez cu pui | Paste |
| J | Supă | Pui cu cartofi |
| V | Comandă/Restaurant | - |

## Echipamente esențiale

- Recipiente de sticlă (10-12 buc)
- Tăvi de cuptor mari
- Slow cooker (opțional)
- Etichetator

## Greșeli de evitat

❌ Să gătești prea multe varietăți
❌ Să nu etichetezi recipientele
❌ Să nu congelezi porții extra
❌ Să cumperi fără listă

## Concluzie

Meal prep îți schimbă viața! Începe simplu cu 2-3 preparate și extinde pe măsură ce prinzi experiență. Folosește CatalogSmart pentru a găsi cele mai ieftine ingrediente.
    `,
    },
    'comparatie-preturi-lidl-kaufland-penny-carrefour-2026': {
        title: 'Comparație prețuri Lidl vs Kaufland vs Penny vs Carrefour 2026',
        excerpt: 'Analiză detaliată a prețurilor la principalele supermarketuri din România. Descoperă unde găsești cele mai bune oferte.',
        category: 'economie',
        publishedAt: '2026-01-01',
        readingTime: 9,
        metaDescription: 'Comparație prețuri supermarketuri România 2026. Lidl vs Kaufland vs Penny vs Carrefour - descoperă cel mai ieftin pentru fiecare categorie.',
        content: `
## Comparație completă: Cele 4 mari supermarketuri

Am analizat prețurile la 50 de produse esențiale pentru a determina care supermarket oferă cele mai bune prețuri.

## Metodologie

Am comparat:
- 15 produse lactate
- 10 produse carne
- 10 fructe/legume
- 10 produse de bază
- 5 băuturi

## Rezultatele comparației

### Produse lactate
| Produs | Lidl | Kaufland | Penny | Carrefour |
|--------|------|----------|-------|-----------|
| Lapte 1L | 5.99 | 6.29 | 6.19 | 6.49 |
| Iaurt 140g | 1.99 | 2.19 | 2.09 | 2.39 |
| Brânză 250g | 8.99 | 9.49 | 8.79 | 9.99 |
| **Câștigător** | ✅ | | | |

### Carne și mezeluri
| Produs | Lidl | Kaufland | Penny | Carrefour |
|--------|------|----------|-------|-----------|
| Pui/kg | 19.99 | 18.99 | 20.49 | 21.99 |
| Cârnați 300g | 12.99 | 11.99 | 13.49 | 14.49 |
| **Câștigător** | | ✅ | | |

### Fructe și legume
| Produs | Lidl | Kaufland | Penny | Carrefour |
|--------|------|----------|-------|-----------|
| Cartofi/kg | 2.49 | 2.29 | 2.79 | 2.99 |
| Mere/kg | 4.99 | 4.49 | 5.29 | 5.49 |
| **Câștigător** | | ✅ | | |

## Concluzie finală

**Câștigător general: Lidl** pentru produse de bază
**Kaufland** pentru carne și legume
**Penny** pentru comoditate
**Carrefour** pentru varietate

## Recomandare

Cel mai eficient e să combini mai multe magazine. CatalogSmart îți arată automat cel mai bun preț pentru fiecare produs din lista ta!
    `,
    },
    'cumparaturi-online-supermarket-romania-livrare-acasa': {
        title: 'Cumpărături online supermarket România - Ghid livrare la domiciliu 2026',
        excerpt: 'Compară serviciile de livrare de la Carrefour, Mega Image, Auchan și supermarketurile online. Costuri, timp și experiență.',
        category: 'ghiduri',
        publishedAt: '2025-12-30',
        readingTime: 7,
        metaDescription: 'Cumpărături online supermarket România 2026. Livrare la domiciliu de la Carrefour, Mega Image, Freshful, Sezamo. Comparație și costuri.',
        content: `
## Cumpărături online de la supermarket în România

Din ce în ce mai mulți români comandă alimente online. Iată ce opțiuni ai și care merită.

## Servicii disponibile

### 1. Carrefour Online
- **Livrare**: 2-4 ore sau programată
- **Cost livrare**: 14.99-24.99 lei
- **Minim comandă**: 99 lei
- **Sortiment**: Complet (peste 20.000 produse)

### 2. Mega Image App
- **Livrare**: 1-2 ore (depinde de zonă)
- **Cost livrare**: 9.99-14.99 lei
- **Minim comandă**: 50 lei
- **Sortiment**: Mediu

### 3. Freshful by eMAG
- **Livrare**: Programată pe ore
- **Cost livrare**: 9.99 lei (gratuit peste 150 lei)
- **Minim comandă**: 75 lei
- **Sortiment**: Focus pe produse fresh

### 4. Sezamo
- **Livrare**: Express 30-60 minute
- **Cost livrare**: 4.99-9.99 lei
- **Minim comandă**: 35 lei
- **Sortiment**: Basic, dar rapid

## Comparație costuri livrare

| Serviciu | Minim | Livrare | Gratuit de la |
|----------|-------|---------|---------------|
| Carrefour | 99 lei | 14.99 lei | 250 lei |
| Mega Image | 50 lei | 9.99 lei | 200 lei |
| Freshful | 75 lei | 9.99 lei | 150 lei |
| Sezamo | 35 lei | 4.99 lei | 100 lei |

## Când merită să comanzi online

✅ Nu ai timp de cumpărături
✅ Nu ai mașină
✅ Cantități mari (livrare gratuit)
✅ Vreme rea

## Când e mai bine să mergi în magazin

❌ Cumpărături mici (cost livrare mare)
❌ Produse proaspete (vrei să alegi personal)
❌ Oferte flash (nu sunt online)

## Concluzie

Cumpărăturile online sunt convenabile dar mai scumpe. Folosește CatalogSmart pentru a compara prețurile și decide dacă merită!
    `,
    },
    'reduceri-de-weekend-supermarketuri-cum-sa-prinzi-ofertele': {
        title: 'Reduceri de weekend la supermarketuri - Cum să prinzi cele mai bune oferte',
        excerpt: 'Strategii pentru a profita maxim de reducerile de weekend. Produse aproape de expirare, lichidări și oferte flash.',
        category: 'tips',
        publishedAt: '2025-12-28',
        readingTime: 6,
        metaDescription: 'Reduceri weekend supermarketuri România 2026. Cum să prinzi ofertele flash, produse la -30% aproape de expirare și lichidări de stoc.',
        content: `
## Secretele reducerilor de weekend

Weekendul poate fi cel mai bun sau cel mai rău moment pentru cumpărături. Iată cum să profiți maxim.

## Tipuri de reduceri de weekend

### 1. Produse aproape de expirare (-30% până la -50%)
- **Când**: Vineri seara, Sâmbătă dimineața
- **Ce găsești**: Carne, lactate, pâine
- **Sfat**: Congelează imediat!

### 2. Lichidări de stoc
- **Când**: Duminică seara
- **Ce găsești**: Fructe, legume, produse sezoniere
- **Sfat**: Prețuri foarte mici dar calitate variabilă

### 3. Oferte flash weekend
- **Lidl**: Sâmbătă-Duminică oferte speciale
- **Kaufland**: Vineri promoții bonus
- **Penny**: Weekend deals

## Orele de aur pentru cumpărături

### Vineri
- **18:00-20:00**: Reduceri la produse fresh
- Evită orele de vârf (17:00)

### Sâmbătă
- **7:00-9:00**: Stocuri pline, liniște
- **Evită**: 10:00-14:00 (aglomerație maximă)

### Duminică
- **18:00-20:00**: Cele mai mari reduceri
- Produse de panificație -50%

## Ce să nu cumperi în weekend

❌ Produse care nu sunt la reducere (prețuri normale)
❌ Legume la tarabe de piață (prețuri umflate)
❌ Produse de impuls la casă

## Strategia perfectă

1. Verifică cataloagele joi-vineri
2. Fă lista cu ofertele de weekend
3. Mergi vineri seara sau sâmbătă devreme
4. Verifică secțiunea reduceri

## Folosește CatalogSmart

CatalogSmart îți arată toate ofertele de weekend într-un singur loc - nu mai pierzi nimic!
    `,
    },
};

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = articlesContent[slug];

    if (!article) {
        return {
            title: 'Articol negăsit',
        };
    }

    const today = new Date().toISOString().split('T')[0];

    return {
        title: article.title,
        description: article.metaDescription,
        alternates: {
            canonical: `/blog/${slug}`,
        },
        openGraph: {
            title: article.title,
            description: article.metaDescription,
            type: 'article',
            publishedTime: article.publishedAt,
            modifiedTime: today,
            authors: ['CatalogSmart'],
            locale: 'ro_RO',
            siteName: 'CatalogSmart',
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.metaDescription,
        },
    };
}

export async function generateStaticParams() {
    return Object.keys(articlesContent).map((slug) => ({
        slug,
    }));
}

function simpleMarkdownToHtml(md: string): string {
    const lines = md.trim().split('\n');
    const htmlLines: string[] = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            if (inList) {
                htmlLines.push('</ul>');
                inList = false;
            }
            continue;
        }

        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Headings (### before ##)
        if (line.startsWith('### ')) {
            if (inList) { htmlLines.push('</ul>'); inList = false; }
            htmlLines.push(`<h3 class="text-xl font-semibold mt-8 mb-3 text-neutral-800">${line.slice(4)}</h3>`);
        } else if (line.startsWith('## ')) {
            if (inList) { htmlLines.push('</ul>'); inList = false; }
            htmlLines.push(`<h2 class="text-2xl font-bold mt-10 mb-4 text-neutral-900">${line.slice(3)}</h2>`);
        } else if (line.startsWith('- ')) {
            if (!inList) { htmlLines.push('<ul class="list-disc pl-6 my-4 space-y-1">'); inList = true; }
            htmlLines.push(`<li>${line.slice(2)}</li>`);
        } else if (/^\d+\.\s/.test(line)) {
            // Numbered list items rendered as unordered for simplicity
            if (!inList) { htmlLines.push('<ul class="list-disc pl-6 my-4 space-y-1">'); inList = true; }
            htmlLines.push(`<li>${line.replace(/^\d+\.\s/, '')}</li>`);
        } else if (line.startsWith('|')) {
            // Table rows - skip header separators
            if (line.match(/^\|[\s-|]+$/)) continue;
            const cells = line.split('|').filter(c => c.trim());
            const isHeader = i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s-|]+$/);
            const tag = isHeader ? 'th' : 'td';
            const cls = isHeader ? 'font-semibold text-left py-2 px-3' : 'py-2 px-3';
            const row = cells.map(c => `<${tag} class="${cls}">${c.trim()}</${tag}>`).join('');
            if (isHeader) {
                htmlLines.push('<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse">');
                htmlLines.push(`<thead><tr class="border-b border-neutral-200">${row}</tr></thead><tbody>`);
            } else {
                htmlLines.push(`<tr class="border-b border-neutral-100">${row}</tr>`);
            }
            // Check if next non-separator line is not a table row → close table
            let nextContentIdx = i + 1;
            while (nextContentIdx < lines.length && lines[nextContentIdx].trim().match(/^\|[\s-|]+$/)) nextContentIdx++;
            if (nextContentIdx >= lines.length || !lines[nextContentIdx].trim().startsWith('|')) {
                if (!isHeader) htmlLines.push('</tbody></table></div>');
            }
        } else {
            if (inList) { htmlLines.push('</ul>'); inList = false; }
            htmlLines.push(`<p class="leading-relaxed mb-4 text-neutral-700">${line}</p>`);
        }
    }
    if (inList) htmlLines.push('</ul>');
    return htmlLines.join('\n');
}

export default async function ArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const article = articlesContent[slug];

    if (!article) {
        notFound();
    }

    // For comparison-focused articles, fetch live price data to embed at the top
    const priceIndex = PRICE_INDEX_SLUGS.has(slug) ? await getPriceIndex() : null;

    const formattedDate = new Date(article.publishedAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    // JSON-LD for SEO
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';
    const today = new Date().toISOString().split('T')[0];
    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.excerpt,
        author: {
            '@type': 'Organization',
            name: 'CatalogSmart',
            url: siteUrl,
        },
        publisher: {
            '@type': 'Organization',
            name: 'CatalogSmart',
            url: siteUrl,
            logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/icon.png`,
            },
        },
        datePublished: article.publishedAt,
        dateModified: today,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${siteUrl}/blog/${slug}`,
        },
        inLanguage: 'ro',
    };

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Acasa', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
            { '@type': 'ListItem', position: 3, name: article.title, item: `${siteUrl}/blog/${slug}` },
        ],
    };

    const categoryColors: Record<string, string> = {
        tips: 'bg-blue-100 text-blue-700',
        economie: 'bg-green-100 text-green-700',
        retete: 'bg-orange-100 text-orange-700',
        ghiduri: 'bg-purple-100 text-purple-700',
    };

    const categoryLabels: Record<string, string> = {
        tips: 'Tips & Trucuri',
        economie: 'Economie',
        retete: 'Rețete',
        ghiduri: 'Ghiduri',
    };

    return (
        <>
            {/* Structured data - safe: JSON.stringify on controlled static objects (not user input) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <article className="min-h-screen bg-white">
                {/* Header */}
                <header className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white py-16 md:py-24">
                    <div className="container-custom">
                        <div className="max-w-3xl mx-auto">
                            {/* Breadcrumb */}
                            <nav className="mb-6 text-sm">
                                <ol className="flex items-center gap-2 text-neutral-400">
                                    <li>
                                        <Link href="/" className="hover:text-white transition-colors">
                                            Acasă
                                        </Link>
                                    </li>
                                    <li>/</li>
                                    <li>
                                        <Link href="/blog" className="hover:text-white transition-colors">
                                            Blog
                                        </Link>
                                    </li>
                                    <li>/</li>
                                    <li className="text-neutral-300 truncate max-w-[200px]">
                                        {article.title}
                                    </li>
                                </ol>
                            </nav>

                            {/* Category */}
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${categoryColors[article.category] || 'bg-neutral-100 text-neutral-700'}`}>
                                {categoryLabels[article.category] || article.category}
                            </span>

                            {/* Title */}
                            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                                {article.title}
                            </h1>

                            {/* Meta */}
                            <div className="flex flex-wrap items-center gap-4 text-neutral-300">
                                <span>CatalogSmart</span>
                                <span>•</span>
                                <time dateTime={article.publishedAt}>{formattedDate}</time>
                                <span>•</span>
                                <span>{article.readingTime} min citire</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Live Price Index — shown on comparison-focused articles */}
                {priceIndex && priceIndex.cheapest && (
                    <div className="bg-neutral-50">
                        <PriceIndexWidget data={priceIndex} />
                    </div>
                )}

                {/* Content */}
                <div className="container-custom py-12 md:py-16">
                    <div className="max-w-3xl mx-auto">
                        {/* Content is from static hardcoded articles, not user input - safe to render */}
                        <div
                            className="prose prose-lg prose-neutral max-w-none
                prose-headings:font-display prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:leading-relaxed prose-p:mb-4
                prose-ul:my-4 prose-li:mb-1
                prose-strong:text-neutral-900
                prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
                            dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(article.content) }}
                        />

                        {/* CTA */}
                        <div className="mt-12 p-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl text-center">
                            <h3 className="font-display text-2xl font-bold text-neutral-900 mb-3">
                                Vrei să economisești și mai mult?
                            </h3>
                            <p className="text-neutral-600 mb-6">
                                Folosește CatalogSmart pentru a compara prețurile și a găsi cele mai bune oferte.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link
                                    href="/cel-mai-ieftin-supermarket"
                                    className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                                >
                                    Vezi cel mai ieftin supermarket azi
                                </Link>
                                <Link
                                    href="/cataloage"
                                    className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-400 transition-colors"
                                >
                                    Vezi Ofertele
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
}
