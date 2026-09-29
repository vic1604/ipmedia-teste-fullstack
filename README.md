# Censo em foco

Aplicação web para consultar dados agregados do Censo Demográfico 2022 (IBGE) a partir do arquivo `censo.sqlite`, com duas telas:

- **Município**: busca com autocomplete pelo nome; mostra população total, número de setores censitários, área, densidade demográfica, situação dos setores (urbana/rural/não informado) e distribuição da população por sexo.
- **Estado**: escolha da UF; mostra os totais do estado (população, área, densidade) e a lista de municípios ordenada por densidade, com paginação.

## Como rodar

Requisitos: Docker com Docker Compose v2. Nada mais precisa ser instalado.

```
docker compose up
```

Na primeira execução as imagens são construídas (alguns minutos). Depois, abra:

- Aplicação: http://localhost:8080
- API (opcional): http://localhost:3000/api/estados

Para encerrar: `Ctrl + C` e, em seguida, `docker compose down`.

## Testes

Requisito: Node 22.

```
cd backend && npm install && npm test
cd frontend && npm install && npm test
```

- Back-end: Vitest (consultas ao banco e rotas da API).
- Front-end: Vitest + Testing Library (busca, indicadores e ranking com paginação).

## Estrutura

```
backend/    API em Node + TypeScript (Fastify + better-sqlite3)
frontend/   React + Vite, servido por nginx em produção
docs/       enunciado do teste e descobertas sobre os dados
openspec/   especificações do projeto (spec-driven, OpenSpec)
censo.sqlite   banco de dados original, versionado na raiz
docker-compose.yml
```

## API

- `GET /api/municipios?busca=texto`: sugestões de municípios (nome + UF).
- `GET /api/municipios/:codigo`: indicadores de um município.
- `GET /api/estados`: lista de estados.
- `GET /api/estados/:uf?pagina=1`: totais do estado e municípios por densidade (paginado).

## Decisões técnicas

- **Spec-driven com OpenSpec**: a especificação, o desenho e as tarefas ficam em `openspec/changes/censo-app/` e foram commitados antes da implementação.
- **Origem da população**: usei `setor.populacao` (total de 203.080.756). A soma de `demografia.moradores` dá 202.561.627, porque 9.327 setores não aparecem nessa tabela. Por isso ela é usada só para a distribuição por sexo, e em alguns municípios homens + mulheres é um pouco menor que a população total.
- **Município "fantasma"**: existe um registro com `cd_mun = '.'` (RS, 2 setores de água, população 0). Ele fica fora do autocomplete e do ranking, mas sua área continua nos totais do estado.
- **Situação vazia**: 1.103 setores têm `situacao` vazia e aparecem como "não informado", em vez de serem descartados.
- **Nomes repetidos**: há vários municípios com o mesmo nome (ex.: São Domingos, Bom Jesus). O autocomplete mostra nome + UF, e a identificação usa sempre o código do município.
- **Banco original intacto**: `censo.sqlite` é montado somente para leitura. Na inicialização, o back-end copia o banco para um volume de trabalho e cria os índices necessários nessa cópia (o original não tem índices).
- **Consultas no SQL**: as agregações (somas, contagens, densidade) são feitas no SQLite com `better-sqlite3`, e a paginação (50 por página) é feita no servidor.
- **Docker**: o nginx serve o front-end e faz proxy de `/api` para o back-end; o front-end só sobe depois do healthcheck do back-end. Tudo funciona com um único `docker compose up`.

## O que eu faria diferente

- Tratar o sinal de parada (SIGTERM) no back-end. Hoje o container é encerrado à força após 10 segundos (código 137) ao dar `Ctrl + C`.
- Pré-calcular uma tabela agregada por município na inicialização, em vez de agregar na hora a cada consulta.
- Adicionar testes ponta a ponta (com o Docker no ar) e um pipeline de CI no GitHub Actions rodando os testes.
- Melhorar a acessibilidade do autocomplete (navegação por teclado e leitores de tela) e adicionar cache nas respostas da API.

## Sobre o histórico de commits

Os primeiros commits (dataset, documentação dos dados e configuração do OpenSpec) foram de preparação. A implementação começou em 28/09/2026, por volta das 20h32. Usei o GitHub Copilot Chat como apoio na escrita do código a partir das especificações; revisei o resultado e executei os testes e o ambiente Docker.