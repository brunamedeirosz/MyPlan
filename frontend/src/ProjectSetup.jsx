import { useState } from 'react';
import { api } from './api';

export default function ProjectSetup({ workspaces, onReady, onCancel }) {
  const managed = workspaces.filter(workspace => workspace.pode_gerenciar);
  const [workspaceId, setWorkspaceId] = useState(String(managed[0]?.id || ''));
  const [workspaceName, setWorkspaceName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      let workspace = createdWorkspace || managed.find(item => String(item.id) === workspaceId);
      if (!workspace) {
        workspace = (await api.post('workspaces/', { nome: workspaceName.trim(), tipo: 'Desenvolvimento' })).data;
        setCreatedWorkspace(workspace);
      }
      const project = (await api.post('projetos/', {
        nome: projectName.trim(), workspace: workspace.id, status: 'Em Planejamento',
      })).data;
      onReady(project, workspace);
    } catch (err) {
      const data = err.response?.data;
      const detail = data && typeof data === 'object' ? Object.values(data)[0] : null;
      setError((Array.isArray(detail) ? detail[0] : detail) || 'Não foi possível salvar. Confira a conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel form-panel quick-setup" onSubmit={submit} aria-label="Preparar projeto">
      <div className="composer-header">
        <div><span className="eyebrow">Vamos começar</span><h2>Um espaço para suas tarefas</h2></div>
        <button className="text-button" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>
      </div>
      <p>O workspace reúne sua equipe; o projeto organiza as tarefas. Crie os dois aqui e continue para sua primeira tarefa.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      {createdWorkspace ? <p>Workspace criado: <strong>{createdWorkspace.nome}</strong>. Falta salvar o projeto; tente novamente.</p> : <>
        {managed.length > 0 && <label>Workspace
          <select className="form-input" aria-label="Workspace do novo projeto" value={workspaceId} disabled={saving} onChange={event => setWorkspaceId(event.target.value)}>
            {managed.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
            <option value="">Criar outro workspace</option>
          </select>
        </label>}
        {!workspaceId && <label>Nome do workspace
          <input autoFocus required maxLength={255} className="form-input" placeholder="Ex.: Meu trabalho" value={workspaceName} disabled={saving} onChange={event => setWorkspaceName(event.target.value)} />
        </label>}
      </>}
      <label>Nome do projeto
        <input required maxLength={255} className="form-input" placeholder="Ex.: Meu primeiro projeto" value={projectName} disabled={saving} onChange={event => setProjectName(event.target.value)} />
      </label>
      <p className="helper-text">Descrição, prazo e responsável podem ser definidos depois.</p>
      <button className="btn primary" disabled={saving || !projectName.trim() || (!workspaceId && !createdWorkspace && !workspaceName.trim())} type="submit">
        {saving ? 'Preparando seu projeto…' : 'Salvar e criar tarefa'}
      </button>
    </form>
  );
}
