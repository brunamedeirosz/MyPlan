import { useState } from "react";
import { dateKey, readDate, monthDays } from "./calendarDates";
import { addDays, weekDates } from "./plannerFilters";
import { spaceColor } from "./spaceColors";
import Icon from "./Icon";

export default function TaskViews({
  view,
  items,
  selectedDate,
  onSelect,
  onEdit,
  onToggle,
  onCreate,
  busy,
}) {
  const [anchor, setAnchor] = useState(() => dateKey(new Date()));
  const today = dateKey(new Date());
  const date = readDate(anchor);
  const days =
    view === "week"
      ? weekDates(anchor).map(readDate)
      : monthDays(date.getFullYear(), date.getMonth());
  const shift = (direction) => {
    if (view === "week") setAnchor(addDays(anchor, direction * 7));
    else
      setAnchor(
        dateKey(new Date(date.getFullYear(), date.getMonth() + direction, 1)),
      );
  };
  const title =
    view === "week"
      ? `${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(days[0])} — ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(days[6])}`
      : new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(date);
  return (
    <section
      className={`task-board ${view === "week" ? "weekly-board" : "monthly-board"}`}
      aria-label={view === "week" ? "Visão semanal" : "Visão mensal"}
    >
      <div className="board-heading">
        <h2>{view === "week" ? "Sua semana" : "Calendário"}</h2>
        <div>
          <button className="secondary-button" onClick={() => setAnchor(today)}>
            Hoje
          </button>
          <button
            className="icon-button"
            aria-label={
              view === "week" ? "Semana anterior" : "Mês anterior da visão"
            }
            onClick={() => shift(-1)}
          >
            ‹
          </button>
          <span aria-live="polite">{title}</span>
          <button
            className="icon-button"
            aria-label={
              view === "week" ? "Próxima semana" : "Próximo mês da visão"
            }
            onClick={() => shift(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="board-weekdays">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="board-grid">
        {days.map((day) => {
          const key = dateKey(day);
          const tasks = items.filter((item) => item.prazo === key);
          return (
            <section
              className={`board-day ${key === today ? "is-today" : ""} ${selectedDate === key ? "is-selected" : ""} ${view === "month" && day.getMonth() !== date.getMonth() ? "is-outside" : ""}`}
              data-board-date={key}
              key={key}
            >
              <header>
                <button
                  className="board-date"
                  aria-label={`Selecionar dia ${key}`}
                  onClick={() => onSelect(key)}
                >
                  <span className="week-day-label">
                    {new Intl.DateTimeFormat("pt-BR", {
                      weekday: "short",
                    }).format(day)}
                  </span>
                  {day.getDate()}
                </button>
                <button
                  className="icon-button board-add"
                  aria-label={`Adicionar tarefa em ${key}`}
                  onClick={() => onCreate(key)}
                >
                  <Icon name="plus" size={14} />
                </button>
              </header>
              {tasks.map((item) => (
                <div
                  key={item.id}
                  className={`board-task ${item.concluida ? "board-task-done" : ""}`}
                >
                  <button
                    aria-label={`${item.concluida ? "Reabrir" : "Concluir"} na visão: ${item.titulo}`}
                    aria-pressed={item.concluida}
                    disabled={busy.includes(item.id)}
                    className="board-task-check"
                    onClick={() => onToggle(item)}
                  >
                    {item.concluida ? "✓" : "○"}
                  </button>
                  <button
                    className="board-task-title"
                    aria-label={`Abrir tarefa ${item.titulo}`}
                    onClick={() => onEdit(item)}
                  >
                    <i style={{ background: spaceColor(item.espaco) }} />
                    {item.titulo}
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      {items.some((item) => !item.prazo) && (
        <details className="unscheduled-tasks">
          <summary>
            Sem prazo · {items.filter((item) => !item.prazo).length}
          </summary>
          {items
            .filter((item) => !item.prazo)
            .map((item) => (
              <button key={item.id} onClick={() => onEdit(item)}>
                {item.titulo}
                <Icon name="arrow" size={13} />
              </button>
            ))}
        </details>
      )}
    </section>
  );
}
