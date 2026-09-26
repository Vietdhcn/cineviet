import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public site does not offer fictional booking or payment', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /CineViet chưa mở bán/);
  assert.match(html, /chưa có lịch chiếu và giá vé được xác thực/);
  assert.doesNotMatch(html, /(?:href|action)=["'][^"']*(?:dat-ghe|thanh-toan|demo-payment)/i);
  assert.doesNotMatch(html, /CHẾ ĐỘ DEMO|DEMO ONLY|thanh toán mô phỏng/i);
});
