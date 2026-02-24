import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://img.icons8.com/fluency/512/artificial-intelligence.png';
const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

const download = (filename: string) => {
  const file = fs.createWriteStream(path.join(publicDir, filename));
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  });
};

download('icon-192.png');
download('icon-512.png');
