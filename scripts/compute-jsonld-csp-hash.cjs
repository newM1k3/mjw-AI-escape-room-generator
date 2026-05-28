const fs = require('fs');
const crypto = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script id="puzzleflow-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!match) {
  throw new Error('JSON-LD script block not found.');
}

const hash = crypto.createHash('sha256').update(match[1]).digest('base64');
console.log(`'sha256-${hash}'`);
