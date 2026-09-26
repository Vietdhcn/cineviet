import { chromium } from 'playwright-core';
import path from 'node:path';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const captures = [
  ['desktop', '/', { width: 1440, height: 1000 }],
  ['mobile', '/', { width: 390, height: 844 }],
  ['seat-desktop', '/dat-ghe/s1', { width: 1440, height: 1000 }],
  ['seat-mobile', '/dat-ghe/s1', { width: 390, height: 844 }],
  ['recommendation-desktop', '/goi-y', { width: 1440, height: 1000 }],
];
for (const [name, route, viewport] of captures) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.resolve('../.impeccable/review', `${name}.png`), fullPage: true });
  await context.close();
}
await browser.close();
