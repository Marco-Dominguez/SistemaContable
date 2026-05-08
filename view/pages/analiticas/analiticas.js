const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_COLORS = {
    'Pendiente': '#eab308',
    'En Proceso': '#3b82f6',
    'Para Pago': '#ef4444',
    'Pagada': '#22c55e',
    'Presentada_Cero': '#94a3b8',
};

const STATUS_LABELS = {
    'Pendiente': 'Pendiente',
    'En Proceso': 'En Proceso',
    'Para Pago': 'Para Pago',
    'Pagada': 'Pagada',
    'Presentada_Cero': 'En Cero',
};

// instancias de Chart.js
let chartEstatus = null;
let chartTendencia = null;
let chartObligaciones = null;
let chartDeclMes = null;

document.addEventListener('DOMContentLoaded', async () => {
    Auth.redirectIfNotLogged();

    // selector de año
    const currentYear = new Date().getFullYear();
    const selAnio = document.getElementById('analiticas-anio');
    for (let y = currentYear; y >= 2020; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        selAnio.appendChild(opt);
    }

    selAnio.addEventListener('change', () => loadAnaliticas());
    document.getElementById('btn-refresh-analiticas')?.addEventListener('click', () => loadAnaliticas());

    await loadAnaliticas();
});

async function loadAnaliticas() {
    const anio = document.getElementById('analiticas-anio').value || new Date().getFullYear();

    try {
        const res = await Api.get(`analiticas?action=general&anio=${anio}`);
        if (!res?.success) {
            Toast.error('Error al cargar analíticas.');
            return;
        }
        const d = res.data;

        // kpis
        if (d.kpi) renderKPIs(d.kpi);

        // graficas
        if (d.por_estatus) renderChartEstatus(d.por_estatus);
        if (d.tendencia) renderChartTendencia(d.tendencia);
        if (d.obligaciones) renderChartObligaciones(d.obligaciones);
        if (d.tendencia) renderChartDeclMes(d.tendencia);
        if (d.top_clientes) renderTopClientes(d.top_clientes);

    } catch (e) {
        Toast.error('No se pudieron cargar las analíticas.');
    }
}

// kpis
function renderKPIs(kpi) {
    document.getElementById('kpi-total-val').textContent = kpi.total.toLocaleString('es-MX');
    document.getElementById('kpi-pend-val').textContent = kpi.pendientes.toLocaleString('es-MX');
    document.getElementById('kpi-imp-val').textContent = '$' + kpi.total_importe.toLocaleString('es-MX', { minimumFractionDigits: 2 });
    document.getElementById('kpi-sal-val').textContent = '$' + kpi.total_saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

// grafico de dona: distribucion por estatus
function renderChartEstatus(porEstatus) {
    if (chartEstatus) chartEstatus.destroy();

    const labels = porEstatus.map(e => STATUS_LABELS[e.estatus] || e.estatus);
    const data = porEstatus.map(e => parseInt(e.cantidad));
    const colors = porEstatus.map(e => STATUS_COLORS[e.estatus] || '#cbd5e1');

    const ctx = document.getElementById('chart-estatus').getContext('2d');
    chartEstatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 12,
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
        }
    });
}

// grafico de lineas: tendencia mensual
function renderChartTendencia(tendencia) {
    if (chartTendencia) chartTendencia.destroy();

    // meses completos 1-12
    const importes = new Array(12).fill(0);
    const saldos = new Array(12).fill(0);
    tendencia.forEach(t => {
        const idx = parseInt(t.mes) - 1;
        importes[idx] = parseFloat(t.importe);
        saldos[idx] = parseFloat(t.saldo_favor);
    });

    const ctx = document.getElementById('chart-tendencia').getContext('2d');
    chartTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MESES_CORTOS,
            datasets: [
                {
                    label: 'Importe a Pagar',
                    data: importes,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 2.5,
                },
                {
                    label: 'Saldo a Favor',
                    data: saldos,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.08)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 2.5,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, usePointStyle: true, font: { family: 'Inter', size: 12 } }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (v) => '$' + v.toLocaleString('es-MX'),
                        font: { family: 'Inter', size: 11 }
                    },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                x: {
                    ticks: { font: { family: 'Inter', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// grafico de barras horizontales: obligaciones mas frecuentes
function renderChartObligaciones(obligaciones) {
    if (chartObligaciones) chartObligaciones.destroy();

    const labels = obligaciones.map(o => o.clave);
    const data = obligaciones.map(o => parseInt(o.cantidad));
    const barColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

    const ctx = document.getElementById('chart-obligaciones').getContext('2d');
    chartObligaciones = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Declaraciones',
                data,
                backgroundColor: barColors.slice(0, data.length),
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 28,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            return obligaciones[idx].nombre;
                        },
                        label: (ctx) => ` ${ctx.raw} declaraciones`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Inter', size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                y: {
                    ticks: { font: { family: 'Inter', size: 12, weight: 500 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// grafico de barras: declaraciones por mes
function renderChartDeclMes(tendencia) {
    if (chartDeclMes) chartDeclMes.destroy();

    const declPorMes = new Array(12).fill(0);
    tendencia.forEach(t => {
        declPorMes[parseInt(t.mes) - 1] = parseInt(t.total_decl);
    });

    const ctx = document.getElementById('chart-decl-mes').getContext('2d');
    chartDeclMes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MESES_CORTOS,
            datasets: [{
                label: 'Declaraciones',
                data: declPorMes,
                backgroundColor: declPorMes.map((_, i) => {
                    const currentMonth = new Date().getMonth();
                    return i === currentMonth ? '#2563eb' : 'rgba(37,99,235,0.25)';
                }),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw} declaraciones`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Inter', size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                x: {
                    ticks: { font: { family: 'Inter', size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// tabla top clientes
function renderTopClientes(topClientes) {
    const tbody = document.querySelector('#table-top-clientes tbody');
    if (!topClientes.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-400 py-8">Sin datos para este año</td></tr>';
        return;
    }
    tbody.innerHTML = topClientes.map((c, i) => `
        <tr>
            <td><span class="badge badge-blue" style="font-size:.7rem">${i + 1}</span></td>
            <td class="font-medium text-slate-700">${escHtml(c.razon_social)}</td>
            <td class="text-right">${parseInt(c.cantidad)}</td>
            <td class="text-right font-medium">$${parseFloat(c.total_importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');
}
