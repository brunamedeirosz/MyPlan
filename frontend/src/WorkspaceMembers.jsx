import { useState } from 'react';
import { api } from './api';

export default function WorkspaceMembers({ workspace, onChange }) {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changeMember = async (name, remove = false) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.request({
        method: remove ? 'delete' : 'post', url: `workspaces/${workspace.id}/membros/`, data: { username: name },
      });
      onChange(data);
      setUsername('');
    } catch (err) {
      const detail = err.response?.data?.username;
      setError((Array.isArray(detail) ? detail[0] : detail) || err.response?.data?.detail || 'Nao foi possivel atualizar os membros.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel workspace-members">
      <h2>Equipe</h2>
      <p>Gestor: {workspace.dono_nome || 'Sem gestor definido'}</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      {(workspace.membros || []).map(member => (
        <div className="panel-header" key={member.id}>
          <span>{member.username} · Colaborador</span>
          {workspace.pode_gerenciar && (
            <button className="text-button" disabled={saving} onClick={() => changeMember(member.username, true)}>Remover</button>
          )}
        </div>
      ))}
      {workspace.pode_gerenciar && (
        <form className="comment-form" onSubmit={event => { event.preventDefault(); void changeMember(username.trim()); }}>
          <label>Usuario cadastrado
            <input className="form-input" required value={username} onChange={event => setUsername(event.target.value)} />
          </label>
          <button className="btn secondary" disabled={saving || !username.trim()} type="submit">Adicionar colaborador</button>
        </form>
      )}
    </div>
  );
}
