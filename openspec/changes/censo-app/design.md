# Design

## Context

O projeto contém o `censo.sqlite` original e não tem aplicação existente. O arquivo tem cerca de 468 mil setores, não possui índices além das chaves primárias e deve permanecer intacto. As regras de agregação e exceções estão em `docs/descobertas-dados.md`; os contratos funcionais estão em `specs/censo-consultas/spec.md`.

## Goals / Non-Goals

**Goals:** cumprir os fluxos da spec, evitar escrita no banco original, manter consultas rápidas e iniciar toda a aplicação com `docker compose up`.

**Non-Goals:** alterar ou versionar uma base derivada, adicionar banco servidor ou criar funcionalidades além das consultas do teste.

## Decisions

- **Backend:** Node.js + TypeScript, Fastify e better-sqlite3 em `backend/`. Expor operações de autocomplete, detalhe municipal e consulta estadual paginada.
- **Cópia de trabalho:** montar `censo.sqlite` no container como somente leitura e usar `.data/censo.sqlite` para a cópia persistente. Na inicialização, criar a cópia se ausente; abrir a cópia para criar `idx_setor_cd_mun`, `idx_demografia_cd_setor` e `idx_municipio_cd_uf` com `CREATE INDEX IF NOT EXISTS`; depois fechar essa conexão e reabri-la somente leitura para servir consultas. Adicionar `.data/` ao `.gitignore`; o Compose monta esse diretório sem etapa manual. Nunca escrever no arquivo original.
- **Agregações:** população e situação vêm de `setor`; sexo vem de `demografia`. Excluir `cd_mun = '.'` das opções e do ranking, mas manter sua área nos totais da UF. Classificar situação nula como "não informado".
- **Frontend:** React + TypeScript + Vite em `frontend/`, com rotas/telas distintas para município e UF. Paginar o ranking em 50 municípios, ordenando por densidade decrescente e, em empates, nome e `cd_mun` crescentes para manter páginas estáveis.
- **Qualidade e execução:** Vitest no backend e frontend. Docker Compose constrói e inicia ambos os serviços com `docker compose up`; o README registra execução e decisões técnicas.
- **Alternativas:** indexar o banco original foi descartado por violar o requisito de somente leitura; consultar sem índices não atende ao volume de setores; um banco servidor não é necessário para este arquivo local.

## Risks / Trade-offs

- [Cópia persistente fica desatualizada se o arquivo fonte for substituído] → documentar que `.data/` deve ser removido para reconstruir a cópia; o conjunto de dados entregue é fixo.
- [Primeira inicialização gasta tempo copiando a base e criando índices] → persistir `.data/` entre execuções do Compose e criar índices somente quando ausentes.

## Migration Plan

Não há migração de aplicação existente. O primeiro `docker compose up` cria `.data/censo.sqlite` e os índices; execuções seguintes reutilizam a cópia. Para recomeçar, parar os serviços e remover `.data/` antes de subir novamente.