import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { openReadOnlyDatabase, prepareWorkingCopy } from '../src/database.js';

const temporaryDirectories: string[] = [];

function createDatabaseFiles(): { sourcePath: string; workingPath: string } {
  const directory = mkdtempSync(join(tmpdir(), 'censo-backend-'));
  temporaryDirectories.push(directory);
  const sourcePath = join(directory, 'source.sqlite');
  const workingPath = join(directory, '.data', 'copy.sqlite');
  const source = new Database(sourcePath);
  source.exec(`
    CREATE TABLE municipio (cd_mun TEXT PRIMARY KEY, cd_uf TEXT NOT NULL);
    CREATE TABLE setor (cd_setor TEXT PRIMARY KEY, cd_mun TEXT NOT NULL);
    CREATE TABLE demografia (cd_setor TEXT PRIMARY KEY);
    INSERT INTO municipio VALUES ('0000001', '01');
    INSERT INTO setor VALUES ('setor-1', '0000001');
    INSERT INTO demografia VALUES ('setor-1');
  `);
  source.close();
  return { sourcePath, workingPath };
}

function checksum(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('cópia de trabalho', () => {
  it('preserva a origem, cria os índices na cópia e abre a cópia somente para leitura', () => {
    const { sourcePath, workingPath } = createDatabaseFiles();
    const originalChecksum = checksum(sourcePath);

    prepareWorkingCopy(sourcePath, workingPath);

    expect(checksum(sourcePath)).toBe(originalChecksum);
    const copy = new Database(workingPath, { readonly: true });
    const indexes = copy.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all()
      .map((row) => (row as { name: string }).name);
    copy.close();
    expect(indexes).toEqual(expect.arrayContaining([
      'idx_setor_cd_mun',
      'idx_demografia_cd_setor',
      'idx_municipio_cd_uf',
    ]));

    prepareWorkingCopy(sourcePath, workingPath);
    const readOnly = openReadOnlyDatabase(workingPath);
    expect(() => readOnly.prepare("INSERT INTO municipio VALUES ('0000002', '01')").run())
      .toThrow();
    readOnly.close();
    expect(checksum(sourcePath)).toBe(originalChecksum);
  });
});