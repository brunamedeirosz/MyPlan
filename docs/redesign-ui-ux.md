# MyPlan — revisão de UI/UX

## Análise inicial e limites da intervenção

O projeto utiliza React 19, Vite, Axios e estado local; autenticação e persistência são
responsabilidade da API Django REST Framework. A entrada ativa era PersonalApp.jsx;
o App.jsx de equipes já estava fora da navegação atual. Não havia roteamento adicional
a criar para o planner. Tarefas, espaços, busca, favoritos, calendário colorido, histórico,
renovação de sessão e desfazer exclusão já existiam e foram reaproveitados.

Os principais riscos eram os estilos sobrepostos em dois arquivos, a duplicação de regras
entre visões, o erro de datas por fuso e a possibilidade de duplicar tarefas recorrentes.
O plano foi apresentado antes das alterações estruturais: primeiro identidade/layout,
depois navegação/calendário e por último campos adicionais e validação.

## Implementação

- Tema consolidado em planner.css: fundo preto, superfícies neutras, texto claro e cores por espaço no calendário. Inter é servido localmente e sua licença está junto do arquivo.
- Navegação principal Hoje e Importantes, além dos espaços pessoais.
- Cartões legíveis com título clicável; opções de cadastro e filtros recolhidos.
- Painéis esquerdo e direito recolhíveis; menu recolhível no celular.
- Perfis/preferências locais para densidade e exibição de tarefas concluídas.
- Componente TaskRow compartilhado: conclusão, espaço, prazo, atraso, prioridade,
  progresso do checklist, recorrência e ações de editar, destacar e excluir.
- Editor em dialog nativo com foco contido, fechamento com Escape e manutenção do
  rascunho em caso de erro. Confirmação antes da exclusão e desfazer depois dela.
- Visões Lista, Semana e Calendário, com filtros preservados e a mesma coleção de tarefas.
- Agrupamento por atrasadas, hoje, próximas, sem prazo e concluídas na lista.
- Calendário lateral mantém a visão de todos os espaços por cor, conforme a definição
  anterior do produto, independentemente do espaço filtrado na lista.
- Agenda com criação vinculada à data, próximos prazos e navegação por setas no mês.
- Feedback discreto de criação, edição e conclusão, estados de carregamento e erro.
- Ações secundárias acessíveis por foco; visíveis em touch. Área de conclusão de 44 px
  no celular. As transições respeitam prefers-reduced-motion.

## Modelo e compatibilidade

A migração 0013 somente adiciona campos ao modelo atual. Os endpoints existentes,
auth e chaves de sessão foram mantidos. Nenhum dado de demonstração foi inserido no banco
local. Foi criada uma cópia local do SQLite antes da migração, fora do versionamento.

Descrição, prioridades, checklist e recorrência são validados na API. A criação da próxima
ocorrência usa transação e uma relação interna para evitar duplicação. Uma ocorrência
atrasada avança para o futuro; meses curtos preservam a âncora original (31 de janeiro,
28 de fevereiro, 31 de março). O checklist é reiniciado na próxima ocorrência.

A recorrência é gerada ao concluir; não é um agendador em segundo plano. A restauração de
uma ocorrência concluída já encadeada é feita como histórico sem repetição para preservar
a próxima tarefa já existente. As preferências são locais ao navegador.

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| frontend/src/PersonalApp.jsx | Integração das interações e estado existentes |
| frontend/src/planner.css | Tema e layout responsivo consolidados |
| frontend/src/Icon.jsx | Ícones compartilhados |
| frontend/src/TaskRow.jsx | Apresentação de uma tarefa |
| frontend/src/TaskEditor.jsx | Editor com descrição, checklist, datas e recorrência |
| frontend/src/TaskViews.jsx | Semana e calendário ampliado |
| frontend/src/plannerFilters.js | Regras compartilhadas de filtro e ordenação |
| frontend/src/PlannerDialogs.jsx | Confirmação e preferências |
| frontend/src/TaskCalendar.jsx | Agenda, atalhos e calendário lateral |
| backend/core/models.py e serializers.py | Campos adicionais e validação |
| backend/core/views.py e recurrence.py | Conclusão e geração da próxima ocorrência |
| backend/core/migrations/0013_* | Migração aditiva |
| backend/core/tests.py, frontend/src/*.test.js e frontend/e2e/personal.spec.js | Testes |

## Validação

- 51 testes da API aprovados, cobrindo isolamento, compatibilidade, validação de checklist,
  prioridade, recorrência, datas mensais e reabertura sem duplicação.
- Nove testes de datas/filtros aprovados no Node.js.
- 14 cenários no Chromium validados: fluxos existentes e novos, autenticação, persistência,
  edição por teclado, rascunho em falha, confirmação/desfazer, recorrência, visões e filtros.
- Lint e build aprovados. Não há typecheck separado nesta base JavaScript.
- Inspeção em 360, 390, 768, 1024 e 1440 px, sem transbordamento horizontal da página.
- Capturas de desktop e mobile e do modal mobile geradas em frontend/test-results/.
- Testes de navegador usam banco e portas próprios; não alteram os dados de uso local.

Safari, Firefox, navegadores de celulares físicos e concorrência sob carga não foram
validados nesta etapa. Publicação, instalação e modo offline seguem como evoluções futuras.

## Referências de implementação

- [Transações no Django](https://docs.djangoproject.com/en/6.0/topics/db/transactions/)
- [Validação no Django REST Framework](https://www.django-rest-framework.org/api-guide/serializers/#validation)
