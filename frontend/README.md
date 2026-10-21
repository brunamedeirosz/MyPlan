# MyPlan · Interface

Interface do planner pessoal MyPlan, feita com React e Vite, com tema preto e layouts
para celular e desktop. A tela reúne checklist, espaços pessoais e calendário de tarefas.

Consulte o [README principal](../README.md) para instalação e execução.

## Código principal

- `src/main.jsx`: entrada da aplicação.
- `src/PersonalApp.jsx`: conta, lista de tarefas e integração dos componentes.
- `src/SpacesManager.jsx`: criação, renomeação e exclusão de espaços.
- `src/TaskCalendar.jsx`: calendário e agenda diária de todos os espaços.
- `src/planner.css`: estilos ativos consolidados e tokens do tema.
- `src/Icon.jsx`, `src/TaskRow.jsx` e `src/TaskEditor.jsx`: componentes reutilizáveis de ícones, tarefas e edição.
- `src/TaskViews.jsx` e `src/plannerFilters.js`: visões e regras compartilhadas de filtro, agrupamento e ordenação.
- `src/PlannerDialogs.jsx`: confirmação de exclusão e preferências.
- `public/fonts/`: fonte Inter e licença OFL.
- `src/api.js`, `src/session.js`: conexão com a API, renovação e isolamento da sessão de demonstração.
- `src/demo.js`: adaptador local com dados fictícios por aba, sem servidor.

## Comandos

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:demo
```

As tarefas são persistidas pela API Django. `VITE_API_URL` define o endereço da API.
Os testes ativos do Playwright estão em `e2e/personal.spec.js` e `e2e/demo.spec.js` e usam banco e portas separados.
`e2e/setup.js` descobre o Python e controla o início e o encerramento dos servidores em Windows e Linux.

Para abrir a demo, acesse `/?demo=1` ou escolha **Experimentar demonstração** no login.
`VITE_DEMO_ONLY=true` gera uma versão exclusivamente de demonstração para o Pages.
`VITE_BASE_PATH` define o caminho de publicação; por padrão usa `/`.

## Compatibilidade

O código anterior de equipes permanece em `legacy/` e não é a entrada da interface atual.
As chaves internas de sessão com prefixo `devdesk_` foram preservadas para manter os logins existentes.


`legacy/personal.css` e `legacy/theme-dark.css` ficam como referência das versões anteriores, fora
da entrada ativa. A stack permanece JavaScript; não há um script de typecheck configurado.
O Prettier foi usado apenas para formatar os arquivos, sem adicionar dependência ao projeto.
