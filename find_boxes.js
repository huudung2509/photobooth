const Jimp = require('jimp');

async function findBoxes(file) {
  const image = await Jimp.read(file);
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  const visited = new Uint8Array(w * h);
  const boxes = [];
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y * w + x]) continue;
      
      const idx = (y * w + x) * 4;
      const a = image.bitmap.data[idx + 3];
      
      if (a < 128) {
        // Transparent pixel, start finding bounding box
        let minX = x, maxX = x, minY = y, maxY = y;
        const queue = [{x, y}];
        visited[y * w + x] = 1;
        
        let area = 0;
        
        while (queue.length > 0) {
          const p = queue.pop();
          area++;
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          
          const neighbors = [
            {x: p.x + 1, y: p.y},
            {x: p.x - 1, y: p.y},
            {x: p.x, y: p.y + 1},
            {x: p.x, y: p.y - 1}
          ];
          
          for (const n of neighbors) {
            if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
              if (!visited[n.y * w + n.x]) {
                const nIdx = (n.y * w + n.x) * 4;
                const nA = image.bitmap.data[nIdx + 3];
                if (nA < 128) {
                  visited[n.y * w + n.x] = 1;
                  queue.push(n);
                }
              }
            }
          }
        }
        
        // Only consider large enough boxes (e.g. > 1000 pixels)
        if (area > 1000) {
          boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area });
        }
      } else {
        visited[y * w + x] = 1;
      }
    }
  }
  
  // Sort boxes by Y
  boxes.sort((a, b) => a.y - b.y);
  console.log(`\n--- ${file} ---`);
  boxes.forEach((b, i) => {
    console.log(`Box ${i+1}: {x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h}}`);
  });
}

async function run() {
  await findBoxes('frame4.png');
  await findBoxes('frame5.png');
  await findBoxes('frame6.png');
}
run();
