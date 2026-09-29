import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const municipalityOption = { cd_mun: '3550308', nm_mun: 'São Paulo', cd_uf: '35', nm_uf: 'São Paulo' };

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('consulta municipal', () => {
  it('seleciona pelo cd_mun e apresenta os agregados após o carregamento', async () => {
    let finishDetails: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/estados') return Promise.resolve(jsonResponse({ estados: [] }));
      if (path.startsWith('/api/municipios?')) return Promise.resolve(jsonResponse({ municipios: [municipalityOption] }));
      if (path === '/api/municipios/3550308') return new Promise<Response>((resolve) => { finishDetails = resolve; });
      throw new Error(`Endpoint inesperado: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Nome do município'), 'São Paulo');
    await user.click(await screen.findByRole('option', { name: /São Paulo.*35/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando indicadores municipais');
    expect(fetchMock).toHaveBeenCalledWith('/api/municipios/3550308', expect.objectContaining({ signal: expect.any(AbortSignal) }));

    finishDetails(jsonResponse({
      ...municipalityOption,
      populacao: 11451245,
      setores: 18000,
      area_km2: 1521.2,
      densidade: 7528.3,
      situacao: { Urbana: 18000, Rural: 0, 'não informado': 0 },
      demografia: { homens: 5400000, mulheres: 6051245 },
    }));
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(screen.getByText('11.451.245')).toBeInTheDocument();
    expect(screen.getByText('não informado')).toBeInTheDocument();
    expect(screen.getByText('5.400.000')).toBeInTheDocument();
  });
});

describe('consulta estadual', () => {
  it('carrega totais e navega páginas mantendo a UF selecionada', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      cd_mun: String(index + 1), nm_mun: `Município ${index + 1}`,
      populacao: 1000, area_km2: 10, densidade: 100,
    }));
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/estados') return Promise.resolve(jsonResponse({ estados: [{ cd_uf: '35', nm_uf: 'São Paulo' }] }));
      if (path === '/api/estados/35?pagina=1&por_pagina=50') return Promise.resolve(jsonResponse({
        estado: { cd_uf: '35', nm_uf: 'São Paulo', populacao: 44420459, area_km2: 248219, densidade: 178.9 },
        municipios: firstPage, pagina: 1, por_pagina: 50, total: 51, total_paginas: 2,
      }));
      if (path === '/api/estados/35?pagina=2&por_pagina=50') return Promise.resolve(jsonResponse({
        estado: { cd_uf: '35', nm_uf: 'São Paulo', populacao: 44420459, area_km2: 248219, densidade: 178.9 },
        municipios: [{ cd_mun: '3509502', nm_mun: 'Campinas', populacao: 1213792, area_km2: 794.6, densidade: 1526.9 }],
        pagina: 2, por_pagina: 50, total: 51, total_paginas: 2,
      }));
      throw new Error(`Endpoint inesperado: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Estado/ }));
    await user.selectOptions(await screen.findByLabelText('Unidade federativa'), '35');
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(screen.getByText('44.420.459')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(await screen.findByText('Campinas')).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/estados/35?pagina=2&por_pagina=50',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(within(screen.getByRole('table')).getByText('Campinas')).toBeInTheDocument();
  });
});

describe('navegação', () => {
  it('apresenta telas distintas para município e estado', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse({ estados: [] }))));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Encontre um município' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Estado/ }));
    expect(screen.getByRole('heading', { name: 'Compare municípios' })).toBeInTheDocument();
    expect(screen.getByLabelText('Unidade federativa')).toBeInTheDocument();
  });
});