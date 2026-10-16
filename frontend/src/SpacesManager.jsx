import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { spaceColor } from "./spaceColors";

export default function SpacesManager({ spaces, onSave, onDelete, onClose }) {
  const dialog = useRef(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  const showError = (err) => {
    const data = err.response?.data;
    setError(
      data?.nome?.[0] ||
        data?.detail ||
        "Não foi possível salvar. Tente novamente.",
    );
  };
  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = editing
        ? await api.patch(`espacos-pessoais/${editing.id}/`, {
            nome: name.trim(),
          })
        : await api.post("espacos-pessoais/", { nome: name.trim() });
      onSave(data, !editing);
      setName("");
      setEditing(null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete(`espacos-pessoais/${deleting.id}/`);
      onDelete(deleting);
      if (editing?.id === deleting.id) {
        setEditing(null);
        setName("");
      }
      setDeleting(null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      className="spaces-dialog"
      ref={dialog}
      aria-labelledby="spaces-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="spaces-dialog-header">
        <div>
          <span className="overline">DO SEU JEITO</span>
          <h2 id="spaces-title">Seus espaços.</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar espaços"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="spaces-explanation">
        Um lugar para cada parte da sua vida. Adicione, renomeie ou remova como
        preferir.
      </p>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <ul className="spaces-edit-list">
        {spaces.map((space) => (
          <li key={space.id}>
            <span
              className="space-marker"
              style={{ background: spaceColor(space.id) }}
            />{" "}
            <strong>{space.nome}</strong>
            <button
              disabled={busy}
              onClick={() => {
                setEditing(space);
                setName(space.nome);
                setDeleting(null);
                setError("");
              }}
            >
              Renomear<span className="sr-only"> {space.nome}</span>
            </button>
            <button
              className="remove-space"
              disabled={busy}
              onClick={() => {
                setDeleting(space);
                setError("");
              }}
            >
              Excluir<span className="sr-only"> {space.nome}</span>
            </button>
          </li>
        ))}
      </ul>
      {deleting ? (
        <div
          className="space-delete-confirm"
          role="group"
          aria-label="Confirmar exclusão de espaço"
        >
          <h3>Excluir {deleting.nome}?</h3>
          <p>
            Suas tarefas serão mantidas em <strong>Sem espaço</strong>. Apenas o
            espaço será removido.
          </p>
          <div>
            <button disabled={busy} onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button disabled={busy} className="danger-button" onClick={remove}>
              {busy ? "Excluindo…" : "Excluir espaço"}
            </button>
          </div>
        </div>
      ) : (
        <form className="space-name-form" onSubmit={save}>
          <label htmlFor="space-name">
            {editing ? `Novo nome para ${editing.nome}` : "Novo espaço"}
          </label>
          <div>
            <input
              id="space-name"
              required
              maxLength={60}
              placeholder="Ex.: Faculdade, Saúde, Ideias…"
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
            <button disabled={busy || !name.trim()} className="primary-button">
              {busy
                ? "Salvando…"
                : editing
                  ? "Salvar nome"
                  : "Adicionar espaço"}
            </button>
          </div>
          {editing && (
            <button
              className="switch-auth"
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              Cancelar edição
            </button>
          )}
        </form>
      )}
      <button className="spaces-close" disabled={busy} onClick={onClose}>
        Pronto
      </button>
    </dialog>
  );
}
