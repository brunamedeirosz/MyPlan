import { useState } from "react";
import { dateKey, monthDays, readDate } from "./calendarDates";
import { spaceColor } from "./spaceColors";

export default function TaskCalendar({
  items,
  spaces,
  selectedDate,
  onSelect,
  onShowTasks,
  onComplete,
  busy,
  loading,
  onCreate,
}) {
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const activeDate = selectedDate || today;
  const pending = items.filter((item) => !item.concluida);
  const dayItems = items.filter((item) => item.prazo === activeDate);
  const overdue = pending.filter((item) => item.prazo && item.prazo < today);
  const scheduledCount = items.filter((item) => item.prazo).length;
  const unscheduledCount = items.filter((item) => !item.prazo).length;
  const spaceName = (id) =>
    spaces.find((space) => space.id === id)?.nome || "Sem espaço";
  const legendSpaces = [
    ...spaces,
    ...(items.some((item) => !item.espaco)
      ? [{ id: null, nome: "Sem espaço" }]
      : []),
  ];
  const dayName = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
  }).format(readDate(activeDate));
  const upcoming = pending
    .filter((item) => item.prazo && item.prazo > activeDate)
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
    .slice(0, 3);
  const days = monthDays(month.year, month.month);
  const focusDay = days.some((day) => dateKey(day) === activeDate)
    ? activeDate
    : dateKey(new Date(month.year, month.month, 1));
  const moveMonth = (direction) => {
    const next = new Date(month.year, month.month + direction, 1);
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
  };
  return (
    <aside
      id="planner-calendar"
      className="calendar-panel"
      aria-label="Calendário das tarefas"
    >
      <div className="calendar-kicker">TODOS OS SEUS ESPAÇOS</div>
      <div className="calendar-title">
        <h2>Calendário</h2>
        <button
          onClick={() => {
            const date = new Date();
            setMonth({ year: date.getFullYear(), month: date.getMonth() });
            onSelect(today);
          }}
        >
          Hoje
        </button>
      </div>
      <div className="calendar-month">
        <span aria-live="polite">
          {new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric",
          }).format(new Date(month.year, month.month, 1))}
        </span>
        <div>
          <button aria-label="Mês anterior" onClick={() => moveMonth(-1)}>
            ‹
          </button>
          <button aria-label="Próximo mês" onClick={() => moveMonth(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div
        className="calendar-grid"
        role="group"
        aria-label="Dias do mês"
        onKeyDown={(event) => {
          const delta = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
          }[event.key];
          if (delta === undefined) return;
          const buttons = [...event.currentTarget.querySelectorAll("button")];
          const index = buttons.indexOf(event.target.closest("button"));
          if (index >= 0 && buttons[index + delta]) {
            event.preventDefault();
            buttons[index + delta].focus();
          }
        }}
      >
        {days.map((date) => {
          const key = dateKey(date);
          const tasks = items.filter((item) => item.prazo === key);
          const groups = [...new Set(tasks.map((item) => item.espaco))].map(
            (id) => {
              const groupItems = tasks.filter((item) => item.espaco === id);
              return {
                id,
                count: groupItems.length,
                completed: groupItems.filter((item) => item.concluida).length,
              };
            },
          );
          const description = groups
            .map(
              (group) =>
                `${spaceName(group.id)}: ${group.count} ${group.count === 1 ? "tarefa" : "tarefas"}${group.completed ? ` (${group.completed} ${group.completed === 1 ? "concluída" : "concluídas"})` : ""}`,
            )
            .join("; ");
          return (
            <button
              key={key}
              data-date={key}
              tabIndex={key === focusDay ? 0 : -1}
              aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date)}${description ? `, ${description}` : ""}`}
              aria-pressed={selectedDate === key}
              aria-current={key === today ? "date" : undefined}
              className={`${date.getMonth() !== month.month ? "outside-month" : ""} ${key === activeDate ? "active-day" : ""} ${key === today ? "today" : ""}`}
              onClick={() => {
                onSelect(key);
                if (date.getMonth() !== month.month)
                  setMonth({
                    year: date.getFullYear(),
                    month: date.getMonth(),
                  });
              }}
            >
              <span>{date.getDate()}</span>
              <span className="calendar-day-markers" aria-hidden="true">
                {groups.map((group) => (
                  <span
                    key={group.id ?? "none"}
                    className={`calendar-space-dot ${group.completed === group.count ? "is-completed" : ""}`}
                    data-space={group.id ?? "none"}
                    style={{
                      background:
                        group.completed === group.count
                          ? "transparent"
                          : spaceColor(group.id),
                      borderColor: spaceColor(group.id),
                    }}
                    title={`${spaceName(group.id)}: ${group.count}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-space-legend" aria-label="Cores dos espaços">
        {legendSpaces.map((space) => (
          <span key={space.id ?? "none"} data-space={space.id ?? "none"}>
            <i style={{ background: spaceColor(space.id) }} />
            {space.nome}
          </span>
        ))}
      </div>
      <p className="calendar-history-hint">
        <i /> Marcador vazado: tarefas concluídas
      </p>
      <section className="day-agenda">
        <div className="agenda-heading">
          <h3>{activeDate === today ? "Para hoje" : dayName}</h3>
          <span>{dayItems.length}</span>
        </div>
        {loading ? (
          <p className="agenda-empty">Carregando…</p>
        ) : dayItems.length ? (
          <ul>
            {dayItems.map((item) => (
              <li
                key={item.id}
                className={item.concluida ? "agenda-completed" : ""}
              >
                <button
                  className="agenda-check"
                  aria-pressed={item.concluida}
                  aria-label={`${item.concluida ? "Reabrir" : "Concluir"} na agenda: ${item.titulo}`}
                  disabled={busy.includes(item.id)}
                  onClick={() => onComplete(item)}
                >
                  {item.concluida ? "✓" : "○"}
                </button>
                <div>
                  <span>{item.titulo}</span>
                  <small className="agenda-space-name">
                    <i style={{ background: spaceColor(item.espaco) }} />
                    {spaceName(item.espaco)}
                    {item.concluida && (
                      <span className="agenda-completed-label">Concluída</span>
                    )}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="agenda-empty">
            Sem tarefas marcadas para este dia.
            <br />
            Um espaço para respirar.
          </p>
        )}
        <button
          className="agenda-create-task"
          onClick={() => onCreate(activeDate)}
        >
          + Adicionar tarefa neste dia
        </button>
        <button
          className="agenda-view-tasks"
          onClick={() => {
            onSelect(activeDate);
            onShowTasks();
          }}
        >
          Ver tarefas deste dia <span>↗</span>
        </button>
      </section>
      {overdue.length > 0 && (
        <button
          className="overdue-summary"
          onClick={() => {
            onSelect("overdue");
            onShowTasks();
          }}
        >
          <span className="overdue-dot" />
          {overdue.length}{" "}
          {overdue.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
          <span>↗</span>
        </button>
      )}
      {upcoming.length > 0 && (
        <section className="upcoming-deadlines" aria-label="Próximos prazos">
          <h3>Próximos prazos</h3>
          {upcoming.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.prazo);
                onShowTasks();
              }}
            >
              <span>{item.titulo}</span>
              <small>
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "numeric",
                  month: "short",
                }).format(readDate(item.prazo))}
              </small>
            </button>
          ))}
        </section>
      )}
      <p className="calendar-note">
        {scheduledCount}{" "}
        {scheduledCount === 1 ? "tarefa com data" : "tarefas com data"}
        {unscheduledCount ? ` · ${unscheduledCount} sem prazo` : ""}
      </p>
    </aside>
  );
}
