import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, 'dist', 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // 将绝对路径改为相对路径
  html = html.replace(/src="\/assets\//g, 'src="./assets/');
  html = html.replace(/href="\/assets\//g, 'href="./assets/');
  
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('Fixed HTML paths to use relative paths');
} else {
  console.error(`HTML file not found at: ${htmlPath}`);
  process.exit(1);
}

