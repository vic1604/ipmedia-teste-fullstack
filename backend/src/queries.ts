import type Database from 'better-sqlite3';

export type MunicipalityResult = {
  cd_mun: string;
  nm_mun: string;
  cd_uf: string;
  nm_uf: string;
};

export function searchMunicipalities(database: Database.Database, query: string, limit: number): MunicipalityResult[] {
  return database.prepare(`
    SELECT m.cd_mun, m.nm_mun, m.cd_uf, u.nm_uf
    FROM municipio AS m
    JOIN uf AS u ON u.cd_uf = m.cd_uf
    WHERE m.cd_mun <> '.' AND m.nm_mun LIKE @pattern COLLATE NOCASE
    ORDER BY m.nm_mun COLLATE NOCASE, u.nm_uf COLLATE NOCASE, m.cd_mun
    LIMIT @limit
  `).all({ pattern: `%${query}%`, limit }) as MunicipalityResult[];
}

export function getMunicipality(database: Database.Database, code: string) {
  const municipality = database.prepare(`
    SELECT m.cd_mun, m.nm_mun, m.cd_uf, u.nm_uf,
      COALESCE(SUM(s.populacao), 0) AS populacao,
      COUNT(s.cd_setor) AS setores,
      COALESCE(SUM(s.area_km2), 0) AS area_km2
    FROM municipio AS m
    JOIN uf AS u ON u.cd_uf = m.cd_uf
    LEFT JOIN setor AS s ON s.cd_mun = m.cd_mun
    WHERE m.cd_mun = @code AND m.cd_mun <> '.'
    GROUP BY m.cd_mun, m.nm_mun, m.cd_uf, u.nm_uf
  `).get({ code }) as (MunicipalityResult & {
    populacao: number;
    setores: number;
    area_km2: number;
  }) | undefined;

  if (!municipality) return undefined;

  const situationRows = database.prepare(`
    SELECT COALESCE(situacao, 'não informado') AS situacao, COUNT(*) AS setores
    FROM setor
    WHERE cd_mun = @code
    GROUP BY COALESCE(situacao, 'não informado')
  `).all({ code }) as { situacao: string; setores: number }[];
  const sexTotals = database.prepare(`
    SELECT COALESCE(SUM(d.homens), 0) AS homens,
      COALESCE(SUM(d.mulheres), 0) AS mulheres
    FROM setor AS s
    JOIN demografia AS d ON d.cd_setor = s.cd_setor
    WHERE s.cd_mun = @code
  `).get({ code }) as { homens: number; mulheres: number };
  const situacao = Object.fromEntries(
    ['Urbana', 'Rural', 'não informado'].map((name) => [name, 0]),
  ) as Record<string, number>;
  for (const row of situationRows) situacao[row.situacao] = row.setores;

  return {
    ...municipality,
    densidade: municipality.area_km2 > 0 ? municipality.populacao / municipality.area_km2 : 0,
    situacao,
    demografia: sexTotals,
  };
}

export function listStates(database: Database.Database) {
  return database.prepare(`
    SELECT cd_uf, nm_uf FROM uf ORDER BY nm_uf COLLATE NOCASE, cd_uf
  `).all() as { cd_uf: string; nm_uf: string }[];
}

export function getState(database: Database.Database, code: string, page: number, pageSize: number) {
  const state = database.prepare(`
    SELECT u.cd_uf, u.nm_uf,
      COALESCE(SUM(s.populacao), 0) AS populacao,
      COALESCE(SUM(s.area_km2), 0) AS area_km2
    FROM uf AS u
    LEFT JOIN municipio AS m ON m.cd_uf = u.cd_uf
    LEFT JOIN setor AS s ON s.cd_mun = m.cd_mun
    WHERE u.cd_uf = @code
    GROUP BY u.cd_uf, u.nm_uf
  `).get({ code }) as { cd_uf: string; nm_uf: string; populacao: number; area_km2: number } | undefined;

  if (!state) return undefined;

  const total = (database.prepare(`
    SELECT COUNT(*) AS total FROM municipio WHERE cd_uf = @code AND cd_mun <> '.'
  `).get({ code }) as { total: number }).total;
  const municipalities = database.prepare(`
    WITH municipality_totals AS (
      SELECT m.cd_mun, m.nm_mun,
        COALESCE(SUM(s.populacao), 0) AS populacao,
        COALESCE(SUM(s.area_km2), 0) AS area_km2
      FROM municipio AS m
      LEFT JOIN setor AS s ON s.cd_mun = m.cd_mun
      WHERE m.cd_uf = @code AND m.cd_mun <> '.'
      GROUP BY m.cd_mun, m.nm_mun
    )
    SELECT cd_mun, nm_mun, populacao, area_km2,
      CASE WHEN area_km2 > 0 THEN populacao * 1.0 / area_km2 ELSE 0 END AS densidade
    FROM municipality_totals
    ORDER BY densidade DESC, nm_mun COLLATE NOCASE ASC, cd_mun ASC
    LIMIT @pageSize OFFSET @offset
  `).all({ code, pageSize, offset: (page - 1) * pageSize }) as {
    cd_mun: string;
    nm_mun: string;
    populacao: number;
    area_km2: number;
    densidade: number;
  }[];

  return {
    estado: {
      ...state,
      densidade: state.area_km2 > 0 ? state.populacao / state.area_km2 : 0,
    },
    municipios: municipalities,
    pagina: page,
    por_pagina: pageSize,
    total,
    total_paginas: Math.ceil(total / pageSize),
  };
}