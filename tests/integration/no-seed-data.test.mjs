import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const database = process.env.CINEVIET_TEST_DB;
const psql = process.env.CINEVIET_PSQL_BIN;
if (!database || !/^cineviet_[a-z0-9_]*_check$/.test(database) || !psql)
  throw new Error('Set CINEVIET_TEST_DB to an isolated *_check database and CINEVIET_PSQL_BIN to psql.');

function query(sql) {
  return execFileSync(psql, ['-h', '127.0.0.1', '-p', '55433', '-U', 'cineviet', '-d', database, '-At', '-c', sql], { encoding: 'utf8' }).trim();
}

test('unreferenced fictional catalogue is removed while tables remain usable', () => {
  const counts = query(`
    select
      (select count(*) from movies where source_key like 'demo-%') || ',' ||
      (select count(*) from cinemas where id in (
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003')) || ',' ||
      (select count(*) from showtimes where movie_id in (
        select id from movies where source_key like 'demo-%'))
  `);
  assert.equal(counts, process.env.CINEVIET_EXPECT_PRESERVED_BOOKING === '1' ? '1,1,1' : '0,0,0');
  assert.equal(query('select max(version) from flyway_schema_history where success'), '6');
});

if (process.env.CINEVIET_EXPECT_PRESERVED_BOOKING === '1') {
  test('a historical booking keeps its account, showtime, cinema and film', () => {
    const counts = query(`
      select
        (select count(*) from bookings where reference = 'PRESERVE-CHECK') || ',' ||
        (select count(*) from showtimes where id = '30000000-0000-0000-0000-000000000001') || ',' ||
        (select count(*) from cinemas where id = '10000000-0000-0000-0000-000000000001') || ',' ||
        (select count(*) from movies where id = '20000000-0000-0000-0000-000000000001') || ',' ||
        (select count(*) from accounts where id = '00000000-0000-0000-0000-000000000001')
    `);
    assert.equal(counts, '1,1,1,1,1');
  });
}
