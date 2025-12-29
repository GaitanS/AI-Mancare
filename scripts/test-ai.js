#!/usr/bin/env node

/**
 * Test AI Generation with OpenRouter + Gemini
 */

require('dotenv').config();
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// OpenRouter client
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-Title': 'Retete Ieftine - AI Mancare',
  },
});

const AI_MODEL = process.env.AI_MODEL || 'google/gemini-2.5-flash';

async function testAI() {
  console.log('🤖 Testing AI Generation with OpenRouter...\n');
  console.log(`   Model: ${AI_MODEL}`);
  console.log(`   API Key: ${process.env.OPENROUTER_API_KEY?.substring(0, 20)}...`);

  try {
    // Get some products from DB
    const products = await prisma.product.findMany({
      where: {
        validUntil: { gte: new Date() },
      },
      orderBy: { discountPercentage: 'desc' },
      take: 20,
    });

    console.log(`\n📦 Found ${products.length} products with active offers\n`);

    // Format products for the prompt
    const productsFormatted = products
      .map(
        (p) =>
          `- ${p.name} (${p.brand || 'no brand'}): ${p.price} lei/${p.unit} [${p.discountPercentage}% reducere] [ID: ${p.id}] [Store: ${p.store}]`
      )
      .join('\n');

    console.log('📝 Generating recipe with Gemini...\n');

    const systemPrompt = `Ești un chef profesionist român care creează rețete economice și delicioase.

IMPORTANT - RETURNEAZĂ DOAR JSON VALID, fără text explicativ înainte sau după!

Schema JSON obligatorie:
{
  "title": "string (titlul rețetei în română)",
  "description": "string (descriere scurtă)",
  "servings": number (nr porții),
  "prep_time": number (minute preparare),
  "cook_time": number (minute gătit),
  "difficulty": "ușor" | "mediu" | "dificil",
  "ingredients": [{"product_id": "string", "quantity": "string", "notes": "string optional"}],
  "instructions": [{"step": number, "text": "string"}],
  "tips": ["string"],
  "estimated_cost": number (cost total în lei)
}`;

    const userPrompt = `PRODUSE DISPONIBILE LA OFERTĂ:
${productsFormatted}

CONSTRÂNGERI:
- Cost maxim: 40 lei
- Timp maxim preparare: 45 minute
- Restricții dietetice: none
- Magazine preferate: orice magazin

SARCINĂ:
Creează o rețetă completă care folosește produsele de mai sus.

IMPORTANT: Returnează DOAR JSON valid!`;

    const startTime = Date.now();

    const response = await openrouter.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const duration = Date.now() - startTime;

    const content = response.choices[0].message.content;

    console.log(`✅ AI Response received in ${duration}ms\n`);
    console.log('--- RAW RESPONSE ---');
    console.log(content);
    console.log('--- END RESPONSE ---\n');

    // Try to parse JSON
    const jsonContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const recipe = JSON.parse(jsonContent);
      console.log('✅ JSON parsed successfully!\n');
      console.log('📋 Recipe Summary:');
      console.log(`   Title: ${recipe.title}`);
      console.log(`   Description: ${recipe.description}`);
      console.log(`   Servings: ${recipe.servings}`);
      console.log(`   Prep Time: ${recipe.prep_time} min`);
      console.log(`   Cook Time: ${recipe.cook_time} min`);
      console.log(`   Difficulty: ${recipe.difficulty}`);
      console.log(`   Ingredients: ${recipe.ingredients?.length || 0}`);
      console.log(`   Steps: ${recipe.instructions?.length || 0}`);
      console.log(`   Estimated Cost: ${recipe.estimated_cost} lei`);
      console.log('\n🎉 AI Generation test PASSED!');
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
    }

  } catch (error) {
    console.error('❌ AI Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAI();
