import fs from 'fs';

async function genSlide(filename, prompt) {
  console.log('Generating:', filename);
  const res = await fetch('https://route9.nurset-studio.web.id/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk-08090e0f60d84b4a-nh34sw-c058c143',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'ag/gemini-3.1-flash-image',
      prompt: prompt,
      size: '1792x1024'
    })
  });
  const data = await res.json();
  if (data.data && data.data[0] && data.data[0].b64_json) {
    const buffer = Buffer.from(data.data[0].b64_json, 'base64');
    fs.writeFileSync('prodi-unusu/public/' + filename, buffer);
    console.log('Successfully saved:', filename, buffer.length, 'bytes');
  } else {
    console.error('Failed to get b64_json:', data);
  }
}

async function main() {
  const prompt1 = "Wide horizontal hero banner for Indonesian Islamic University UNUSU. Split composition: on the left side, emerald green background with modern dynamic Islamic wave curves and prominent typography text 'PENERIMAAN MAHASISWA BARU' and 'UNGGUL BERKARAKTER' with badges. On the right side, photorealistic shot of smiling Indonesian university students in green alma mater blazers holding books with modern campus building under blue sky. Professional university marketing banner, 8k quality.";
  await genSlide('hero-slide-split-1.png', prompt1);

  const prompt2 = "Wide horizontal hero banner for university portal. Split composition: on the left side, vibrant photorealistic photo of cheerful Indonesian male and female university students holding laptops and study folders in a bright modern campus hall. On the right side, deep emerald green and white geometric gradient waves with typography text 'EKOSISTEM DIGITAL MULTI-PRODI' and '14 Program Studi Unggulan'. Professional banner design, 8k.";
  await genSlide('hero-slide-split-2.png', prompt2);

  const prompt3 = "Wide university hero slider billboard banner for Universitas Nahdlatul Ulama Sumatera Utara. Split composition: on the left side, elegant dark green and mint wave geometric banner with bold text 'KAMPUS INOVATIF & RELIGIUS' and subtitle 'Mencetak Lulusan Berakhlak Mulia'. On the right side, beautiful grand modern Islamic campus architecture with students walking under trees and sunny sky. Clean professional layout, 8k resolution.";
  await genSlide('hero-slide-split-3.png', prompt3);
}

main();
