# Tasks

## 1. Backend e dados

- [ ] 1.1 Criar `backend/` com Node.js, TypeScript, Fastify, better-sqlite3 e Vitest; implementar cópia de `censo.sqlite` para `.data/`, índices idempotentes e conexão de consulta somente leitura; verificar com testes que a origem permanece intacta e os índices existem na cópia.
- [ ] 1.2 Implementar autocomplete e agregados municipais conforme a spec; verificar com testes Vitest códigos repetidos, exclusão de `cd_mun = '.'`, população de `setor`, sexo de `demografia` e situação não informada.
- [ ] 1.3 Implementar totais estaduais e ranking por densidade com paginação estável; verificar com testes Vitest população, área incluindo o município especial, ordenação, desempate e navegação entre páginas.

## 2. Frontend

- [ ] 2.1 Criar `frontend/` com React, TypeScript, Vite e Vitest; verificar que a aplicação e a configuração de testes iniciam.
- [ ] 2.2 Implementar tela municipal com autocomplete nome + UF e indicadores agregados; verificar seleção por `cd_mun` e estados de carregamento/resultado com testes Vitest.
- [ ] 2.3 Implementar tela estadual com totais e ranking paginado; verificar seleção de UF, mudança de página e apresentação dos resultados com testes Vitest.

## 3. Docker e documentação

- [ ] 3.1 Criar `.gitignore` para `.data/` e Docker Compose para montar `censo.sqlite` somente leitura, persistir a cópia de trabalho e iniciar backend e frontend; verificar `git check-ignore .data/censo.sqlite` e `docker compose config`.
- [ ] 3.2 Ajustar builds e inicialização para que `docker compose up` em checkout limpo disponibilize as duas telas sem preparação manual; verificar a cópia e os índices no volume e testar os fluxos integrados.
- [ ] 3.3 Criar README com instalação, execução, decisões técnicas e atualização da cópia ignorada; verificar que os comandos documentados funcionam a partir de checkout limpo.