const API = '/api';

interface ChartDataset {
  label?: string; data: number[]; backgroundColor?: string | string[];
  borderColor?: string; borderWidth?: number; fill?: boolean; tension?: number;
  pointBackgroundColor?: string; pointRadius?: number; borderRadius?: number;
}
interface ChartConfig {
  type: string;
  data: { labels: string[]; datasets: ChartDataset[] };
  options?: Record<string, unknown>;
}
declare class Chart {
  constructor(ctx: CanvasRenderingContext2D, config: ChartConfig);
  destroy(): void;
}

type UPSEstado = 'activa' | 'entrada' | 'salida' | 'mantenimiento' | 'soporte_provisional' | 'baja';
type HerrEstado = 'disponible' | 'en_uso' | 'mantenimiento' | 'prestada' | 'baja';
type AccionAuditoria = 'CREATE' | 'UPDATE' | 'DELETE' | 'SALIDA' | 'ENTRADA';

interface UPS {
  id: number; serial_number: string; modelo: string; capacidad: string;
  ubicacion: string; estado: UPSEstado; fecha_ingreso: string | null;
  fecha_salida: string | null; notas: string; created_at: string; updated_at: string;
}
interface Herramienta {
  id: number; codigo: string; nombre: string; marca: string; modelo: string;
  ubicacion: string; estado: HerrEstado; fecha_adquisicion: string | null;
  notas: string; created_at: string; updated_at: string;
}
interface Proyecto {
  id: number; nombre: string; ubicacion: string; descripcion: string;
  fecha_inicio: string | null; fecha_fin: string | null; responsable: string;
  created_at: string; herramientas_activas: number;
  herramientas_asignadas: string | null; estado: string;
}
interface Movimiento {
  id: number; herramienta_id: number; proyecto_id: number;
  fecha_salida: string; fecha_entrada: string | null;
  recibido_por: string; notas: string; created_at: string;
  herramienta_codigo: string; herramienta_nombre: string;
  proyecto_nombre: string; proyecto_ubicacion: string;
}
interface HistorialMov extends Movimiento {
  proyecto_nombre: string; proyecto_ubicacion: string;
}
interface Usuario {
  id: number; nombre: string; email: string; rol: string;
}
interface AuditoriaLog {
  id: number; tabla: string; accion: AccionAuditoria; registro_id: number;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos: Record<string, unknown> | null;
  usuario_id: number; created_at: string; usuario_nombre: string;
}
interface LoginResponse { token: string; usuario: Usuario; }
interface StatsUPS {
  total: number; activas: number;
  estados: { estado: UPSEstado; count: number }[];
  modelos: { modelo: string; count: number }[];
  ubicaciones: { ubicacion: string; count: number }[];
  ingresos_por_mes: { mes: string; count: number }[];
}
interface StatsHerr {
  total: number; disponibles: number;
  estados: { estado: HerrEstado; count: number }[];
  marcas: { marca: string; count: number }[];
  ubicaciones: { ubicacion: string; count: number }[];
  adquisiciones_por_mes: { mes: string; count: number }[];
}
interface StatsProy {
  total: number; abiertos: number; cerrados: number;
  herramientas_por_proy: { proyecto: string; count: number }[];
  proyectos_mes: { mes: string; count: number }[];
  responsables: { responsable: string; count: number }[];
}
interface ChartsMap { [key: string]: Chart | undefined; }

const estadoLabelsUPS: Record<UPSEstado, string> = {
  activa: 'Activa', entrada: 'Entrada', salida: 'Salida',
  mantenimiento: 'Mantenimiento', soporte_provisional: 'Soporte Provisional', baja: 'De Baja',
};
const estadoColorsUPS: Record<UPSEstado, string> = {
  activa: '#0284c7', entrada: '#2563eb', salida: '#7c3aed',
  mantenimiento: '#0891b2', soporte_provisional: '#4f46e5', baja: '#64748b',
};
const estadoLabelsHerr: Record<string, string> = {
  disponible: 'Disponible', en_uso: 'En Uso', baja: 'De Baja',
};
const estadoColorsHerr: Record<string, string> = {
  disponible: '#0284c7', en_uso: '#2563eb', baja: '#ef4444',
};
const PAGE_SIZE = 15;

let token: string | null = localStorage.getItem('token');
let upsData: UPS[] = [];
let herrData: Herramienta[] = [];
let proyectosData: Proyecto[] = [];
let movimientosData: Movimiento[] = [];
let allMovimientosData: Movimiento[] = [];
let charts: ChartsMap = {};
let currentSection = 'ups';
let usuarioActual: Usuario | null = null;

function showView(name: string): void {
  document.querySelectorAll('.view').forEach(v => (v as HTMLElement).style.display = 'none');
  const el = document.getElementById(`view-${name}`);
  if (el) el.style.display = 'block';
}

function getHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...getHeaders(), ...(options.headers as Record<string, string> || {}) } });
  if (res.status === 401) {
    localStorage.removeItem('token'); token = null;
    showView('login');
    toast('Sesión expirada, inicia sesión de nuevo', 'error');
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data as T;
}

function toast(msg: string, type = 'info'): void {
  const container = document.getElementById('toast-container')!;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, 3500);
}

function setLoading(btn: HTMLElement, loading: boolean): void {
  if (loading) {
    (btn as any)._orig = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span>';
    (btn as HTMLButtonElement).disabled = true;
  } else {
    btn.innerHTML = (btn as any)._orig || btn.innerHTML;
    (btn as HTMLButtonElement).disabled = false;
  }
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ========== DARK MODE ========== */

function toggleDarkMode(): void {
  document.body.classList.toggle('dark');
  localStorage.setItem('darkMode', document.body.classList.contains('dark') ? '1' : '0');
  const btn = document.getElementById('btnDarkMode')!;
  btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

/* ========== PAGINATION ========== */

interface PagState {
  data: any[];
  page: number;
  totalPages: number;
  renderFn: () => void;
  tbodyId: string;
}
const pagStates: Record<string, PagState> = {};

function initPag(id: string, data: any[], renderFn: () => void, tbodyId: string): void {
  pagStates[id] = { data, page: 0, totalPages: Math.max(1, Math.ceil(data.length / PAGE_SIZE)), renderFn, tbodyId };
}

function pagRender(id: string): void {
  const st = pagStates[id];
  if (!st) return;
  const start = st.page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageData = st.data.slice(start, end);
  const container = document.getElementById(id);
  if (!container) return;
  if (st.data.length <= PAGE_SIZE) { container.style.display = 'none'; return; }
  container.style.display = 'flex';
  container.innerHTML = `
    <button class="btn btn-xs" onclick="pagGo('${id}', -1)" ${st.page === 0 ? 'disabled style="opacity:0.4"' : ''}>‹ Anterior</button>
    <span style="font-size:0.8rem;color:#64748b;padding:0 8px;line-height:28px;">Pág ${st.page + 1} de ${st.totalPages} (${st.data.length} registros)</span>
    <button class="btn btn-xs" onclick="pagGo('${id}', 1)" ${st.page >= st.totalPages - 1 ? 'disabled style="opacity:0.4"' : ''}>Siguiente ›</button>
  `;
}

(window as any).pagGo = function pagGo(id: string, delta: number): void {
  const st = pagStates[id];
  if (!st) return;
  st.page = Math.max(0, Math.min(st.totalPages - 1, st.page + delta));
  st.renderFn();
  pagRender(id);
};

/* ========== LOGIN ========== */

document.getElementById('formLogin')!.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnLogin')!;
  setLoading(btn, true);
  try {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: (document.getElementById('loginEmail') as HTMLInputElement).value.trim(),
        password: (document.getElementById('loginPassword') as HTMLInputElement).value,
      }),
    });
    if (data) {
      token = data.token; usuarioActual = data.usuario;
      localStorage.setItem('token', token);
      toast(`Bienvenido, ${data.usuario.nombre}`, 'success');
      initDashboard();
    }
  } catch (err) { toast((err as Error).message, 'error'); }
  finally { setLoading(btn, false); }
});

