#!/usr/bin/env node

/**
 * Fix Product Categories
 * Applies consistent category rules to all existing products
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Determine category based on product name
 */
function getCategory(productName) {
  const name = productName.toLowerCase();

  // ANIMALE - hrană pentru animale (check FIRST - but be specific!)
  if (/hrană.*pisici|hrană.*câini|one.*pisici|whiskas|pedigree|felix\b|purina one|vitakraft.*pisici|vitakraft.*câini|snack.*pisici/i.test(name)) {
    return 'Animale';
  }

  // PANIFICAȚIE - pâine și produse de patiserie (check before dulciuri)
  if (/pâine|franzelă|baghetă|chiflă|cozonac|lipie|croissant|gogoașă|plăcintă|patiserie|churro|saleu|chec|prăjitur|tort\b|ecler|pain.*chocolat|foi.*plăcintă/i.test(name)) {
    return 'Panificatie';
  }

  // PEȘTE & FRUCTE DE MARE (check BEFORE carne)
  if (/pește|somon|ton\b|macrou|păstrăv|șalău|creveți|caracatiță|sushi|fructe de mare|sardine|hering|crap|doradă|file.*nil|file.*șalău|file somon/i.test(name)) {
    return 'Peste & Fructe de Mare';
  }

  // CARNE & MEZELURI - toate proteinele animale (dar nu pește)
  if (/carne|pui\b|porc|vită|miel|curcan|pulpe|piept|aripi|mușchi|fleică|rasol|cotlet|antricot|vrăbioară|carpaccio|vitello|grill/i.test(name)) {
    if (!/somon|păstrăv|șalău|ton\b|macrou/i.test(name)) {
      return 'Carne & Mezeluri';
    }
  }
  if (/mezeluri|salam|șuncă|bacon|cârnați|parizer|pate|tobă|kaizer|jambon|ruladă|cremwurști|cârnăciori|pastramă|mici\b/i.test(name)) {
    return 'Carne & Mezeluri';
  }
  if (/afumat/i.test(name) && !/păstrăv|somon|pește|macrou/i.test(name)) {
    return 'Carne & Mezeluri';
  }

  // LACTATE - toate produsele din lapte
  if (/lapte|iaurt|brânză|cașcaval|smântână|unt\b|frișcă|mascarpone|gorgonzola|feta|telemea|mozzarella|parmezan|ricotta|cream cheese|margarină/i.test(name)) {
    if (!/ardei/i.test(name)) {
      return 'Lactate';
    }
  }

  // APĂ (check before băuturi - very specific patterns)
  if (/apă minerală|apă plată|apă de izvor|apă.*naturală|bilbor|borsec|aqua carpatica|aquavia/i.test(name)) {
    return 'Apa';
  }

  // BĂUTURI ALCOOLICE (exclude desserts with liqueur)
  if (/bere\b|vin\b|șampanie|vodka|whisky|rom\b|lichior|prosecco|lambrusco|cocktail|tequila|gin\b|coniac|brandy|vermut|spumant|alcool|malibu/i.test(name)) {
    // Exclude gogoașă cu lichior, prăjitură, baton, condiment
    if (!/gogoașă|prăjitur|baton|condiment|vin.*fiert/i.test(name)) {
      return 'Bauturi Alcoolice';
    }
  }

  // BĂUTURI RĂCORITOARE (exclude ananas bucăți which is conserve)
  if (/suc\b|cola|fanta|sprite|pepsi|mirinda|7up|schweppes|limonadă|energizant|red bull|monster|hell|ciao|mountain dew|sirop|san pellegrino/i.test(name)) {
    return 'Bauturi Racoritoare';
  }
  if (/răcoritoare|fresh\b/i.test(name) && /băutură/i.test(name)) {
    return 'Bauturi Racoritoare';
  }

  // CAFEA & CEAI
  if (/cafea|espresso|cappuccino|nescafe|jacobs|lavazza|capsule.*cafea|cacao\b/i.test(name)) {
    return 'Cafea & Ceai';
  }
  if (/ceai\b|infuzie/i.test(name)) {
    return 'Cafea & Ceai';
  }

  // DULCIURI & SNACKS - ciocolată, biscuiți, chips, etc
  if (/ciocolat|biscuiți|napolitană|praline|bomboane|dulciuri|kit kat|milka|oreo|snickers|mars|twix|bounty|raffaello|ferrero|kinder|jelly|gummy|baton|făgăraș|jaffa|cherry queen|kandia/i.test(name)) {
    return 'Dulciuri & Snacks';
  }
  if (/chips|chipsuri|snack|floricele|popcorn|covrigei|sticks|crackers|lay's/i.test(name)) {
    // Exclude snack pisici
    if (!/pisici|câini/i.test(name)) {
      return 'Dulciuri & Snacks';
    }
  }

  // CONSERVE (check before legume & ingrediente to catch oțet items)
  if (/conserv|gogoșari|murături|compot|mazăre.*boabe|porumb|ananas.*bucăți|în oțet|oțet.*cm/i.test(name)) {
    return 'Conserve';
  }

  // LEGUME & FRUCTE - proaspete
  if (/roșii|ardei|cartofi|ceapă|morcov|varză|salată|castraveți|vinete|dovlecei|spanac|usturoi|ciuperci|conopidă|broccoli|țelină|ridichi|măsline|căpșun|lămâi|lime|limes|avocado/i.test(name)) {
    // Exclude ardei/castraveți în oțet (conserve - already checked above)
    return 'Legume & Fructe';
  }
  if (/mere\b|banane|portocale|struguri|cireșe|piersici|pepene|kiwi|mango|ananas|fructe/i.test(name)) {
    // Exclude conserve și băuturi
    if (!/bucăți.*suc|suc.*propriu|compot|conserv|băutură|răcoritoare/i.test(name)) {
      return 'Legume & Fructe';
    }
  }

  // INGREDIENTE - tot ce se folosește la gătit
  if (/făină|mălai|griș|zahăr|sare\b|piper|boia|oregano|cimbru|condiment|mirodenii|drojdie|bicarbonat|amidon|gelatină|esență|vanilie|scorțișoară|nucșoară|migdale|nucă.*cocos/i.test(name)) {
    return 'Ingrediente';
  }
  if (/ulei|oțet\b|sos\b|maioneză|muștar|ketchup|pastă.*tomate|bulion|cremă.*gătit|cremă.*cacao|cremă.*tartinabilă|cremă.*alune/i.test(name)) {
    // Only oțet by itself (not "în oțet" which is conserve)
    if (!/în oțet/i.test(name)) {
      return 'Ingrediente';
    }
  }
  if (/paste\b|spaghetti|penne|fusilli|macaroane|orez|năut|linte|quinoa|cușcuș|bob\b/i.test(name)) {
    return 'Ingrediente';
  }

  // CONGELATE
  if (/congelat|înghețată|legume.*congelate|fructe.*congelate|pizza.*congelat|fasole.*verde.*1\s*kg/i.test(name)) {
    return 'Congelate';
  }

  return 'Altele';
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     FIX PRODUCT CATEGORIES                                       ║');
  console.log('║     Applying consistent category rules                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Get all products
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products to categorize\n`);

  let updated = 0;
  const categoryCount = {};

  for (const product of products) {
    const newCategory = getCategory(product.name);

    // Track category counts
    categoryCount[newCategory] = (categoryCount[newCategory] || 0) + 1;

    // Update if different
    if (product.category !== newCategory) {
      await prisma.product.update({
        where: { id: product.id },
        data: { category: newCategory }
      });
      updated++;
      console.log(`  ${product.name.substring(0, 50).padEnd(50)} : ${product.category} -> ${newCategory}`);
    }
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     CATEGORIES SUMMARY                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Sort by count descending
  const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

  for (const [cat, count] of sorted) {
    console.log(`  ${cat.padEnd(25)} ${count}`);
  }

  console.log('\n');
  console.log(`✅ Updated ${updated} products`);
  console.log(`✅ Total categories: ${Object.keys(categoryCount).length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
