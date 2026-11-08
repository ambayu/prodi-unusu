import fs from 'fs';
import path from 'path';

const API_KEY = process.env.NINEROUTER_KEY || 'sk-08090e0f60d84b4a-nh34sw-c058c143';
const BASE_URL = process.env.NINEROUTER_URL || 'https://route9.nurset-studio.web.id';
const MODEL = 'ag/gemini-3.1-flash-image';

const TARGET_DIR = path.resolve('D:/Project/Unusu Worksheet/prodi-unusu/public/images/prodi');

const IMAGES = [
  {
    name: 'campus-building-header.png',
    prompt:
      'Modern university building facade of Universitas Nahdlatul Ulama Sumatera Utara (UNUSU), Islamic architectural arches, clean white pillars and emerald green accents, green campus logo badge on top, lush green trees, bright daylight, clear sky, professional architectural photography, sharp, high resolution',
    size: '1024x1024',
  },
  {
    name: 'prodi-coding.png',
    prompt:
      'Close-up of a modern laptop open on a wooden desk showing clean colorful code editor with dark theme, shallow depth of field, subtle green LED backlighting, sleek tech setup, professional high resolution photography',
    size: '1024x1024',
  },
  {
    name: 'prodi-ai.png',
    prompt:
      'Futuristic artificial intelligence AI glowing microchip on laptop screen, cyber digital neural network graphics, glowing cyan and emerald blue light, computer science research concept, professional clean tech photography',
    size: '1024x1024',
  },
  {
    name: 'prodi-analytics.png',
    prompt:
      'Modern laptop displaying colorful business intelligence analytics dashboard with bar charts, line graphs and donut charts, clean modern office desk background, information systems concept, crisp photography',
    size: '1024x1024',
  },
  {
    name: 'prodi-education.png',
    prompt:
      'Stack of hardcover academic books with colorful covers and a cup of pencil holder on a wooden teacher desk, chalkboard classroom background with soft blur, primary education study concept, bright natural lighting',
    size: '1024x1024',
  },
  {
    name: 'prodi-finance.png',
    prompt:
      'Modern financial calculator, printed business financial spreadsheet report with graphs, and a sleek pen on office desk, economics and accounting management concept, professional clean photography',
    size: '1024x1024',
  },
];

async function generate(item) {
  const outPath = path.join(TARGET_DIR, item.name);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`[SKIP] ${item.name} already exists (${fs.statSync(outPath).size} bytes)`);
    return;
  }

  console.log(`[GEN] Generating ${item.name}...`);
  try {
    const res = await fetch(`${BASE_URL}/v1/images/generations?response_format=binary`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: item.prompt,
        size: item.size,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[ERR] Failed ${item.name}: ${res.status} ${errText}`);
      return;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buffer);
    console.log(`[OK] Saved ${item.name} (${buffer.length} bytes)`);
  } catch (err) {
    console.error(`[EXC] ${item.name}:`, err.message);
  }
}

async function main() {
  for (const item of IMAGES) {
    await generate(item);
  }
}

main();
