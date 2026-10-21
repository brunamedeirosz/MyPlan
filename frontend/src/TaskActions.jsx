import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

export default function TaskActions({
  item,
  busy,
  onClose,
  onEdit,
  onFavorite,
  onDelete,
}) {
  const dialog = useRef(null);
  const editButton = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    editButton.current?.focus();
    return () => element.close();
  }, []);

  const close = () => {
    dialog.current.close();
    onClose();
  };
  const act = (action) => {
    if (busy) return;
    close();
    action(item);
  };

  return (
    <dialog
      ref={dialog}
      className="task-actions-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="task-actions-heading">
        <h2 id={titleId}>{item.titulo}</h2>
      </div>
      <div className="task-actions-list">
        <button
          ref={editButton}
          className="task-action-button"
          type="button"
          aria-label={`Editar tarefa: ${item.titulo}`}
          disabled={busy}
          onClick={() => act(onEdit)}
        >
          <Icon name="edit" size={20} />
          Editar tarefa
        </button>
        <button
          className="task-action-button"
          type="button"
          aria-label={`${item.importante ? "Remover dos importantes" : "Marcar como importante"}: ${item.titulo}`}
          aria-pressed={item.importante}
          disabled={busy}
          onClick={() => act(onFavorite)}
        >
          <Icon
            name="star"
            size={20}
            fill={item.importante ? "currentColor" : "none"}
          />
          {item.importante ? "Remover dos importantes" : "Marcar como importante"}
        </button>
        <button
          className="task-action-button task-action-delete"
          type="button"
          aria-label={`Excluir tarefa: ${item.titulo}`}
          disabled={busy}
          onClick={() => act(onDelete)}
        >
          <Icon name="trash" size={20} />
          Excluir tarefa
        </button>
      </div>
      <button
        className="secondary-button task-actions-cancel"
        type="button"
        disabled={busy}
        onClick={close}
      >
        Cancelar
      </button>
    </dialog>
  );
}
