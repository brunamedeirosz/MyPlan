import { test, expect } from "@playwright/test";

const password = "DevDesk!Personal42";
async function signup(page, { openOptions = true } = {}) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Primeira vez? Crie sua conta" })
    .click();
  const username = `pessoa${Date.now()}${Math.floor(Math.random() * 10000)}`;
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hoje." }),
  ).toBeVisible();
  if (openOptions) await page.locator(".composer-options > summary").click();
  return username;
}
async function add(page, title) {
  await page
    .getByRole("textbox", { name: "Nova tarefa", exact: true })
    .fill(title);
  await page
    .getByRole("textbox", { name: "Nova tarefa", exact: true })
    .press("Enter");
  await expect(
    page.locator(".task-title").filter({ hasText: title }),
  ).toBeVisible();
}

test("uma conta nova adiciona, edita, conclui, reabre e exclui sem configurar projetos", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const username = await signup(page);
  await add(page, "Organizar meu dia");
  await add(page, "Ler um capítulo");
  await page
    .getByRole("button", { name: "Editar Organizar meu dia", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Editar título" })
    .fill("Organizar a semana");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Organizar a semana", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Importante: Organizar a semana",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Importante: Organizar a semana",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Importantes", exact: false }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Concluir Organizar a semana", exact: true })
    .click();
  await page.locator(".list-filter-options > summary").click();
  await page.getByLabel("Filtrar situação").selectOption("done");
  await page
    .getByRole("button", { name: "Reabrir Organizar a semana", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Todos os espaços", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Excluir Ler um capítulo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await expect(page.locator(".undo-toast")).toContainText("Tarefa excluída");
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Excluir Ler um capítulo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Organizar a semana", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("falha ao salvar mantém o texto e permite tentar novamente", async ({
  page,
}) => {
  await signup(page);
  await page.route("**/api/itens-pessoais/", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Não foi possível salvar agora." }),
        })
      : route.continue(),
  );
  await page
    .getByRole("textbox", { name: "Nova tarefa", exact: true })
    .fill("Não perder esta ideia");
  await page
    .getByRole("button", { name: "Adicionar tarefa", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await expect(
    page.getByRole("textbox", { name: "Nova tarefa", exact: true }),
  ).toHaveValue("Não perder esta ideia");
  await page.unroute("**/api/itens-pessoais/");
  await page
    .getByRole("button", { name: "Adicionar tarefa", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Não perder esta ideia", exact: true }),
  ).toBeVisible();
});

test("interface desktop e celular permitem adicionar sem transbordar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page);
  await add(page, "Finalizar aquela ideia que ficou para depois");
  await add(page, "Separar um tempo para estudar");
  await add(page, "Fazer uma pausa e tomar um café");
  await page
    .getByRole("button", {
      name: "Importante: Separar um tempo para estudar",
      exact: true,
    })
    .click();
  await page.screenshot({
    path: "test-results/personal-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await add(page, "Minha tarefa no celular");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sair", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar menu", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/personal-mobile.png",
    fullPage: true,
  });
});

test("sessão renova e volta ao login quando o refresh expira", async ({
  page,
}) => {
  await signup(page);
  await add(page, "Preservar minha tarefa");
  await page.evaluate(() => localStorage.setItem("devdesk_token", "invalido"));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Preservar minha tarefa", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem("devdesk_token", "invalido");
    localStorage.setItem("devdesk_refresh_token", "invalido");
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("espaços iniciais, criação, renomeação, mudança de tarefa e exclusão sem perder tarefas", async ({
  page,
}) => {
  await signup(page);
  const spaces = page.getByRole("navigation", { name: "Seus espaços" });
  await expect(spaces.getByRole("button", { name: /^Pessoal/ })).toBeVisible();
  await expect(spaces.getByRole("button", { name: /^Trabalho/ })).toBeVisible();
  await expect(spaces.getByRole("button", { name: /^Estudos/ })).toBeVisible();
  await spaces.getByRole("button", { name: /^Trabalho/ }).click();
  await add(page, "Preparar reunião");
  await spaces.getByRole("button", { name: /^Estudos/ }).click();
  await expect(page.locator(".task-row")).toHaveCount(0);
  await add(page, "Revisar matéria");
  await page
    .getByRole("button", { name: "Gerenciar espaços", exact: true })
    .click();
  await page.getByLabel("Novo espaço", { exact: true }).fill("Faculdade");
  await page
    .getByRole("button", { name: "Adicionar espaço", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Renomear Faculdade", exact: true })
    .click();
  await page
    .getByLabel("Novo nome para Faculdade", { exact: true })
    .fill("Universidade");
  await page.getByRole("button", { name: "Salvar nome", exact: true }).click();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Universidade." }),
  ).toBeVisible();
  await add(page, "Entregar trabalho");
  await page
    .getByRole("button", { name: "Editar Entregar trabalho", exact: true })
    .click();
  await page
    .getByLabel("Mover tarefa para espaço")
    .selectOption({ label: "Trabalho" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await spaces.getByRole("button", { name: /^Trabalho/ }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Gerenciar espaços", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir Trabalho", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Confirmar exclusão de espaço" }),
  ).toContainText("Suas tarefas serão mantidas");
  await page
    .getByRole("button", { name: "Excluir espaço", exact: true })
    .click();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sem espaço." }),
  ).toBeVisible();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.reload();
  await expect(spaces.getByRole("button", { name: /^Trabalho/ })).toHaveCount(
    0,
  );
  await spaces.getByRole("button", { name: /^Sem espaço/ }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
});

test("prazos aparecem no calendário, filtram o dia e persistem após editar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page);
  const dates = await page.evaluate(() => {
    const format = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      today: format(today),
      yesterday: format(yesterday),
      tomorrow: format(tomorrow),
    };
  });
  await page
    .getByLabel("Data da nova tarefa", { exact: true })
    .fill(dates.today);
  await add(page, "Entrega de hoje");
  const calendar = page.getByRole("complementary", {
    name: "Calendário das tarefas",
  });
  await expect(
    calendar.getByText("Entrega de hoje", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Data da nova tarefa", { exact: true })
    .fill(dates.yesterday);
  await add(page, "Entrega atrasada");
  await expect(
    page.getByRole("button", { name: /1 tarefa atrasada/ }),
  ).toBeVisible();
  await calendar.locator(`[data-date="${dates.today}"]`).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Editar Entrega de hoje", exact: true })
    .click();
  await page
    .getByLabel("Prazo da tarefa", { exact: true })
    .fill(dates.tomorrow);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    calendar
      .locator(".day-agenda")
      .getByText("Entrega de hoje", { exact: true }),
  ).toHaveCount(0);
  await calendar.locator(`[data-date="${dates.tomorrow}"]`).click();
  await expect(page.locator(".task-title")).toContainText("Entrega de hoje");
  await page.reload();
  await calendar.locator(`[data-date="${dates.tomorrow}"]`).click();
  await expect(page.locator(".task-title")).toContainText("Entrega de hoje");
  await page
    .getByRole("button", {
      name: "Concluir na agenda: Entrega de hoje",
      exact: true,
    })
    .click();
  await expect(
    calendar.getByRole("button", {
      name: "Reabrir na agenda: Entrega de hoje",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    calendar.locator(
      `[data-date="${dates.tomorrow}"] .calendar-space-dot.is-completed`,
    ),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /Ver todas as datas/ }).click();
  await page
    .getByRole("button", { name: "Excluir Entrega atrasada", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /1 tarefa atrasada/ }),
  ).toBeVisible();
});

test("no celular alterna para calendário, escolhe o dia e volta às tarefas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signup(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  await page.getByLabel("Data da nova tarefa", { exact: true }).fill(today);
  await add(page, "Tarefa no calendário mobile");
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Calendário", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Calendário das tarefas" })
      .getByText("Tarefa no calendário mobile", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/calendar-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Ver tarefas deste dia/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Nova tarefa", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".task-title")).toContainText(
    "Tarefa no calendário mobile",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/calendar-desktop.png",
    fullPage: true,
  });
});

test("calendário reúne todos os espaços e mostra cores distintas no mesmo dia", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  const spaces = page.getByRole("navigation", { name: "Seus espaços" });
  await spaces.getByRole("button", { name: /^Pessoal/ }).click();
  await page.getByLabel("Data da nova tarefa", { exact: true }).fill(today);
  await add(page, "Minha consulta pessoal");
  await spaces.getByRole("button", { name: /^Estudos/ }).click();
  await add(page, "Entrega da faculdade");
  const calendar = page.getByRole("complementary", {
    name: "Calendário das tarefas",
  });
  await expect(
    calendar.getByText("Minha consulta pessoal", { exact: true }),
  ).toBeVisible();
  await expect(
    calendar.getByText("Entrega da faculdade", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".task-row")).toHaveCount(1);
  const day = calendar.locator(`[data-date="${today}"]`);
  await expect(day.locator(".calendar-space-dot")).toHaveCount(2);
  await expect(day).toHaveAttribute("aria-label", /Pessoal: 1 tarefa/);
  await expect(day).toHaveAttribute("aria-label", /Estudos: 1 tarefa/);
  const colors = await day
    .locator(".calendar-space-dot")
    .evaluateAll((dots) =>
      dots.map((dot) => getComputedStyle(dot).backgroundColor),
    );
  expect(new Set(colors).size).toBe(2);
  const originalColor = colors[0];
  await spaces.getByRole("button", { name: /^Trabalho/ }).click();
  await expect(day.locator(".calendar-space-dot")).toHaveCount(2);
  expect(
    await day
      .locator(".calendar-space-dot")
      .first()
      .evaluate((dot) => getComputedStyle(dot).backgroundColor),
  ).toBe(originalColor);
  await page.getByRole("button", { name: /Ver tarefas deste dia/ }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await expect(day.locator(".calendar-space-dot")).toHaveCount(2);
  await expect(
    calendar.getByText("Minha consulta pessoal", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/calendar-spaces-mobile.png",
    fullPage: true,
  });
});

test("cadastrar outra tarefa preserva a anterior no calendário mesmo depois de concluída", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page);
  const dates = await page.evaluate(() => {
    const key = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return { today: key(today), tomorrow: key(tomorrow) };
  });
  await page
    .getByLabel("Data da nova tarefa", { exact: true })
    .fill(dates.today);
  await add(page, "Primeira entrega");
  const calendar = page.getByRole("complementary", {
    name: "Calendário das tarefas",
  });
  const firstDay = calendar.locator(`[data-date="${dates.today}"]`);
  await page
    .getByRole("button", {
      name: "Concluir na agenda: Primeira entrega",
      exact: true,
    })
    .click();
  await expect(
    calendar.getByRole("button", {
      name: "Reabrir na agenda: Primeira entrega",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    firstDay.locator(".calendar-space-dot.is-completed"),
  ).toHaveCount(1);
  await page
    .getByLabel("Data da nova tarefa", { exact: true })
    .fill(dates.tomorrow);
  await add(page, "Segunda entrega");
  await expect(
    firstDay.locator(".calendar-space-dot.is-completed"),
  ).toHaveCount(1);
  await expect(
    calendar.locator(`[data-date="${dates.tomorrow}"] .calendar-space-dot`),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    firstDay.locator(".calendar-space-dot.is-completed"),
  ).toHaveCount(1);
  await expect(
    calendar.getByText("Primeira entrega", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Reabrir na agenda: Primeira entrega",
      exact: true,
    })
    .click();
  await expect(
    firstDay.locator(".calendar-space-dot.is-completed"),
  ).toHaveCount(0);
  await expect(
    calendar.getByRole("button", {
      name: "Concluir na agenda: Primeira entrega",
      exact: true,
    }),
  ).toBeVisible();
});

test("editor persiste descrição, prioridade e checklist; recorrência gera uma próxima tarefa", async ({
  page,
}) => {
  await signup(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  await add(page, "Minha rotina");
  const edit = page.getByRole("button", {
    name: "Editar Minha rotina",
    exact: true,
  });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Organizar minhas leituras.");
  await page.getByLabel("Prioridade", { exact: true }).selectOption("alta");
  await page.getByLabel("Prazo da tarefa", { exact: true }).fill(today);
  await page.getByLabel("Repetir", { exact: true }).selectOption("diaria");
  await page
    .getByLabel("Nova subtarefa", { exact: true })
    .fill("Ler dez páginas");
  await page.getByLabel("Nova subtarefa", { exact: true }).press("Enter");
  await page
    .getByLabel("Nova subtarefa", { exact: true })
    .fill("Anotar ideias");
  await page
    .getByRole("button", { name: "Adicionar subtarefa", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Concluir subtarefa Ler dez páginas",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Checklist de Minha rotina: 1 de 2",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Editar Minha rotina", exact: true })
    .click();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue(
    "Organizar minhas leituras.",
  );
  await expect(page.getByLabel("Prioridade", { exact: true })).toHaveValue(
    "alta",
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Concluir subtarefa Ler dez páginas",
      exact: true,
    }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Concluir Minha rotina", exact: true })
    .click();
  await page.getByRole("button", { name: "Todos os espaços", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Checklist de Minha rotina: 0 de 2",
      exact: true,
    }),
  ).toBeVisible();
  const token = await page.evaluate(() =>
    localStorage.getItem("devdesk_token"),
  );
  const response = await page.request.get(
    "http://127.0.0.1:8001/api/itens-pessoais/",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const items = await response.json();
  expect(items).toHaveLength(2);
  expect(items.filter((item) => item.concluida)).toHaveLength(1);
  expect(items.find((item) => !item.concluida).prioridade).toBe("alta");
  await page.screenshot({
    path: "test-results/redesign-desktop.png",
    fullPage: true,
  });
});

test("visões e filtros compartilham os dados e painéis podem ser recolhidos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
  await page.getByLabel("Data da nova tarefa", { exact: true }).fill(today);
  await page
    .getByLabel("Prioridade da nova tarefa", { exact: true })
    .selectOption("alta");
  await add(page, "Planejar a semana");
  await page
    .getByLabel("Prioridade da nova tarefa", { exact: true })
    .selectOption("baixa");
  await add(page, "Fazer uma pausa");
  const navigation = page.getByRole("navigation", { name: "Filtrar tarefas" });
  await navigation.getByRole("button", { name: /^Hoje/ }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.locator(".list-filter-options > summary").click();
  await page.getByLabel("Filtrar prioridade").selectOption("alta");
  await expect(page.locator(".task-row")).toHaveCount(1);
  const viewSelector = page.getByRole("group", {
    name: "Visualização de tarefas",
  });
  await viewSelector
    .getByRole("button", { name: "Semana", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Visão semanal" }),
  ).toBeVisible();
  await expect(page.locator(".board-task")).toHaveCount(1);
  await viewSelector
    .getByRole("button", { name: "Calendário", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Visão mensal" }),
  ).toBeVisible();
  await expect(page.getByLabel("Filtrar prioridade")).toHaveValue("alta");
  await page
    .getByRole("button", {
      name: "Abrir tarefa Planejar a semana",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await viewSelector
    .getByRole("button", { name: "Lista", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recolher barra lateral", exact: true })
    .click();
  await expect(navigation).not.toBeVisible();
  await page
    .getByRole("button", { name: "Recolher calendário lateral", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Calendário das tarefas" }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir barra lateral", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Expandir barra lateral", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir calendário lateral", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Lista compacta/ }).check();
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(page.locator(".workspace-layout")).toHaveClass(/compact-tasks/);
});

test("falha na edição mantém o rascunho e confirmação de exclusão pode ser cancelada", async ({
  page,
}) => {
  await signup(page);
  await add(page, "Não perder detalhes");
  await page
    .getByRole("button", { name: "Editar Não perder detalhes", exact: true })
    .click();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Meu texto importante.");
  await page.route("**/api/itens-pessoais/*/", (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Falha temporária de gravação." }),
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Falha temporária");
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue(
    "Meu texto importante.",
  );
  await page.unroute("**/api/itens-pessoais/*/");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Excluir Não perder detalhes", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Excluir Não perder detalhes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir tarefa", exact: true })
    .click();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar Não perder detalhes", exact: true })
    .click();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue(
    "Meu texto importante.",
  );
});

test("redesign funciona em notebook tablet e smartphone com áreas acessíveis", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signup(page);
  await add(
    page,
    "Uma demanda com título longo para verificar a quebra de linha e preservar ações em todas as telas",
  );
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `largura ${width}`,
    ).toBeTruthy();
    await expect(
      page.getByRole("textbox", { name: "Nova tarefa", exact: true }),
    ).toBeVisible();
    if (width <= 700) {
      await page.getByRole("button", { name: "Semana", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Visão semanal" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.getByRole("button", { name: "Tarefas", exact: true }).click();
    }
  }
  await page.getByRole("button", { name: /^Uma demanda com título longo/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/redesign-editor-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/redesign-mobile.png",
    fullPage: true,
  });
});


test("lista simplificada mantém cartões, detalhes e ações no desktop e celular", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page, { openOptions: false });
  await expect(page.getByLabel("Data da nova tarefa")).not.toBeVisible();
  await page.locator(".composer-options > summary").click();
  await page.getByLabel("Adicionar em", { exact: true }).selectOption({ label: "Trabalho" });
  await page.locator(".composer-options > summary").click();
  await add(page, "Preparar apresentação");
  await add(page, "Revisar anotações da reunião");
  await page.getByRole("button", { name: "Preparar apresentação", exact: true }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Separar os pontos principais para conversar com a equipe.");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".task-description")).toContainText("pontos principais");
  await page.getByRole("button", { name: "Importante: Preparar apresentação", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("task-cards-desktop.png"), fullPage: true });
  await page.locator(".list-filter-options > summary").click();
  await expect(page.getByLabel("Filtrar prioridade")).toBeVisible();
  await page.locator(".list-filter-options > summary").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Preparar apresentação", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("task-cards-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Concluir Revisar anotações da reunião", exact: true }).click();
  await expect(page.locator(".task-row:not(.is-done)")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Preparar apresentação", exact: true })).toBeVisible();
});


test("tema claro e escuro persiste e cobre login, tarefas, calendário e configurações", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar modo claro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await signup(page, { openOptions: false });
  await add(page, "Organizar a semana");
  await add(page, "Estudar para a prova");
  const row = page.locator(".task-row").first();
  const colors = await row.evaluate((node) => {
    // Composite translucent task rows over their actual ancestors.
    const ancestors = [];
    for (let current = node; current; current = current.parentElement) ancestors.unshift(current);
    const background = ancestors.reduce((underneath, element) => {
      const [r, g, b, alpha = 1] = getComputedStyle(element).backgroundColor.match(/[\d.]+/g).map(Number);
      return [r, g, b].map((value, index) => value * alpha + underneath[index] * (1 - alpha));
    }, [255, 255, 255]);
    return {
      background: `rgb(${background.map(Math.round).join(", ")})`,
      title: getComputedStyle(node.querySelector(".task-open")).color,
    };
  });
  const luminance = (color) => {
    const [r, g, b] = color.match(/\d+/g).map(Number).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  expect((luminance(colors.background) + 0.05) / (luminance(colors.title) + 0.05)).toBeGreaterThan(7);
  await page.screenshot({ path: testInfo.outputPath("theme-light-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await expect(page.getByLabel("Aparência", { exact: true })).toHaveValue("light");
  await page.getByLabel("Aparência", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Aparência", { exact: true }).selectOption("light");
  await page.getByRole("button", { name: "Pronto", exact: true }).click();
  await page.getByRole("button", { name: "Organizar a semana", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("theme-light-editor.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("theme-light-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Ativar modo escuro", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Organizar a semana", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("theme-dark-mobile.png"), fullPage: true });
});


async function weatherOptions(page) {
  const options = page.locator(".weather-settings");
  if (await options.getAttribute("open") === null) await options.locator("summary").click();
}

test("tempo fica aberto no canto, persiste e funciona nos dois temas sem enviar credenciais", async ({ page }, testInfo) => {
  let forecastCalls = 0;
  let searchCalls = 0;
  let fail = false;
  await page.route("https://geocoding-api.open-meteo.com/**", async (route) => {
    searchCalls++;
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: { results: [{ name: "Brasília", admin1: "Distrito Federal", country: "Brasil", latitude: -15.78, longitude: -47.93 }] } });
  });
  await page.route("https://api.open-meteo.com/**", async (route) => {
    forecastCalls++;
    expect(route.request().headers().authorization).toBeUndefined();
    expect(new URL(route.request().url()).searchParams.get("forecast_days")).toBe("1");
    if (fail) { await route.fulfill({ status: 503, json: { error: true } }); return; }
    await route.fulfill({ json: {
      current: { temperature_2m: 26.4, weather_code: 2, is_day: 1 },
      daily: { temperature_2m_min: [18], temperature_2m_max: [29], precipitation_probability_max: [70] },
    } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signup(page, { openOptions: false });
  const weather = page.getByRole("region", { name: "Previsão do tempo", exact: true });
  await expect(weather).toBeVisible();
  expect(searchCalls).toBe(0);
  expect(forecastCalls).toBe(0);
  await weatherOptions(page);
  await page.getByLabel("Buscar cidade", { exact: true }).fill("Brasília");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: "Brasília, Distrito Federal, Brasil", exact: true }).click();
  await expect(page.locator(".weather-now")).toContainText("26°");
  await add(page, "Planejar minha caminhada");
  await expect(weather).toBeVisible();
  await expect(weather).toContainText("Mínima18°");
  await expect(weather).toContainText("Máxima29°");
  await expect(weather).toContainText("Chuva70%");
  await expect(page.getByLabel("Trocar cidade", { exact: true })).not.toBeVisible();
  const main = await page.locator(".task-content").boundingBox();
  const card = await weather.boundingBox();
  expect(card.x).toBeGreaterThanOrEqual(main.x + main.width);
  await page.screenshot({ path: testInfo.outputPath("weather-card-dark-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Ativar modo claro", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("weather-card-light-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 360, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileMain = await page.locator(".task-content").boundingBox();
  expect((await weather.boundingBox()).y).toBeGreaterThanOrEqual(mobileMain.y + mobileMain.height);
  expect((await weather.boundingBox()).height).toBeLessThanOrEqual(80);
  await weatherOptions(page);
  await expect(page.locator(".weather-mobile-details .weather-stats")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: testInfo.outputPath("weather-card-light-mobile.png"), fullPage: true });
  await page.reload();
  await expect(page.locator(".weather-now")).toContainText("26°");
  expect(searchCalls).toBe(1);
  await weatherOptions(page);
  fail = true;
  await page.getByRole("button", { name: "Atualizar tempo", exact: true }).click();
  await expect(weather).toContainText("Não foi possível carregar o tempo");
  await page.getByRole("button", { name: "Remover cidade", exact: true }).click();
  await expect(page.locator(".weather-now")).toHaveCount(0);
  await add(page, "Minhas tarefas continuam funcionando");
  await expect(weather).toBeVisible();
});

test("busca de cidade comunica resultado vazio e indisponibilidade sem atrapalhar tarefas", async ({ page }) => {
  let fail = false;
  await page.route("https://geocoding-api.open-meteo.com/**", (route) => route.fulfill(
    fail ? { status: 503, json: { error: true } } : { json: { results: [] } },
  ));
  await signup(page, { openOptions: false });
  await weatherOptions(page);
  await page.getByLabel("Buscar cidade", { exact: true }).fill("Cidade desconhecida");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".weather-message")).toContainText("Cidade não encontrada");
  fail = true;
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".weather-message")).toContainText("Não foi possível buscar");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Buscar cidade", { exact: true })).not.toBeVisible();
  await expect(page.getByRole("region", { name: "Previsão do tempo" })).toBeVisible();
  await add(page, "Organizar meus compromissos");
});

test("localização permitida exibe o tempo automaticamente sem salvar coordenadas do dispositivo", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
  let requests = 0;
  await page.route("https://api.open-meteo.com/**", async (route) => {
    requests++;
    const url = new URL(route.request().url());
    expect(url.searchParams.get("latitude")).toBe("-23.55");
    expect(url.searchParams.get("longitude")).toBe("-46.63");
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: {
      current: { temperature_2m: 24, weather_code: 0, is_day: 1 },
      daily: { temperature_2m_min: [17], temperature_2m_max: [27], precipitation_probability_max: [15] },
    } });
  });
  const username = await signup(page, { openOptions: false });
  await expect(page.locator(".weather-now")).toContainText("24°");
  await expect(page.locator(".weather-current > .weather-stats")).toBeVisible();
  expect(requests).toBeGreaterThan(0);
  expect(await page.evaluate((name) => localStorage.getItem(`myplan:${name}:weather-city`), username)).toBeNull();
  await page.reload();
  await expect(page.locator(".weather-now")).toContainText("24°");
  await expect(page.locator(".weather-card > .weather-place")).toHaveText("Sua localização atual");
  await weatherOptions(page);
  await page.getByRole("button", { name: "Desativar tempo", exact: true }).click();
  await expect(page.locator(".weather-now")).toHaveCount(0);
  const calls = requests;
  await page.reload();
  await add(page, "Organizar o dia sem previsão");
  expect(requests).toBe(calls);
  await weatherOptions(page);
  await page.getByRole("button", { name: "Usar minha localização", exact: true }).click();
  await expect(page.locator(".weather-now")).toContainText("24°");
});

test("localização negada permite cidade manual e não consulta o tempo sem uma região", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (_success, failure) => queueMicrotask(() => failure({ code: 1 })),
    } });
  });
  let forecasts = 0;
  await page.route("https://api.open-meteo.com/**", async (route) => {
    forecasts++;
    await route.fulfill({ json: { current: { temperature_2m: 28, weather_code: 3, is_day: 1 }, daily: {} } });
  });
  await page.route("https://geocoding-api.open-meteo.com/**", (route) => route.fulfill({ json: {
    results: [{ name: "Recife", admin1: "Pernambuco", country: "Brasil", latitude: -8.05, longitude: -34.88 }],
  } }));
  await signup(page, { openOptions: false });
  await weatherOptions(page);
  await expect(page.locator(".weather-message")).toContainText("Localização não autorizada");
  expect(forecasts).toBe(0);
  await page.getByLabel("Buscar cidade", { exact: true }).fill("Recife");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: "Recife, Pernambuco, Brasil", exact: true }).click();
  await expect(page.locator(".weather-now")).toContainText("28°");
  await page.reload();
  await expect(page.locator(".weather-now")).toContainText("28°");
  await expect(page.locator(".weather-card > .weather-place")).toHaveText("Recife, Pernambuco, Brasil");
  await expect(page.locator(".weather-message")).toHaveCount(0);
});


test("menu mobile organiza espaços em coluna, contém foco e fecha ao escolher um espaço", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signup(page, { openOptions: false });
  await add(page, "Organizar minhas tarefas");
  const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
  await opener.click();
  const menu = page.getByRole("dialog", { name: "Menu do planner", exact: true });
  await expect(menu).toBeVisible();
  expect(await page.locator(".task-content").evaluate((node) => node.inert)).toBe(true);
  const spaces = menu.getByRole("navigation", { name: "Seus espaços" });
  const personal = await spaces.getByRole("button", { name: /^Pessoal/ }).boundingBox();
  const work = await spaces.getByRole("button", { name: /^Trabalho/ }).boundingBox();
  expect(work.x).toBe(personal.x);
  expect(work.y).toBeGreaterThanOrEqual(personal.y + personal.height);
  expect(await menu.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Fechar menu", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByRole("button", { name: "Sair", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Fechar menu", exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("mobile-menu-dark.png"), fullPage: true });
  await spaces.getByRole("button", { name: /^Trabalho/ }).click();
  await expect(menu).not.toBeVisible();
  expect(await page.locator(".task-content").evaluate((node) => node.inert)).toBe(false);
  await expect(opener).toBeFocused();
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await page.getByRole("button", { name: "Ativar modo claro", exact: true }).click();
  await opener.click();
  await page.screenshot({ path: testInfo.outputPath("mobile-menu-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Gerenciar espaços", exact: true }).click();
  await expect(menu).not.toBeVisible();
  await expect(page.getByLabel("Novo espaço", { exact: true })).toBeVisible();
});
