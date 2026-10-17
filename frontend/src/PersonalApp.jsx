import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import SpacesManager from "./SpacesManager";
import Icon from "./Icon";
import TaskRow from "./TaskRow";
import TaskEditor from "./TaskEditor";
import TaskViews from "./TaskViews";
import { DeleteConfirmation, PlannerSettings } from "./PlannerDialogs";
import {
  filterTasks,
  sortTasks,
  groupTasks,
  priorityLabels,
  recurrenceLabels,
} from "./plannerFilters";
import TaskCalendar from "./TaskCalendar.jsx";
import WeatherWidget from "./WeatherWidget.jsx";
import { spaceColor } from "./spaceColors";
import { dateKey, readDate } from "./calendarDates";

function errorMessage(error) {
  if (!error.response)
    return "Não foi possível conectar. Confira se o servidor está rodando e tente novamente.";
  const data = error.response.data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(
        ([field, value]) =>
          `${{ username: "Usuário", password: "Senha", titulo: "Título", email: "Email" }[field] || field}: ${Array.isArray(value) ? value.join(" ") : value}`,
      )
      .join(" ");
  }
  return "Não foi possível salvar. Tente novamente.";
}

function Login({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [values, setValues] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) await api.post("registro/", values);
      const { data } = await api.post("token/", {
        username: values.username,
        password: values.password,
      });
      onLogin(data, values.username);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="welcome-layout">
      <div className="welcome-copy">
        <span className="overline">MENOS RUÍDO. MAIS CLAREZA.</span>
        <h1>
          Espaço para
          <br />o que importa<span>.</span>
        </h1>
        <p>
          Tire as ideias da cabeça.
          <br />
          Uma pequena tarefa de cada vez.
        </p>
      </div>
      <form className="login-card" onSubmit={submit}>
        <span className="login-wordmark">MyPlan</span>
        <h2>{register ? "Seu novo começo." : "Bom ter você aqui."}</h2>
        <p>
          {register
            ? "Crie sua conta para guardar suas tarefas."
            : "Entre para continuar de onde parou."}
        </p>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <label>
          Usuário
          <input
            required
            autoComplete="username"
            maxLength={150}
            value={values.username}
            disabled={busy}
            onChange={(e) => setValues({ ...values, username: e.target.value })}
          />
        </label>
        {register && (
          <label>
            Email <span>(opcional)</span>
            <input
              type="email"
              autoComplete="email"
              value={values.email}
              disabled={busy}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </label>
        )}
        <label>
          Senha
          <input
            required
            minLength={register ? 8 : undefined}
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            value={values.password}
            disabled={busy}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
        </label>
        {register && (
          <small>Use ao menos 8 caracteres. Evite senhas muito comuns.</small>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? "Um instante…" : register ? "Criar conta" : "Entrar"}
          <Icon name="arrow" size={17} />
        </button>
        <button
          className="switch-auth"
          disabled={busy}
          type="button"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "Já tenho uma conta" : "Primeira vez? Crie sua conta"}
        </button>
      </form>
    </div>
  );
}

