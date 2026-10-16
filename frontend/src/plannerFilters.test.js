import test from "node:test";
import assert from "node:assert/strict";
import {
  filterTasks,
  sortTasks,
  groupTasks,
  weekDates,
} from "./plannerFilters.js";
const tasks = [
  {
    id: 1,
    titulo: "Antes",
    prazo: "2026-10-15",
    prioridade: "alta",
    espaco: 1,
    concluida: false,
  },
  {
    id: 2,
    titulo: "Hoje",
    prazo: "2026-10-16",
    prioridade: "media",
    espaco: 2,
    concluida: false,
  },
  {
    id: 3,
    titulo: "Depois",
    prazo: "2026-10-17",
    prioridade: "baixa",
    espaco: 2,
    concluida: false,
  },
  {
    id: 4,
    titulo: "Feita",
    prazo: "2026-10-16",
    prioridade: "alta",
    espaco: 1,
    concluida: true,
  },
  {
    id: 5,
    titulo: "Ideia",
    prazo: null,
    prioridade: "media",
    espaco: 1,
    concluida: false,
  },
];
test("Hoje e próximos dias respeitam conclusão, espaço e prioridade", () => {
  const base = { today: "2026-10-16" };
  assert.deepEqual(
    filterTasks(tasks, { ...base, section: "today" }).map((task) => task.id),
    [2],
  );
  assert.deepEqual(
    filterTasks(tasks, { ...base, section: "upcoming" }).map((task) => task.id),
    [3],
  );
  assert.deepEqual(
    filterTasks(tasks, { ...base, spaceId: "2", priority: "baixa" }).map(
      (task) => task.id,
    ),
    [3],
  );
  assert.deepEqual(
    filterTasks(tasks, { ...base, selectedDate: "overdue" }).map(
      (task) => task.id,
    ),
    [1],
  );
  assert.deepEqual(
    filterTasks(tasks, { ...base, status: "done" }).map((task) => task.id),
    [4],
  );
});
test("agrupamento inclui atrasadas, hoje, futuras, sem prazo e concluídas", () => {
  assert.deepEqual(
    groupTasks(tasks, "2026-10-16").map((group) => group.id),
    ["overdue", "today", "future", "undated", "done"],
  );
});
test("ordenação não altera os dados e coloca tarefas sem prazo no fim", () => {
  assert.deepEqual(
    sortTasks(tasks, "due").map((task) => task.id),
    [1, 4, 2, 3, 5],
  );
  assert.equal(tasks[0].id, 1);
  assert.deepEqual(
    sortTasks(tasks, "priority")
      .slice(0, 2)
      .map((task) => task.id),
    [4, 1],
  );
});
test("semana usa segunda a domingo em fronteiras de ano", () => {
  assert.deepEqual(weekDates("2027-01-01"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
});
