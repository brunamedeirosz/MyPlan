# Publicação do MyPlan

## Demonstração no GitHub Pages

A demonstração usa os mesmos componentes React e um adaptador Axios local.
`VITE_DEMO_ONLY=true` abre o planner com exemplos e desabilita o fluxo de contas.
Tarefas e espaços ficam em `sessionStorage`, separados dos tokens reais em
`localStorage`. O clima é opcional e continua usando a Open-Meteo quando ativado.
Fechar a aba encerra os dados de demonstração; “Restaurar exemplo” recomeça o roteiro.

O workflow `.github/workflows/demo.yml` gera o build com o caminho do repositório
e publica pelo artefato oficial do Pages, sem branch de arquivos compilados.

1. Disponibilize GitHub Pages no repositório: **Settings → Pages → Source → GitHub Actions**.
2. Execute **Actions → Publicar demonstração → Run workflow**.
3. Para atualizar automaticamente após a CI aprovada em `main`, crie a variável
   de repositório `PUBLISH_DEMO=true` em **Settings → Secrets and variables → Actions → Variables**.
4. Use a URL retornada pelo deployment no campo Website e no início do README.

A disponibilidade do Pages em repositórios privados depende do plano da conta.
A visibilidade do código deve ser decidida pela mantenedora antes de tornar um
repositório privado público. Nenhum segredo é necessário para compilar a demo.

Para testar esse build localmente, na pasta `frontend`, em PowerShell:

```powershell
$env:VITE_DEMO_ONLY='true'
$env:VITE_BASE_PATH='/MyPlan/'
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

Abra o endereço exibido pelo Vite com `/MyPlan/`. Ao terminar, remova as variáveis
com `Remove-Item Env:VITE_DEMO_ONLY, Env:VITE_BASE_PATH` antes de compilar a versão com API.

## Aplicação completa com contas

O `Dockerfile` compila React e executa Django/Gunicorn, servindo a interface e a API
no mesmo domínio. A interface usa `/api/`, e WhiteNoise serve o build e os estáticos
do admin. É necessário Docker em ambiente Linux e PostgreSQL persistente externo.
O Docker não está instalado no computador usado nesta revisão; a construção e o
teste integrado da imagem estão previstos na CI Linux.

Crie um arquivo privado de ambiente fora do Git, com:

```dotenv
DJANGO_DEBUG=false
DJANGO_SETTINGS_MODULE=config.production
SECRET_KEY=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO_DE_NO_MINIMO_50_CARACTERES
ALLOWED_HOSTS=myplan.seudominio.com
CSRF_TRUSTED_ORIGINS=https://myplan.seudominio.com
DB_ENGINE=postgresql
DB_NAME=myplan
DB_USER=myplan
DB_PASSWORD=SUBSTITUA_PELA_SENHA_DO_BANCO
DB_HOST=HOST_DO_BANCO
DB_PORT=5432
DB_SSLMODE=require
PORT=8000
TRUST_PROXY_HTTPS=true
NUM_PROXIES=1
```

Gere o segredo com `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
Configure `TRUST_PROXY_HTTPS=true` apenas se o proxy de hospedagem substituir
`X-Forwarded-Proto` e impedir acesso direto externo ao container. Ajuste
`NUM_PROXIES` à quantidade real de proxies confiáveis. O proxy deve entregar HTTPS
ao navegador, encaminhar HTTP ao container e preservar o host público.

Na raiz do repositório:

```sh
docker build -t myplan:1.0.0 .
docker run --rm --env-file /caminho/privado/myplan.env myplan:1.0.0 python manage.py check --deploy --fail-level WARNING
docker run -d --name myplan --env-file /caminho/privado/myplan.env -p 127.0.0.1:8000:8000 myplan:1.0.0
```

O comando de início executa as migrações antes do Gunicorn. Esta receita considera
uma instância. Para múltiplas réplicas, execute migrações em uma etapa de release e
substitua o cache em arquivos por um cache compartilhado entre instâncias.

`GET /api/health/` verifica a conexão com o banco e retorna 200 ou 503 sem expor
credenciais. Logs saem em stdout/stderr. Login e renovação têm limite básico de
30 tentativas/minuto por IP; cadastro, 10/hora. Esses limites do DRF são uma proteção
básica, sujeita a concorrência, e podem ser complementados no proxy.

O perfil de produção desliga as rotas antigas de equipes, exige segredo e PostgreSQL,
ativa cookies seguros e redirecionamento HTTPS. HSTS começa com uma hora.
O aviso `security.W021` é silenciado deliberadamente: preload não é ativado sem a
decisão de adesão do domínio à lista dos navegadores.

## Verificação e dados

- Valide cadastro, login, criação, edição, conclusão e persistência após recarregar.
- Entre com outra conta e confirme o isolamento das tarefas e dos espaços.
- Confira os temas e as telas de 390 px e desktop na URL HTTPS.
- Configure backup no provedor do PostgreSQL antes de oferecer contas para uso real.
  Faça um `pg_dump` em formato custom e teste `pg_restore` em um banco separado;
  registre retenção e data do último teste de restauração. Um backup não foi criado
  por esta receita, pois o provedor e o banco ainda precisam ser definidos.
- Senhas não têm recuperação por email nesta V1. A demo sem cadastro é o caminho
  indicado para quem está avaliando o portfólio.

Referências: [Pages com Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[checklist Django](https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/),
[WhiteNoise](https://whitenoise.readthedocs.io/en/stable/django.html).