function TaskSpace({ username, onLogout, theme, onThemeChange }) {
  const [items, setItems] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState("all");
  const [addSpace, setAddSpace] = useState("");
  const [managingSpaces, setManagingSpaces] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState([]);
  const [filter, setFilter] = useState("today");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [newDate, setNewDate] = useState(() => dateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [deleted, setDeleted] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const input = useRef(null);
  const sidebar = useRef(null);
  const menuToggle = useRef(null);
  const [view, setView] = useState("list");
  const calendarView = view === "month";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(`myplan:${username}:sidebar`) === "true",
  );
  const [calendarCollapsed, setCalendarCollapsed] = useState(
    () => localStorage.getItem(`myplan:${username}:calendar`) === "true",
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState(() => {
    try {
      return {
        compact: false,
        showCompleted: false,
        ...JSON.parse(
          localStorage.getItem(`myplan:${username}:preferences`) || "{}",
        ),
      };
    } catch {
      return { compact: false, showCompleted: false };
    }
  });
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [newPriority, setNewPriority] = useState("media");
  const [newRecurrence, setNewRecurrence] = useState("nenhuma");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    localStorage.setItem(
      `myplan:${username}:sidebar`,
      String(sidebarCollapsed),
    );
    localStorage.setItem(
      `myplan:${username}:calendar`,
      String(calendarCollapsed),
    );
    localStorage.setItem(
      `myplan:${username}:preferences`,
      JSON.stringify(preferences),
    );
  }, [sidebarCollapsed, calendarCollapsed, preferences, username]);
  useEffect(() => {
    if (!mobileMenu) return;
    const media = window.matchMedia("(max-width: 700px)");
    if (!media.matches) return;
    const node = sidebar.current;
    const opener = menuToggle.current;
    const background = [
      ...document.querySelectorAll(
        ".brand-bar, .layout-controls, .mobile-view-switch, .task-content, .calendar-panel",
      ),
    ];
    const oldInert = background.map((item) => item.inert);
    background.forEach((item) => {
      item.inert = true;
    });
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [
      ...node.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ),
    ];
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenu(false);
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const onResize = () => {
      if (!media.matches) setMobileMenu(false);
    };
    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onResize);
    return () => {
      background.forEach((item, index) => {
        item.inert = oldInert[index];
      });
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onResize);
      opener?.focus();
    };
  }, [mobileMenu]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get("itens-pessoais/", { signal: controller.signal }),
      api.get("espacos-pessoais/", { signal: controller.signal }),
    ])
      .then(([tasks, workspaces]) => {
        setItems(tasks.data);
        setSpaces(workspaces.data);
        setAddSpace((current) =>
          workspaces.data.some((space) => String(space.id) === current)
            ? current
            : String(workspaces.data[0]?.id || ""),
        );
        setLoadFailed(false);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(err));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const add = async (event) => {
    event.preventDefault();
    if (!title.trim() || adding) return;
    if (newRecurrence !== "nenhuma" && !newDate) {
      setError("Escolha um prazo para definir a recorrência.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const { data } = await api.post("itens-pessoais/", {
        titulo: title.trim(),
        importante: filter === "important",
        espaco: (selectedSpace === "all" ? addSpace : selectedSpace) || null,
        prazo: newDate || null,
        prioridade: newPriority,
        recorrencia: newRecurrence,
      });
      setItems((current) => [data, ...current]);
      setTitle("");
      setFeedback("Tarefa criada.");
      if (filter === "today" && newDate !== dateKey(new Date()))
        setFilter("all");
      if (filter === "upcoming" && (!newDate || newDate <= dateKey(new Date())))
        setFilter("all");
      if (priorityFilter && priorityFilter !== newPriority)
        setPriorityFilter("");
      if (statusFilter === "done") setStatusFilter("");
      if (
        query &&
        !data.titulo
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR"))
      )
        setQuery("");
      if (filter === "done") setFilter("all");
      if (
        selectedDate === "overdue" ||
        (selectedDate && newDate !== selectedDate)
      )
        setSelectedDate(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
      requestAnimationFrame(() => input.current?.focus());
    }
  };

  const update = async (item, changes) => {
    setBusy((current) => [...current, item.id]);
    setError("");
    try {
      const { data } = await api.patch(`itens-pessoais/${item.id}/`, changes);
      setItems((current) =>
        current.map((row) => (row.id === item.id ? data : row)),
      );
      if ("titulo" in changes) {
        setEditing(null);
        setFeedback("Tarefa atualizada.");
      } else if ("concluida" in changes)
        setFeedback(data.concluida ? "Tarefa concluída." : "Tarefa reaberta.");
      if (data.proxima_ocorrencia) {
        try {
          const { data: next } = await api.get(
            `itens-pessoais/${data.proxima_ocorrencia}/`,
          );
          setItems((current) =>
            current.some((row) => row.id === next.id)
              ? current
              : [next, ...current],
          );
        } catch {
          setReload((value) => value + 1);
        }
      }
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy((current) => current.filter((id) => id !== item.id));
    }
  };

  const remove = async (item) => {
    setBusy((current) => [...current, item.id]);
    setError("");
    try {
      await api.delete(`itens-pessoais/${item.id}/`);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setDeleted(item);
      setDeleteTarget(null);
      setEditing(null);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy((current) => current.filter((id) => id !== item.id));
    }
  };

  const undo = async () => {
    setRestoring(true);
    try {
      const { data } = await api.post("itens-pessoais/", {
        titulo: deleted.titulo,
        concluida: deleted.concluida,
        importante: deleted.importante,
        espaco: spaces.some((space) => space.id === deleted.espaco)
          ? deleted.espaco
          : null,
        prazo: deleted.prazo,
        descricao: deleted.descricao || "",
        prioridade: deleted.prioridade || "media",
        subtarefas: deleted.subtarefas || [],
        recorrencia: deleted.proxima_ocorrencia
          ? "nenhuma"
          : deleted.recorrencia || "nenhuma",
      });
      setItems((current) => [data, ...current]);
      setDeleted(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRestoring(false);
    }
  };

  const scopedItems = items.filter(
    (item) =>
      selectedSpace === "all" || String(item.espaco || "") === selectedSpace,
  );
  const pending = scopedItems.filter((item) => !item.concluida);
  const important = pending.filter((item) => item.importante);
  const todayKey = dateKey(new Date());
  const context = {
    section: filter,
    spaceId: selectedSpace,
    query,
    priority: priorityFilter,
    status: statusFilter || (preferences.showCompleted ? "all" : ""),
    today: todayKey,
  };
  const viewItems = sortTasks(filterTasks(items, context), sort, spaces);
  const visible = sortTasks(
    filterTasks(items, { ...context, selectedDate }),
    sort,
    spaces,
  );
  const completedMatches = filterTasks(items, {
    ...context,
    section: "done",
    status: "done",
    selectedDate,
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const spaceName =
    selectedSpace === "all"
      ? "Minhas tarefas"
      : spaces.find((space) => String(space.id) === selectedSpace)?.nome ||
        "Sem espaço";
  const filterNames = {
    all: spaceName,
    important: "O que importa",
    done: "Pequenas conquistas",
    today: "Hoje",
    upcoming: "Próximos dias",
  };
  const openEditor = (item) => {
    setError("");
    setEditing(item.id);
  };
  const toggleTask = (item) => update(item, { concluida: !item.concluida });
  const selectDay = (value) => {
    setSelectedDate(value);
    setEditing(null);
    setFilter("all");
    setQuery("");
    setPriorityFilter("");
    setStatusFilter("all");
    if (value !== "overdue") setNewDate(value);
  };
  const createForDate = (value) => {
    selectDay(value);
    setView("list");
    requestAnimationFrame(() => input.current?.focus());
  };
  const editingItem = items.find((item) => item.id === editing);
  const renderItem = (item) => (
    <TaskRow
      key={item.id}
      item={item}
      spaces={spaces}
      today={todayKey}
      busy={busy.includes(item.id)}
      onEdit={openEditor}
      onToggle={toggleTask}
      onFavorite={(row) => update(row, { importante: !row.importante })}
      onDelete={(row) => {
        setError("");
        setDeleteTarget(row);
      }}
    />
  );

  return (
    <div
      className={`workspace-layout with-calendar ${calendarView ? "view-calendar" : "view-tasks"} ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${calendarCollapsed ? "calendar-collapsed" : ""} ${mobileMenu ? "mobile-menu-open" : ""} ${preferences.compact ? "compact-tasks" : ""}`}
    >
      <div className="layout-controls">
        <button
          className="icon-button desktop-sidebar-toggle"
          aria-controls="planner-sidebar"
          aria-label={
            sidebarCollapsed
              ? "Expandir barra lateral"
              : "Recolher barra lateral"
          }
          aria-expanded={!sidebarCollapsed}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Icon name="panel" size={17} />
        </button>
        <button
          ref={menuToggle}
          className="icon-button mobile-menu-toggle"
          aria-controls="planner-sidebar"
          aria-label="Abrir menu"
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <Icon name="list" size={19} />
          <span>Menu</span>
        </button>
        <span>Meu planner</span>
        <button
          className="icon-button right-panel-toggle"
          aria-controls="planner-calendar"
          aria-label={
            calendarCollapsed
              ? "Expandir calendário lateral"
              : "Recolher calendário lateral"
          }
          aria-expanded={!calendarCollapsed}
          onClick={() => setCalendarCollapsed(!calendarCollapsed)}
        >
          <Icon name="calendar" size={17} />
        </button>
      </div>
      <nav className="mobile-view-switch" aria-label="Alternar visualização">
        <button aria-pressed={view === "list"} onClick={() => setView("list")}>
          Tarefas
        </button>
        <button aria-pressed={view === "week"} onClick={() => setView("week")}>
          Semana
        </button>
        <button aria-pressed={calendarView} onClick={() => setView("month")}>
          Calendário
        </button>
      </nav>
      {mobileMenu && (
        <button
          className="menu-backdrop"
          aria-label="Fechar menu pelo fundo"
          tabIndex={-1}
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className="sidebar"
        id="planner-sidebar"
        ref={sidebar}
        role={mobileMenu ? "dialog" : undefined}
        aria-modal={mobileMenu || undefined}
        aria-label={mobileMenu ? "Menu do planner" : undefined}
      >
        <div className="mobile-sidebar-heading">
          <h2>Meu planner</h2>
          <button
            className="icon-button"
            aria-label="Fechar menu"
            onClick={() => setMobileMenu(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="space-label">SEU ESPAÇO</div>
        <nav aria-label="Filtrar tarefas">
          {[
            [
              "today",
              "sun",
              "Hoje",
              pending.filter((item) => item.prazo === todayKey).length,
            ],
            ["important", "star", "Importantes", important.length],
          ].map(([id, icon, label, count]) => (
            <button
              key={id}
              className={`nav-item ${filter === id ? "selected" : ""}`}
              aria-current={filter === id ? "page" : undefined}
              onClick={() => {
                setFilter(id);
                setQuery("");
                setSelectedDate(null);
                setStatusFilter("");
                setMobileMenu(false);
                if (id === "today") setNewDate(todayKey);
              }}
            >
              <Icon name={icon} size={19} />
              <span>{label}</span>
              <span className="nav-count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="spaces-section">
          <div className="spaces-section-heading">
            <span>ESPAÇOS</span>
            <button
              className="icon-button"
              aria-label="Gerenciar espaços"
              title="Criar ou editar espaços"
              disabled={loading || loadFailed}
              onClick={() => {
                setMobileMenu(false);
                setManagingSpaces(true);
              }}
            >
              <Icon name="plus" size={17} />
            </button>
          </div>
          <nav aria-label="Seus espaços" className="spaces-navigation">
            <button
              className={`space-nav ${selectedSpace === "all" ? "active" : ""}`}
              aria-pressed={selectedSpace === "all"}
              onClick={() => {
                setMobileMenu(false);
                setSelectedSpace("all");
                setFilter("all");
                setQuery("");
              }}
            >
              Todos os espaços
            </button>
            {spaces.map((space) => (
              <button
                key={space.id}
                className={`space-nav ${selectedSpace === String(space.id) ? "active" : ""}`}
                aria-pressed={selectedSpace === String(space.id)}
                onClick={() => {
                  setMobileMenu(false);
                  setSelectedSpace(String(space.id));
                  setFilter("all");
                  setQuery("");
                  setEditing(null);
                }}
              >
                <span
                  className="space-marker"
                  style={{ background: spaceColor(space.id) }}
                />
                {space.nome}
                <span className="nav-count">
                  {
                    items.filter(
                      (item) => item.espaco === space.id && !item.concluida,
                    ).length
                  }
                </span>
              </button>
            ))}
            <button
              className={`space-nav ${selectedSpace === "" ? "active" : ""}`}
              aria-pressed={selectedSpace === ""}
              onClick={() => {
                setMobileMenu(false);
                setSelectedSpace("");
                setFilter("all");
                setQuery("");
              }}
            >
              Sem espaço
              <span className="nav-count">
                {items.filter((item) => !item.espaco && !item.concluida).length}
              </span>
            </button>
          </nav>
        </div>

        <div className="profile">
          <span className="avatar">{username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{username}</strong>
            <span>Meu espaço pessoal</span>
          </div>
          <button
            className="icon-button"
            aria-label="Configurações"
            title="Perfil e preferências"
            onClick={() => {
              setMobileMenu(false);
              setSettings(true);
            }}
          >
            <Icon name="settings" size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Sair"
            title="Sair da conta"
            onClick={onLogout}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>
      <main className="task-content">
        <div className="content-heading">
          <div>
            <h1>
              {filterNames[filter]}
              <span>.</span>
            </h1>
            <div className="date-label">{today}</div>
          </div>
        </div>
        <div className="workspace-toolbar">
          <div
            className="view-selector"
            role="group"
            aria-label="Visualização de tarefas"
          >
            {[
              ["list", "list", "Lista"],
              ["week", "week", "Semana"],
              ["month", "calendar", "Calendário"],
            ].map(([key, icon, label]) => (
              <button
                key={key}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                <Icon name={icon} size={14} />
                {label}
              </button>
            ))}
          </div>
          <span className="workspace-total">
            {pending.length}{" "}
            {pending.length === 1 ? "tarefa pendente" : "tarefas pendentes"}
          </span>
        </div>
        {selectedDate && (
          <div className="date-filter">
            <span>
              {selectedDate === "overdue"
                ? "Tarefas atrasadas"
                : new Intl.DateTimeFormat("pt-BR", {
                    day: "numeric",
                    month: "long",
                  }).format(readDate(selectedDate))}
            </span>
            <button
              onClick={() => {
                setSelectedDate(null);
                setNewDate("");
              }}
            >
              Ver todas as datas ×
            </button>
          </div>
        )}
        <section
          className="task-results"
          data-section={filter}
          aria-label="Suas tarefas"
        >
          {loading ? (
            <div className="loading-tasks" role="status">
              <span />
              <span />
              <span />
              <p>Carregando suas tarefas…</p>
            </div>
          ) : loadFailed ? null : view !== "list" ? (
            <TaskViews
              view={view}
              items={viewItems}
              selectedDate={selectedDate}
              onSelect={selectDay}
              onEdit={openEditor}
              onToggle={toggleTask}
              onCreate={createForDate}
              busy={busy}
            />
          ) : visible.length ? (
            <div className="task-groups">
              {groupTasks(visible, todayKey).map((group) => (
                <section
                  className={`task-group group-${group.id}`}
                  key={group.id}
                >
                  <div className="task-group-heading">
                    <h2>{group.title}</h2>
                    <span>{group.items.length}</span>
                  </div>
                  <ul className="task-list">{group.items.map(renderItem)}</ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-list">
              <div className="empty-symbol">
                <Icon
                  name={filter === "important" ? "star" : "done"}
                  size={24}
                />
              </div>
              <h2>
                {query || priorityFilter || statusFilter
                  ? "Nenhuma tarefa com esses filtros."
                  : filter === "done"
                    ? "Cada passo conta."
                    : filter === "today"
                      ? "Seu dia está livre por aqui."
                      : filter === "upcoming"
                        ? "Uma semana com espaço."
                        : selectedDate
                          ? "Nada por aqui nesta data."
                          : "Um começo tranquilo."}
              </h2>
              <p>
                {query || priorityFilter || statusFilter
                  ? "Ajuste a busca ou os filtros para continuar."
                  : "Adicione sua primeira tarefa no campo abaixo."}
              </p>
            </div>
          )}
          {view === "list" &&
            !preferences.showCompleted &&
            !statusFilter &&
            filter === "all" &&
            completedMatches.length > 0 && (
              <section className="completed-section">
                <button
                  className="completed-toggle"
                  aria-expanded={showCompleted}
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <Icon
                    name="arrow"
                    size={13}
                    style={{
                      transform: showCompleted ? "rotate(90deg)" : undefined,
                    }}
                  />
                  Concluídas <span>{completedMatches.length}</span>
                </button>
                {showCompleted && (
                  <ul className="task-list">
                    {completedMatches.map(renderItem)}
                  </ul>
                )}
              </section>
            )}
        </section>
        {error && !editingItem && !deleteTarget && (
          <div className="error-message" role="alert">
            {error}
            {loadFailed && (
              <button
                onClick={() => {
                  setLoading(true);
                  setReload((value) => value + 1);
                }}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
        <div className="task-composer">
          <form className="add-task" onSubmit={add}>
            <span className="add-outline">
              <Icon name="plus" size={18} />
            </span>
            <input
              ref={input}
              aria-label="Nova tarefa"
              placeholder="O que você quer fazer?"
              maxLength={255}
              value={title}
              disabled={adding || loading || loadFailed}
              onChange={(e) => setTitle(e.target.value)}
            />
            <kbd>↵</kbd>
            <button
              aria-label="Adicionar tarefa"
              className="add-button"
              disabled={!title.trim() || adding || loading || loadFailed}
            >
              <Icon name="arrow" size={19} />
            </button>
          </form>
          <details className="composer-options">
            <summary>Espaço, data e opções</summary>
            <div className="task-space-picker">
              <label htmlFor="new-task-space">Adicionar em</label>
              <select
                id="new-task-space"
                disabled={loading || loadFailed || adding}
                value={selectedSpace === "all" ? addSpace : selectedSpace}
                onChange={(event) => {
                  if (selectedSpace !== "all") {
                    setSelectedSpace(event.target.value);
                    setFilter("all");
                  } else setAddSpace(event.target.value);
                }}
              >
                <option value="">Sem espaço</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.nome}
                  </option>
                ))}
              </select>
              <label className="new-date-label" htmlFor="new-task-date">
                Prazo
              </label>
              <input
                id="new-task-date"
                aria-label="Data da nova tarefa"
                type="date"
                value={newDate}
                required={newRecurrence !== "nenhuma"}
                disabled={loading || loadFailed || adding}
                onChange={(event) => setNewDate(event.target.value)}
              />
              <label className="sr-only" htmlFor="new-priority">
                Prioridade da nova tarefa
              </label>
              <select
                id="new-priority"
                value={newPriority}
                disabled={adding || loading || loadFailed}
                onChange={(event) => setNewPriority(event.target.value)}
              >
                {Object.entries(priorityLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="new-recurrence">
                Recorrência da nova tarefa
              </label>
              <select
                id="new-recurrence"
                value={newRecurrence}
                disabled={adding || loading || loadFailed}
                onChange={(event) => setNewRecurrence(event.target.value)}
              >
                {Object.entries(recurrenceLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                disabled={loading || loadFailed}
                onClick={() => {
                  setMobileMenu(false);
                  setManagingSpaces(true);
                }}
              >
                Novo espaço
              </button>
            </div>
          </details>
        </div>
        <div className="list-toolbar">
          <label className="search-box">
            <Icon name="search" size={16} />
            <input
              aria-label="Buscar tarefas"
              placeholder="Buscar tarefas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <details className="list-filter-options">
            <summary>
              Filtros
              {priorityFilter || statusFilter || sort !== "newest"
                ? " · ativos"
                : ""}
            </summary>
            <div className="filter-controls">
              <select
                aria-label="Filtrar prioridade"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="">Prioridade</option>
                {Object.entries(priorityLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar situação"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Situação</option>
                <option value="open">Pendentes</option>
                <option value="done">Concluídas</option>
                <option value="all">Todas</option>
              </select>
              <select
                aria-label="Ordenar tarefas"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="newest">Mais recentes</option>
                <option value="due">Por prazo</option>
                <option value="priority">Por prioridade</option>
                <option value="space">Por espaço</option>
                <option value="status">Por situação</option>
              </select>
            </div>
          </details>
        </div>
      </main>
      <TaskCalendar
        items={items}
        spaces={spaces}
        selectedDate={selectedDate === "overdue" ? null : selectedDate}
        loading={loading || loadFailed}
        busy={busy}
        onComplete={(item) => update(item, { concluida: !item.concluida })}
        onSelect={selectDay}
        onShowTasks={() => {
          setSelectedSpace("all");
          setView("list");
        }}
        onCreate={createForDate}
      >
        <WeatherWidget username={username} />
      </TaskCalendar>
      {editingItem && (
        <TaskEditor
          key={editingItem.id}
          item={editingItem}
          spaces={spaces}
          onSave={update}
          onClose={() => setEditing(null)}
          error={error}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmation
          item={deleteTarget}
          error={error}
          onClose={() => setDeleteTarget(null)}
          onDelete={remove}
        />
      )}
      {settings && (
        <PlannerSettings
          username={username}
          theme={theme}
          onThemeChange={onThemeChange}
          preferences={preferences}
          onChange={setPreferences}
          onClose={() => setSettings(false)}
        />
      )}
      {feedback && !deleted && (
        <div className="feedback-toast" role="status">
          <Icon name="check" size={15} />
          {feedback}
        </div>
      )}
      {managingSpaces && (
        <SpacesManager
          spaces={spaces}
          onClose={() => setManagingSpaces(false)}
          onSave={(space, created) => {
            setSpaces((current) =>
              created
                ? [...current, space]
                : current.map((item) => (item.id === space.id ? space : item)),
            );
            if (created) {
              setSelectedSpace(String(space.id));
              setFilter("all");
              setQuery("");
            }
          }}
          onDelete={(space) => {
            setSpaces((current) =>
              current.filter((item) => item.id !== space.id),
            );
            setItems((current) =>
              current.map((item) =>
                item.espaco === space.id ? { ...item, espaco: null } : item,
              ),
            );
            if (selectedSpace === String(space.id)) {
              setSelectedSpace("");
              setFilter("all");
              setQuery("");
            }
            if (addSpace === String(space.id)) setAddSpace("");
          }}
        />
      )}
      {deleted && (
        <div className="undo-toast" role="status">
          <span>Tarefa excluída.</span>
          <button disabled={restoring} onClick={undo}>
            {restoring ? "Restaurando…" : "Desfazer"}
          </button>
          <button
            aria-label="Fechar aviso"
            disabled={restoring}
            onClick={() => setDeleted(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function PersonalApp() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f7f7f7" : "#0b0b0b");
    try {
      localStorage.setItem("myplan:theme", theme);
    } catch {
      // The theme still works if browser storage is unavailable.
    }
  }, [theme]);
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem("devdesk_token") || "",
    username: localStorage.getItem("devdesk_username") || "",
  }));
  const logout = () => {
    ["devdesk_token", "devdesk_refresh_token", "devdesk_username"].forEach(
      (key) => localStorage.removeItem(key),
    );
    setAuth({ token: "", username: "" });
  };
  useEffect(() => {
    const expired = () => setAuth({ token: "", username: "" });
    window.addEventListener("devdesk:session-expired", expired);
    return () => window.removeEventListener("devdesk:session-expired", expired);
  }, []);
  const login = (tokens, username) => {
    localStorage.setItem("devdesk_token", tokens.access);
    localStorage.setItem("devdesk_refresh_token", tokens.refresh);
    localStorage.setItem("devdesk_username", username);
    setAuth({ token: tokens.access, username });
  };
  return (
    <div className="personal-app">
      <header className="brand-bar">
        <a href="/" className="brand-link">
          MyPlan
        </a>
        <button
          className="icon-button theme-toggle"
          aria-label={
            theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
          }
          title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
        </button>
        <span className="brand-caption">PLANNER PESSOAL</span>
      </header>
      {auth.token ? (
        <TaskSpace
          key={auth.username}
          username={auth.username}
          onLogout={logout}
          theme={theme}
          onThemeChange={setTheme}
        />
      ) : (
        <Login onLogin={login} />
      )}
    </div>
  );
}
