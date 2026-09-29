import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_setor_cd_mun ON setor(cd_mun)',
  'CREATE INDEX IF NOT EXISTS idx_demografia_cd_setor ON demografia(cd_setor)',
  'CREATE INDEX IF NOT EXISTS idx_municipio_cd_uf ON municipio(cd_uf)',
];

export function prepareWorkingCopy(sourcePath: string, workingPath: string): void {
  const source = resolve(sourcePath);
  const working = resolve(workingPath);

  if (source === working) {
    throw new Error('O banco de trabalho não pode ser o arquivo fonte.');
  }
  if (!existsSync(source)) {
    throw new Error(`Banco fonte não encontrado: ${source}`);
  }

  mkdirSync(dirname(working), { recursive: true });
  if (!existsSync(working)) {
    copyFileSync(source, working);
  }

  const database = new Database(working);
  try {
    database.exec(INDEXES.join(';'));
  } finally {
    database.close();
  }
}

export function openReadOnlyDatabase(databasePath: string): Database.Database {
  const database = new Database(resolve(databasePath), {
    readonly: true,
    fileMustExist: true,
  });
  database.pragma('query_only = ON');
  return database;
}

export function defaultDatabasePaths(): { sourcePath: string; workingPath: string } {
  return {
    sourcePath: process.env.CENSO_SOURCE_PATH ?? resolve(process.cwd(), '../censo.sqlite'),
    workingPath: process.env.CENSO_WORKING_PATH ?? resolve(process.cwd(), '../.data/censo.sqlite'),
  };
}