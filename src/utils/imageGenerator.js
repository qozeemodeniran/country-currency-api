const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

async function generateSummaryImage(total, top5, timestamp) {
  const outDir = path.join(__dirname, '..', 'cache');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000';
  ctx.font = 'bold 28px Sans';
  ctx.fillText('Country GDP Summary', 20, 50);

  ctx.font = '20px Sans';
  ctx.fillText(`Total countries: ${total}`, 20, 90);

  ctx.font = '18px Sans';
  ctx.fillText('Top 5 countries by estimated GDP:', 20, 130);

  ctx.font = '16px Sans';
  for (let i = 0; i < top5.length; i++) {
    const c = top5[i];
    ctx.fillText(`${i + 1}. ${c.name} — ${Number(c.estimated_gdp).toLocaleString(undefined, {maximumFractionDigits:2})}`, 30, 170 + i * 30);
  }

  ctx.font = '14px Sans';
  ctx.fillText(`Last refresh: ${timestamp}`, 20, height - 40);

  const outPath = path.join(outDir, 'summary.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

module.exports = { generateSummaryImage };
