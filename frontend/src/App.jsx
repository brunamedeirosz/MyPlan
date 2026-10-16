import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { toApiDate, toLocalDateTime } from './dates';
import WorkspaceMembers from './WorkspaceMembers';
import ProjectSetup from './ProjectSetup';
import './index.css';

const emptyProjectForm = {
  nome: '',
  descricao: '',
  status: 'Em Planejamento',
  prazo_entrega: '',
  workspace: '',
};

const emptyTaskForm = {
  titulo: '',
  descricao: '',
  prioridade: 'Media',
  status: 'A Fazer',
  prazo_entrega: '',
  projeto: '',
  responsavel: '',
};

function formatDate(value) {
  if (!value) {
    return 'Sem prazo';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
}

function getErrorMessage(error, fallback = 'Nao foi possivel concluir a acao.') {
  if (error?.response?.data) {
    const data = error.response.data;

    if (typeof data === 'string') {
      return data;
    }

    const firstKey = Object.keys(data)[0];

    if (firstKey) {
      const value = data[firstKey];
      return Array.isArray(value) ? value[0] : String(value);
    }
  }

  return fallback;
}

function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ value }) {
  const normalizedValue = getStatusGroup(value);
  const className = normalizedValue === 'Concluido' ? 'badge success' : normalizedValue === 'Em Andamento' ? 'badge warning' : 'badge';
  return <span className={className}>{getStatusLabel(value)}</span>;
}

