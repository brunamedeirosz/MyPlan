import { AxiosError } from 'axios';
import { dateKey, readDate } from './calendarDates.js';
import { addDays } from './plannerFilters.js';

const storageKey = 'myplan:demo:v1';
const clone = value => structuredClone(value);
export const resetDemo = storage => storage.removeItem(storageKey);

function sampleData() {
  const today = dateKey(new Date());
  const criado_em = new Date().toISOString();
  const spaces = ['Pessoal', 'Trabalho', 'Estudos'].map((nome, index) => ({ id: index + 1, nome, criado_em }));
  const tasks = [
    { titulo: 'Planejar a semana com calma', espaco: 1, importante: true, descricao: 'Separar o que importa e reservar espaço para descansar.', subtarefas: [{ id: 'a', texto: 'Revisar compromissos', concluida: true }, { id: 'b', texto: 'Escolher três prioridades', concluida: false }] },
    { titulo: 'Preparar a apresentação do projeto', espaco: 2, prioridade: 'alta', importante: true },
    { titulo: 'Ler um capítulo e fazer anotações', espaco: 3 },
    { titulo: 'Fazer uma pausa para caminhar', espaco: 1, recorrencia: 'diaria' },
    { titulo: 'Revisar o portfólio', espaco: 2, prazo: addDays(today, 2) },
    { titulo: 'Organizar os materiais de estudo', espaco: 3, prazo: addDays(today, -1) },
    { titulo: 'Reservar um tempo para um novo hobby', espaco: 1, prazo: null },
    { titulo: 'Atualizar o planejamento', espaco: 1, concluida: true },
  ].map((task, index) => ({
    id: index + 1, titulo: '', descricao: '', prioridade: 'media', subtarefas: [],
    recorrencia: 'nenhuma', proxima_ocorrencia: null, concluida: false, importante: false,
    espaco: null, prazo: today, criado_em, ...task,
  }));
  return { spaces, tasks, nextTaskId: 9, nextSpaceId: 4 };
}

function nextDate(task) {
  const today = dateKey(new Date());
  let due = task.prazo;
  const anchor = readDate(task.anchor || due).getDate();
  do {
    if (task.recorrencia === 'mensal') {
      const date = readDate(due);
      const last = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate();
      due = dateKey(new Date(date.getFullYear(), date.getMonth() + 1, Math.min(anchor, last)));
    } else due = addDays(due, task.recorrencia === 'semanal' ? 7 : 1);
  } while (due <= today);
  return due;
}

// Adaptador local: as operações do planner não fazem requisições à API Django.
// As regras definitivas e a autenticação pertencem ao backend; este modo é uma amostra.
export function createDemoAdapter(storage) {
  return async config => {
    let state;
    try { state = JSON.parse(storage.getItem(storageKey)); } catch { /* Recomeça se os dados locais forem inválidos. */ }
    if (!state?.tasks || !state?.spaces) {
      state = sampleData();
      storage.setItem(storageKey, JSON.stringify(state));
    }
    const respond = (data, status = 200) => ({ data: clone(data), status, statusText: String(status), headers: {}, config });
    const fail = (data, status = 400) => {
      throw new AxiosError('Operação inválida na demonstração.', AxiosError.ERR_BAD_REQUEST, config, null, respond(data, status));
    };
    const [resource, rawId] = config.url.split('/').filter(Boolean);
    const key = { 'itens-pessoais': 'tasks', 'espacos-pessoais': 'spaces' }[resource];
    if (!key) fail({ detail: 'Este recurso exige a versão com servidor.' }, 404);
    const method = config.method || 'get';
    const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
    const id = Number(rawId);
    const row = state[key].find(item => item.id === id);
    if (rawId && !row) fail({ detail: 'Item não encontrado.' }, 404);
    if (method === 'get') return respond(rawId ? row : state[key]);
    if (!['post', 'patch', 'delete'].includes(method)) fail({ detail: 'Método indisponível.' }, 405);
    if (method === 'delete') {
      state[key] = state[key].filter(item => item.id !== id);
      if (key === 'spaces') state.tasks.forEach(task => { if (task.espaco === id) task.espaco = null; });
      else state.tasks.forEach(task => { if (task.proxima_ocorrencia === id) task.proxima_ocorrencia = null; });
    } else if (key === 'spaces') {
      const nome = String(data.nome || '').trim();
      if (!nome || nome.length > 60) fail({ nome: ['Use um nome com até 60 caracteres.'] });
      if (state.spaces.some(space => space.id !== id && space.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) fail({ nome: ['Você já tem um espaço com esse nome.'] });
      if (row) row.nome = nome;
      else state.spaces.push({ id: state.nextSpaceId++, nome, criado_em: new Date().toISOString() });
    } else {
      const task = { titulo: '', descricao: '', prioridade: 'media', subtarefas: [], recorrencia: 'nenhuma', proxima_ocorrencia: null, concluida: false, importante: false, espaco: null, prazo: null, ...row };
      const fields = ['titulo', 'descricao', 'prioridade', 'subtarefas', 'recorrencia', 'concluida', 'importante', 'espaco', 'prazo'];
      fields.forEach(field => { if (Object.hasOwn(data, field)) task[field] = data[field]; });
      if (!task.titulo.trim() || task.titulo.length > 255) fail({ titulo: ['Use um título com até 255 caracteres.'] });
      if (task.recorrencia !== 'nenhuma' && !task.prazo) fail({ prazo: ['Defina um prazo para a tarefa recorrente.'] });
      if (task.espaco && !state.spaces.some(space => space.id === Number(task.espaco))) fail({ espaco: ['Espaço não encontrado.'] });
      task.espaco = task.espaco ? Number(task.espaco) : null;
      if (!row || row.prazo !== task.prazo || row.recorrencia !== task.recorrencia) task.anchor = task.prazo;
      if (row && !row.concluida && task.concluida && task.recorrencia !== 'nenhuma' && !task.proxima_ocorrencia) {
        const next = { ...clone(task), id: state.nextTaskId++, prazo: nextDate(task), concluida: false, subtarefas: task.subtarefas.map(item => ({ ...item, concluida: false })) };
        task.proxima_ocorrencia = next.id;
        state.tasks.unshift(next);
      }
      if (row) Object.assign(row, task);
      else state.tasks.unshift({ ...task, id: state.nextTaskId++, criado_em: new Date().toISOString() });
    }
    storage.setItem(storageKey, JSON.stringify(state));
    if (method === 'delete') return respond(null, 204);
    return respond(row || (key === 'tasks' ? state.tasks[0] : state.spaces.at(-1)), method === 'post' ? 201 : 200);
  };
}
