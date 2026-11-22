#!/usr/bin/env node
/**
 * Phase TEX-0 Pipeline — Poly Haven Texture & HDRI Stylizer for Cá Sấu Lên Bờ
 *
 * Usage:
 *   node tools/process_polyhaven.mjs --input=polyhaven --stylize=medium
 *
 * Supports stylize presets:
 *   - light:  512–1024px, gentle edge-preserving smoothing (-enhance/-despeckle), saturation 88%, normal 0.65
 *   - medium: 512px, smoothing + slight palette shift toward Vietnamese folk tones, optional 7-level posterize, normal 0.45
 *   - strong: 512px, strong cel/anime stylization, 5-level posterize, palette tint, normal 0.30
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEXTURE_BUDGET_BYTES = 20 * 1024 * 1024;
const SKY_BUDGET_BYTES = 6 * 1024 * 1024;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  })
);

const inputRoot = path.resolve(process.cwd(), args.input || 'polyhaven');
const outRoot = path.resolve(process.cwd(), 'public/assets/textures/polyhaven');
const stylize = (args.stylize || 'medium').toLowerCase();

const ASSET_TO_LOGICAL_ID = {
  wood_planks: 'tex.wood.plank_new',
  weathered_brown_planks: 'tex.wood.plank_old',
  raw_plank_wall: 'tex.wood.plank_old',
  plank_flooring_03: 'tex.wood.plank_new',
  wood_floor_worn: 'tex.wood.plank_old',
  brown_mud_leaves_01: 'tex.ground.mud',
  dirt_floor: 'tex.ground.dirt',
  forest_ground_04: 'tex.ground.grass',
  leaves_forest_ground: 'tex.ground.grass',
  rocks_ground_02: 'tex.rock.shore',
  red_sandstone_wall: 'tex.rock.shore',
  red_bricks_04: 'tex.brick.red',
  medieval_red_brick: 'tex.brick.red',
  mixed_brick_wall: 'tex.brick.red',
  brick_wall_001: 'tex.brick.red',
  brick_wall_003: 'tex.brick.red',
  brick_wall_10: 'tex.brick.red',
};

const HDRI_TO_SKY_ID = {
  evening_field: 'sky.round1',
  kloofendal_48d_partly_cloudy: 'sky.round2',
  kloofendal_38d_partly_cloudy: 'sky.round2',
  farm_field: 'sky.round1',
  overcast_soil: 'sky.round3',
  quarry_cloudy: 'sky.round3',
  venice_sunset: 'sky.round2',
};

const PALETTE_TINT = {
  'tex.wood.plank_new': '#5B3A24',
  'tex.wood.plank_old': '#4F3421',
  'tex.ground.mud': '#352416',
  'tex.ground.dirt': '#8A6845',
  'tex.ground.grass': '#4F6F3A',
  'tex.rock.shore': '#7D7567',
  'tex.brick.red': '#A84432',
};

function hasTool(bin) {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseSourceTxt(filePath) {
  if (!fs.existsSync(filePath)) return { url: '', author: 'Unknown', resolution: '1k' };
  const raw = fs.readFileSync(filePath, 'utf8');
  const url = raw.match(/https?:\/\/\S+/)?.[0] || '';
  const authorLine = raw.match(/(?:author|tác giả)\s*[:\-]\s*(.+)/i)?.[1]?.trim() || 'See SOURCE.txt';
  return { url, author: authorLine, resolution: raw.match(/\b[1248]k\b/i)?.[0] || '1k' };
}

function isPow2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const manifestPath = path.join(outRoot, 'manifest.json');

  if (!fs.existsSync(inputRoot)) {
    console.log(`[Phase TEX-0] Input directory "${inputRoot}" not found.`);
    console.log('Place downloaded Poly Haven CC0 folders under polyhaven/<asset_id>/ and polyhaven/hdri/<asset_id>/, then re-run.');
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({ version: 1, generatedAt: null, stylizeLevel: stylize, textures: {}, hdri: {} }, null, 2)
      );
    }
    return;
  }

  const hasConvert = hasTool('convert') && hasTool('identify');
  if (!hasConvert) {
    console.warn('[Phase TEX-0] ImageMagick convert/identify missing; copying raw files where valid.');
  }

  const preset =
    stylize === 'light'
      ? { size: 1024, sat: 88, posterize: 0, blur: '0x0.6', tintAmt: 12 }
      : stylize === 'strong'
      ? { size: 512, sat: 78, posterize: 5, blur: '0x1.2', tintAmt: 26 }
      : { size: 512, sat: 84, posterize: 7, blur: '0x0.9', tintAmt: 18 };

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    stylizeLevel: stylize,
    textures: {},
    hdri: {},
  };

  let totalTexBytes = 0;
  let totalSkyBytes = 0;
  const inventoryRows = [];

  for (const entry of fs.readdirSync(inputRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'hdri') {
      const hdriRoot = path.join(inputRoot, 'hdri');
      for (const hEntry of fs.readdirSync(hdriRoot, { withFileTypes: true })) {
        if (!hEntry.isDirectory()) continue;
        const assetId = hEntry.name;
        const skyId = HDRI_TO_SKY_ID[assetId] || `sky.${assetId}`;
        const srcDir = path.join(hdriRoot, assetId);
        const files = fs.readdirSync(srcDir);
        const hdrFile = files.find((f) => /\.hdr$/i.test(f));
        if (!hdrFile) continue;

        const destDir = path.join(outRoot, 'hdri', assetId);
        fs.mkdirSync(destDir, { recursive: true });
        const destHdr = path.join(destDir, hdrFile);
        fs.copyFileSync(path.join(srcDir, hdrFile), destHdr);
        const bytes = fs.statSync(destHdr).size;
        totalSkyBytes += bytes;
        const srcInfo = parseSourceTxt(path.join(srcDir, 'SOURCE.txt'));

        manifest.hdri[skyId] = {
          assetId,
          hdr: `/assets/textures/polyhaven/hdri/${assetId}/${hdrFile}`,
          bytes,
          author: srcInfo.author,
        };
        inventoryRows.push({
          id: skyId,
          assetId,
          url: srcInfo.url || `https://polyhaven.com/a/${assetId}`,
          author: srcInfo.author,
          res: srcInfo.resolution,
          format: 'HDR + PMREM',
          bytes,
          modified: `Yes (${stylize})`,
        });
      }
      continue;
    }

    const assetId = entry.name;
    const logicalId = ASSET_TO_LOGICAL_ID[assetId];
    if (!logicalId) {
      console.warn(`[Phase TEX-0] Skipping unmapped Poly Haven folder "${assetId}"`);
      continue;
    }

    const srcDir = path.join(inputRoot, assetId);
    const files = fs.readdirSync(srcDir);
    const diffFile = files.find((f) => /_diff_/i.test(f));
    const normFile = files.find((f) => /_nor_gl_/i.test(f));
    const armFile = files.find((f) => /_arm_/i.test(f));

    if (!diffFile) {
      console.warn(`[Phase TEX-0] Missing *_diff_* map in ${srcDir}`);
      continue;
    }
    if (normFile && /_nor_dx_/i.test(normFile)) {
      throw new Error(`Invalid DirectX normal map in ${assetId}: must use OpenGL (_nor_gl_)`);
    }

    const destDir = path.join(outRoot, assetId);
    fs.mkdirSync(destDir, { recursive: true });
    const srcInfo = parseSourceTxt(path.join(srcDir, 'SOURCE.txt'));
    let setBytes = 0;

    const diffOutName = `${assetId}_diff_stylized.webp`;
    const diffDest = path.join(destDir, diffOutName);
    if (hasConvert) {
      const dims = execFileSync('identify', ['-format', '%w %h', path.join(srcDir, diffFile)], { encoding: 'utf8' })
        .trim()
        .split(' ')
        .map(Number);
      if (!isPow2(dims[0]) || !isPow2(dims[1])) {
        console.warn(`[Phase TEX-0] Non-power-of-2 source (${dims[0]}x${dims[1]}) for ${assetId}; resizing to ${preset.size}x${preset.size}`);
      }
      const tint = PALETTE_TINT[logicalId];
      const cmdArgs = [
        path.join(srcDir, diffFile),
        '-resize',
        `${preset.size}x${preset.size}!`,
        '-despeckle',
        '-gaussian-blur',
        preset.blur,
        '-modulate',
        `100,${preset.sat},100`,
      ];
      if (tint) {
        cmdArgs.push('-fill', tint, '-colorize', `${preset.tintAmt}%`);
      }
      if (preset.posterize > 0) {
        cmdArgs.push('-posterize', String(preset.posterize));
      }
      cmdArgs.push('-quality', '84', diffDest);
      execFileSync('convert', cmdArgs);
    } else {
      fs.copyFileSync(path.join(srcDir, diffFile), diffDest);
    }
    setBytes += fs.statSync(diffDest).size;

    let normUrl;
    if (normFile) {
      const normOutName = `${assetId}_nor_gl_stylized.jpg`;
      const normDest = path.join(destDir, normOutName);
      if (hasConvert) {
        execFileSync('convert', [
          path.join(srcDir, normFile),
          '-resize',
          `${preset.size}x${preset.size}!`,
          '-gaussian-blur',
          '0x0.6',
          '-quality',
          '88',
          normDest,
        ]);
      } else {
        fs.copyFileSync(path.join(srcDir, normFile), normDest);
      }
      setBytes += fs.statSync(normDest).size;
      normUrl = `/assets/textures/polyhaven/${assetId}/${normOutName}`;
    }

    let armUrl;
    if (armFile) {
      const armOutName = `${assetId}_arm_stylized.jpg`;
      const armDest = path.join(destDir, armOutName);
      if (hasConvert) {
        execFileSync('convert', [
          path.join(srcDir, armFile),
          '-resize',
          `${preset.size}x${preset.size}!`,
          '-quality',
          '86',
          armDest,
        ]);
      } else {
        fs.copyFileSync(path.join(srcDir, armFile), armDest);
      }
      setBytes += fs.statSync(armDest).size;
      armUrl = `/assets/textures/polyhaven/${assetId}/${armOutName}`;
    }

    totalTexBytes += setBytes;
    manifest.textures[logicalId] = {
      assetId,
      diffuse: `/assets/textures/polyhaven/${assetId}/${diffOutName}`,
      normalGl: normUrl,
      arm: armUrl,
      bytes: setBytes,
      author: srcInfo.author,
    };
    inventoryRows.push({
      id: logicalId,
      assetId,
      url: srcInfo.url || `https://polyhaven.com/a/${assetId}`,
      author: srcInfo.author,
      res: `${preset.size}px`,
      format: 'WebP + nor_gl + ARM',
      bytes: setBytes,
      modified: `Yes (${stylize})`,
    });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[Phase TEX-0] Wrote manifest (${inventoryRows.length} assets).`);
  console.log(`Textures: ${(totalTexBytes / 1048576).toFixed(2)} MB / 20.00 MB`);
  console.log(`Sky HDRI: ${(totalSkyBytes / 1048576).toFixed(2)} MB / 6.00 MB`);
  if (totalTexBytes > TEXTURE_BUDGET_BYTES || totalSkyBytes > SKY_BUDGET_BYTES) {
    console.error('[Phase TEX-0] BUDGET EXCEEDED!');
    process.exitCode = 1;
  }
}

main();