function Notice({ type = 'info', children }) {
  return <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function getStatusGroup(value) {
  if (value === 'Em Andamento') {
    return 'Em Andamento';
  }

  if (value === 'Concluido') {
    return 'Concluido';
  }

  return 'A Fazer';
}

function getStatusLabel(value) {
  if (value === 'Em Planejamento') {
    return 'Em planejamento';
  }

  const status = getStatusGroup(value);

  if (status === 'Em Andamento') {
    return 'Em andamento';
  }

  if (status === 'Concluido') {
    return 'Concluido';
  }

  return 'Para fazer';
}

function NavLinkItem({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} className={`nav-tab ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  );
}

function AuthRequired() {
  return (
    <section className="auth-required">
      <div className="auth-required-card">
        <span className="eyebrow">Acesso restrito</span>
        <h1>Entre para usar o DevDesk</h1>
        <p>Volte para a pagina inicial, crie uma conta ou faca login para acessar quadros, projetos, tarefas e comentarios.</p>
        <Link className="btn primary" to="/">Ir para login</Link>
      </div>
    </section>
  );
}

function ProtectedRoute({ auth, children }) {
  if (!auth.token) {
    return <AuthRequired />;
  }

  return children;
}

function AuthBox({ auth, onLogin, onLogout, className = '' }) {
  const [mode, setMode] = useState('login');
  const [credentials, setCredentials] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const loginPayload = {
      username: credentials.username,
      password: credentials.password,
    };
    const login = () => api.post('token/', loginPayload);
    const request = mode === 'register'
      ? api.post('registro/', credentials).then(login)
      : login();

    request.then((res) => {
      onLogin({
        token: res.data.access,
        refreshToken: res.data.refresh,
        username: credentials.username,
      });
      setCredentials({ username: '', email: '', password: '' });
    }).catch((err) => {
      setError(getErrorMessage(err, mode === 'register' ? 'Nao foi possivel criar a conta.' : 'Usuario ou senha invalidos.'));
    }).finally(() => setLoading(false));
  };

  if (auth.token) {
    return (
      <div className="account-box">
        <span>Conta</span>
        <strong>{auth.username}</strong>
        <button className="btn secondary" onClick={onLogout}>Sair</button>
      </div>
    );
  }

  return (
    <form className={`auth-box ${className}`} onSubmit={handleSubmit}>
      <div className="auth-title">
        <strong>{mode === 'register' ? 'Criar conta' : 'Entrar'}</strong>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setMode(mode === 'register' ? 'login' : 'register');
            setError('');
          }}
        >
          {mode === 'register' ? 'Ja tenho conta' : 'Criar conta'}
        </button>
      </div>
      <input
        required
        className="form-input"
        placeholder="Usuario"
        value={credentials.username}
        onChange={event => setCredentials({ ...credentials, username: event.target.value })}
      />
      {mode === 'register' && (
        <input
          className="form-input"
          placeholder="Email"
          type="email"
          value={credentials.email}
          onChange={event => setCredentials({ ...credentials, email: event.target.value })}
        />
      )}
      <input
        required
        className="form-input"
        placeholder="Senha"
        type="password"
        value={credentials.password}
        onChange={event => setCredentials({ ...credentials, password: event.target.value })}
      />
      <button className="btn primary" disabled={loading} type="submit">
        {loading ? 'Aguarde' : mode === 'register' ? 'Criar e entrar' : 'Entrar'}
      </button>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

function LandingPage({ auth, onLogin, onLogout }) {
  return (
    <section className="landing-page">
      <div className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">DevDesk para equipes pequenas</span>
          <h1>Organize projetos, tarefas e comentarios em um quadro simples de acompanhar.</h1>
          <p>
            Crie workspaces, acompanhe entregas por projeto e use um quadro inspirado no Trello para mover tarefas do planejamento ate a conclusao.
          </p>
          <div className="landing-points">
            <span>Quadros por status</span>
            <span>Responsaveis e prazos</span>
            <span>Comentarios nas tarefas</span>
          </div>
        </div>

        <div className="landing-auth-card">
          <div>
            <span className="landing-kicker">Comece agora</span>
            <h2>Acesse sua area de trabalho</h2>
            <p>Entre com uma conta existente ou crie uma nova em poucos segundos.</p>
          </div>
          <AuthBox auth={auth} onLogin={onLogin} onLogout={onLogout} className="landing-auth-box" />
        </div>
      </div>

      <div className="landing-preview">
        <div className="preview-list">
          <div className="preview-list-header">
            <strong>Para fazer</strong>
            <span>2</span>
          </div>
          <div className="preview-card">
            <span className="priority-label alta">Alta</span>
            <strong>Finalizar proposta do cliente</strong>
            <p>Revisar escopo, prazo e responsavel.</p>
          </div>
          <div className="preview-card">
            <span className="priority-label media">Media</span>
            <strong>Criar workspace do time</strong>
            <p>Separar demandas por area.</p>
          </div>
        </div>
        <div className="preview-list">
          <div className="preview-list-header">
            <strong>Em andamento</strong>
            <span>1</span>
          </div>
          <div className="preview-card">
            <span className="priority-label media">Media</span>
            <strong>Montar quadro de tarefas</strong>
            <p>Organizar tarefas por etapa.</p>
          </div>
        </div>
        <div className="preview-list">
          <div className="preview-list-header">
            <strong>Concluido</strong>
            <span>1</span>
          </div>
          <div className="preview-card">
            <span className="priority-label baixa">Baixa</span>
            <strong>Definir prioridade inicial</strong>
            <p>Equipe alinhada para a semana.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingNoteManager({ auth }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [dragState, setDragState] = useState(null);
  const [error, setError] = useState('');
  const saveQueue = useRef(Promise.resolve());

  const loadNote = () => {
    setLoading(true);
    setError('');
    api.get('notas/')
      .then((res) => setNote(res.data[0] || null))
      .catch(err => setError(getErrorMessage(err, 'Nao foi possivel salvar a nota.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (auth.token) {
      void Promise.resolve().then(loadNote);
    }
  }, [auth.token]);

  const persistNote = (changes) => {
    if (!note) {
      return;
    }

    const nextNote = { ...note, ...changes };
    setNote(nextNote);
    const { titulo, itens, itens_concluidos, pos_x, pos_y, fixada, visivel } = nextNote;
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => api.patch(`notas/${note.id}/`, {
      titulo, itens, itens_concluidos, pos_x, pos_y, fixada, visivel,
    })).then(() => setError('')).catch(err => setError(getErrorMessage(err, 'Nao foi possivel salvar a nota.')));
  };

  const createNote = () => {
    setLoading(true);
    setError('');
    api.post('notas/', {
      titulo: 'Minha nota',
      itens: [],
      itens_concluidos: [],
      pos_x: 24,
      pos_y: 120,
      fixada: false,
      visivel: true,
    }).then(res => setNote(res.data)).catch(err => setError(getErrorMessage(err, 'Nao foi possivel salvar a nota.'))).finally(() => setLoading(false));
  };

  const addItem = (event) => {
    event.preventDefault();
    const texto = newItem.trim();

    if (!texto || !note) {
      return;
    }

    const item = {
      id: crypto.randomUUID(),
      texto,
    };

    persistNote({ itens: [...(note.itens || []), item] });
    setNewItem('');
  };

  const completeItem = (itemId) => {
    const item = (note.itens || []).find(currentItem => currentItem.id === itemId);

    if (!item) {
      return;
    }

    persistNote({
      itens: (note.itens || []).filter(currentItem => currentItem.id !== itemId),
      itens_concluidos: [
        { ...item, concluido_em: new Date().toISOString() },
        ...(note.itens_concluidos || []),
      ],
    });
  };

  const restoreItem = (itemId) => {
    const item = (note.itens_concluidos || []).find(currentItem => currentItem.id === itemId);

    if (!item) {
      return;
    }

    persistNote({
      itens: [...(note.itens || []), { id: item.id, texto: item.texto }],
      itens_concluidos: (note.itens_concluidos || []).filter(currentItem => currentItem.id !== itemId),
    });
  };

  const startDrag = (event) => {
    if (!note || note.fixada) {
      return;
    }

    if (event.target.closest('button, input, textarea, select, a')) {
      return;
    }

    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      posX: note.pos_x,
      posY: note.pos_y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !note) {
      return;
    }

    const nextX = Math.max(8, Math.min(window.innerWidth - 320, dragState.posX + event.clientX - dragState.startX));
    const nextY = Math.max(8, Math.min(window.innerHeight - 80, dragState.posY + event.clientY - dragState.startY));
    setNote({ ...note, pos_x: nextX, pos_y: nextY });
  };

  const endDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !note) {
      return;
    }

    persistNote({ pos_x: note.pos_x, pos_y: note.pos_y });
    setDragState(null);
  };

  if (!auth.token || loading) {
    return null;
  }

  if (!note || !note.visivel) {
    return (
      <>
      {error && <div className="notice error" role="alert">{error} <button onClick={loadNote}>Tentar novamente</button></div>}
      <button disabled={Boolean(error)} className="floating-note-launcher" onClick={note ? () => persistNote({ visivel: true }) : createNote}>
        Nota
      </button>
      </>
    );
  }

  return (
    <aside
      className={`floating-note ${note.fixada ? 'fixed' : ''}`}
      style={{ left: `${Math.max(8, Math.min(window.innerWidth - 320, note.pos_x))}px`, top: `${Math.max(8, Math.min(window.innerHeight - 80, note.pos_y))}px` }}
    >
      <div
        className="floating-note-header"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <input
          className="note-title-input"
          aria-label="Titulo da nota"
          maxLength={120}
          value={note.titulo}
          onChange={event => persistNote({ titulo: event.target.value })}
        />
        <div className="note-actions">
          <button type="button" onClick={() => persistNote({ fixada: !note.fixada })}>
            {note.fixada ? 'Fixada' : 'Fixar'}
          </button>
          <button type="button" onClick={() => persistNote({ visivel: false })}>Fechar</button>
        </div>
      </div>

      <div className="note-paper">
        {error && <div role="alert">{error} <button onClick={() => persistNote({})}>Tentar salvar novamente</button></div>}
        <form className="note-add-form" onSubmit={addItem}>
          <input
            placeholder="Nova linha do checklist"
            value={newItem}
            onChange={event => setNewItem(event.target.value)}
          />
          <button type="submit">Adicionar</button>
        </form>

        <div className="note-checklist">
          {(note.itens || []).length === 0 ? (
            <p className="note-empty">Nenhuma linha ativa.</p>
          ) : note.itens.map(item => (
            <label className="note-line" key={item.id}>
              <input type="checkbox" onChange={() => completeItem(item.id)} />
              <span>{item.texto}</span>
            </label>
          ))}
        </div>

        <details className="note-completed">
          <summary>Concluidos ({(note.itens_concluidos || []).length})</summary>
          <div>
            {(note.itens_concluidos || []).length === 0 ? (
              <p className="note-empty">Nada concluido ainda.</p>
            ) : note.itens_concluidos.map(item => (
              <button className="completed-note-line" key={item.id} type="button" onClick={() => restoreItem(item.id)}>
                {item.texto}
              </button>
            ))}
          </div>
        </details>
      </div>
    </aside>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ workspaces: [], projetos: [], tarefas: [] });

  const loadData = () => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get('workspaces/'),
      api.get('projetos/'),
      api.get('tarefas/'),
    ]).then(([workspaces, projetos, tarefas]) => {
      setData({
        workspaces: workspaces.data,
        projetos: projetos.data,
        tarefas: tarefas.data,
      });
    }).catch((err) => {
      setError(getErrorMessage(err, 'Nao foi possivel carregar o dashboard.'));
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const stats = useMemo(() => ({
    workspaces: data.workspaces.length,
    projetos: data.projetos.length,
    tarefas: data.tarefas.length,
    concluidas: data.tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Concluido').length,
  }), [data]);

  const proximasTarefas = data.tarefas
    .filter(tarefa => tarefa.status !== 'Concluido')
    .slice()
    .sort((a, b) => {
      if (!a.prazo_entrega && !b.prazo_entrega) {
        return 0;
      }

      if (!a.prazo_entrega) {
        return 1;
      }

      if (!b.prazo_entrega) {
        return -1;
      }

      return new Date(a.prazo_entrega) - new Date(b.prazo_entrega);
    })
    .slice(0, 5);

  return (
    <section className="page">
      <PageHeader
        title="Dashboard"
        description="Resumo rapido do trabalho em andamento."
        action={<button className="btn primary" onClick={() => navigate('/tarefas?nova=1')}>Nova tarefa</button>}
      />

      {error && <Notice type="error">{error}</Notice>}
      {loading ? (
        <Notice>Carregando informacoes...</Notice>
      ) : (
        <>
          {!error && data.tarefas.length === 0 && (
            <div className="panel getting-started">
              <span className="eyebrow">Seu primeiro passo</span>
              <h2>Vamos criar sua primeira tarefa?</h2>
              <p>Você pode preparar seu workspace e projeto pelo próprio quadro, sem sair da tela.</p>
              <Link className="btn primary" to="/tarefas?nova=1">Criar minha primeira tarefa</Link>
            </div>
          )}
          <div className="stats-grid">
            <div className="stat-card">
              <span>Workspaces</span>
              <strong>{stats.workspaces}</strong>
            </div>
            <div className="stat-card">
              <span>Projetos</span>
              <strong>{stats.projetos}</strong>
            </div>
            <div className="stat-card">
              <span>Tarefas</span>
              <strong>{stats.tarefas}</strong>
            </div>
            <div className="stat-card">
              <span>Concluidas</span>
              <strong>{stats.concluidas}</strong>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Proximas tarefas</h2>
              <button className="btn secondary" onClick={loadData}>Atualizar</button>
            </div>
            {proximasTarefas.length === 0 ? (
              <Notice>Nenhuma tarefa cadastrada ainda.</Notice>
            ) : (
              <div className="table-list">
                {proximasTarefas.map(tarefa => (
                  <div className="table-row" key={tarefa.id}>
                    <div>
                      <strong>{tarefa.titulo}</strong>
                      <span>{tarefa.projeto_nome || 'Sem projeto'}</span>
                    </div>
                    <StatusBadge value={tarefa.status} />
                    <span>{formatDate(tarefa.prazo_entrega)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ nome: '', tipo: 'Desenvolvimento' });

  const loadWorkspaces = () => {
    setLoading(true);
    setError('');
    api.get('workspaces/')
      .then(res => setWorkspaces(res.data))
      .catch(err => setError(getErrorMessage(err, 'Nao foi possivel carregar os workspaces.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadWorkspaces);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    api.post('workspaces/', formData).then((res) => {
      setWorkspaces([...workspaces, res.data]);
      setFormData({ nome: '', tipo: 'Desenvolvimento' });
    }).catch(err => setError(getErrorMessage(err))).finally(() => setSaving(false));
  };

  return (
    <section className="page">
      <PageHeader title="Workspaces" description="Ambientes para separar clientes, equipes ou areas." />

      {error && <Notice type="error">{error}</Notice>}

      <div className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h2>Novo workspace</h2>
          <label>
            Nome
            <input
              required
              className="form-input"
              value={formData.nome}
              onChange={event => setFormData({ ...formData, nome: event.target.value })}
            />
          </label>
          <label>
            Tipo
            <select
              required
              className="form-input"
              value={formData.tipo}
              onChange={event => setFormData({ ...formData, tipo: event.target.value })}
            >
              <option value="Desenvolvimento">Desenvolvimento</option>
              <option value="Marketing">Marketing</option>
              <option value="Design">Design</option>
              <option value="Gestao">Gestao</option>
            </select>
          </label>
          <button className="btn primary" disabled={saving} type="submit">{saving ? 'Salvando' : 'Salvar workspace'}</button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <h2>Workspaces cadastrados</h2>
            <button className="btn secondary" onClick={loadWorkspaces}>Atualizar</button>
          </div>
          {loading ? (
            <Notice>Carregando...</Notice>
          ) : workspaces.length === 0 ? (
            <Notice>Nenhum workspace cadastrado.</Notice>
          ) : (
            <div className="card-grid">
              {workspaces.map(workspace => (
                <Link className="item-card workspace-card" key={workspace.id} to={`/workspaces/${workspace.id}`}>
                  <strong>{workspace.nome}</strong>
                  <span className="badge">{workspace.tipo}</span>
                  <span>Abrir espaco de trabalho</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WorkspaceDetail() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [projetos, setProjetos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true);
      setError('');

      Promise.all([
        api.get(`workspaces/${workspaceId}/`),
        api.get('projetos/'),
        api.get('tarefas/'),
      ]).then(([workspaceRes, projetosRes, tarefasRes]) => {
        const workspaceProjetos = projetosRes.data.filter(projeto => String(projeto.workspace) === String(workspaceId));
        const workspaceProjetoIds = new Set(workspaceProjetos.map(projeto => projeto.id));

        setWorkspace(workspaceRes.data);
        setProjetos(workspaceProjetos);
        setTarefas(tarefasRes.data.filter(tarefa => workspaceProjetoIds.has(tarefa.projeto)));
      }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel carregar o workspace.')))
        .finally(() => setLoading(false));
    });
  }, [workspaceId]);

  const stats = useMemo(() => ({
    projetos: projetos.length,
    tarefas: tarefas.length,
    emAndamento: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Em Andamento').length,
    concluidas: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Concluido').length,
  }), [projetos, tarefas]);

  const tarefasPorProjeto = projetos.map(projeto => ({
    projeto,
    tarefas: tarefas.filter(tarefa => tarefa.projeto === projeto.id),
  }));

  return (
    <section className="page">
      <PageHeader
        title={workspace ? workspace.nome : 'Workspace'}
        description={workspace ? `Espaco de trabalho de ${workspace.tipo}` : 'Carregando espaco de trabalho.'}
        action={<button className="btn secondary" onClick={() => navigate('/workspaces')}>Voltar</button>}
      />

      {error && <Notice type="error">{error}</Notice>}
      {loading ? (
        <Notice>Carregando workspace...</Notice>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Projetos</span>
              <strong>{stats.projetos}</strong>
            </div>
            <div className="stat-card">
              <span>Tarefas</span>
              <strong>{stats.tarefas}</strong>
            </div>
            <div className="stat-card">
              <span>Em andamento</span>
              <strong>{stats.emAndamento}</strong>
            </div>
            <div className="stat-card">
              <span>Concluidas</span>
              <strong>{stats.concluidas}</strong>
            </div>
          </div>

          {projetos.length === 0 ? (
            <div className="panel empty-workspace-panel">
              <h2>Nenhum projeto neste workspace</h2>
              <p>Crie um projeto e selecione este workspace para comecar a organizar tarefas aqui dentro.</p>
              <Link className="btn primary" to="/projetos">Criar projeto</Link>
            </div>
          ) : (
            <div className="workspace-detail-grid">
              {tarefasPorProjeto.map(({ projeto, tarefas: projetoTarefas }) => (
                <div className="panel workspace-project-panel" key={projeto.id}>
                  <div className="panel-header">
                    <div>
                      <h2>{projeto.nome}</h2>
                      <p>{projeto.descricao}</p>
                    </div>
                    <StatusBadge value={projeto.status} />
                  </div>

                  {projetoTarefas.length === 0 ? (
                    <Notice>Nenhuma tarefa neste projeto ainda.</Notice>
                  ) : (
                    <div className="workspace-task-list">
                      {projetoTarefas.map(tarefa => (
                        <div className="workspace-task-row" key={tarefa.id}>
                          <div>
                            <strong>{tarefa.titulo}</strong>
                            <span>{tarefa.responsavel_nome || 'Sem responsavel'} · {formatDate(tarefa.prazo_entrega)}</span>
                          </div>
                          <StatusBadge value={tarefa.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        {workspace && <WorkspaceMembers workspace={workspace} onChange={setWorkspace} />}
        </>
      )}
    </section>
  );
}

function Projetos() {
  const [projetos, setProjetos] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyProjectForm);
  const [editingProject, setEditingProject] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get('projetos/'),
      api.get('workspaces/'),
    ]).then(([projetosRes, workspacesRes]) => {
      setProjetos(projetosRes.data);
      setWorkspaces(workspacesRes.data);
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel carregar projetos.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const startEditingProject = (event, projeto) => {
    event.preventDefault();
    event.stopPropagation();
    setEditingProject(projeto);
    setFormData({
      nome: projeto.nome,
      descricao: projeto.descricao,
      status: projeto.status,
      prazo_entrega: toLocalDateTime(projeto.prazo_entrega),
      workspace: String(projeto.workspace),
    });
  };

  const cancelEditingProject = () => {
    setEditingProject(null);
    setFormData(emptyProjectForm);
    setError('');
  };

  const deleteProject = (event, projeto) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(`Excluir o projeto "${projeto.nome}"? As tarefas ligadas a ele tambem serao removidas.`);

    if (!confirmed) {
      return;
    }

    api.delete(`projetos/${projeto.id}/`).then(() => {
      setProjetos(projetos.filter(currentProject => currentProject.id !== projeto.id));

      if (editingProject?.id === projeto.id) {
        cancelEditingProject();
      }
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel excluir o projeto.')));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const request = editingProject
      ? api.patch(`projetos/${editingProject.id}/`, { ...formData, prazo_entrega: toApiDate(formData.prazo_entrega) })
      : api.post('projetos/', { ...formData, prazo_entrega: toApiDate(formData.prazo_entrega) });

    request.then((res) => {
      if (editingProject) {
        setProjetos(projetos.map(projeto => projeto.id === editingProject.id ? res.data : projeto));
        setEditingProject(null);
      } else {
        setProjetos([...projetos, res.data]);
      }

      setFormData(emptyProjectForm);
    }).catch(err => setError(getErrorMessage(err))).finally(() => setSaving(false));
  };

  return (
    <section className="page">
      <PageHeader title="Projetos" description="Cadastre entregas e acompanhe prazo e status." />

      {error && <Notice type="error">{error}</Notice>}
      {workspaces.length === 0 && !loading && (
        <Notice>Crie um workspace antes de cadastrar projetos.</Notice>
      )}

      <div className="content-grid">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          {workspaces.length > 0 && !workspaces.some(item => item.pode_gerenciar) && <Notice>Somente o gestor pode criar ou editar projetos.</Notice>}
          <div className="form-panel-header">
            <h2>{editingProject ? 'Editar projeto' : 'Novo projeto'}</h2>
            {editingProject && (
              <button className="text-button" type="button" onClick={cancelEditingProject}>Cancelar</button>
            )}
          </div>
          <label>
            Nome
            <input
              required
              className="form-input"
              value={formData.nome}
              onChange={event => setFormData({ ...formData, nome: event.target.value })}
            />
          </label>
          <label>
            Descricao
            <textarea
              className="form-input"
              rows="4"
              value={formData.descricao}
              onChange={event => setFormData({ ...formData, descricao: event.target.value })}
            />
          </label>
          <label>
            Workspace
            <select
              required
              className="form-input"
              aria-label="Workspace"
              value={formData.workspace}
              onChange={event => setFormData({ ...formData, workspace: event.target.value })}
            >
              <option value="">Selecione</option>
              {workspaces.filter(workspace => workspace.pode_gerenciar).map(workspace => (
                <option key={workspace.id} value={workspace.id}>{workspace.nome}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              required
              className="form-input"
              value={formData.status}
              onChange={event => setFormData({ ...formData, status: event.target.value })}
            >
              <option value="Em Planejamento">Em Planejamento</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluido">Concluido</option>
            </select>
          </label>
          <label>
            Prazo
            <input
              className="form-input"
              type="datetime-local"
              value={formData.prazo_entrega}
              onChange={event => setFormData({ ...formData, prazo_entrega: event.target.value })}
            />
          </label>
          <button className="btn primary" disabled={saving || !workspaces.some(workspace => workspace.pode_gerenciar)} type="submit">
            {saving ? 'Salvando' : editingProject ? 'Salvar alteracoes' : 'Salvar projeto'}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <h2>Projetos cadastrados</h2>
            <button className="btn secondary" onClick={loadData}>Atualizar</button>
          </div>
          {loading ? (
            <Notice>Carregando...</Notice>
          ) : projetos.length === 0 ? (
            <Notice>Nenhum projeto cadastrado.</Notice>
          ) : (
            <div className="card-grid">
              {projetos.map(projeto => (
                <div className="item-card project-card" key={projeto.id}>
                  <div className="item-card-header">
                    <strong>{projeto.nome}</strong>
                    <StatusBadge value={projeto.status} />
                  </div>
                  <p>{projeto.descricao}</p>
                  <span>Workspace: {projeto.workspace_nome || projeto.workspace}</span>
                  <span>Prazo: {formatDate(projeto.prazo_entrega)}</span>
                  <div className="card-actions">
                    <Link to={`/projetos/${projeto.id}`}>Abrir projeto</Link>
                    {projeto.pode_gerenciar && <button type="button" onClick={event => startEditingProject(event, projeto)}>Editar</button>}
                    {projeto.pode_gerenciar && <button type="button" className="danger-action" onClick={event => deleteProject(event, projeto)}>Excluir</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProjetoDetail() {
  const { projetoId } = useParams();
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(emptyProjectForm);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true);
      setError('');

      Promise.all([
        api.get(`projetos/${projetoId}/`),
        api.get('tarefas/'),
        api.get('workspaces/'),
      ]).then(([projetoRes, tarefasRes, workspacesRes]) => {
        setProjeto(projetoRes.data);
        setWorkspaces(workspacesRes.data);
        setTarefas(tarefasRes.data.filter(tarefa => String(tarefa.projeto) === String(projetoId)));
      }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel carregar o projeto.')))
        .finally(() => setLoading(false));
    });
  }, [projetoId]);

  const stats = useMemo(() => ({
    tarefas: tarefas.length,
    aFazer: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'A Fazer').length,
    emAndamento: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Em Andamento').length,
    concluidas: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Concluido').length,
  }), [tarefas]);

  const tarefasPorStatus = [
    { title: 'Para fazer', items: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'A Fazer') },
    { title: 'Em andamento', items: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Em Andamento') },
    { title: 'Concluido', items: tarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Concluido') },
  ];

  const startEditing = () => {
    setEditing(true);
    setFormData({
      nome: projeto.nome,
      descricao: projeto.descricao,
      status: projeto.status,
      prazo_entrega: toLocalDateTime(projeto.prazo_entrega),
      workspace: String(projeto.workspace),
    });
  };

  const saveProject = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    api.patch(`projetos/${projeto.id}/`, { ...formData, prazo_entrega: toApiDate(formData.prazo_entrega) }).then((res) => {
      setProjeto(res.data);
      setEditing(false);
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel editar o projeto.')))
      .finally(() => setSaving(false));
  };

  const deleteProject = () => {
    const confirmed = window.confirm(`Excluir o projeto "${projeto.nome}"? As tarefas ligadas a ele tambem serao removidas.`);

    if (!confirmed) {
      return;
    }

    api.delete(`projetos/${projeto.id}/`).then(() => {
      navigate('/projetos');
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel excluir o projeto.')));
  };

  return (
    <section className="page">
      <PageHeader
        title={projeto ? projeto.nome : 'Projeto'}
        description={projeto ? projeto.descricao : 'Carregando projeto.'}
        action={(
          <div className="header-actions">
            <button className="btn secondary" onClick={() => navigate('/projetos')}>Voltar</button>
            {projeto?.pode_gerenciar && <button className="btn secondary" onClick={startEditing}>Editar</button>}
            {projeto?.pode_gerenciar && <button className="btn danger" onClick={deleteProject}>Excluir</button>}
          </div>
        )}
      />

      {error && <Notice type="error">{error}</Notice>}
      {loading ? (
        <Notice>Carregando projeto...</Notice>
      ) : projeto && (
        <>
          {editing && (
            <form className="panel form-panel edit-project-panel" onSubmit={saveProject}>
              <div className="form-panel-header">
                <h2>Editar projeto</h2>
                <button className="text-button" type="button" onClick={() => setEditing(false)}>Cancelar</button>
              </div>
              <label>
                Nome
                <input
                  required
                  className="form-input"
                  value={formData.nome}
                  onChange={event => setFormData({ ...formData, nome: event.target.value })}
                />
              </label>
              <label>
                Descricao
                <textarea
                  className="form-input"
                  rows="4"
                  value={formData.descricao}
                  onChange={event => setFormData({ ...formData, descricao: event.target.value })}
                />
              </label>
              <label>
                Workspace
                <select
                  required
                  className="form-input"
                  aria-label="Workspace"
              value={formData.workspace}
                  onChange={event => setFormData({ ...formData, workspace: event.target.value })}
                >
                  {workspaces.filter(workspace => workspace.pode_gerenciar).map(workspace => (
                    <option key={workspace.id} value={workspace.id}>{workspace.nome}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  required
                  className="form-input"
                  value={formData.status}
                  onChange={event => setFormData({ ...formData, status: event.target.value })}
                >
                  <option value="Em Planejamento">Em Planejamento</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluido">Concluido</option>
                </select>
              </label>
              <label>
                Prazo
                <input
                  className="form-input"
                  type="datetime-local"
                  value={formData.prazo_entrega}
                  onChange={event => setFormData({ ...formData, prazo_entrega: event.target.value })}
                />
              </label>
              <button className="btn primary" disabled={saving} type="submit">
                {saving ? 'Salvando' : 'Salvar alteracoes'}
              </button>
            </form>
          )}

          <div className="project-detail-header panel">
            <div>
              <span>Workspace</span>
              <strong>{projeto.workspace_nome || projeto.workspace}</strong>
            </div>
            <div>
              <span>Status</span>
              <StatusBadge value={projeto.status} />
            </div>
            <div>
              <span>Prazo</span>
              <strong>{formatDate(projeto.prazo_entrega)}</strong>
            </div>
            <Link className="btn primary" to="/tarefas">Abrir quadro</Link>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Tarefas</span>
              <strong>{stats.tarefas}</strong>
            </div>
            <div className="stat-card">
              <span>Para fazer</span>
              <strong>{stats.aFazer}</strong>
            </div>
            <div className="stat-card">
              <span>Em andamento</span>
              <strong>{stats.emAndamento}</strong>
            </div>
            <div className="stat-card">
              <span>Concluidas</span>
              <strong>{stats.concluidas}</strong>
            </div>
          </div>

          {tarefas.length === 0 ? (
            <div className="panel empty-workspace-panel">
              <h2>Nenhuma tarefa neste projeto</h2>
              <p>Abra o quadro de desenvolvimento e crie uma tarefa selecionando este projeto.</p>
              <Link className="btn primary" to="/tarefas">Criar tarefa</Link>
            </div>
          ) : (
            <div className="project-task-columns">
              {tarefasPorStatus.map(group => (
                <div className="panel project-task-column" key={group.title}>
                  <div className="panel-header">
                    <h2>{group.title}</h2>
                    <span className="badge">{group.items.length}</span>
                  </div>
                  {group.items.length === 0 ? (
                    <Notice>Nenhuma tarefa.</Notice>
                  ) : (
                    <div className="workspace-task-list">
                      {group.items.map(tarefa => (
                        <div className="project-task-card" key={tarefa.id}>
                          <div className="item-card-header">
                            <strong>{tarefa.titulo}</strong>
                            <span className={`priority-label ${tarefa.prioridade.toLowerCase()}`}>{tarefa.prioridade}</span>
                          </div>
                          <p>{tarefa.descricao}</p>
                          <div className="project-task-meta">
                            <span>{tarefa.responsavel_nome || 'Sem responsavel'}</span>
                            <span>Prazo {formatDate(tarefa.prazo_entrega)}</span>
                            <span>{(tarefa.comentarios || []).length} comentarios</span>
                          </div>
                          {(tarefa.comentarios || []).length > 0 && (
                            <div className="comment-list">
                              {tarefa.comentarios.map(comentario => (
                                <div className="comment" key={comentario.id}>
                                  <strong>{comentario.autor_nome || 'Usuario'}</strong>
                                  <span>{comentario.texto}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Tarefas({ auth }) {
  const location = useLocation();
  const [startCreating] = useState(() => new URLSearchParams(location.search).get('nova') === '1');
  const [showSetup, setShowSetup] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [success, setSuccess] = useState('');
  const [tarefas, setTarefas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [taskWorkspaces, setTaskWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyTaskForm);
  const [commentText, setCommentText] = useState({});
  const [selectedProjeto, setSelectedProjeto] = useState('todos');
  const [showComposer, setShowComposer] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    setError('');

    Promise.all([
      api.get('tarefas/'),
      api.get('projetos/'),
      api.get('usuarios/'),
      api.get('workspaces/'),
    ]).then(([tarefasRes, projetosRes, usuariosRes, workspacesRes]) => {
      setTarefas(tarefasRes.data);
      setProjetos(projetosRes.data);
      setUsuarios(usuariosRes.data);
      setTaskWorkspaces(workspacesRes.data);
      if (startCreating) {
        const project = projetosRes.data.find(item => item.pode_gerenciar);
        setFormData({ ...emptyTaskForm, projeto: project ? String(project.id) : '' });
        setShowSetup(!project);
        setShowComposer(Boolean(project));
      }
    }).catch(err => { setLoadFailed(true); setError(getErrorMessage(err, 'Não foi possível carregar tarefas. Confira se o backend está rodando e clique em Atualizar.')); })
      .finally(() => setLoading(false));
  }, [startCreating]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const filteredTarefas = useMemo(() => {
    if (selectedProjeto === 'todos') {
      return tarefas;
    }

    return tarefas.filter(tarefa => String(tarefa.projeto) === selectedProjeto);
  }, [selectedProjeto, tarefas]);

  const tarefasPorStatus = useMemo(() => ({
    aFazer: filteredTarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'A Fazer'),
    fazendo: filteredTarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Em Andamento'),
    concluido: filteredTarefas.filter(tarefa => getStatusGroup(tarefa.status) === 'Concluido'),
  }), [filteredTarefas]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      ...formData,
      responsavel: formData.responsavel || null,
      prazo_entrega: toApiDate(formData.prazo_entrega),
    };

    const request = editingTask
      ? api.patch(`tarefas/${editingTask.id}/`, payload)
      : api.post('tarefas/', payload);

    request.then((res) => {
      if (editingTask) {
        setTarefas(tarefas.map(tarefa => tarefa.id === editingTask.id ? res.data : tarefa));
        setEditingTask(null);
      } else {
        setTarefas(current => [...current, res.data]);
        setSelectedProjeto(String(res.data.projeto));
      }

      setSuccess(editingTask ? 'Tarefa atualizada.' : 'Tarefa criada! Ela já está no quadro abaixo.');
      setFormData(emptyTaskForm);
      setShowComposer(false);
    }).catch(err => setError(getErrorMessage(err))).finally(() => setSaving(false));
  };

  const updateTask = (taskId, changes) => {
    api.patch(`tarefas/${taskId}/`, changes).then((res) => {
      setTarefas(current => current.map(tarefa => tarefa.id === taskId ? res.data : tarefa));
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel atualizar a tarefa.')));
  };

  const handleCommentSubmit = (event, tarefaId) => {
    event.preventDefault();
    const texto = (commentText[tarefaId] || '').trim();

    if (!texto || !auth.token) {
      return;
    }

    api.post('comentarios/', { tarefa: tarefaId, texto }).then((res) => {
      setTarefas(current => current.map((tarefa) => {
        if (tarefa.id !== tarefaId) {
          return tarefa;
        }

        return {
          ...tarefa,
          comentarios: [...(tarefa.comentarios || []), res.data],
        };
      }));
      setCommentText({ ...commentText, [tarefaId]: '' });
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel comentar.')));
  };

  const openComposer = (status = 'A Fazer') => {
    setEditingTask(null);
    setError('');
    setSuccess('');
    const managed = projetos.filter(project => project.pode_gerenciar);
    const project = managed.find(item => String(item.id) === selectedProjeto) || managed[0];
    setFormData({ ...emptyTaskForm, status, projeto: project ? String(project.id) : '' });
    setShowSetup(!project);
    setShowComposer(Boolean(project));
  };

  const startEditingTask = (tarefa) => {
    setEditingTask(tarefa);
    setFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      prioridade: tarefa.prioridade,
      status: getStatusGroup(tarefa.status),
      prazo_entrega: toLocalDateTime(tarefa.prazo_entrega),
      projeto: String(tarefa.projeto || ''),
      responsavel: tarefa.responsavel ? String(tarefa.responsavel) : '',
    });
    setShowComposer(true);
  };

  const closeComposer = () => {
    setEditingTask(null);
    setFormData(emptyTaskForm);
    setShowComposer(false);
  };

  const deleteTask = (tarefa) => {
    const confirmed = window.confirm(`Excluir a tarefa "${tarefa.titulo}"? Os comentarios ligados a ela tambem serao removidos.`);

    if (!confirmed) {
      return;
    }

    api.delete(`tarefas/${tarefa.id}/`).then(() => {
      setTarefas(tarefas.filter(currentTask => currentTask.id !== tarefa.id));

      if (editingTask?.id === tarefa.id) {
        closeComposer();
      }
    }).catch(err => setError(getErrorMessage(err, 'Nao foi possivel excluir a tarefa.')));
  };

  const renderColumn = (title, status, items) => (
    <div className="board-list">
      <div className="board-list-header">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </div>
      <div className="board-card-stack">
        {items.length === 0 ? (
          <div className="board-empty">Nenhuma tarefa nesta etapa</div>
        ) : items.map(tarefa => (
          <article className="board-card" key={tarefa.id}>
            <div className="label-row">
              <span className={`priority-label ${tarefa.prioridade.toLowerCase()}`}>{tarefa.prioridade}</span>
              <StatusBadge value={tarefa.status} />
            </div>
            <strong>{tarefa.titulo}</strong>
            <p>{tarefa.descricao}</p>
            <div className="card-meta-grid">
              <span>{tarefa.projeto_nome || 'Sem projeto'}</span>
              <span>{tarefa.responsavel_nome || 'Sem responsavel'}</span>
              <span>Prazo {formatDate(tarefa.prazo_entrega)}</span>
              <span>{(tarefa.comentarios || []).length} comentarios</span>
            </div>
            <div className="card-actions task-card-actions">
              {tarefa.pode_gerenciar && <button type="button" onClick={() => startEditingTask(tarefa)}>Editar</button>}
              {tarefa.pode_gerenciar && <button type="button" className="danger-action" onClick={() => deleteTask(tarefa)}>Excluir</button>}
            </div>
            <select
              className="compact-select"
              aria-label={`Status de ${tarefa.titulo}`}
              value={getStatusGroup(tarefa.status)}
              onChange={event => updateTask(tarefa.id, { status: event.target.value })}
            >
              <option value="A Fazer">Para fazer</option>
              <option value="Em Andamento">Em andamento</option>
              <option value="Concluido">Concluido</option>
            </select>

            {(tarefa.comentarios || []).length > 0 && (
              <div className="comment-list">
                {tarefa.comentarios.map(comentario => (
                  <div className="comment" key={comentario.id}>
                    <strong>{comentario.autor_nome || 'Usuario'}</strong>
                    <span>{comentario.texto}</span>
                  </div>
                ))}
              </div>
            )}

            {auth.token ? (
              <form className="comment-form" onSubmit={event => handleCommentSubmit(event, tarefa.id)}>
                <input
                  className="form-input"
                  placeholder="Comentar"
                  value={commentText[tarefa.id] || ''}
                  onChange={event => setCommentText({ ...commentText, [tarefa.id]: event.target.value })}
                />
                <button className="btn secondary" type="submit">Enviar</button>
              </form>
            ) : (
              <span className="helper-text">Entre para comentar.</span>
            )}
          </article>
        ))}
      </div>
      <button className="add-card-button" disabled={loading || loadFailed} onClick={() => openComposer(status)}>
        + Nova tarefa
      </button>
    </div>
  );

  return (
    <section className="page board-page">
      <div className="board-hero">
        <div>
          <span className="eyebrow">Desenvolvimento</span>
          <h1>Quadro de desenvolvimento</h1>
          <p>Acompanhe o fluxo das demandas, mova tarefas por etapa e registre comentarios.</p>
        </div>
        <div className="board-actions">
          <select className="form-input" value={selectedProjeto} onChange={event => setSelectedProjeto(event.target.value)}>
            <option value="todos">Todos os projetos</option>
            {projetos.map(projeto => (
              <option key={projeto.id} value={projeto.id}>{projeto.nome}</option>
            ))}
          </select>
          <button className="btn secondary" onClick={loadData}>Atualizar</button>
          <button className="btn primary" disabled={loading || loadFailed} onClick={() => openComposer()}>Nova tarefa</button>
        </div>
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {!loading && !loadFailed && !showSetup && !showComposer && !projetos.some(project => project.pode_gerenciar) && (
        <div className="panel getting-started">
          <h2>{projetos.length === 0 ? 'Seu quadro começa aqui' : 'Crie um projeto para suas próprias tarefas'}</h2>
          <p>{projetos.length === 0
            ? 'Antes da primeira tarefa, vamos dar um nome ao workspace e ao projeto. Você faz tudo aqui.'
            : 'Nos projetos em que você é colaborador, pode comentar e alterar o status. Para criar suas tarefas, prepare um projeto próprio ou peça ao gestor.'}</p>
          <button className="btn primary" onClick={() => openComposer()}>Começar e criar tarefa</button>
        </div>
      )}
      {showSetup && (
        <ProjectSetup workspaces={taskWorkspaces} onCancel={() => setShowSetup(false)} onReady={(project, workspace) => {
          setProjetos(current => [...current, project]);
          setTaskWorkspaces(current => current.some(item => item.id === workspace.id) ? current : [...current, workspace]);
          setFormData(current => ({ ...current, projeto: String(project.id), responsavel: '' }));
          setSelectedProjeto(String(project.id));
          setShowSetup(false);
          setShowComposer(true);
          setSuccess('Projeto pronto. Agora só falta o título da sua tarefa.');
        }} />
      )}

      {showComposer && (
        <form className="task-composer" onSubmit={handleSubmit}>
          <div className="composer-header">
            <h2>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</h2>
            <button className="text-button" type="button" onClick={closeComposer}>Fechar</button>
          </div>
          <p className="helper-text">Preencha o título. Descrição, responsável e prazo são opcionais.</p>
          <input
            autoFocus
            maxLength={255}
            required
            className="form-input composer-title"
            placeholder="Titulo da tarefa"
            value={formData.titulo}
            onChange={event => setFormData({ ...formData, titulo: event.target.value })}
          />
          <textarea
            className="form-input"
            placeholder="Descricao"
            rows="3"
            value={formData.descricao}
            onChange={event => setFormData({ ...formData, descricao: event.target.value })}
          />
          {!editingTask && <button className="text-button" type="button" onClick={() => { setShowComposer(false); setShowSetup(true); }}>+ Criar outro projeto</button>}
          <div className="composer-grid">
            <select
              required
              className="form-input"
              aria-label="Projeto da tarefa"
              value={formData.projeto}
              onChange={event => setFormData({ ...formData, projeto: event.target.value, responsavel: '' })}
            >
              <option value="">Projeto</option>
              {projetos.filter(projeto => projeto.pode_gerenciar).map(projeto => (
                <option key={projeto.id} value={projeto.id}>{projeto.nome}</option>
              ))}
            </select>
            <select
              className="form-input"
              aria-label="Responsavel"
              value={formData.responsavel}
              onChange={event => setFormData({ ...formData, responsavel: event.target.value })}
            >
              <option value="">Responsavel</option>
              {usuarios.filter(usuario => {
                const project = projetos.find(item => String(item.id) === String(formData.projeto));
                const workspace = taskWorkspaces.find(item => item.id === project?.workspace);
                return workspace && (workspace.dono === usuario.id || workspace.membros.some(member => member.id === usuario.id));
              }).map(usuario => (
                <option key={usuario.id} value={usuario.id}>{usuario.username}</option>
              ))}
            </select>
            <select
              required
              className="form-input"
              value={formData.prioridade}
              onChange={event => setFormData({ ...formData, prioridade: event.target.value })}
            >
              <option value="Baixa">Baixa</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
            <select
              required
              className="form-input"
              value={formData.status}
              onChange={event => setFormData({ ...formData, status: event.target.value })}
            >
              <option value="A Fazer">Para fazer</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluido">Concluido</option>
            </select>
            <input
              className="form-input"
              type="datetime-local"
              title="Prazo opcional"
              value={formData.prazo_entrega}
              onChange={event => setFormData({ ...formData, prazo_entrega: event.target.value })}
            />
          </div>
          <button className="btn primary" disabled={saving || !projetos.some(projeto => projeto.pode_gerenciar)} type="submit">
            {saving ? 'Salvando' : editingTask ? 'Salvar alteracoes' : 'Adicionar tarefa'}
          </button>
        </form>
      )}

      <div className="board-shell">
        {loading ? (
          <Notice>Carregando quadro...</Notice>
        ) : (
          <div className="board-columns">
            {renderColumn('Para fazer', 'A Fazer', tarefasPorStatus.aFazer)}
            {renderColumn('Em andamento', 'Em Andamento', tarefasPorStatus.fazendo)}
            {renderColumn('Concluido', 'Concluido', tarefasPorStatus.concluido)}
          </div>
        )}
      </div>
    </section>
  );
}

function AppShell() {
  const [auth, setAuth] = useState({
    token: localStorage.getItem('devdesk_token') || '',
    username: localStorage.getItem('devdesk_username') || '',
  });

  useEffect(() => {
    const onExpired = () => setAuth({ token: '', username: '' });
    window.addEventListener('devdesk:session-expired', onExpired);
    return () => window.removeEventListener('devdesk:session-expired', onExpired);
  }, []);

  const handleLogin = ({ token, refreshToken, username }) => {
    localStorage.setItem('devdesk_token', token);
    localStorage.setItem('devdesk_refresh_token', refreshToken);
    localStorage.setItem('devdesk_username', username);
    setAuth({ token, username });
  };

  const handleLogout = () => {
    localStorage.removeItem('devdesk_token');
    localStorage.removeItem('devdesk_refresh_token');
    localStorage.removeItem('devdesk_username');
    setAuth({ token: '', username: '' });
  };

  return (
    <div className="app-shell">
      <header className={`topbar ${auth.token ? '' : 'public-topbar'}`}>
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <strong>DevDesk</strong>
            <span>Gestao de projetos e tarefas</span>
          </div>
        </div>
        {auth.token ? (
          <>
            <nav className="nav-tabs">
              <NavLinkItem to="/">Dashboard</NavLinkItem>
              <NavLinkItem to="/workspaces">Workspaces</NavLinkItem>
              <NavLinkItem to="/projetos">Projetos</NavLinkItem>
              <NavLinkItem to="/tarefas">Desenvolvimento</NavLinkItem>
            </nav>
            <AuthBox auth={auth} onLogin={handleLogin} onLogout={handleLogout} />
          </>
        ) : (
          <span className="public-topbar-note">Crie sua conta para acessar o sistema</span>
        )}
      </header>

      <main className="app-main" key={`pages-${auth.username}`}>
        <Routes>
          <Route path="/" element={auth.token ? <Dashboard /> : <LandingPage auth={auth} onLogin={handleLogin} onLogout={handleLogout} />} />
          <Route path="/workspaces" element={<ProtectedRoute auth={auth}><Workspaces /></ProtectedRoute>} />
          <Route path="/workspaces/:workspaceId" element={<ProtectedRoute auth={auth}><WorkspaceDetail /></ProtectedRoute>} />
          <Route path="/projetos" element={<ProtectedRoute auth={auth}><Projetos /></ProtectedRoute>} />
          <Route path="/projetos/:projetoId" element={<ProtectedRoute auth={auth}><ProjetoDetail /></ProtectedRoute>} />
          <Route path="/tarefas" element={<ProtectedRoute auth={auth}><Tarefas auth={auth} /></ProtectedRoute>} />
          <Route path="*" element={<section className="page"><h1>Pagina nao encontrada</h1><Link to="/">Voltar ao inicio</Link></section>} />
        </Routes>
      </main>
      <FloatingNoteManager key={`notes-${auth.username}`} auth={auth} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
