import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let directory: string;
let app: ReturnType<typeof createApp>;

function createFixture(): Database.Database {
  directory = mkdtempSync(join(tmpdir(), 'censo-api-'));
  const database = new Database(join(directory, 'fixture.sqlite'));
  database.exec(`
    CREATE TABLE uf (cd_uf TEXT PRIMARY KEY, nm_uf TEXT NOT NULL);
    CREATE TABLE municipio (cd_mun TEXT PRIMARY KEY, nm_mun TEXT NOT NULL, cd_uf TEXT NOT NULL);
    CREATE TABLE setor (
      cd_setor TEXT PRIMARY KEY, cd_mun TEXT NOT NULL, situacao TEXT, area_km2 REAL, populacao INTEGER
    );
    CREATE TABLE demografia (
      cd_setor TEXT PRIMARY KEY, moradores INTEGER, homens INTEGER, mulheres INTEGER
    );
    INSERT INTO uf VALUES ('01', 'Estado A'), ('02', 'Estado B');
    INSERT INTO municipio VALUES
      ('001', 'Vila Igual', '01'), ('002', 'Vila Igual', '02'),
      ('.', '', '01'), ('003', 'Vila Menor', '01');
    INSERT INTO setor VALUES
      ('s1', '001', 'Urbana', 10, 100), ('s2', '001', NULL, 5, 50),
      ('s3', '003', 'Rural', 10, 60), ('s4', '.', NULL, 20000, 0);
    INSERT INTO demografia VALUES
      ('s1', 100, 40, 60), ('s2', 50, 20, 30), ('s3', 60, 25, 35);
  `);
  return database;
}

beforeEach(() => {
  app = createApp(createFixture());
});

afterEach(async () => {
  await app.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('API municipal', () => {
  it('retorna nome, UF e código para nomes repetidos e exclui o município especial', async () => {
    const response = await app.inject('/api/municipios?busca=Vila%20Igual');
    expect(response.statusCode).toBe(200);
    expect(response.json().municipios).toEqual([
      { cd_mun: '001', nm_mun: 'Vila Igual', cd_uf: '01', nm_uf: 'Estado A' },
      { cd_mun: '002', nm_mun: 'Vila Igual', cd_uf: '02', nm_uf: 'Estado B' },
    ]);
    expect((await app.inject('/api/municipios?busca=')).json().municipios)
      .not.toContainEqual(expect.objectContaining({ cd_mun: '.' }));
  });

  it('agrega população e situação de setores, e soma sexo apenas de demografia', async () => {
    const response = await app.inject('/api/municipios/001');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      cd_mun: '001',
      populacao: 150,
      setores: 2,
      area_km2: 15,
      densidade: 10,
      situacao: { Urbana: 1, Rural: 0, 'não informado': 1 },
      demografia: { homens: 60, mulheres: 90 },
    });
  });
});

describe('API estadual', () => {
  it('inclui a área especial nos totais e ordena o ranking pela densidade', async () => {
    const response = await app.inject('/api/estados/01');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      estado: { populacao: 210, area_km2: 20025 },
      municipios: [
        { cd_mun: '001', densidade: 10 },
        { cd_mun: '003', densidade: 6 },
      ],
      total: 2,
      pagina: 1,
      por_pagina: 50,
      total_paginas: 1,
    });
    expect(response.json().municipios).not.toContainEqual(expect.objectContaining({ cd_mun: '.' }));
  });

  it('ordena empates por nome e código e percorre páginas sem perder a UF', async () => {
    const database = new Database(join(directory, 'fixture.sqlite'));
    for (let index = 0; index < 51; index += 1) {
      const code = String(index + 100).padStart(3, '0');
      database.prepare('INSERT INTO municipio VALUES (?, ?, ?)').run(code, `Mun ${String(index).padStart(2, '0')}`, '02');
      database.prepare('INSERT INTO setor VALUES (?, ?, ?, ?, ?)').run(`extra-${code}`, code, 'Urbana', 1, 10);
    }
    for (const code of ['899', '900']) {
      database.prepare('INSERT INTO municipio VALUES (?, ?, ?)').run(code, 'Zeta', '02');
      database.prepare('INSERT INTO setor VALUES (?, ?, ?, ?, ?)').run(`extra-${code}`, code, 'Urbana', 1, 10);
    }
    database.close();

    const firstPage = await app.inject('/api/estados/02?pagina=1');
    const secondPage = await app.inject('/api/estados/02?pagina=2');
    expect(firstPage.json().estado.cd_uf).toBe('02');
    expect(firstPage.json().municipios).toHaveLength(50);
    expect(firstPage.json().municipios[0].nm_mun).toBe('Mun 00');
    expect(firstPage.json().municipios[49].nm_mun).toBe('Mun 49');
    expect(secondPage.json()).toMatchObject({ pagina: 2, total: 54, total_paginas: 2 });
    expect(secondPage.json().municipios).toHaveLength(4);
    expect(secondPage.json().municipios.slice(1, 3).map((municipality: { cd_mun: string }) => municipality.cd_mun))
      .toEqual(['899', '900']);
    expect(secondPage.json().estado.cd_uf).toBe('02');
  });
});