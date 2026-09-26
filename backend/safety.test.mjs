import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('backend starts with customer sessions and no automatically generated fictional showtimes', () => {
  assert.match(source('./src/main/resources/application.yml'), /customer-auth-enabled:\s*true/);
  assert.match(source('./src/main/java/vn/cineviet/catalog/DemoScheduleService.java'), /@ConditionalOnProperty\(name = "cineviet\.demo-enabled", havingValue = "true"\)/);
});

test('new migration withdraws synthetic catalogue without deleting booking history', () => {
  const migration = source('./src/main/resources/db/migration/V5__withdraw_synthetic_catalogue.sql');
  assert.match(migration, /update movies set visibility\s*=\s*'HIDDEN'/i);
  assert.match(migration, /source_key like 'demo-%'/i);
  assert.match(migration, /update cinemas set active\s*=\s*false/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\b/i);
});

test('a hold cannot bypass withdrawn catalogue by calling an old showtime ID', () => {
  const bookingService = source('./src/main/java/vn/cineviet/booking/BookingService.java');
  assert.match(bookingService, /select s\.starts_at from showtimes s\s+join movies m on m\.id\s*=\s*s\.movie_id\s+join cinemas c on c\.id\s*=\s*s\.cinema_id\s+where s\.id\s*=\s*\? and m\.visibility\s*=\s*'PUBLISHED' and c\.active\s+for update of s/i);
});