document.getElementById('btnLogout')!.addEventListener('click', () => {
  localStorage.removeItem('token'); token = null;
  showView('login');
  Object.values(charts).forEach(c => { try { c?.destroy(); } catch {} }); charts = {};
});

/* ========== TABS ========== */

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.id === 'btnDarkMode') return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
    tab.classList.add('tab-active');
    document.querySelectorAll('.section').forEach(s => (s as HTMLElement).style.display = 'none');
    const section = document.getElementById(`section-${(tab as HTMLElement).dataset.section}`);
    if (section) section.style.display = 'block';
    currentSection = (tab as HTMLElement).dataset.section!;
    if (currentSection === 'ups') renderTableUPS();
    else if (currentSection === 'herramientas') renderTableHerr();
    else if (currentSection === 'proyectos') renderProyectos();
    else if (currentSection === 'movimientos') renderMovimientos();
  });
});

/* ========== DASHBOARD ========== */

async function initDashboard(): Promise<void> {
  showView('dashboard');
  if (localStorage.getItem('darkMode') === '1') {
    document.body.classList.add('dark');
    document.getElementById('btnDarkMode')!.textContent = '☀️';
  }
  await Promise.all([loadUPS(), loadHerramientas(), loadProyectos(), loadMovimientos()]);
  actualizarDashboardResumen();
}

function actualizarDashboardResumen(): void {
  document.getElementById('dash-total-ups')!.textContent = String(upsData.length);
  document.getElementById('dash-total-herr')!.textContent = String(herrData.length);
  document.getElementById('dash-total-proy')!.textContent = String(proyectosData.filter(p => p.estado !== 'cerrado').length);
  document.getElementById('dash-total-mov')!.textContent = String(movimientosData.filter(m => !m.fecha_entrada).length);
}

