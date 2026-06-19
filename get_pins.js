const https = require('https');

const urls = process.argv.slice(2);

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let location = res.headers.location;
        if (!location.startsWith('http')) {
          location = new URL(location, url).href;
        }
        return resolve(fetchUrl(location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (match) {
          resolve(match[1]);
        } else {
          resolve('Not found');
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const url of urls) {
    try {
      const img = await fetchUrl(url);
      console.log(`${url} -> ${img}`);
    } catch (e) {
      console.log(`${url} -> Error: ${e.message}`);
    }
  }
}
run();
