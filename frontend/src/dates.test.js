import assert from 'node:assert/strict';
import test from 'node:test';
import { toApiDate, toLocalDateTime } from './dates.js';

process.env.TZ = 'America/Sao_Paulo';

test('editar e salvar preserva o instante no fuso de Sao Paulo', () => {
  const instant = '2026-10-16T15:30:00Z';
  assert.equal(toLocalDateTime(instant), '2026-10-16T12:30');
  assert.equal(toApiDate(toLocalDateTime(instant)), '2026-10-16T15:30:00.000Z');
});
test('prazos opcionais e valores invalidos', () => {
  assert.equal(toApiDate(''), null);
  assert.equal(toLocalDateTime(null), '');
  assert.equal(toLocalDateTime('invalid'), '');
});
