# Histórico da interface DevDesk

Esta pasta preserva a interface anterior de equipes e os estilos das primeiras
versões. A entrada atual é `src/main.jsx`, que importa `src/PersonalApp.jsx` e
`src/planner.css`. Nenhum arquivo desta pasta entra no bundle atual.

- `App.jsx`, `ProjectSetup.jsx`, `WorkspaceMembers.jsx`, `index.css`: interface de equipes.
- `App.css`: estilos do protótipo inicial.
- `personal.css`, `theme-dark.css`: estilos anteriores do planner pessoal.
- `../e2e/devdesk.spec.js`: testes históricos, fora da seleção atual do Playwright.

As tabelas, migrações e testes da API de equipes permanecem para preservar dados e
compatibilidade. As rotas antigas ficam desativadas em `config.production`.
As chaves de sessão `devdesk_*` são preservadas para manter contas existentes.

Não reative esta interface como se fosse parte do MyPlan V1: ela exige uma entrada,
estilos e validação dos fluxos de equipes próprios.
