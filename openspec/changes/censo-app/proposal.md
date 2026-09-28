# Proposal

## Why

O arquivo do Censo já está disponível, mas falta uma forma simples de consultar indicadores por município e comparar municípios dentro de um estado. A aplicação deve entregar os dois fluxos exigidos pelo teste técnico com dados agregados consistentes e listas que funcionem em estados grandes.

## What Changes

- Criar uma tela de busca de municípios com autocomplete e indicadores agregados, incluindo população, setores, área, densidade, situação e sexo.
- Criar uma tela de consulta por UF com totais estaduais e ranking paginado de municípios por densidade.
- Entregar execução local por `docker compose up`, testes automatizados nas duas aplicações e README de execução e decisões técnicas.

## Capabilities

### New Capabilities
- `censo-consultas`: busca e apresentação de indicadores do Censo por município e por UF.

### Modified Capabilities
- Nenhuma.

## Impact

- `backend/`: API e consultas agregadas sobre `censo.sqlite`.
- `frontend/`: telas de busca municipal e estadual.
- Docker Compose, testes Vitest e README.
- O banco existente na raiz será aberto somente para leitura.