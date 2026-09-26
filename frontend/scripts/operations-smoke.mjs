import { chromium } from 'playwright-core';

const baseUrl = process.env.CINEVIET_BASE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/dieu-hanh`);
  await page.locator('.operations-editor button[type=submit]:not([disabled])').waitFor();
  const dateTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(Date.now() + 4 * 86_400_000)).replace(' ', 'T').slice(0, 11) + '09:00';
  await page.locator('input[type="datetime-local"]').fill(dateTime);
  await page.locator('.operations-editor button[type=submit]').click();
  await page.locator('.operations-editor .operations-success').waitFor();
  const showtime = await page.evaluate(() => JSON.parse(localStorage.getItem('cineviet-demo-operations-v1') ?? '{}').added?.[0]);
  if (!showtime?.id) throw new Error('Demo showtime was not saved');

  await page.goto(baseUrl);
  await page.locator('.booking-dock input[type=date]').fill(dateTime.slice(0, 10));
  await page.locator(`.showtime-stack a[href="/dat-ghe/${showtime.id}"]`).waitFor();
  await page.goto(`${baseUrl}/rap/${showtime.cinemaId}`);
  await page.locator('.cinema-detail__header h1').waitFor();
  const dayMonth = `${dateTime.slice(8, 10)}/${dateTime.slice(5, 7)}`;
  await page.locator('.cinema-detail__dates button').filter({ hasText: dayMonth }).click();
  await page.locator(`.cinema-detail__times a[href="/dat-ghe/${showtime.id}"]`).waitFor();

  await page.goto(`${baseUrl}/dieu-hanh`);
  await page.locator('.operations-editor button[type=submit]:not([disabled])').waitFor();
  await page.locator('input[type="datetime-local"]').fill(dateTime);
  await page.locator('.operations-editor button[type=submit]').click();
  await page.locator('.operations-editor .message--error').waitFor();
  const conflictMessage = await page.locator('.operations-editor .message--error').innerText();
  if (!conflictMessage.includes('trùng giờ')) throw new Error(`Expected room conflict, got: ${conflictMessage}`);

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator(`.operations-list article[data-showtime-id="${showtime.id}"] button`).click();
  await page.locator('.operations-schedule .operations-success').waitFor();
  const cancelled = await page.evaluate(() => JSON.parse(localStorage.getItem('cineviet-demo-operations-v1') ?? '{}').cancelled?.length);
  if (cancelled !== 1) throw new Error(`Expected one cancelled showtime, got ${cancelled}`);
  await page.goto(baseUrl);
  await page.locator('.booking-dock input[type=date]').fill(dateTime.slice(0, 10));
  await page.locator('.catalog-section .movie-list, .catalog-section .message').first().waitFor();
  if (await page.locator(`.showtime-stack a[href="/dat-ghe/${showtime.id}"]`).count()) throw new Error('Cancelled showtime remains public');
  await page.goto(`${baseUrl}/rap/${showtime.cinemaId}`);
  await page.locator('.cinema-detail__header h1').waitFor();
  await page.locator('.cinema-detail__dates button').filter({ hasText: dayMonth }).click();
  await page.locator('.cinema-detail__times, .cinema-detail__empty').first().waitFor();
  if (await page.locator(`.cinema-detail__times a[href="/dat-ghe/${showtime.id}"]`).count()) throw new Error('Cancelled showtime remains on cinema page');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('OPERATIONS_SMOKE_OK: create -> catalogue + cinema -> conflict -> cancel -> hidden');
} finally {
  await context.close();
  await browser.close();
}
