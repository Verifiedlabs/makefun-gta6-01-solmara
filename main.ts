import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

process.umask(0o022);

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });

function copyDirClean(src: string, dst: string): void {
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  chmodSync(dst, 0o755);

  const entries = readdirSync(src, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    const st = statSync(srcPath);
    if (st.isDirectory()) {
      copyDirClean(srcPath, dstPath);
    } else if (st.isFile()) {
      copyFileSync(srcPath, dstPath);
      chmodSync(dstPath, 0o644);
    }
  }
}

copyDirClean(join(repoRoot, 'game'), join(outDir, 'game'));
copyDirClean(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);
chmodSync(dossierPath, 0o644);

console.log(`Wrote Solmara Bay output to ${outDir} (dossier.json: ${dossierBytes.byteLength} bytes)`);
