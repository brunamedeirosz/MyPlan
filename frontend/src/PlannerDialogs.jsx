import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export function DeleteConfirmation({ item, onClose, onDelete, error }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <span className="overline">CONFIRMAR EXCLUSÃO</span>
      <h2 id="delete-title">Excluir esta tarefa?</h2>
      <p>
        “{item.titulo}” será removida. Você poderá desfazer pelo aviso que
        aparece após a exclusão.
      </p>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="editor-footer">
        <button
          autoFocus
          disabled={busy}
          className="secondary-button"
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="danger-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (!(await onDelete(item))) setBusy(false);
          }}
        >
          {busy ? "Excluindo…" : "Excluir tarefa"}
        </button>
      </div>
    </dialog>
  );
}

export function PlannerSettings({ username, theme, onThemeChange, preferences, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="editor-heading">
        <div>
          <span className="overline">SEU MYPLAN</span>
          <h2 id="settings-title">Perfil e preferências</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar configurações"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="settings-account">
        <span className="avatar">{username.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{username}</strong>
          <span>Conta pessoal</span>
        </div>
      </div>
      <p className="field-help">
        Estas preferências são salvas neste navegador.
      </p>
      <label className="settings-toggle">
        <span>Aparência<small>Escolha como prefere ver seu planner.</small></span>
        <select className="theme-select" aria-label="Aparência" value={theme}
          onChange={(event) => onThemeChange(event.target.value)}>
          <option value="dark">Modo escuro</option>
          <option value="light">Modo claro</option>
        </select>
      </label>
      <label className="settings-toggle">
        <span>
          Lista compacta<small>Menos espaço entre as tarefas.</small>
        </span>
        <input
          type="checkbox"
          checked={preferences.compact}
          onChange={(event) =>
            onChange({ ...preferences, compact: event.target.checked })
          }
        />
      </label>
      <label className="settings-toggle">
        <span>
          Mostrar concluídas
          <small>Incluir o histórico na lista principal.</small>
        </span>
        <input
          type="checkbox"
          checked={preferences.showCompleted}
          onChange={(event) =>
            onChange({ ...preferences, showCompleted: event.target.checked })
          }
        />
      </label>
      <button className="primary-button settings-done" onClick={onClose}>
        Pronto
      </button>
    </dialog>
  );
}
