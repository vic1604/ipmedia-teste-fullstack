import Fastify from 'fastify';
import type Database from 'better-sqlite3';
import { getMunicipality, getState, listStates, searchMunicipalities } from './queries.js';

type PaginationQuery = { pagina?: string; por_pagina?: string };

function positiveInteger(value: string | undefined, fallback: number, maximum: number): number | undefined {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number >= 1 && number <= maximum ? number : undefined;
}

export function createApp(database: Database.Database) {
  const app = Fastify();
  app.addHook('onClose', async () => database.close());

  app.get('/api/municipios', async (request, reply) => {
    const { busca = '' } = request.query as { busca?: string };
    if (typeof busca !== 'string') return reply.code(400).send({ erro: 'busca inválida' });
    return { municipios: searchMunicipalities(database, busca, 20) };
  });

  app.get<{ Params: { cd_mun: string } }>('/api/municipios/:cd_mun', async (request, reply) => {
    const municipality = getMunicipality(database, request.params.cd_mun);
    if (!municipality) return reply.code(404).send({ erro: 'Município não encontrado' });
    return municipality;
  });

  app.get('/api/estados', async () => ({ estados: listStates(database) }));

  app.get<{ Params: { cd_uf: string }; Querystring: PaginationQuery }>(
    '/api/estados/:cd_uf',
    async (request, reply) => {
      const page = positiveInteger(request.query.pagina, 1, Number.MAX_SAFE_INTEGER);
      const pageSize = positiveInteger(request.query.por_pagina, 50, 100);
      if (page === undefined || pageSize === undefined) {
        return reply.code(400).send({ erro: 'paginação inválida' });
      }

      const state = getState(database, request.params.cd_uf, page, pageSize);
      if (!state) return reply.code(404).send({ erro: 'Estado não encontrado' });
      return state;
    },
  );

  return app;
}