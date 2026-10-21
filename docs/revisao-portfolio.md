# Revisão do MyPlan para portfólio — 20/10/2026

## Implementação após a revisão

O diagnóstico abaixo foi preservado como registro inicial. Na etapa seguinte foram
implementados README com capturas reais, documentação de publicação, diagrama do
domínio pessoal, licença MIT, changelog V1, modo de demonstração isolado, identidade
MyPlan no pacote e separação da interface antiga em `frontend/legacy/`.

Também foram adicionados CI Linux/Windows, workflow do Pages, Dockerfile,
perfil de produção com PostgreSQL/Gunicorn/WhiteNoise, limites básicos de autenticação
e endpoint de saúde. O perfil de produção desativa as rotas de equipes.

Validação local final: 54 testes de API, 12 testes de regras do frontend e 23 cenários
de navegador aprovados; lint, build e migrações sem pendências. O Playwright agora
encerra os servidores e retorna o resultado sozinho. O build exclusivo de demonstração
foi testado em `/MyPlan/`, incluindo fonte, edição e persistência sem chamadas à API.

`check --deploy --fail-level WARNING` aprovou o perfil de produção; somente W021
fica silenciado deliberadamente porque HSTS preload exige decisão sobre o domínio.
Docker e PostgreSQL não estão disponíveis localmente; a verificação da imagem,
do banco e da interface com contas passou na
[CI do GitHub](https://github.com/brunamedeirosz/MyPlan/actions/runs/39534670959),
assim como os testes de navegador em Linux e Windows.

A auditoria npm encontrou falhas altas em `follow-redirects` e Vite. Ambos foram
atualizados dentro das faixas permitidas; a auditoria completa passou sem alertas.
Uma busca por padrões conhecidos de tokens e chaves no histórico Git não encontrou
ocorrências; não havia `.env`, chaves privadas ou bancos SQLite no histórico.
Essa busca limitada não equivale a uma auditoria completa de segredos.

O remoto foi atualizado para `brunamedeirosz/MyPlan`. Após autorização da mantenedora,
o repositório foi tornado público e o Pages habilitado para a demonstração em
`https://brunamedeirosz.github.io/MyPlan/`. A aplicação com contas ainda exige
hospedagem e PostgreSQL próprios; o modo de demonstração é publicado separadamente.

A [publicação do Pages](https://github.com/brunamedeirosz/MyPlan/actions/runs/39535044793)
foi concluída. A URL HTTPS foi validada no Chromium: criação de tarefa, persistência
após recarregar, largura de 390 px, visão semanal e restauração do exemplo passaram,
sem erros de JavaScript nem chamadas à API Django.

## Diagnóstico inicial

O núcleo do planner já está implementado. A conclusão para portfólio depende
principalmente de apresentação, organização do repositório, automação e uma
demonstração acessível. Não é necessário ampliar o produto para encerrar a V1.

Esta revisão considera o checkout local, associado ao remoto
`https://github.com/brunamedeirosz/devdesk.git`. Não verifica a visibilidade,
os metadados ou as configurações atuais desse repositório no GitHub.

## Evidências

- Django check: aprovado, sem problemas.
- Migrações: nenhuma alteração pendente detectada.
- API: 51 testes aprovados com banco temporário SQLite.
- Frontend: lint, 9 testes de regras e build de produção aprovados.
- Dependências Python: `pip check` aprovado.
- Navegador: os 20 cenários ativos do Playwright no Chromium reportaram aprovação;
  cobrem cadastro, sessão, tarefas, espaços, calendário, recorrência, temas,
  clima simulado e navegação mobile. Depois do último cenário, o processo permaneceu
  ativo sem imprimir o resumo final; por isso o encerramento automático da suíte
  ainda precisa ser investigado, especialmente antes de configurar a CI.
- Inspeção visual das capturas geradas pelos testes; a interface já oferece
  lista, espaços, calendário e adaptação para celular.
- `manage.py check --deploy`, com a configuração local carregada, emitiu cinco
  avisos: HSTS, redirecionamento HTTPS, cookies de sessão e CSRF seguros e DEBUG.
  São pendências de preparação de produção, não falhas dos testes locais.

## Pendências por prioridade

| Prioridade | Pendência | Evidência e critério para concluir |
| --- | --- | --- |
| Alta, antes de publicar a aplicação | Configuração de produção | `backend/config/settings.py` usa DEBUG por padrão e não configura as opções HTTPS/cookies apontadas acima. Preparar configuração explícita para produção, segredo exclusivo, hosts, origens e URL HTTPS da API; executar novamente `check --deploy` nesse ambiente. Configurar proxy/HSTS conforme a hospedagem. |
| Alta, para demonstração online | Hospedagem da interface e API | Há comandos locais e build, mas não há receita versionada de publicação nem endereço de demonstração no README. Configurar servidor WSGI/ASGI de produção, entrega dos arquivos estáticos, migrações, persistência do banco, backup e logs. Validar cadastro, login, tarefas e recarga na URL pública. |
| Alta, para apresentação no GitHub | README visual e direto | `README.md` explica bem o uso local, mas não inclui capturas, vídeo/GIF ou link de demonstração. Incluir telas de desktop e celular com dados fictícios, proposta, principais decisões técnicas e limitações. Colocar a demonstração perto do início. |
| Alta, para coerência | Consolidar identidade MyPlan | O remoto ainda é `devdesk`; `frontend/package.json` usa `frontend` e versão `0.0.0`; `docs/banco-de-dados.md` começa por DevDesk. Atualizar nomes públicos e metadados. Preservar chaves internas e dados existentes, ou migrá-los explicitamente. |
| Média, para revisão técnica | Automatizar verificações no GitHub | Não há workflow versionado em `.github/workflows`. Criar CI para API, migrações, lint, testes e build; incluir os fluxos de navegador. `frontend/playwright.config.js` depende do caminho Windows da venv e precisa ser adaptado caso a CI rode em Linux. |
| Média, para manutenção | Delimitar legado de equipes | `main.jsx` usa `PersonalApp.jsx`; `App.jsx`, componentes de equipes e estilos antigos continuam no repositório. As APIs antigas também seguem registradas em `backend/core/urls.py`, e `e2e/devdesk.spec.js` está fora da seleção ativa do Playwright. Documentar o legado e decidir seu destino. Remover código e modelos exige avaliar dependências e dados; não apagar migrações já aplicadas. |
| Média, para documentação técnica | Corrigir descrição do banco | `docs/banco-de-dados.md` afirma que o calendário parte do espaço selecionado, enquanto o produto atual reúne todos os espaços. Reorganizar o documento com o modelo pessoal primeiro e atualizar o diagrama conforme o esquema atual. |
| Média, para facilitar avaliação | Demonstração com conteúdo | O acesso começa pelo cadastro e o planner fica vazio numa conta nova. Oferecer um roteiro curto e dados fictícios reproduzíveis; um modo de demonstração isolado pode reduzir o esforço de quem avalia. Evitar uma conta pública compartilhada com escrita irrestrita. |
| Média, antes de abrir cadastro ao público | Proteção contra abuso | Não há limitação de tentativas configurada na aplicação para login/cadastro. Definir proteção na aplicação ou infraestrutura e verificar seu funcionamento no ambiente publicado. |
| Baixa, acabamento | Licença e release | Não há licença do projeto na raiz. Escolher uma licença caso a intenção seja permitir reutilização; preservar licenças de terceiros. Publicar uma versão V1 com descrição do escopo e configurar descrição, tópicos e link do projeto no GitHub. |

O preparo de produção deve seguir o
[checklist oficial do Django](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/).
GitHub armazena o código; uma demonstração completa precisa também executar a API
Django e manter seus dados persistentes.

## O que pode ficar depois da V1

- PWA, instalação e funcionamento offline.
- Integração com calendários externos.
- Notificações e novas funcionalidades de equipes.
- Recuperação de senha por email: pode ficar documentada como limite de uma demo;
  deve entrar no planejamento caso o serviço seja oferecido para uso cotidiano.
- Paginação e otimizações para grandes históricos. Hoje a API retorna a lista
  completa e os filtros são locais; qualquer paginação precisa preservar a visão
  do calendário e das recorrências.
- Dividir mais o componente `PersonalApp.jsx`, que concentra mais de mil linhas.
  É uma melhoria de manutenção, sem impedir uma primeira apresentação funcional.

## Sequência sugerida para encerrar

1. Consolidar nomes, documentação do banco e delimitação do legado.
2. Automatizar os checks e tornar a execução dos testes reproduzível na CI.
3. Preparar configuração de produção e publicar uma demonstração com dados fictícios.
4. Validar a URL publicada no desktop e celular, incluindo persistência e isolamento de contas.
5. Acrescentar capturas e link no README, definir licença e publicar a V1 no GitHub.

## Limites da revisão

Os resultados locais não comprovam o comportamento de uma hospedagem ainda não
validada. PostgreSQL, Firefox, WebKit, restauração de backup e uma auditoria completa
de segurança/acessibilidade não fizeram parte desta revisão. As chamadas de clima
nos testes de navegador usam respostas simuladas. Não foi feita auditoria de todo o
histórico Git para segredos nem auditoria atual de vulnerabilidades de dependências.
Nenhuma alteração funcional, publicação ou envio ao GitHub foi feito nesta revisão.
