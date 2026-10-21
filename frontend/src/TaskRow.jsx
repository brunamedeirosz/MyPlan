import { useState } from "react";
import Icon from "./Icon";
import TaskActions from "./TaskActions";
import { dueLabel } from "./calendarDates";
import { spaceColor } from "./spaceColors";
import { priorityLabels } from "./plannerFilters";

export default function TaskRow({
  item,
  spaces,
  today,
  busy,
  onEdit,
  onToggle,
  onFavorite,
  onDelete,
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const checklist = item.subtarefas || [];
  const completed = checklist.filter((task) => task.concluida).length;
  return (
    <li className={`task-row ${item.concluida ? "is-done" : ""}`}>
      <button
        className="task-check"
        disabled={busy}
        aria-label={`${item.concluida ? "Reabrir" : "Concluir"} ${item.titulo}`}
        aria-pressed={item.concluida}
        onClick={() => onToggle(item)}
      >
        {item.concluida && <Icon name="check" size={14} />}
      </button>
      <div className="task-title">
        <button className="task-open" onClick={() => onEdit(item)}>
          {item.titulo}
        </button>
        {item.descricao && <p className="task-description">{item.descricao}</p>}
        <div className="task-metadata">
          {item.importante && (
            <span
              className="mobile-important-mark"
              role="img"
              aria-label="Tarefa importante"
            >
              <Icon name="star" size={13} fill="currentColor" />
            </span>
          )}
          <small className="task-space-name">
            <i style={{ background: spaceColor(item.espaco) }} />
            {spaces.find((space) => space.id === item.espaco)?.nome ||
              "Sem espaço"}
          </small>
          {item.prazo && (
            <small
              className={`task-due ${item.prazo < today && !item.concluida ? "late" : ""}`}
            >
              <Icon name="calendar" size={12} />
              {item.prazo < today && !item.concluida ? "Atrasada · " : ""}
              {dueLabel(item.prazo, today)}
            </small>
          )}
          {item.prioridade && item.prioridade !== "media" && <small
            className={`priority-pill priority-${item.prioridade || "media"}`}
          >
            <i />
            {priorityLabels[item.prioridade || "media"]}
          </small>}
          {checklist.length > 0 && (
            <button
              className="subtask-progress"
              aria-label={`Checklist de ${item.titulo}: ${completed} de ${checklist.length}`}
              onClick={() => onEdit(item)}
            >
              <Icon name="list" size={12} />
              {completed}/{checklist.length}
            </button>
          )}
          {item.recorrencia && item.recorrencia !== "nenhuma" && (
            <span title="Tarefa recorrente" className="recurring-mark">
              <Icon name="repeat" size={12} />
            </span>
          )}
          {item.descricao && (
            <span title="Possui descrição" className="description-mark">
              ≡
            </span>
          )}
        </div>
      </div>
      <div className="task-tools">
        <button
          className="icon-button edit-tool"
          aria-label={`Editar ${item.titulo}`}
          title="Editar tarefa"
          disabled={busy}
          onClick={() => onEdit(item)}
        >
          <Icon name="edit" size={16} />
        </button>
        <button
          className={`icon-button star-tool ${item.importante ? "is-important" : ""}`}
          title="Marcar como importante"
          aria-label={`Importante: ${item.titulo}`}
          aria-pressed={item.importante}
          disabled={busy}
          onClick={() => onFavorite(item)}
        >
          <Icon
            name="star"
            size={17}
            fill={item.importante ? "currentColor" : "none"}
          />
        </button>
        <button
          className="icon-button delete-tool"
          title="Excluir tarefa"
          aria-label={`Excluir ${item.titulo}`}
          disabled={busy}
          onClick={() => onDelete(item)}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
      <button
        className="icon-button task-more-mobile"
        aria-label={`Ações de ${item.titulo}`}
        aria-haspopup="dialog"
        aria-expanded={actionsOpen}
        disabled={busy}
        onClick={() => setActionsOpen(true)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {actionsOpen && (
        <TaskActions
          item={item}
          busy={busy}
          onClose={() => setActionsOpen(false)}
          onEdit={onEdit}
          onFavorite={onFavorite}
          onDelete={onDelete}
        />
      )}
    </li>
  );
}
