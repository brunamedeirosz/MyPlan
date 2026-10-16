import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, readDate, monthDays, dueLabel } from './calendarDates.js';

process.env.TZ = 'America/Sao_Paulo';
test('datas do calendário preservam o dia local, sem converter para UTC', () => {
  assert.equal(dateKey(readDate('2026-10-16')), '2026-10-16');
  assert.equal(readDate('2026-10-16').getHours(), 0);
  assert.equal(dueLabel('2026-10-16', '2026-10-16'), 'Hoje');
  assert.equal(dueLabel(null, '2026-10-16'), '');
});
test('grade inicia na segunda, tem seis semanas e inclui fevereiro bissexto', () => {
  const days = monthDays(2024, 1);
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(new Set(days.map(dateKey)).size, 42);
  assert.ok(days.some(day => dateKey(day) === '2024-02-29'));
  assert.equal(days.filter(day => day.getMonth() === 1).length, 29);
});
test('dezembro e janeiro incluem dias do ano vizinho corretamente', () => {
  assert.ok(monthDays(2026, 11).some(day => day.getFullYear() === 2027));
  assert.ok(monthDays(2027, 0).some(day => day.getFullYear() === 2026));
});
