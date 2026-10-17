# MyPlan

Seu dia, organizado.

**MyPlan** é um planner pessoal para reunir tarefas, checklists e prazos em um só lugar.
Separe as demandas da vida pessoal, do trabalho e dos estudos e acompanhe tudo pelo
calendário. A interface é minimalista, com modos claro e escuro, destaques em tons de cinza e fonte Inter hospedada no próprio projeto. Adapta-se ao celular e ao desktop.

## Funcionalidades

- **Tarefas e checklist:** lista compacta com conclusão por toque. As tarefas aparecem primeiro; o campo de adicionar fica abaixo. Acrescente descrição e subtarefas pelo editor e marque cada etapa como concluída.
- **Organização:** edite pelo modal, escolha prioridade baixa, média ou alta, destaque tarefas importantes e filtre ou ordene por prazo, prioridade, espaço e situação.
- **Espaços pessoais:** Pessoal, Trabalho e Estudos vêm prontos; você pode criar, renomear, excluir e mover tarefas entre espaços.
- **Calendário:** defina prazos opcionais e veja as tarefas de todos os espaços, identificadas por cores.
- **Agenda do dia:** selecione uma data para consultar suas tarefas e conclua ou reabra itens diretamente na agenda.
- **Pendências e histórico:** navegue por Hoje e Importantes, acompanhe atrasos e mantenha as tarefas concluídas no calendário.
- **Visualizações:** alterne entre Lista, Semana e Calendário sem trocar a fonte de dados.
- **Recorrência:** repita tarefas diariamente, semanalmente ou mensalmente. Ao concluir uma ocorrência, a próxima é criada com o checklist reiniciado.
- **Preferências:** alterne entre modo claro e escuro pelo ícone de sol/lua no topo ou pelas configurações. A escolha fica salva neste navegador. Também é possível recolher painéis, usar lista compacta e incluir concluídas.
- **Tempo hoje:** consulte temperatura atual, mínima, máxima e chance de chuva pela Open-Meteo. Ao abrir, permita a localização para ver a previsão da sua região automaticamente. O card fica aberto acima do calendário; a busca manual por cidade continua disponível em **Localização e opções**.
- **Conta pessoal:** suas tarefas e espaços são salvos no banco e isolados das outras contas.

No desktop, lista e calendário aparecem lado a lado. No celular, a navegação inferior
permite alternar entre Tarefas, Semana e Calendário. O botão **Menu** abre um painel lateral com filtros, espaços e conta.
A previsão aparece numa faixa compacta no celular; mínima, máxima e chance de chuva ficam em **Opções**.

## Começar a usar

1. Crie uma conta ou entre com sua conta existente.
2. Escolha um espaço, se desejar.
3. Digite uma tarefa e pressione Enter.
4. Novas tarefas vêm com a data de hoje. Para alterar, abra **Espaço, data e opções** ou edite a tarefa.
5. Use o calendário para consultar as demandas de cada dia.

O **+** ao lado de Espaços abre o gerenciamento. Você pode transformar Estudos em Faculdade
ou criar espaços para outros assuntos. Excluir um espaço mantém suas tarefas em **Sem espaço**;
as opções removidas não voltam ao entrar novamente.

O calendário reúne todos os espaços, mesmo quando a lista está filtrada. Os marcadores
coloridos e a legenda identificam a origem das tarefas. Um marcador vazado indica que
todas as tarefas daquele espaço no dia foram concluídas. **Ver tarefas deste dia** abre
a lista do dia com todos os espaços; **Ver todas as datas** remove o filtro por data.

## Tecnologias

- Interface: React, Vite e CSS.
- API: Django REST Framework e autenticação JWT.
- Banco local: SQLite, com opção de configurar PostgreSQL.
- Verificação: testes da API Django, testes de datas com Node.js e fluxos de navegador com Playwright.

## Executar localmente no Windows

Pré-requisitos: Python 3.12 a 3.14 e Node.js 22.12+.
O projeto foi validado neste computador com Python 3.14 e Node 24.

Os comandos de instalação partem da pasta raiz do repositório:

```powershell
cd backend
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
cd ..\frontend
npm.cmd ci
```

