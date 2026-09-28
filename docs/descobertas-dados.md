# Descobertas sobre o dado (censo.sqlite)

## Totais conferidos
- Soma de `setor.populacao` = 203.080.756 (bate com o Censo)
- Soma de `setor.area_km2` = 8.510.417,25 km2 (bate com o Censo)
- Soma de `demografia.moradores` = 202.561.627 (NAO bate)

## Armadilhas e decisoes
1. **Total de populacao vem de `setor.populacao`.** `demografia` tem 9.327 setores a menos que `setor`, entao serve so para a divisao por sexo.
2. **Municipio "fantasma".** Existe um registro com `cd_mun = '.'` e nome vazio (UF 43, RS): sao 2 setores de agua (areas de 2.884 km2 e 10.201 km2, provavelmente Lagoa Mirim e Lagoa dos Patos), com populacao 0. Deve ficar fora do autocomplete e do ranking, mas a area continua na soma do RS.
3. **`situacao` tem tres valores:** Urbana (354.965), Rural (112.031) e vazio (1.103). O vazio aparece como grupo proprio para o total fechar em 468.099 setores.
4. **Nomes repetidos.** Ex.: Sao Domingos e Bom Jesus (5 cada). O autocomplete mostra nome + UF e a busca usa `cd_mun`, nunca o nome.