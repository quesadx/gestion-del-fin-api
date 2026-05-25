import { mkdirSync, copyFileSync, readdirSync, statSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

const srcDir = resolve('src/docs/openapi');
const destDir = resolve('dist/docs/openapi');
copyDir(srcDir, destDir);
