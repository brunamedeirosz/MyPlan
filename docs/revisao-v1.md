# Revisão da V1 — 16/10/2026

Objetivo desta etapa: deixar o projeto preparado para teste no computador.
Não houve publicação nem envio das alterações ao GitHub.

## Avaliação e ajustes

| Área | Situação inicial | Resultado |
| --- | --- | --- |
| Ambiente local | Backend sem manifesto de dependências e dependente de PostgreSQL | Ambiente Python isolado, versões registradas, SQLite padrão e PostgreSQL opcional |
| Cadastro e login | Cadastro e JWT existentes; refresh armazenado sem uso | Validação de senha, renovação automática com requisição compartilhada e saída ao expirar a sessão |
| Equipes | Workspaces visíveis e modificáveis por qualquer usuário autenticado | Gestor e membros por workspace, consultas e relações limitadas à equipe |
| Gestor e colaborador | Todas as contas com as mesmas ações | Gestor gerencia equipe, projetos e tarefas; colaborador lê, comenta e altera status |
| Responsáveis | Qualquer usuário podia ser atribuído | Somente membros do workspace do projeto, tanto na interface quanto na API |
| Projetos e tarefas | Criação, edição, exclusão e quadro já existentes | Fluxos preservados com permissões e validação de status e prioridade |
| Prazos | Entrada sem fuso e edição cortando a string UTC | Conversão entre horário do navegador e ISO com fuso; edição preserva o instante |
| Dashboard | Próximas tarefas incluíam concluídas | Lista considera apenas tarefas abertas |
| Notas | Salvamento silencioso em caso de erro e requisições concorrentes | Fila de gravação, aviso e nova tentativa, isolamento visual ao trocar de conta e posição limitada à tela |
| Configuração | DEBUG fixo, CORS aberto e senha padrão do PostgreSQL | Configuração por ambiente, origens locais explícitas e segredo obrigatório fora do desenvolvimento |
| Dependências JS | Nove alertas no npm audit | Lock atualizado dentro das faixas permitidas; auditoria sem alertas na validação |
| Documentação | README principal com uma frase | Instalação Windows, configuração, testes, fluxo de uso e cuidados de migração documentados |

## Validação

- 29 testes de API aprovados com banco SQLite temporário.
- 2 testes de conversão de datas aprovados no fuso de São Paulo.
- 6 cenários de navegador aprovados no Chromium, com banco `e2e.sqlite3` separado.
- Fluxo real de cadastro, workspace, projeto, tarefa, edição do prazo, comentário,
  conclusão, nota, recarga e saída validado no navegador.
- Colaborador sem ações de gestão, renovação de sessão e falha/repetição ao salvar nota validados.
- Quadro e nota conferidos em largura de 390 px, sem transbordamento horizontal da página.
- Lint, build, Django check, migrações sem alterações pendentes e pip check aprovados.
- PostgreSQL, outros navegadores e ambiente publicado não foram testados nesta etapa.

## Limites e trabalho posterior

A V1 documentada pode ser testada localmente. Antes da publicação ainda será necessário
preparar hospedagem, HTTPS, servidor de aplicação, arquivos estáticos, segredo exclusivo,
hosts/origens, banco persistente e backups. Recuperação de senha por email não foi implementada.

Notificações, chat interno, controle de horas e integração com GitHub são funcionalidades
futuras nos requisitos originais; não fazem parte desta etapa. A equipe é definida no
workspace e compartilhada por seus projetos. Não há papéis personalizados ou participantes
independentes por projeto.

A migração 0007 mantém workspaces antigos sem gestor até atribuição manual por um
administrador; essas áreas não ficam automaticamente disponíveis a qualquer conta.

## Referências técnicas

- [Permissões no Django REST Framework](https://www.django-rest-framework.org/api-guide/permissions/)
- [Configuração do Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/en/stable/getting_started.html)
- [Checklist oficial de publicação do Django](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/)


## Ajuste do primeiro uso

A conta recém-criada não tinha workspace ou projeto. A interface desabilitava a criação
de tarefas e exigia descobrir a sequência de cadastro em três páginas diferentes.
Os registros da tentativa mostravam consultas vazias sem requisições de criação.

Agora o dashboard oferece “Criar minha primeira tarefa”. No quadro, “Nova tarefa”
abre a preparação do workspace e do projeto se necessário, sem sair da tela.
Projetos gerenciados já existentes são pré-selecionados. Novos projetos também podem
ser preparados pelo formulário de tarefa, preservando o título digitado.

A migração 0008 torna descrição e prazo de projeto opcionais e descrição de tarefa
opcional, preservando os dados existentes. O quadro confirma o salvamento e seleciona
o projeto da tarefa criada para que ela fique visível imediatamente.

Os cenários de navegador agora cobrem uma conta vazia partindo do dashboard e outra
partindo de “Nova tarefa”, incluindo a segunda tarefa e a persistência após recarregar.
Os testes usam portas 8001 e 5175, independentes dos servidores locais de uso normal.
