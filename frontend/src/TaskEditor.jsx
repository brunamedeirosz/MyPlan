import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { priorityLabels, recurrenceLabels } from "./plannerFilters";

export default function TaskEditor({ item, spaces, onSave, onClose, error }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(() => ({
    titulo: item.titulo,
    descricao: item.descricao || "",
    espaco: String(item.espaco || ""),
    prazo: item.prazo || "",
    prioridade: item.prioridade || "media",
    recorrencia: item.recorrencia || "nenhuma",
    subtarefas: item.subtarefas || [],
  }));
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  const change = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await onSave(item, {
      ...draft,
      titulo: draft.titulo.trim(),
      espaco: draft.espaco || null,
      prazo: draft.prazo || null,
    });
    if (!result) setSaving(false);
  };
  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    change("subtarefas", [
      ...draft.subtarefas,
      { id: crypto.randomUUID(), texto: newSubtask.trim(), concluida: false },
    ]);
    setNewSubtask("");
  };
  return (
    <dialog
      ref={dialog}
      className="task-editor"
      aria-labelledby="task-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <div className="editor-heading">
        <div>
          <span className="overline">DETALHES DA TAREFA</span>
          <h2 id="task-editor-title">Um pouco mais de clareza.</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar edição"
          disabled={saving}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <form onSubmit={submit}>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <label className="field-label">
          Título
          <input
            aria-label="Editar título"
            autoFocus
            required
            maxLength={255}
            value={draft.titulo}
            disabled={saving}
            onChange={(event) => change("titulo", event.target.value)}
          />
        </label>
        <label className="field-label">
          Descrição
          <textarea
            aria-label="Descrição"
            rows={3}
            maxLength={10000}
            placeholder="Contexto, links ou uma ideia para depois…"
            value={draft.descricao}
            disabled={saving}
            onChange={(event) => change("descricao", event.target.value)}
          />
        </label>
        <div className="editor-fields">
          <label className="field-label">
            Espaço
            <select
              aria-label="Mover tarefa para espaço"
              value={draft.espaco}
              disabled={saving}
              onChange={(event) => change("espaco", event.target.value)}
            >
              <option value="">Sem espaço</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Prazo
            <input
              type="date"
              aria-label="Prazo da tarefa"
              required={draft.recorrencia !== "nenhuma"}
              value={draft.prazo}
              disabled={saving}
              onChange={(event) => change("prazo", event.target.value)}
            />
          </label>
          <label className="field-label">
            Prioridade
            <select
              aria-label="Prioridade"
              value={draft.prioridade}
              disabled={saving}
              onChange={(event) => change("prioridade", event.target.value)}
            >
              {Object.entries(priorityLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Repetir
            <select
              aria-label="Repetir"
              value={draft.recorrencia}
              disabled={saving}
              onChange={(event) => change("recorrencia", event.target.value)}
            >
              {Object.entries(recurrenceLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {draft.recorrencia !== "nenhuma" && (
          <p className="field-help">
            Ao concluir, uma próxima tarefa será criada com a data seguinte. O
            checklist será reiniciado.
          </p>
        )}
        <section className="editor-checklist" aria-label="Subtarefas">
          <div className="checklist-heading">
            <h3>Checklist</h3>
            <span>
              {draft.subtarefas.filter((task) => task.concluida).length}/
              {draft.subtarefas.length}
            </span>
          </div>
          {draft.subtarefas.map((task) => (
            <div className="checklist-row" key={task.id}>
              <input
                type="checkbox"
                aria-label={`Concluir subtarefa ${task.texto}`}
                checked={task.concluida}
                disabled={saving}
                onChange={(event) =>
                  change(
                    "subtarefas",
                    draft.subtarefas.map((row) =>
                      row.id === task.id
                        ? { ...row, concluida: event.target.checked }
                        : row,
                    ),
                  )
                }
              />
              <span className={task.concluida ? "subtask-done" : ""}>
                {task.texto}
              </span>
              <button
                className="icon-button"
                aria-label={`Remover subtarefa ${task.texto}`}
                disabled={saving}
                type="button"
                onClick={() =>
                  change(
                    "subtarefas",
                    draft.subtarefas.filter((row) => row.id !== task.id),
                  )
                }
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          <div className="add-subtask">
            <input
              aria-label="Nova subtarefa"
              placeholder="Adicionar uma etapa…"
              maxLength={300}
              value={newSubtask}
              disabled={saving || draft.subtarefas.length >= 50}
              onChange={(event) => setNewSubtask(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSubtask();
                }
              }}
            />
            <button
              type="button"
              aria-label="Adicionar subtarefa"
              className="icon-button"
              disabled={
                saving || !newSubtask.trim() || draft.subtarefas.length >= 50
              }
              onClick={addSubtask}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
        </section>
        <div className="editor-footer">
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={saving || !draft.titulo.trim()}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
