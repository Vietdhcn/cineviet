import { chromium } from 'playwright-core';

const baseUrl = process.env.CINEVIET_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/rap`);
  await page.locator('.cinema-directory__item').first().waitFor();
  const total = await page.locator('.cinema-directory__item').count();
  if (total < 2) throw new Error(`Expected demo cinemas, got ${total}`);
  await page.locator('.cinema-directory__filters select').selectOption('Hà Nội');
  if (await page.locator('.cinema-directory__item').count() !== 1) throw new Error('City filter failed');
  await page.locator('.cinema-directory__filters input').fill('không có rạp');
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  if (await page.locator('.cinema-directory__item').count() !== total) throw new Error('Clear filters failed');
  await page.screenshot({ path: '../.impeccable/review/cinema-directory-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Cinema directory overflows mobile viewport');
  await page.screenshot({ path: '../.impeccable/review/cinema-directory-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.cinema-directory__item h3 a').first().click();
  await page.locator('.cinema-detail__header h1').waitFor();
  await page.locator('.cinema-detail__schedule .loading-state').waitFor({ state: 'hidden' });
  for (const button of await page.locator('.cinema-detail__dates button').all()) {
    if (await page.locator('.cinema-detail__times a').count()) break;
    await button.click();
    await page.locator('.cinema-detail__schedule .loading-state').waitFor({ state: 'hidden' });
  }
  await page.locator('.cinema-detail__times a').first().waitFor();
  await page.screenshot({ path: '../.impeccable/review/cinema-detail-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Cinema detail overflows mobile viewport');
  await page.screenshot({ path: '../.impeccable/review/cinema-detail-mobile.png', fullPage: true });
  await page.locator('.cinema-detail__dates button').nth(5).focus();
  const dateRailScrolled = await page.locator('.cinema-detail__dates').evaluate((rail) => rail.scrollLeft > 0);
  if (!dateRailScrolled) throw new Error('Keyboard focus did not reveal later dates');
  await page.locator('.cinema-detail__times a').first().click();
  await page.getByRole('heading', { name: 'Chọn chỗ ngồi' }).waitFor();
  await page.goto(`${baseUrl}/rap/hn-ho-guom`);
  await page.locator('.cinema-detail__dates button').nth(3).click();
  await page.getByRole('heading', { name: 'Chuyến Tàu Sương Mai' }).waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '../.impeccable/review/expanded-catalogue-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Expanded catalogue overflows mobile viewport');
  await page.screenshot({ path: '../.impeccable/review/expanded-catalogue-mobile.png', fullPage: true });
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('CINEMA_SMOKE_OK: filter -> cinema -> date -> showtime -> seats; expanded demo film visible');
} finally {
  await context.close();
  await browser.close();
}
