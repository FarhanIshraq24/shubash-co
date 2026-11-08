const sharp = require('sharp');
const path = require('path');

async function processLogos() {
  const imagesDir = path.join(__dirname, '..', 'public', 'images');

  const files = [
    {
      in: 'logo-bengali-original.png',
      out: 'logo-bengali.png',
      outWebp: 'logo-bengali.webp',
    },
    {
      in: 'logo-english-original.png',
      out: 'logo-english.png',
      outWebp: 'logo-english.webp',
    }
  ];

  for (const item of files) {
    const inputPath = path.join(imagesDir, item.in);
    const outputPath = path.join(imagesDir, item.out);
    const outputWebpPath = path.join(imagesDir, item.outWebp);

    console.log(`Processing ${item.in}...`);
    // Trim empty space around the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Trim based on edge pixel color with tolerance
    const trimmedBuffer = await image
      .trim({
        threshold: 10
      })
      .toBuffer();

    // Add clean 16px padding on top/bottom and 24px left/right for comfortable breathing room
    await sharp(trimmedBuffer)
      .extend({
        top: 20,
        bottom: 20,
        left: 24,
        right: 24,
        background: item.in.includes('bengali') ? '#F7F5E6' : '#FFFFFF'
      })
      .png()
      .toFile(outputPath);

    await sharp(outputPath)
      .webp({ quality: 95 })
      .toFile(outputWebpPath);

    console.log(`Created ${item.out} and ${item.outWebp}`);
  }
}

processLogos().catch(err => {
  console.error(err);
  process.exit(1);
});
