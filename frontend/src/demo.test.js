import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDemoAdapter, resetDemo } from './demo.js';

function client() {
  const map = new Map();
  const storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
  return { api: axios.create({ adapter: createDemoAdapter(storage) }), storage };
}

test('demo preserva tarefas sem espaço ao excluir um espaço e restaura o exemplo', async () => {
  const { api, storage } = client();
  const original = (await api.get('itens-pessoais/')).data;
  await api.delete('espacos-pessoais/1/');
  const tasks = (await api.get('itens-pessoais/')).data;
  assert.equal(tasks.length, original.length);
  assert.equal(tasks.find(task => task.id === 1).espaco, null);
  resetDemo(storage);
  assert.equal((await api.get('itens-pessoais/1/')).data.espaco, 1);
});

test('demo exige prazo para recorrência e reinicia o checklist uma única vez', async () => {
  const { api } = client();
  await assert.rejects(api.post('itens-pessoais/', { titulo: 'Teste', recorrencia: 'mensal' }), error => error.response.status === 400);
  const { data: task } = await api.post('itens-pessoais/', {
    titulo: 'Revisão', prazo: '2025-01-31', recorrencia: 'mensal',
    subtarefas: [{ id: 'a', texto: 'Revisar', concluida: true }],
  });
  const { data: done } = await api.patch(`itens-pessoais/${task.id}/`, { concluida: true });
  const { data: next } = await api.get(`itens-pessoais/${done.proxima_ocorrencia}/`);
  assert.equal(next.subtarefas[0].concluida, false);
  assert.equal(next.anchor, '2025-01-31');
  const count = (await api.get('itens-pessoais/')).data.length;
  await api.patch(`itens-pessoais/${task.id}/`, { concluida: false });
  await api.patch(`itens-pessoais/${task.id}/`, { concluida: true });
  assert.equal((await api.get('itens-pessoais/')).data.length, count);
});

test('demo rejeita recursos de conta e espaços duplicados', async () => {
  const { api } = client();
  await assert.rejects(api.post('token/', { username: 'a', password: 'b' }), error => error.response.status === 404);
  await assert.rejects(api.post('espacos-pessoais/', { nome: 'pessoal' }), error => error.response.status === 400);
});
