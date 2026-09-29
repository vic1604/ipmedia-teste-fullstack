import { useEffect, useState } from 'react';

type MunicipalityOption = { cd_mun: string; nm_mun: string; cd_uf: string; nm_uf: string };
type Municipality = MunicipalityOption & {
  populacao: number;
  setores: number;
  area_km2: number;
  densidade: number;
  situacao: Record<string, number>;
  demografia: { homens: number; mulheres: number };
};
type StateOption = { cd_uf: string; nm_uf: string };
type RankedMunicipality = {
  cd_mun: string;
  nm_mun: string;
  populacao: number;
  area_km2: number;
  densidade: number;
};
type StateResult = {
  estado: StateOption & { populacao: number; area_km2: number; densidade: number };
  municipios: RankedMunicipality[];
  pagina: number;
  por_pagina: number;
  total: number;
  total_paginas: number;
};

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os dados. Tente novamente.');
  return response.json() as Promise<T>;
}

const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function Metric({ label, value, detail, tone = 'green' }: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'green' | 'blue' | 'coral' | 'gold';
}) {
  return (
    <article className={`metric metric--${tone}`}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
      {detail && <p className="metric__detail">{detail}</p>}
    </article>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'municipios' | 'estados'>('municipios');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<MunicipalityOption[]>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityOption | null>(null);
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingMunicipality, setLoadingMunicipality] = useState(false);
  const [municipalityError, setMunicipalityError] = useState('');
  const [states, setStates] = useState<StateOption[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [page, setPage] = useState(1);
  const [stateResult, setStateResult] = useState<StateResult | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [stateError, setStateError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getJson<{ estados: StateOption[] }>('/api/estados', controller.signal)
      .then((data) => setStates(data.estados))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setStateError(error.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.trim() || selectedMunicipality) {
      setOptions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    getJson<{ municipios: MunicipalityOption[] }>(
      `/api/municipios?busca=${encodeURIComponent(query.trim())}`,
      controller.signal,
    )
      .then((data) => setOptions(data.municipios))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setMunicipalityError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [query, selectedMunicipality]);

  useEffect(() => {
    if (!selectedMunicipality) return;
    const controller = new AbortController();
    setLoadingMunicipality(true);
    setMunicipalityError('');
    getJson<Municipality>(`/api/municipios/${selectedMunicipality.cd_mun}`, controller.signal)
      .then(setMunicipality)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setMunicipalityError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMunicipality(false);
      });
    return () => controller.abort();
  }, [selectedMunicipality]);

  useEffect(() => {
    if (!selectedState) {
      setStateResult(null);
      return;
    }
    const controller = new AbortController();
    setLoadingState(true);
    setStateError('');
    getJson<StateResult>(`/api/estados/${selectedState}?pagina=${page}&por_pagina=50`, controller.signal)
      .then(setStateResult)
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setStateError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingState(false);
      });
    return () => controller.abort();
  }, [selectedState, page]);

  function chooseMunicipality(option: MunicipalityOption) {
    setQuery(`${option.nm_mun} · ${option.cd_uf}`);
    setSelectedMunicipality(option);
    setMunicipality(null);
    setOptions([]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={() => setScreen('municipios')} aria-label="Censo em foco, início">
          <span className="brand__mark" aria-hidden="true">C</span><span>Censo <strong>em foco</strong></span>
        </a>
        <span className="edition">BRASIL <i /> CENSO 2022</span>
      </header>

      <main id="inicio">
        <section className="intro">
          <p className="eyebrow">TERRITÓRIO EM NÚMEROS <span>●</span> 2022</p>
          <h1>O Brasil, <em>em cada escala.</em></h1>
          <p className="intro__copy">Explore os dados do Censo, do seu município ao panorama estadual.</p>
        </section>

        <nav className="tabs" aria-label="Consultas">
          <button className={screen === 'municipios' ? 'tab tab--active' : 'tab'} onClick={() => setScreen('municipios')}>
            <span className="tab__index">01</span> Município
          </button>
          <button className={screen === 'estados' ? 'tab tab--active' : 'tab'} onClick={() => setScreen('estados')}>
            <span className="tab__index">02</span> Estado
          </button>
        </nav>

        {screen === 'municipios' ? (
          <section className="workspace" aria-labelledby="municipality-title">
            <div className="section-heading">
              <div><p className="section-kicker">CONSULTA MUNICIPAL</p><h2 id="municipality-title">Encontre um município</h2></div>
              <span className="section-number">01 / 02</span>
            </div>
            <div className="search-area">
              <label className="field-label" htmlFor="municipality-search">Nome do município</label>
              <div className="search-wrap">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  id="municipality-search"
                  autoComplete="off"
                  placeholder="Ex.: Campinas, Rio Branco..."
                  value={query}
                  aria-expanded={options.length > 0}
                  aria-controls="municipality-options"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedMunicipality(null);
                    setMunicipality(null);
                    setMunicipalityError('');
                  }}
                />
                {searching && <span className="search-status" role="status">Buscando</span>}
                {options.length > 0 && (
                  <ul className="suggestions" id="municipality-options" role="listbox" aria-label="Municípios encontrados">
                    {options.map((option) => (
                      <li key={option.cd_mun}>
                        <button type="button" role="option" aria-selected="false" onClick={() => chooseMunicipality(option)}>
                          <span>{option.nm_mun}</span>
                          <span className="suggestion-state">{option.nm_uf} <b>{option.cd_uf}</b></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="field-hint">Os resultados incluem a unidade federativa para distinguir nomes iguais.</p>
            </div>

            {municipalityError && <p className="notice notice--error" role="alert">{municipalityError}</p>}
            {loadingMunicipality && <p className="notice" role="status">Carregando indicadores municipais...</p>}
            {municipality && (
              <div className="results" aria-live="polite">
                <div className="result-title">
                  <div><p className="section-kicker">{municipality.nm_uf} <span>·</span> {municipality.cd_uf}</p><h3>{municipality.nm_mun}</h3></div>
                  <span className="code-label">CÓD. {municipality.cd_mun}</span>
                </div>
                <div className="metric-grid">
                  <Metric label="População" value={integer.format(municipality.populacao)} detail="habitantes" />
                  <Metric label="Setores censitários" value={integer.format(municipality.setores)} tone="blue" />
                  <Metric label="Área" value={`${decimal.format(municipality.area_km2)} km²`} tone="gold" />
                  <Metric label="Densidade" value={`${decimal.format(municipality.densidade)} hab/km²`} tone="coral" />
                </div>
                <div className="detail-grid">
                  <section className="detail-block">
                    <h4>Situação dos setores</h4>
                    {Object.entries(municipality.situacao).map(([name, count]) => (
                      <div className="detail-row" key={name}><span>{name}</span><strong>{integer.format(count)}</strong></div>
                    ))}
                  </section>
                  <section className="detail-block">
                    <h4>População por sexo</h4>
                    <div className="detail-row"><span>Homens</span><strong>{integer.format(municipality.demografia.homens)}</strong></div>
                    <div className="detail-row"><span>Mulheres</span><strong>{integer.format(municipality.demografia.mulheres)}</strong></div>
                  </section>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="workspace" aria-labelledby="state-title">
            <div className="section-heading">
              <div><p className="section-kicker">PANORAMA ESTADUAL</p><h2 id="state-title">Compare municípios</h2></div>
              <span className="section-number">02 / 02</span>
            </div>
            <div className="state-picker">
              <label className="field-label" htmlFor="state-select">Unidade federativa</label>
              <select id="state-select" value={selectedState} onChange={(event) => {
                setSelectedState(event.target.value);
                setPage(1);
              }}>
                <option value="">Selecione um estado</option>
                {states.map((state) => <option key={state.cd_uf} value={state.cd_uf}>{state.cd_uf} · {state.nm_uf}</option>)}
              </select>
            </div>
            {stateError && <p className="notice notice--error" role="alert">{stateError}</p>}
            {loadingState && <p className="notice" role="status">Carregando totais e ranking...</p>}
            {stateResult && !loadingState && (
              <div className="results" aria-live="polite">
                <div className="result-title">
                  <div><p className="section-kicker">UNIDADE FEDERATIVA <span>·</span> {stateResult.estado.cd_uf}</p><h3>{stateResult.estado.nm_uf}</h3></div>
                  <span className="code-label">{integer.format(stateResult.total)} MUNICÍPIOS</span>
                </div>
                <div className="metric-grid metric-grid--state">
                  <Metric label="População total" value={integer.format(stateResult.estado.populacao)} detail="habitantes" />
                  <Metric label="Área total" value={`${integer.format(stateResult.estado.area_km2)} km²`} tone="gold" />
                  <Metric label="Densidade estadual" value={`${decimal.format(stateResult.estado.densidade)} hab/km²`} tone="coral" />
                </div>
                <div className="ranking-heading">
                  <div><p className="section-kicker">DENSIDADE DEMOGRÁFICA</p><h4>Municípios em destaque</h4></div>
                  <span>MAIOR DENSIDADE PRIMEIRO</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead><tr><th>#</th><th>Município</th><th>População</th><th>Área</th><th>Densidade</th></tr></thead>
                    <tbody>{stateResult.municipios.map((item, index) => (
                      <tr key={item.cd_mun}>
                        <td className="rank-cell">{String((page - 1) * stateResult.por_pagina + index + 1).padStart(2, '0')}</td>
                        <td><span className="table-municipality">{item.nm_mun}</span><span className="table-code">{item.cd_mun}</span></td>
                        <td>{integer.format(item.populacao)}</td><td>{decimal.format(item.area_km2)} km²</td>
                        <td className="density-cell">{decimal.format(item.densidade)} <small>hab/km²</small></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="pagination">
                  <span>Página {stateResult.pagina} de {Math.max(1, stateResult.total_paginas)} <i /> {integer.format(stateResult.total)} municípios</span>
                  <div>
                    <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>←</button>
                    <button type="button" aria-label="Próxima página" disabled={page >= stateResult.total_paginas} onClick={() => setPage((current) => current + 1)}>→</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <footer><span>IBGE <i /> CENSO DEMOGRÁFICO 2022</span><span>DADOS AGREGADOS POR MUNICÍPIO E UF</span></footer>
    </div>
  );
}