Em um terminal, a partir da raiz, inicie a API:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver
```

Em outro terminal, a partir da raiz, inicie a interface:

```powershell
cd frontend
npm.cmd run dev
```

Abra **http://localhost:5173**. No PowerShell, `npm.cmd` evita o bloqueio de execução de
`npm.ps1`. O servidor Django padrão recarrega o código quando os arquivos são alterados.
Após uma atualização com novas migrações, execute `manage.py migrate` com o Python da `.venv`.

## Configuração e dados

Os padrões permitem executar localmente sem instalar PostgreSQL. Os dados ficam em
`backend/db.sqlite3`, que não é versionado.

Para personalizar, copie `backend/.env.example` para `backend/.env` e
`frontend/.env.example` para `frontend/.env` e reinicie os servidores.

| Variável | Finalidade |
| --- | --- |
| `DJANGO_DEBUG` | Habilitar o modo de desenvolvimento. |
| `SECRET_KEY` | Segredo exclusivo, obrigatório fora do desenvolvimento. |
| `ALLOWED_HOSTS` | Hosts aceitos pela API, separados por vírgula. |
| `CORS_ALLOWED_ORIGINS` | Origens da interface aceitas pela API, separadas por vírgula. |
| `DB_ENGINE` | `sqlite` por padrão; `postgresql` usa as variáveis `DB_*` do exemplo. |
| `VITE_API_URL` | URL da API, incluindo `/api/`. |

Prazos são datas sem horário, evitando alteração de dia por conversões de fuso.
A API define o usuário pela sessão e valida que o espaço escolhido pertence à mesma conta.
Veja os relacionamentos em [Banco de dados](docs/banco-de-dados.md).

## Verificações

Na pasta `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test
```

Na pasta `frontend`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Os testes de navegador usam portas próprias, 8001 e 5175, e o banco `e2e.sqlite3`,
separado dos dados de uso local. A cobertura inclui cadastro, login, persistência,
isolamento entre contas, checklist, espaços, calendário, falhas ao salvar e uso no celular.

## Estado do projeto

O MyPlan está em desenvolvimento e disponível para teste local pelo navegador.
Para acessar de outro aparelho, a aplicação precisa estar disponível por uma URL
acessível a ele; `localhost` no celular aponta para o próprio celular.

Publicação, instalação como aplicativo, suporte offline, recuperação de senha por email
e integração com calendários externos são etapas futuras. O calendário atual organiza
as tarefas cadastradas no MyPlan.

A proposta do produto está em [Requisitos](docs/requisitos.md).


## Redesign e detalhes de uso

O [relatório de UI/UX](docs/redesign-ui-ux.md) descreve a análise, os arquivos alterados,
a migração e as verificações realizadas. As preferências de layout são salvas neste
navegador; os dados das tarefas continuam na API e no banco.

A recorrência exige prazo. Uma próxima ocorrência é criada somente ao concluir a atual,
não por um processo em segundo plano. Se uma ocorrência estiver atrasada, o próximo prazo
avança para uma data futura; a repetição semanal mantém o dia da semana e a mensal mantém
o dia original, limitado ao último dia dos meses mais curtos.

Reabrir e concluir novamente uma ocorrência não duplica a próxima tarefa já existente.
Desfazer a exclusão de uma ocorrência concluída que já gerou a próxima restaura o item
como histórico sem repetição, preservando a próxima ocorrência independente.

## Previsão do tempo

O resumo consulta diretamente a [Open-Meteo](https://open-meteo.com/en/docs), sem chave de API,
usando a localização aproximada após a permissão do navegador ou uma cidade escolhida manualmente. As coordenadas do dispositivo são arredondadas para duas casas decimais e ficam apenas na memória;
a preferência de modo e as cidades escolhidas manualmente ficam salvas neste navegador.
Ao negar a permissão, a busca por cidade continua disponível. A opção **Desativar tempo**
interrompe o modo automático até a pessoa ativá-lo novamente.
A busca de cidades usa a API de geocodificação da
Open-Meteo, com dados do GeoNames. As requisições externas não incluem tokens do MyPlan.
A previsão é atualizada a cada 30 minutos com a página visível e pode ser atualizada manualmente.
Falhas do serviço não impedem o uso das tarefas. O resumo mostra o tempo de hoje na cidade
escolhida, independentemente da data selecionada no calendário.

A API gratuita é destinada a uso não comercial e tem limites de chamadas. Antes de uma
oferta comercial, consulte os [termos da Open-Meteo](https://open-meteo.com/en/terms).