async function loadUPS(): Promise<void> {
  try {
    upsData = (await apiFetch<UPS[]>('/ups')) || [];
    renderTableUPS();
    updateResumenUPS();
    loadStatsUPS();
    actualizarDashboardResumen();
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function loadHerramientas(): Promise<void> {
  try {
    herrData = (await apiFetch<Herramienta[]>('/herramientas')) || [];
    const idsEnUso = new Set<number>();
    proyectosData.forEach(p => {
      if (p.herramientas_asignadas) {
        p.herramientas_asignadas.split('||').forEach(e => {
          const id = parseInt(e.split('::')[0], 10);
          if (!isNaN(id)) idsEnUso.add(id);
        });
      }
    });
    for (const h of herrData) {
      const deberia = idsEnUso.has(h.id) ? 'en_uso' : 'disponible';
      if (h.estado !== deberia) {
        apiFetch(`/herramientas/${h.id}`, { method: 'PUT', body: JSON.stringify({ estado: deberia }) }).catch(() => {});
        h.estado = deberia;
      }
    }
    renderTableHerr();
    updateResumenHerr();
    loadStatsHerr();
    actualizarDashboardResumen();
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== STATS ========== */

async function loadStatsUPS(): Promise<void> {
  try {
    const stats = await apiFetch<StatsUPS>('/stats/ups');
    if (stats) renderChartsUPS(stats);
  } catch (err) { toast((err as Error).message, 'error'); }
}
async function loadStatsHerr(): Promise<void> {
  try {
    const stats = await apiFetch<StatsHerr>('/stats/herramientas');
    if (stats) renderChartsHerr(stats);
  } catch (err) { toast((err as Error).message, 'error'); }
}

function updateResumenUPS(): void {
  const counts: Record<string, number> = {};
  upsData.forEach(u => { counts[u.estado] = (counts[u.estado] || 0) + 1; });
  (Object.keys(estadoLabelsUPS) as UPSEstado[]).forEach(e => {
    const el = document.getElementById(`ups-count-${e}`);
    if (el) el.textContent = String(counts[e] || 0);
  });
}

function herramientaEnUso(h: Herramienta): boolean {
  return proyectosData.some(p =>
    p.herramientas_asignadas?.split('||').some(e => e.startsWith(String(h.id) + '::'))
  );
}

function updateResumenHerr(): void {
  const disponibles = herrData.filter(h => h.estado !== 'baja' && !herramientaEnUso(h)).length;
  const enUso = herrData.filter(h => h.estado !== 'baja' && herramientaEnUso(h)).length;
  const baja = herrData.filter(h => h.estado === 'baja').length;
  document.getElementById('herr-count-disponible')!.textContent = String(disponibles);
  document.getElementById('herr-count-en_uso')!.textContent = String(enUso);
  document.getElementById('herr-count-baja')!.textContent = String(baja);
}

/* ========== CHARTS PROYECTOS ========== */

async function loadStatsProyectos(): Promise<void> {
  try {
    const stats = await apiFetch<StatsProy>('/stats/proyectos');
    if (stats) renderChartsProyectos(stats);
  } catch (err) { toast((err as Error).message, 'error'); }
}

function renderChartsProyectos(stats: StatsProy): void {
  ['proyEstado','proyHerr','proyMeses','proyResponsable'].forEach(k => { try { charts[k]?.destroy(); } catch {}; delete charts[k]; });
  const emptyLabel = 'Sin datos';
  const emptyColor = '#e2e8f0';
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Estado chart
  const ctxEstado = (document.getElementById('chart-proy-estado') as HTMLCanvasElement).getContext('2d')!;
  charts.proyEstado = new Chart(ctxEstado, {
    type: 'doughnut',
    data: {
      labels: stats.total > 0 ? ['Abiertos', 'Cerrados'] : [emptyLabel],
      datasets: [{ data: stats.total > 0 ? [stats.abiertos, stats.cerrados] : [1], backgroundColor: stats.total > 0 ? ['#16a34a', '#64748b'] : [emptyColor], borderWidth: 2, borderColor: '#fff' }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { padding: 12, usePointStyle: true, font: { size: 12 } } } } },
  });

  // Herramientas por proyecto chart
  const ctxHerr = (document.getElementById('chart-proy-herr') as HTMLCanvasElement).getContext('2d')!;
  charts.proyHerr = new Chart(ctxHerr, {
    type: 'bar', data: { labels: stats.herramientas_por_proy?.length ? stats.herramientas_por_proy.map(p => p.proyecto) : [emptyLabel], datasets: [{ label: 'Herramientas', data: stats.herramientas_por_proy?.length ? stats.herramientas_por_proy.map(p => p.count) : [0], backgroundColor: stats.herramientas_por_proy?.length ? '#3b82f6' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { stepSize: 1 }, grid: { display: false } }, y: { grid: { display: false } } } },
  });

  // Proyectos por mes chart
  const ctxMeses = (document.getElementById('chart-proy-meses') as HTMLCanvasElement).getContext('2d')!;
  charts.proyMeses = new Chart(ctxMeses, {
    type: 'line', data: { labels: stats.proyectos_mes?.length ? stats.proyectos_mes.map(m => { const [y, mo] = m.mes.split('-'); return `${meses[parseInt(mo)-1]} ${y}`; }) : [emptyLabel], datasets: [{ label: 'Creados', data: stats.proyectos_mes?.length ? stats.proyectos_mes.map(m => m.count) : [0], borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.3, pointBackgroundColor: '#16a34a', pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.06)' } }, x: { grid: { display: false } } } },
  });

  // Top responsables chart
  const ctxResp = (document.getElementById('chart-proy-responsable') as HTMLCanvasElement).getContext('2d')!;
  charts.proyResponsable = new Chart(ctxResp, {
    type: 'bar', data: { labels: stats.responsables?.length ? stats.responsables.map(r => r.responsable) : [emptyLabel], datasets: [{ label: 'Proyectos', data: stats.responsables?.length ? stats.responsables.map(r => r.count) : [0], backgroundColor: stats.responsables?.length ? '#8b5cf6' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { display: false } }, x: { grid: { display: false } } } },
  });
}

/* ========== TABLA UPS ========== */

function renderTableUPS(): void {
  const input = document.querySelector<HTMLInputElement>('.filtro-buscar[data-section="ups"]');
  const select = document.querySelector<HTMLSelectElement>('.filtro-estado[data-section="ups"]');
  const text = (input?.value || '').toLowerCase();
  const filter = select?.value || '';
  const filtered = upsData.filter(u => {
    const matchText = !text ||
      u.serial_number.toLowerCase().includes(text) ||
      (u.modelo || '').toLowerCase().includes(text) ||
      (u.ubicacion || '').toLowerCase().includes(text);
    return matchText && (!filter || u.estado === filter);
  });
  const tbody = document.getElementById('ups-tabla-body')!;
  initPag('pag-ups', filtered, () => renderTableUPSPage(filtered), 'ups-tabla-body');
  renderTableUPSPage(filtered);
}

function renderTableUPSPage(filtered: UPS[]): void {
  const st = pagStates['pag-ups'];
  const start = st ? st.page * PAGE_SIZE : 0;
  const end = start + PAGE_SIZE;
  const page = filtered.slice(start, end);
  const tbody = document.getElementById('ups-tabla-body')!;
  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">No hay registros</td></tr>';
  } else {
    tbody.innerHTML = page.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.serial_number)}</strong></td>
        <td>${escapeHtml(u.modelo)}</td>
        <td>${escapeHtml(u.capacidad)}</td>
        <td>${escapeHtml(u.ubicacion)}</td>
        <td>
          <select class="estado-select" data-id="${u.id}" data-section="ups" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;background:var(--surface);color:var(--text);cursor:pointer;">
            ${(Object.entries(estadoLabelsUPS) as [UPSEstado, string][]).map(([val, lbl]) =>
              `<option value="${val}" ${u.estado === val ? 'selected' : ''}>${lbl}</option>`
            ).join('')}
          </select>
        </td>
        <td>${u.fecha_ingreso || '-'}</td>
        <td>${u.fecha_salida || '-'}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(u.notas)}">${escapeHtml(u.notas) || '-'}</td>
        <td>
          <div class="acciones">
            <button class="btn btn-primary btn-xs" onclick="openFormUPS(${u.id})">Editar</button>
            <button class="btn btn-danger btn-xs" onclick="deleteUPS(${u.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  pagRender('pag-ups');
}

/* ========== TABLA HERRAMIENTAS ========== */

function renderTableHerr(): void {
  const input = document.querySelector<HTMLInputElement>('.filtro-buscar[data-section="herramientas"]');
  const select = document.querySelector<HTMLSelectElement>('.filtro-estado[data-section="herramientas"]');
  const proyFilter = (document.getElementById('filtro-proyecto-herr') as HTMLSelectElement)?.value || '';
  const text = (input?.value || '').toLowerCase();
  const filter = select?.value || '';
  const filtered = herrData.filter(h => {
    const estadoActual = h.estado === 'baja' ? 'baja' : (herramientaEnUso(h) ? 'en_uso' : 'disponible');
    const matchText = !text ||
      (h.codigo || '').toLowerCase().includes(text) ||
      (h.nombre || '').toLowerCase().includes(text) ||
      (h.ubicacion || '').toLowerCase().includes(text);
    // Project filter
    if (proyFilter) {
      const enProy = proyectosData.some(p =>
        String(p.id) === proyFilter &&
        p.herramientas_asignadas?.split('||').some(e => e.startsWith(String(h.id) + '::'))
      );
      if (!enProy) return false;
    }
    return matchText && (!filter || estadoActual === filter);
  });
  initPag('pag-herr', filtered, () => renderTableHerrPage(filtered), 'herr-tabla-body');
  renderTableHerrPage(filtered);
}

function renderTableHerrPage(filtered: Herramienta[]): void {
  const st = pagStates['pag-herr'];
  const start = st ? st.page * PAGE_SIZE : 0;
  const end = start + PAGE_SIZE;
  const page = filtered.slice(start, end);
  const tbody = document.getElementById('herr-tabla-body')!;
  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;">No hay registros</td></tr>';
  } else {
    tbody.innerHTML = page.map(h => {
      const estadoActual = h.estado === 'baja' ? 'baja' : (herramientaEnUso(h) ? 'en_uso' : 'disponible');
      return `
      <tr>
        <td><strong>${escapeHtml(h.codigo)}</strong></td>
        <td>${escapeHtml(h.nombre)}</td>
        <td>${escapeHtml(h.marca)}</td>
        <td>${escapeHtml(h.modelo)}</td>
        <td>${escapeHtml(h.ubicacion)}</td>
        <td><span class="estado-badge estado-${estadoActual}">${estadoLabelsHerr[estadoActual]}</span></td>
        <td>${h.fecha_adquisicion || '-'}</td>
        <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(h.notas)}">${escapeHtml(h.notas) || '-'}</td>
        <td>
          <div class="acciones">
            <button class="btn btn-primary btn-xs" onclick="openFormHerr(${h.id})">Editar</button>
            <button class="btn btn-secondary btn-xs" onclick="asignarHerramienta(${h.id})">Asignar</button>
            <button class="btn btn-info btn-xs" onclick="verHistorial(${h.id})">Historial</button>
            <button class="btn btn-danger btn-xs" onclick="deleteHerr(${h.id})">Eliminar</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  pagRender('pag-herr');
}

/* ========== HISTORIAL MODAL ========== */

async function verHistorial(id: number): Promise<void> {
  try {
    const historial = await apiFetch<HistorialMov[]>(`/herramientas/${id}/historial`);
    const h = herrData.find(x => x.id === id);
    const container = document.getElementById('historial-contenido')!;
    if (!historial || historial.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:30px;color:#94a3b8;">Sin movimientos registrados</p>';
    } else {
      container.innerHTML = `<table><thead><tr>
        <th>Fecha Salida</th><th>Proyecto</th><th>Recibió</th><th>Estado</th><th>Fecha Entrada</th>
      </tr></thead><tbody>${historial.map(m => `
        <tr>
          <td>${m.fecha_salida || '-'}</td>
          <td>${escapeHtml(m.proyecto_nombre)}</td>
          <td>${escapeHtml(m.recibido_por) || '-'}</td>
          <td>${m.fecha_entrada ? '<span class="estado-badge estado-disponible">Devuelta</span>' : '<span class="estado-badge estado-prestada">En uso</span>'}</td>
          <td>${m.fecha_entrada || '-'}</td>
        </tr>`).join('')}</tbody></table>`;
    }
    document.getElementById('historial-titulo')!.textContent = `Historial: ${h ? escapeHtml(h.codigo) + ' — ' + escapeHtml(h.nombre) : 'Herramienta #' + id}`;
    document.getElementById('modal-historial')!.classList.add('active');
  } catch (err) { toast((err as Error).message, 'error'); }
}

(window as any).verHistorial = verHistorial;

/* ========== CHARTS UPS ========== */

function renderChartsUPS(stats: StatsUPS): void {
  ['upsEstado','upsModelo','upsMeses','upsUbicacion'].forEach(k => { try { charts[k]?.destroy(); } catch {}; delete charts[k]; });
  const emptyLabel = 'Sin datos';
  const emptyColor = '#e2e8f0';

  // Estado chart
  const ctxEstado = (document.getElementById('chart-ups-estado') as HTMLCanvasElement).getContext('2d')!;
  charts.upsEstado = new Chart(ctxEstado, {
    type: 'doughnut',
    data: {
      labels: stats.estados?.length ? stats.estados.map(e => estadoLabelsUPS[e.estado] || e.estado) : [emptyLabel],
      datasets: [{
        data: stats.estados?.length ? stats.estados.map(e => e.count) : [1],
        backgroundColor: stats.estados?.length ? stats.estados.map(e => estadoColorsUPS[e.estado] || '#94a3b8') : [emptyColor],
        borderWidth: 2, borderColor: '#fff',
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { padding: 12, usePointStyle: true, font: { size: 12 } } } } },
  });

  // Modelo chart
  const ctxModelo = (document.getElementById('chart-ups-modelo') as HTMLCanvasElement).getContext('2d')!;
  charts.upsModelo = new Chart(ctxModelo, {
    type: 'bar', data: { labels: stats.modelos?.length ? stats.modelos.map(m => m.modelo) : [emptyLabel], datasets: [{ label: 'Cantidad', data: stats.modelos?.length ? stats.modelos.map(m => m.count) : [0], backgroundColor: stats.modelos?.length ? '#1e40af' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { stepSize: 1 }, grid: { display: false } }, y: { grid: { display: false } } } },
  });

  // Meses chart
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const ctxMeses = (document.getElementById('chart-ups-meses') as HTMLCanvasElement).getContext('2d')!;
  charts.upsMeses = new Chart(ctxMeses, {
    type: 'line', data: { labels: stats.ingresos_por_mes?.length ? stats.ingresos_por_mes.map(m => { const [y, mo] = m.mes.split('-'); return `${meses[parseInt(mo)-1]} ${y}`; }) : [emptyLabel], datasets: [{ label: 'Ingresos', data: stats.ingresos_por_mes?.length ? stats.ingresos_por_mes.map(m => m.count) : [0], borderColor: '#1e40af', backgroundColor: 'rgba(30,64,175,0.1)', fill: true, tension: 0.3, pointBackgroundColor: '#1e40af', pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.06)' } }, x: { grid: { display: false } } } },
  });

  // Ubicación chart
  const ctxUbic = (document.getElementById('chart-ups-ubicacion') as HTMLCanvasElement).getContext('2d')!;
  charts.upsUbicacion = new Chart(ctxUbic, {
    type: 'bar', data: { labels: stats.ubicaciones?.length ? stats.ubicaciones.map(u => u.ubicacion) : [emptyLabel], datasets: [{ label: 'Cantidad', data: stats.ubicaciones?.length ? stats.ubicaciones.map(u => u.count) : [0], backgroundColor: stats.ubicaciones?.length ? '#2563eb' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { display: false } }, x: { grid: { display: false } } } },
  });
}

function renderChartsHerr(stats: StatsHerr): void {
  ['herrEstado','herrMarca','herrMeses','herrUbicacion'].forEach(k => { try { charts[k]?.destroy(); } catch {}; delete charts[k]; });
  const emptyLabel = 'Sin datos';
  const emptyColor = '#e2e8f0';

  // Estado chart
  const ctxEstado = (document.getElementById('chart-herr-estado') as HTMLCanvasElement).getContext('2d')!;
  charts.herrEstado = new Chart(ctxEstado, {
    type: 'doughnut', data: { labels: stats.estados?.length ? stats.estados.map(e => estadoLabelsHerr[e.estado] || e.estado) : [emptyLabel], datasets: [{ data: stats.estados?.length ? stats.estados.map(e => e.count) : [1], backgroundColor: stats.estados?.length ? stats.estados.map(e => estadoColorsHerr[e.estado] || '#94a3b8') : [emptyColor], borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { padding: 12, usePointStyle: true, font: { size: 12 } } } } },
  });

  // Marca chart
  const ctxMarca = (document.getElementById('chart-herr-marca') as HTMLCanvasElement).getContext('2d')!;
  charts.herrMarca = new Chart(ctxMarca, {
    type: 'bar', data: { labels: stats.marcas?.length ? stats.marcas.map(m => m.marca) : [emptyLabel], datasets: [{ label: 'Cantidad', data: stats.marcas?.length ? stats.marcas.map(m => m.count) : [0], backgroundColor: stats.marcas?.length ? '#1e40af' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { stepSize: 1 }, grid: { display: false } }, y: { grid: { display: false } } } },
  });

  // Meses chart
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const ctxMeses = (document.getElementById('chart-herr-meses') as HTMLCanvasElement).getContext('2d')!;
  charts.herrMeses = new Chart(ctxMeses, {
    type: 'line', data: { labels: stats.adquisiciones_por_mes?.length ? stats.adquisiciones_por_mes.map(m => { const [y, mo] = m.mes.split('-'); return `${meses[parseInt(mo)-1]} ${y}`; }) : [emptyLabel], datasets: [{ label: 'Adquisiciones', data: stats.adquisiciones_por_mes?.length ? stats.adquisiciones_por_mes.map(m => m.count) : [0], borderColor: '#1e40af', backgroundColor: 'rgba(30,64,175,0.1)', fill: true, tension: 0.3, pointBackgroundColor: '#1e40af', pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.06)' } }, x: { grid: { display: false } } } },
  });

  // Ubicación chart
  const ctxUbic = (document.getElementById('chart-herr-ubicacion') as HTMLCanvasElement).getContext('2d')!;
  charts.herrUbicacion = new Chart(ctxUbic, {
    type: 'bar', data: { labels: stats.ubicaciones?.length ? stats.ubicaciones.map(u => u.ubicacion) : [emptyLabel], datasets: [{ label: 'Cantidad', data: stats.ubicaciones?.length ? stats.ubicaciones.map(u => u.count) : [0], backgroundColor: stats.ubicaciones?.length ? '#2563eb' : emptyColor, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { display: false } }, x: { grid: { display: false } } } },
  });
}

/* ========== MODAL UPS ========== */

async function openFormUPS(id: number | null = null): Promise<void> {
  if (id !== null && !await confirmarAdmin()) return;
  const modal = document.getElementById('modal-ups')!;
  modal.classList.add('active');
  (document.getElementById('form-ups') as HTMLFormElement).reset();
  (document.getElementById('ups-id') as HTMLInputElement).value = '';
  if (id) {
    const u = upsData.find(x => x.id === id);
    if (!u) return;
    document.getElementById('modal-ups-title')!.textContent = 'Editar UPS';
    (document.getElementById('ups-id') as HTMLInputElement).value = String(u.id);
    (document.getElementById('ups-serial') as HTMLInputElement).value = u.serial_number;
    (document.getElementById('ups-modelo') as HTMLInputElement).value = u.modelo || '';
    (document.getElementById('ups-capacidad') as HTMLInputElement).value = u.capacidad || '';
    (document.getElementById('ups-ubicacion') as HTMLInputElement).value = u.ubicacion || '';
    (document.getElementById('ups-estado') as HTMLSelectElement).value = u.estado;
    (document.getElementById('ups-fecha_ingreso') as HTMLInputElement).value = u.fecha_ingreso || '';
    (document.getElementById('ups-fecha_salida') as HTMLInputElement).value = u.fecha_salida || '';
    (document.getElementById('ups-notas') as HTMLTextAreaElement).value = u.notas || '';
  } else {
    document.getElementById('modal-ups-title')!.textContent = 'Nueva UPS';
    (document.getElementById('ups-estado') as HTMLSelectElement).value = 'activa';
    (document.getElementById('ups-fecha_ingreso') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
  }
}

async function deleteUPS(id: number): Promise<void> {
  if (!await confirmarAdmin()) return;
  if (!confirm('¿Eliminar esta UPS?')) return;
  try {
    await apiFetch(`/ups/${id}`, { method: 'DELETE' });
    toast('UPS eliminada', 'success');
    await loadUPS();
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function confirmarAdmin(): Promise<boolean> {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-password')!;
    const input = document.getElementById('input-password') as HTMLInputElement;
    const btnConfirmar = document.getElementById('btn-pw-confirmar')!;
    const btnCancelar = document.getElementById('btn-pw-cancelar')!;
    const btnCerrar = document.getElementById('btn-pw-cerrar')!;
    const limpiar = () => {
      overlay.classList.remove('active'); input.value = '';
      btnConfirmar.onclick = null; btnCancelar.onclick = null; btnCerrar.onclick = null;
      (input as any)._keydown = null;
    };
    const verificar = async () => {
      const pw = input.value;
      if (!pw) { input.focus(); return; }
      btnConfirmar.textContent = 'Verificando...';
      (btnConfirmar as HTMLButtonElement).disabled = true;
      try {
        const res = await apiFetch<{ ok: boolean }>('/auth/verify-password', { method: 'POST', body: JSON.stringify({ password: pw }) });
        if (res?.ok === true) { limpiar(); resolve(true); }
        else { toast('Contraseña incorrecta', 'error'); input.value = ''; input.focus(); }
      } catch { toast('Contraseña incorrecta', 'error'); input.value = ''; input.focus(); }
      finally { btnConfirmar.textContent = 'Confirmar'; (btnConfirmar as HTMLButtonElement).disabled = false; }
    };
    const cancelar = () => { limpiar(); resolve(false); };
    btnConfirmar.onclick = verificar; btnCancelar.onclick = cancelar; btnCerrar.onclick = cancelar;
    input.onkeydown = (e: KeyboardEvent) => { if (e.key === 'Enter') verificar(); if (e.key === 'Escape') cancelar(); };
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 100);
  });
}

/* ========== MODAL HERRAMIENTAS ========== */

async function openFormHerr(id: number | null = null): Promise<void> {
  if (id !== null && !await confirmarAdmin()) return;
  const modal = document.getElementById('modal-herramientas')!;
  modal.classList.add('active');
  (document.getElementById('form-herramientas') as HTMLFormElement).reset();
  (document.getElementById('herr-id') as HTMLInputElement).value = '';
  if (id) {
    const h = herrData.find(x => x.id === id);
    if (!h) return;
    document.getElementById('modal-herr-title')!.textContent = 'Editar Herramienta';
    (document.getElementById('herr-id') as HTMLInputElement).value = String(h.id);
    (document.getElementById('herr-codigo') as HTMLInputElement).value = h.codigo;
    (document.getElementById('herr-nombre') as HTMLInputElement).value = h.nombre || '';
    (document.getElementById('herr-marca') as HTMLInputElement).value = h.marca || '';
    (document.getElementById('herr-modelo') as HTMLInputElement).value = h.modelo || '';
    (document.getElementById('herr-ubicacion') as HTMLInputElement).value = h.ubicacion || '';
    (document.getElementById('herr-estado') as HTMLSelectElement).value = h.estado;
    (document.getElementById('herr-fecha') as HTMLInputElement).value = h.fecha_adquisicion || '';
    (document.getElementById('herr-notas') as HTMLTextAreaElement).value = h.notas || '';
  } else {
    document.getElementById('modal-herr-title')!.textContent = 'Nueva Herramienta';
    (document.getElementById('herr-estado') as HTMLSelectElement).value = 'disponible';
    (document.getElementById('herr-fecha') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
  }
}

async function deleteHerr(id: number): Promise<void> {
  if (!await confirmarAdmin()) return;
  if (!confirm('¿Eliminar esta herramienta?')) return;
  try {
    await apiFetch(`/herramientas/${id}`, { method: 'DELETE' });
    toast('Herramienta eliminada', 'success');
    await loadHerramientas();
  } catch (err) { toast((err as Error).message, 'error'); }
}

function closeAllModals(): void {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    if (m.classList.contains('active')) {
      const form = m.querySelector('form');
      if (form && form.dataset.dirty === 'true') {
        if (!confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?')) return;
      }
    }
    m.classList.remove('active');
  });
}

function resetDirty(modal: Element): void {
  const form = modal.querySelector('form');
  if (form) form.dataset.dirty = 'false';
}
function markDirty(form: HTMLFormElement): void {
  form.dataset.dirty = 'true';
}

/* ========== EXPORT EXCEL ========== */

async function exportExcel(section: string): Promise<void> {
  try {
    const res = await fetch(`${API}/export/${section}`, { headers: getHeaders() });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section}-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Excel descargado', 'success');
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== EXPORT PDF (imprimir) ========== */

async function exportPDF(section: string): Promise<void> {
  try {
    const data = section === 'ups' ? upsData : herrData;
    let html = `<div style="text-align:center;margin-bottom:20px;">
      <h2 style="font-size:1.2rem;">Inventario de ${section === 'ups' ? 'UPS' : 'Herramientas'}</h2>
      <p style="color:#64748b;">Generado: ${new Date().toLocaleString('es-MX')}</p>
      <hr style="margin:12px 0;border-color:#e2e8f0;">
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
      <thead><tr style="background:#f8fafc;">`;
    if (section === 'ups') {
      html += '<th style="padding:6px;border:1px solid #e2e8f0;">Serie</th><th style="padding:6px;border:1px solid #e2e8f0;">Modelo</th><th style="padding:6px;border:1px solid #e2e8f0;">Capacidad</th><th style="padding:6px;border:1px solid #e2e8f0;">Ubicación</th><th style="padding:6px;border:1px solid #e2e8f0;">Estado</th>';
      data.forEach((u: any) => {
        html += `<tr><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(u.serial_number)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(u.modelo)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(u.capacidad)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(u.ubicacion)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${estadoLabelsUPS[u.estado as UPSEstado] || u.estado}</td></tr>`;
      });
    } else {
      html += '<th style="padding:6px;border:1px solid #e2e8f0;">Código</th><th style="padding:6px;border:1px solid #e2e8f0;">Nombre</th><th style="padding:6px;border:1px solid #e2e8f0;">Marca</th><th style="padding:6px;border:1px solid #e2e8f0;">Ubicación</th><th style="padding:6px;border:1px solid #e2e8f0;">Estado</th>';
      data.forEach((h: any) => {
        const ea = h.estado === 'baja' ? 'baja' : (herramientaEnUso(h) ? 'en_uso' : 'disponible');
        html += `<tr><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(h.codigo)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(h.nombre)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(h.marca)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(h.ubicacion)}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${estadoLabelsHerr[ea]}</td></tr>`;
      });
    }
    html += '</tbody></table>';
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Inventario ${section}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#333;}table{width:100%;border-collapse:collapse;}th{background:#1e40af;color:white;}</style></head><body>${html}</body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== AUDITORIA ========== */

async function loadAuditoria(): Promise<void> {
  const tabla = (document.getElementById('audit-filtro') as HTMLSelectElement).value;
  try {
    const logs = await apiFetch<AuditoriaLog[]>(`/auditoria${tabla ? '?tabla='+tabla : ''}`);
    const tbody = document.getElementById('audit-tabla-body')!;
    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Sin registros</td></tr>'; return;
    }
    tbody.innerHTML = logs.map(l => {
      const detalle = l.accion === 'CREATE' ? 'Creación' :
        l.accion === 'DELETE' ? `Eliminó: ${l.datos_anteriores ? (l.datos_anteriores.serial_number || l.datos_anteriores.codigo || '') : ''}` :
        l.accion === 'UPDATE' ? 'Modificó registro' : l.accion;
      return `<tr><td style="white-space:nowrap;">${l.created_at || '-'}</td><td>${escapeHtml(l.usuario_nombre)}</td><td>${l.tabla}</td><td><span class="estado-badge ${l.accion === 'CREATE' ? 'estado-disponible' : l.accion === 'DELETE' ? 'estado-baja' : 'estado-activa'}">${l.accion}</span></td><td>${l.registro_id}</td><td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(detalle)}</td></tr>`;
    }).join('');
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== BACKUP ========== */

async function descargarBackup(): Promise<void> {
  try {
    const res = await fetch(`${API}/backup`, { headers: getHeaders() });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const blob = await res.blob();
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = dlUrl; a.download = `backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(dlUrl);
    toast('Backup descargado', 'success');
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function restaurarBackup(file: File): Promise<void> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await apiFetch('/backup/restore', { method: 'POST', body: JSON.stringify(data) });
    toast('Restauración completada', 'success');
    closeAllModals();
    await Promise.all([loadUPS(), loadHerramientas()]);
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== PROYECTOS ========== */

async function loadProyectos(): Promise<void> {
  try {
    proyectosData = (await apiFetch<Proyecto[]>('/proyectos')) || [];
    renderProyectos();
    actualizarSelectProyectos();
    actualizarSelectProyectoHerr();
    actualizarDashboardResumen();
    loadStatsProyectos();
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function loadMovimientos(): Promise<void> {
  try {
    movimientosData = (await apiFetch<Movimiento[]>('/movimientos')) || [];
    allMovimientosData = [...movimientosData];
    renderMovimientos();
    actualizarDashboardResumen();
  } catch (err) { toast((err as Error).message, 'error'); }
}

function renderProyectos(): void {
  const tbody = document.getElementById('proyectos-tabla-body')!;
  if (!proyectosData.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">Sin proyectos</td></tr>';
    return;
  }
  const filtered = proyectosData;
  initPag('pag-proy', filtered, () => renderProyectosPage(filtered), 'proyectos-tabla-body');
  renderProyectosPage(filtered);
}

function renderProyectosPage(filtered: Proyecto[]): void {
  const st = pagStates['pag-proy'];
  const start = st ? st.page * PAGE_SIZE : 0;
  const end = start + PAGE_SIZE;
  const page = filtered.slice(start, end);
  const tbody = document.getElementById('proyectos-tabla-body')!;
  if (page.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">Sin proyectos</td></tr>';
    return;
  }
  tbody.innerHTML = page.map(p => {
    const herramientasHtml = p.herramientas_asignadas
      ? p.herramientas_asignadas.split('||').filter(Boolean).map(entry => {
          const [id, ...nameParts] = entry.split('::');
          const name = nameParts.join('::');
          return `<span class="estado-badge estado-disponible" style="margin:2px 4px 2px 0;display:inline-block;" title="ID: ${escapeHtml(id)}">#${escapeHtml(id)} ${escapeHtml(name)}</span>`;
        }).join('')
      : '<span style="color:#94a3b8;">—</span>';
    const estado = (p as any).estado || 'abierto';
    return `<tr>
      <td><strong>${escapeHtml(p.nombre)}</strong></td>
      <td>${escapeHtml(p.ubicacion) || '-'}</td>
      <td style="white-space:nowrap;">${p.fecha_inicio || '-'}</td>
      <td style="white-space:nowrap;">${p.fecha_fin || '-'}</td>
      <td>${escapeHtml(p.responsable) || '-'} <button class="btn btn-xs" style="padding:1px 6px;font-size:0.7rem;border:1px solid #e2e8f0;border-radius:4px;background:#fff;cursor:pointer;vertical-align:middle;" onclick="cambiarResponsable(${p.id})" title="Cambiar responsable">✎</button></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(p.descripcion)}">${escapeHtml(p.descripcion) || '-'}</td>
      <td style="max-width:260px;line-height:1.6;">${herramientasHtml}</td>
      <td><span class="estado-badge ${estado === 'abierto' ? 'estado-disponible' : 'estado-baja'}">${estado === 'abierto' ? 'Abierto' : 'Cerrado'}</span></td>
      <td>
        <div class="acciones">
          <button class="btn btn-primary btn-xs" onclick="editarProyecto(${p.id})">Editar</button>
          <button class="btn btn-danger btn-xs" onclick="eliminarProyecto(${p.id})">Eliminar</button>
          ${estado === 'abierto' ? `<button class="btn btn-secondary btn-xs" onclick="cerrarProyecto(${p.id})">Cerrar</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  pagRender('pag-proy');
}

function renderMovimientos(): void {
  const filtroProyecto = (document.getElementById('filtro-proyecto-mov') as HTMLSelectElement)?.value || '';
  const filtered = filtroProyecto ? movimientosData.filter(m => m.proyecto_id === Number(filtroProyecto)) : movimientosData;
  document.getElementById('mov-count-prestadas')!.textContent = String(movimientosData.filter(m => !m.fecha_entrada).length);
  document.getElementById('mov-count-proyectos')!.textContent = String(new Set(movimientosData.filter(m => !m.fecha_entrada).map(m => m.proyecto_id)).size);
  document.getElementById('mov-count-total')!.textContent = String(movimientosData.length);
  const tbody = document.getElementById('movimientos-tabla-body')!;
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Sin movimientos</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td style="white-space:nowrap;">${m.fecha_salida || '-'}</td>
      <td><strong>${escapeHtml(m.herramienta_codigo)}</strong> ${escapeHtml(m.herramienta_nombre)}</td>
      <td>${escapeHtml(m.proyecto_nombre)}</td>
      <td>${escapeHtml(m.recibido_por) || '-'}</td>
      <td>${m.fecha_entrada ? '<span class="estado-badge estado-disponible">Devuelta</span>' : '<span class="estado-badge estado-prestada">En préstamo</span>'}</td>
      <td>${m.fecha_entrada || '-'}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.notas) || '-'}</td>
    </tr>
  `).join('');
}

async function actualizarSelectProyectos(): Promise<void> {
  const selects = ['filtro-proyecto-mov', 'asignar-proyecto'].map(id => document.getElementById(id)) as (HTMLSelectElement | null)[];
  const proyectos = (await apiFetch<Proyecto[]>('/proyectos')) || [];
  for (const sel of selects) {
    if (!sel) continue;
    const val = sel.value;
    sel.innerHTML = sel.id === 'filtro-proyecto-mov'
      ? '<option value="">Todos los proyectos</option>'
      : '<option value="">Seleccionar proyecto...</option>';
    proyectos.forEach(p => { sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`; });
    sel.value = val;
  }
}

async function actualizarSelectProyectoHerr(): Promise<void> {
  const sel = document.getElementById('filtro-proyecto-herr') as HTMLSelectElement;
  if (!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">Todos los proyectos</option>';
  for (const p of proyectosData) {
    sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`;
  }
  sel.value = val;
}

async function abrirFormProyecto(id: number | null = null): Promise<void> {
  if (id !== null && !await confirmarAdmin()) return;
  document.getElementById('modal-proyecto')!.classList.add('active');
  (document.getElementById('form-proyecto') as HTMLFormElement).reset();
  (document.getElementById('proyecto-id') as HTMLInputElement).value = '';
  document.getElementById('modal-proyecto-title')!.textContent = 'Nuevo Proyecto';
  await cargarSelectorHerramientas(id);
  if (id) {
    const p = proyectosData.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-proyecto-title')!.textContent = 'Editar Proyecto';
    (document.getElementById('proyecto-id') as HTMLInputElement).value = String(p.id);
    (document.getElementById('proy-nombre') as HTMLInputElement).value = p.nombre;
    (document.getElementById('proy-ubicacion') as HTMLInputElement).value = p.ubicacion || '';
    (document.getElementById('proy-fecha_inicio') as HTMLInputElement).value = p.fecha_inicio || '';
    (document.getElementById('proy-fecha_fin') as HTMLInputElement).value = p.fecha_fin || '';
    (document.getElementById('proy-responsable') as HTMLInputElement).value = p.responsable || '';
    (document.getElementById('proy-descripcion') as HTMLTextAreaElement).value = p.descripcion || '';
    if (p.herramientas_asignadas) {
      p.herramientas_asignadas.split('||').forEach(entry => {
        const idHerr = entry.split('::')[0];
        const cb = document.getElementById(`herr-cb-${idHerr}`) as HTMLInputElement | null;
        if (cb) cb.checked = true;
      });
    }
  }
}

(window as any).openFormUPS = openFormUPS;
(window as any).deleteUPS = deleteUPS;
(window as any).openFormHerr = openFormHerr;
(window as any).deleteHerr = deleteHerr;
(window as any).asignarHerramienta = asignarHerramienta;
(window as any).editarProyecto = abrirFormProyecto;
(window as any).eliminarProyecto = eliminarProyecto;
(window as any).cerrarProyecto = cerrarProyecto;
(window as any).cambiarResponsable = cambiarResponsable;

async function cargarSelectorHerramientas(proyectoActualId: number | null = null): Promise<void> {
  const container = document.getElementById('proy-herr-selector')!;
  try {
    const toolProyectoMap: Record<number, string> = {};
    for (const p of proyectosData) {
      if (p.id === proyectoActualId) continue;
      if (p.herramientas_asignadas) {
        p.herramientas_asignadas.split('||').forEach(entry => {
          const [idStr] = entry.split('::');
          const tid = parseInt(idStr, 10);
          if (!isNaN(tid) && !toolProyectoMap[tid]) toolProyectoMap[tid] = p.nombre;
        });
      }
    }
    const herramientas = (await apiFetch<Herramienta[]>('/herramientas')) || [];
    container.innerHTML = herramientas.length === 0
      ? '<p style="color:#94a3b8;padding:8px;">No hay herramientas disponibles</p>'
      : `<p style="font-size:0.8rem;color:#64748b;margin:0 0 8px;">Las herramientas en uso en otro proyecto se moverán automáticamente a este.</p>`
        + herramientas.map(h => {
          const enProyecto = toolProyectoMap[h.id];
          return `<label style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:6px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
            <input type="checkbox" id="herr-cb-${h.id}" value="${h.id}" style="accent-color:#1e40af;">
            <span style="font-size:0.85rem;"><strong>${escapeHtml(h.codigo)}</strong> — ${escapeHtml(h.nombre)}${enProyecto ? ` <span style="color:#d97706;font-size:0.75rem;">(se moverá desde: ${escapeHtml(enProyecto)})</span>` : ''}</span>
          </label>`;
        }).join('');
  } catch (err) { container.innerHTML = '<p style="color:#ef4444;padding:8px;">Error al cargar herramientas</p>'; }
}

async function eliminarProyecto(id: number): Promise<void> {
  if (!await confirmarAdmin()) return;
  if (!confirm('¿Eliminar este proyecto? También se eliminarán sus movimientos.')) return;
  try {
    await apiFetch(`/proyectos/${id}`, { method: 'DELETE' });
    toast('Proyecto eliminado', 'success');
    loadProyectos(); loadMovimientos();
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function cerrarProyecto(id: number): Promise<void> {
  if (!await confirmarAdmin()) return;
  if (!confirm('¿Cerrar este proyecto? Se liberarán todas las herramientas asignadas.')) return;
  try {
    await apiFetch(`/proyectos/${id}/cerrar`, { method: 'PUT' });
    toast('Proyecto cerrado, herramientas liberadas', 'success');
    await Promise.all([loadProyectos(), loadHerramientas()]);
  } catch (err) { toast((err as Error).message, 'error'); }
}

async function cambiarResponsable(id: number): Promise<void> {
  const p = proyectosData.find(x => x.id === id);
  if (!p) return;
  const nombre = prompt('Nuevo responsable:', p.responsable || '');
  if (!nombre || !nombre.trim()) return;
  try {
    await apiFetch(`/proyectos/${id}/responsable`, { method: 'PUT', body: JSON.stringify({ responsable: nombre.trim() }) });
    toast('Responsable actualizado', 'success');
    await loadProyectos();
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== ASIGNAR HERRAMIENTA ========== */

async function asignarHerramienta(id: number): Promise<void> {
  const h = herrData.find(x => x.id === id);
  if (!h) return;
  (document.getElementById('asignar-herramienta-id') as HTMLInputElement).value = String(h.id);
  (document.getElementById('asignar-herramienta-nombre') as HTMLInputElement).value = `${h.codigo} - ${h.nombre}`;
  (document.getElementById('asignar-fecha') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
  (document.getElementById('asignar-proyecto') as HTMLSelectElement).value = '';
  (document.getElementById('asignar-recibio') as HTMLInputElement).value = '';
  (document.getElementById('asignar-notas') as HTMLTextAreaElement).value = '';
  document.getElementById('modal-asignar')!.classList.add('active');
  await actualizarSelectProyectos();
  resetDirty(document.getElementById('modal-asignar')!);
}

/* ========== REPORTE FISICO ========== */

async function generarReporte(): Promise<void> {
  try {
    const data = await apiFetch<Movimiento[]>('/reporte/movimientos');
    if (!data || !data.length) {
      document.getElementById('reporte-contenido')!.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;">Sin movimientos</p>';
    } else {
      let html = `<div style="text-align:center;margin-bottom:20px;"><h2 style="font-size:1.2rem;">📋 Reporte de Movimientos de Herramientas</h2><p style="color:#64748b;">Generado: ${new Date().toLocaleString('es-MX')}</p><hr style="margin:12px 0;border-color:#e2e8f0;"></div>
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;"><thead><tr style="background:#f8fafc;"><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Fecha Salida</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Herramienta</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Código</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Proyecto</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Recibió</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Estado</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Fecha Retorno</th></tr></thead><tbody>`;
      data.forEach(m => {
        html += `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;">${m.fecha_salida}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(m.herramienta_nombre)}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(m.herramienta_codigo)}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(m.proyecto_nombre)}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${escapeHtml(m.recibido_por) || '-'}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${m.fecha_entrada ? 'Devuelta' : 'En uso'}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;">${m.fecha_entrada || '-'}</td></tr>`;
      });
      html += `</tbody></table>`;
      document.getElementById('reporte-contenido')!.innerHTML = html;
    }
    document.getElementById('modal-reporte')!.classList.add('active');
  } catch (err) { toast((err as Error).message, 'error'); }
}

/* ========== EVENTS ========== */

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    apiFetch<Usuario>('/auth/me').then(user => {
      if (user) {
        usuarioActual = user;
        document.getElementById('userInfo')!.innerHTML = `<strong>${escapeHtml(user.nombre)}</strong> (${user.rol})`;
        initDashboard();
      }
    }).catch(() => { localStorage.removeItem('token'); token = null; showView('login'); });
  } else { showView('login'); }

  document.getElementById('btnDarkMode')!.addEventListener('click', toggleDarkMode);

  document.querySelectorAll('.btn-nuevo').forEach(btn => {
    btn.addEventListener('click', () => {
      if ((btn as HTMLElement).dataset.section === 'ups') openFormUPS();
      else openFormHerr();
    });
  });

  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', () => exportExcel((btn as HTMLElement).dataset.section!));
  });

  document.querySelectorAll('.btn-pdf').forEach(btn => {
    btn.addEventListener('click', () => exportPDF((btn as HTMLElement).dataset.section!));
  });

  document.querySelectorAll('.modal-close, .btn-secondary[data-modal]').forEach(el => {
    el.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeAllModals(); });
  });

  // Dirty form tracking
  document.querySelectorAll('.modal-overlay form').forEach(form => {
    form.addEventListener('input', () => markDirty(form as HTMLFormElement));
    form.addEventListener('change', () => markDirty(form as HTMLFormElement));
  });
  const origOpenFormUPS = openFormUPS;
  (window as any).openFormUPS = async (id?: number | null) => {
    await origOpenFormUPS(id);
    resetDirty(document.getElementById('modal-ups')!);
  };
  const origOpenFormHerr = openFormHerr;
  (window as any).openFormHerr = async (id?: number | null) => {
    await origOpenFormHerr(id);
    resetDirty(document.getElementById('modal-herramientas')!);
  };
  const origAbirFormProyecto = abrirFormProyecto;
  (window as any).editarProyecto = async (id?: number | null) => {
    await origAbirFormProyecto(id);
    resetDirty(document.getElementById('modal-proyecto')!);
  };

  document.getElementById('btnPerfil')!.addEventListener('click', () => {
    (document.getElementById('perfil-email') as HTMLInputElement).value = usuarioActual?.email || '';
    (document.getElementById('perfil-rol') as HTMLInputElement).value = usuarioActual?.rol || '';
    document.getElementById('modal-perfil')!.classList.add('active');
    resetDirty(document.getElementById('modal-perfil')!);
  });

  document.getElementById('btnAuditoria')!.addEventListener('click', () => {
    document.getElementById('modal-auditoria')!.classList.add('active');
    loadAuditoria();
  });
  document.getElementById('audit-filtro')!.addEventListener('change', loadAuditoria);

  document.getElementById('btnBackupHeader')!.addEventListener('click', () => {
    document.getElementById('modal-backup')!.classList.add('active');
  });
  document.getElementById('btnBackup')!.addEventListener('click', descargarBackup);
  document.getElementById('btnRestore')!.addEventListener('click', () => {
    const fileInput = document.getElementById('backup-file') as HTMLInputElement;
    if (!fileInput.files?.[0]) return toast('Seleccioná un archivo', 'error');
    restaurarBackup(fileInput.files[0]);
  });

  document.getElementById('btnNuevoProyecto')!.addEventListener('click', async () => {
    await abrirFormProyecto();
    resetDirty(document.getElementById('modal-proyecto')!);
  });

  document.getElementById('form-proyecto')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e.target as HTMLElement).querySelector('button[type="submit"]') as HTMLElement;
    setLoading(btn, true);
    const id = (document.getElementById('proyecto-id') as HTMLInputElement).value;
    const herramientasSeleccionadas = Array.from(
      document.querySelectorAll<HTMLInputElement>('#proy-herr-selector input[type="checkbox"]:checked')
    ).map(cb => Number(cb.value));
    // Detect moved tools
    const movidas: string[] = [];
    for (const hId of herramientasSeleccionadas) {
      for (const p of proyectosData) {
        if (String(p.id) === id) continue;
        if (p.herramientas_asignadas?.split('||').some(e => e.startsWith(String(hId) + '::'))) {
          const h = herrData.find(x => x.id === hId);
          if (h) movidas.push(`${h.codigo} (desde: ${p.nombre})`);
          break;
        }
      }
    }
    if (movidas.length > 0) {
      toast(`🔀 Herramientas movidas: ${movidas.join(', ')}`, 'info');
    }
    const data = {
      nombre: (document.getElementById('proy-nombre') as HTMLInputElement).value.trim(),
      ubicacion: (document.getElementById('proy-ubicacion') as HTMLInputElement).value.trim(),
      descripcion: (document.getElementById('proy-descripcion') as HTMLTextAreaElement).value.trim(),
      fecha_inicio: (document.getElementById('proy-fecha_inicio') as HTMLInputElement).value || null,
      fecha_fin: (document.getElementById('proy-fecha_fin') as HTMLInputElement).value || null,
      responsable: (document.getElementById('proy-responsable') as HTMLInputElement).value.trim(),
      herramientas: herramientasSeleccionadas,
    };
    try {
      await apiFetch(id ? `/proyectos/${id}` : '/proyectos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      toast(id ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
      closeAllModals();
      loadProyectos();
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setLoading(btn, false); }
  });

  document.getElementById('btn-select-all-herr')!.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('#proy-herr-selector input[type="checkbox"]').forEach(cb => cb.checked = true);
  });
  document.getElementById('btn-deselect-all-herr')!.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('#proy-herr-selector input[type="checkbox"]').forEach(cb => cb.checked = false);
  });

  document.getElementById('form-asignar')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e.target as HTMLElement).querySelector('button[type="submit"]') as HTMLElement;
    setLoading(btn, true);
    const data = {
      herramienta_id: Number((document.getElementById('asignar-herramienta-id') as HTMLInputElement).value),
      proyecto_id: Number((document.getElementById('asignar-proyecto') as HTMLSelectElement).value),
      fecha_salida: (document.getElementById('asignar-fecha') as HTMLInputElement).value || null,
      recibido_por: (document.getElementById('asignar-recibio') as HTMLInputElement).value.trim(),
      notas: (document.getElementById('asignar-notas') as HTMLTextAreaElement).value.trim(),
    };
    try {
      await apiFetch('/movimientos/salida', { method: 'POST', body: JSON.stringify(data) });
      toast('Asignación registrada', 'success');
      closeAllModals();
      await Promise.all([loadHerramientas(), loadMovimientos()]);
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setLoading(btn, false); }
  });

  document.getElementById('filtro-proyecto-mov')!.addEventListener('change', renderMovimientos);
  document.getElementById('filtro-proyecto-herr')?.addEventListener('change', renderTableHerr);

  document.getElementById('form-password')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e.target as HTMLElement).querySelector('button[type="submit"]') as HTMLElement;
    setLoading(btn, true);
    try {
      await apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify({
        currentPassword: (document.getElementById('perfil-current') as HTMLInputElement).value,
        newPassword: (document.getElementById('perfil-new') as HTMLInputElement).value,
      })});
      toast('Contraseña actualizada', 'success');
      closeAllModals();
      (document.getElementById('form-password') as HTMLFormElement).reset();
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setLoading(btn, false); }
  });

  document.getElementById('form-ups')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e.target as HTMLElement).querySelector('button[type="submit"]') as HTMLElement;
    setLoading(btn, true);
    const id = (document.getElementById('ups-id') as HTMLInputElement).value;
    const data = {
      serial_number: (document.getElementById('ups-serial') as HTMLInputElement).value.trim(),
      modelo: (document.getElementById('ups-modelo') as HTMLInputElement).value.trim(),
      capacidad: (document.getElementById('ups-capacidad') as HTMLInputElement).value.trim(),
      ubicacion: (document.getElementById('ups-ubicacion') as HTMLInputElement).value.trim(),
      estado: (document.getElementById('ups-estado') as HTMLSelectElement).value,
      fecha_ingreso: (document.getElementById('ups-fecha_ingreso') as HTMLInputElement).value || null,
      fecha_salida: (document.getElementById('ups-fecha_salida') as HTMLInputElement).value || null,
      notas: (document.getElementById('ups-notas') as HTMLTextAreaElement).value.trim(),
    };
    try {
      await apiFetch(id ? `/ups/${id}` : '/ups', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      toast(id ? 'UPS actualizada' : 'UPS creada', 'success');
      closeAllModals();
      await loadUPS();
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setLoading(btn, false); }
  });

  document.getElementById('form-herramientas')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = (e.target as HTMLElement).querySelector('button[type="submit"]') as HTMLElement;
    setLoading(btn, true);
    const id = (document.getElementById('herr-id') as HTMLInputElement).value;
    const data = {
      codigo: (document.getElementById('herr-codigo') as HTMLInputElement).value.trim(),
      nombre: (document.getElementById('herr-nombre') as HTMLInputElement).value.trim(),
      marca: (document.getElementById('herr-marca') as HTMLInputElement).value.trim(),
      modelo: (document.getElementById('herr-modelo') as HTMLInputElement).value.trim(),
      ubicacion: (document.getElementById('herr-ubicacion') as HTMLInputElement).value.trim(),
      estado: (document.getElementById('herr-estado') as HTMLSelectElement).value,
      fecha_adquisicion: (document.getElementById('herr-fecha') as HTMLInputElement).value || null,
      notas: (document.getElementById('herr-notas') as HTMLTextAreaElement).value.trim(),
    };
    try {
      await apiFetch(id ? `/herramientas/${id}` : '/herramientas', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      toast(id ? 'Herramienta actualizada' : 'Herramienta creada', 'success');
      closeAllModals();
      await loadHerramientas();
    } catch (err) { toast((err as Error).message, 'error'); }
    finally { setLoading(btn, false); }
  });

  document.querySelectorAll<HTMLSelectElement>('.estado-select').forEach(el => {
    el.addEventListener('change', async function () {
      const select = this;
      const id = Number(select.dataset.id);
      const section = select.dataset.section;
      if (section !== 'ups') return;
      const estado = select.value;
      try {
        await apiFetch(`/ups/${id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
        toast('Estado actualizado', 'success');
        const u = upsData.find(x => x.id === id);
        if (u) u.estado = estado as UPSEstado;
        updateResumenUPS();
      } catch (err) { toast((err as Error).message, 'error'); }
    });
  });

  document.querySelectorAll<HTMLInputElement>('.filtro-buscar').forEach(el => {
    el.addEventListener('input', () => {
      if (el.dataset.section === 'ups') renderTableUPS();
      else renderTableHerr();
    });
  });

  document.querySelectorAll<HTMLSelectElement>('.filtro-estado').forEach(el => {
    el.addEventListener('change', () => {
      if (el.dataset.section === 'ups') renderTableUPS();
      else renderTableHerr();
    });
  });
});
