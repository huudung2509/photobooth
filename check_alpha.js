const fs = require('fs');

const files = [
  'C:\\Users\\phamh\\.gemini\\antigravity-ide\\brain\\0d9aaae2-6d12-4917-91ae-64294d4c7692\\media__1781888674825.png',
  'C:\\Users\\phamh\\.gemini\\antigravity-ide\\brain\\0d9aaae2-6d12-4917-91ae-64294d4c7692\\media__1781888694337.png',
  'C:\\Users\\phamh\\.gemini\\antigravity-ide\\brain\\0d9aaae2-6d12-4917-91ae-64294d4c7692\\media__1781888708182.png'
];

files.forEach(f => {
  const buffer = fs.readFileSync(f);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  // IHDR chunk: length (4), type (4), width (4), height (4), bit depth (1), color type (1)
  const colorType = buffer[25];
  let hasAlpha = false;
  if (colorType === 4 || colorType === 6) hasAlpha = true;
  console.log(`${f} -> Color Type: ${colorType}, Has Alpha: ${hasAlpha}`);
});
