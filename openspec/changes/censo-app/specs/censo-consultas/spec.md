# Spec Delta

## Purpose

Permitir consultar indicadores agregados do Censo 2022 por município e analisar os municípios de uma UF em um ranking paginado por densidade demográfica.

## ADDED Requirements

### Requirement: Consulta de município
A aplicação SHALL oferecer uma tela de busca municipal com autocomplete e apresentar os indicadores do município selecionado.

#### Scenario: Selecionar município sem ambiguidade
- **WHEN** a pessoa busca municípios por nome
- **THEN** cada resultado exibe nome e UF, usa `cd_mun` como identificador e não inclui o registro `cd_mun = '.'`

#### Scenario: Exibir agregados municipais
- **WHEN** a pessoa seleciona um município
- **THEN** a aplicação exibe população somada de `setor.populacao`, quantidade de setores, área total, densidade, setores por situação e totais de homens e mulheres somados de `demografia`
- **AND** situações nulas são exibidas no grupo "não informado"

### Requirement: Consulta e ranking por UF
A aplicação SHALL oferecer uma tela distinta para selecionar uma UF, consultar seus totais e percorrer seus municípios ordenados por densidade demográfica decrescente.

#### Scenario: Exibir totais e ranking estadual
- **WHEN** a pessoa seleciona uma UF
- **THEN** a aplicação exibe população total baseada em `setor.populacao`, área total e densidade do estado, além do ranking municipal
- **AND** a área do município `cd_mun = '.'` permanece no total estadual, mas esse registro não aparece no ranking

#### Scenario: Percorrer ranking paginado
- **WHEN** o ranking da UF contém mais municípios que a página atual
- **THEN** a pessoa pode avançar e voltar entre páginas sem perder a UF selecionada