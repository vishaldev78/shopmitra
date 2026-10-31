#!/usr/bin/env node
/**
 * shot-diagram.mjs — screenshot a diagram HTML element to PNG @2x (print quality).
 * Usage: node scripts/shot-diagram.mjs <html> <out.png> [selector]
 */
import { chromium } from 'playwright';

const [, , htmlPath, outPath, selector = '#root'] = process.argv;
if (!htmlPath || !outPath) {
  console.error('Usage: node scripts/shot-diagram.mjs <html> <out.png> [selector]');
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const el = page.locator(selector);
const bbox = await el.boundingBox();
if (bbox) {
  await page.setViewportSize({
    width: Math.max(1200, Math.ceil(bbox.width) + 60),
    height: Math.ceil(bbox.height) + 60,
  });
  await page.waitForTimeout(200);
}
await el.screenshot({ path: outPath });
await browser.close();

const { statSync } = await import('node:fs');
console.log(`saved ${outPath} (${(statSync(outPath).size / 1024).toFixed(0)}KB)`);
