import { dateKey, readDate } from "./calendarDates.js";

export const priorityLabels = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const recurrenceLabels = {
  nenhuma: "Não repetir",
  diaria: "Diariamente",
  semanal: "Semanalmente",
  mensal: "Mensalmente",
};
export function addDays(value, amount) {
  const date = readDate(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
export function weekDates(value) {
  const date = readDate(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(dateKey(date), index));
}
export function filterTasks(
  items,
  {
    section = "all",
    selectedDate = null,
    spaceId = "all",
    query = "",
    priority = "",
    status = "",
    today,
  },
) {
  const nextWeek = addDays(today, 7);
  return items.filter((item) => {
    if (spaceId !== "all" && String(item.espaco || "") !== spaceId)
      return false;
    if (
      !item.titulo
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR"))
    )
      return false;
    if (priority && (item.prioridade || "media") !== priority) return false;
    if (
      section === "done"
        ? !item.concluida
        : status === "done"
          ? !item.concluida
          : status !== "all" && item.concluida
    )
      return false;
    if (status === "open" && item.concluida) return false;
    if (section === "important" && !item.importante) return false;
    if (section === "today" && item.prazo !== today) return false;
    if (
      section === "upcoming" &&
      (!item.prazo || item.prazo <= today || item.prazo > nextWeek)
    )
      return false;
    if (
      selectedDate === "overdue" &&
      (!item.prazo || item.prazo >= today || item.concluida)
    )
      return false;
    if (
      selectedDate &&
      selectedDate !== "overdue" &&
      item.prazo !== selectedDate
    )
      return false;
    return true;
  });
}
export function sortTasks(items, sort, spaces = []) {
  const priorities = { alta: 0, media: 1, baixa: 2 };
  return [...items].sort((a, b) => {
    if (sort === "priority")
      return (
        priorities[a.prioridade || "media"] -
          priorities[b.prioridade || "media"] || b.id - a.id
      );
    if (sort === "space")
      return (
        (
          spaces.find((space) => space.id === a.espaco)?.nome || "Sem espaço"
        ).localeCompare(
          spaces.find((space) => space.id === b.espaco)?.nome || "Sem espaço",
          "pt-BR",
        ) || b.id - a.id
      );
    if (sort === "due")
      return (
        (a.prazo || "9999-12-31").localeCompare(b.prazo || "9999-12-31") ||
        b.id - a.id
      );
    if (sort === "status")
      return Number(a.concluida) - Number(b.concluida) || b.id - a.id;
    return b.id - a.id;
  });
}
export function groupTasks(items, today) {
  const groups = [
    ["overdue", "Atrasadas"],
    ["today", "Hoje"],
    ["future", "Próximas"],
    ["undated", "Sem prazo"],
    ["done", "Concluídas"],
  ];
  return groups
    .map(([id, title]) => ({
      id,
      title,
      items: items.filter((item) => {
        const key = item.concluida
          ? "done"
          : !item.prazo
            ? "undated"
            : item.prazo < today
              ? "overdue"
              : item.prazo === today
                ? "today"
                : "future";
        return key === id;
      }),
    }))
    .filter((group) => group.items.length);
}
