import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
        title: 'Top 5 supermarketuri din România - Comparație prețuri 2026',
        excerpt: 'Analizăm în detaliu prețurile la Lidl, Kaufland, Penny, Carrefour și Mega Image.',
        category: 'ghiduri',
        publishedAt: '2026-01-05',
        readingTime: 10,
        metaDescription: 'Comparație detaliată a prețurilor la Lidl, Kaufland, Penny, Carrefour și Mega Image în 2026. Descoperă cel mai ieftin supermarket pentru fiecare categorie.',
        content: `
## Introducere

Alegerea supermarketului potrivit poate face diferența de sute de lei pe lună în bugetul familiei. Am analizat prețurile la cele mai populare lanțuri de magazine din România pentru a te ajuta să iei decizia potrivită.

## 1. Lidl - Cel mai bun raport calitate-preț

**Puncte forte:**
- Prețuri mici la produse de bază
- Produse de marcă proprie de calitate
- Oferte săptămânale excelente (Joi)
- Produse importate la prețuri competitive

**Puncte slabe:**
- Sortiment limitat
- Nu toate magazinele au produse proaspete

**Cel mai ieftin pentru:** Produse de panificație, lactate, dulciuri importate

## 2. Kaufland - Varietate și prețuri competitive

**Puncte forte:**
- Sortiment foarte larg
- Secțiune mare de produse proaspete
- Prețuri bune la carne și mezeluri
- Program prelungit

**Puncte slabe:**
- Poate fi aglomerat
- Prețurile variază mult între produse

**Cel mai ieftin pentru:** Carne, fructe și legume, produse voluminoase

## 3. Penny - Discount-ul de cartier

**Puncte forte:**
- Magazine în aproape orice cartier
- Prețuri mici la produse esențiale
- Oferte bune la produse pentru casă

**Puncte slabe:**
- Spațiu limitat
- Sortiment restrâns

**Cel mai ieftin pentru:** Cumpărături rapide, produse de curățenie

## 4. Carrefour - Pentru cumpărături complete

**Puncte forte:**
- Tot ce ai nevoie într-un singur loc
- Card de fidelitate cu puncte
- Sortiment premium disponibil

**Puncte slabe:**
- Prețuri mai mari la produse de bază
- Poate fi confuz din cauza mărimii

**Cel mai ieftin pentru:** Electronice, produse non-alimentare

## 5. Mega Image - Comoditate maximă

**Puncte forte:**
- Magazine deschise până târziu
- Produse proaspete de calitate
- Aplicație mobilă cu oferte personalizate

**Puncte slabe:**
- Prețuri mai mari în general
- Magazinele mici au sortiment limitat

**Cel mai ieftin pentru:** Cumpărături de urgență, produse premium

## Concluzie

Nu există un singur "cel mai bun" supermarket - depinde de ce cumperi și de prioritățile tale. **Sfatul nostru**: combină mai multe magazine și folosește CatalogSmart pentru a găsi cele mai bune oferte din fiecare!
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
};

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const article = articlesContent[slug];

    if (!article) {
        return {
            title: 'Articol negăsit | CatalogSmart',
        };
    }

    return {
        title: `${article.title} | CatalogSmart`,
        description: article.metaDescription,
        openGraph: {
            title: article.title,
            description: article.metaDescription,
            type: 'article',
            publishedTime: article.publishedAt,
            authors: ['CatalogSmart'],
        },
    };
}

export async function generateStaticParams() {
    return Object.keys(articlesContent).map((slug) => ({
        slug,
    }));
}

export default async function ArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const article = articlesContent[slug];

    if (!article) {
        notFound();
    }

    const formattedDate = new Date(article.publishedAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    // JSON-LD for SEO
    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.excerpt,
        author: {
            '@type': 'Organization',
            name: 'CatalogSmart',
        },
        publisher: {
            '@type': 'Organization',
            name: 'CatalogSmart',
            url: 'https://catalogsmart.ro',
        },
        datePublished: article.publishedAt,
        dateModified: article.publishedAt,
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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
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

                {/* Content */}
                <div className="container-custom py-12 md:py-16">
                    <div className="max-w-3xl mx-auto">
                        <div
                            className="prose prose-lg prose-neutral max-w-none
                prose-headings:font-display prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:leading-relaxed prose-p:mb-4
                prose-ul:my-4 prose-li:mb-1
                prose-strong:text-neutral-900
                prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
                            dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br/>').replace(/## /g, '</p><h2>').replace(/### /g, '</p><h3>').replace(/<h2>/g, '<h2 class="text-2xl font-bold mt-10 mb-4 text-neutral-900">').replace(/<h3>/g, '<h3 class="text-xl font-semibold mt-8 mb-3 text-neutral-800">') }}
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
                                    href="/cataloage"
                                    className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
                                >
                                    Vezi Ofertele
                                </Link>
                                <Link
                                    href="/blog"
                                    className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl border-2 border-primary-200 hover:border-primary-400 transition-colors"
                                >
                                    Mai multe articole
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        </>
    );
}
