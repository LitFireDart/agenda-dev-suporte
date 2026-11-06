/**
 * DevProgress - gráfico de tarefas concluídas, no estilo do GitHub.
 *
 * Recebe o JSON de /api/stats/contributions e desenha:
 *  - cartões de resumo (total, dias ativos, maiores sequências)
 *  - o mapa de calor (uma coluna por semana, começando no domingo)
 *  - a lista do que foi concluído no dia clicado
 */
class DevProgress {
  constructor({ heatmap, summary, heading, years, detail, onYearChange, onItemClick }) {
    this.el = { heatmap, summary, heading, years, detail };
    this.onYearChange = onYearChange || (() => {});
    this.onItemClick = onItemClick || (() => {});
    this.data = null;
    this.selected = null;
    this.tooltip = null;

    this.MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    this.MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  }

  // ---------- utilidades ----------

  esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
  }

  parse(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  key(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
  }

  addDays(date, n) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
  }

  longDate(str) {
    const d = this.parse(str);
    return `${d.getDate()} de ${this.MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
  }

  plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
  }

  level(count, max) {
    if (!count) return 0;
    // O divisor mínimo 4 evita que 1 ou 2 tarefas já pintem o verde mais escuro.
    return Math.min(4, Math.ceil((count / Math.max(max, 4)) * 4));
  }

  // ---------- renderização ----------

  render(data) {
    this.data = data;
    this.counts = new Map(data.days.map(d => [d.date, d.count]));
    this.itemsByDay = new Map();
    data.items.forEach(item => {
      if (!this.itemsByDay.has(item.date)) this.itemsByDay.set(item.date, []);
      this.itemsByDay.get(item.date).push(item);
    });

    // Mantém o dia aberto se ele ainda está no período; senão, o mais recente com conclusões.
    const prev = this.selected;
    this.selected = (prev && prev >= data.start && prev <= data.end)
      ? prev
      : (data.items.length ? data.items[0].date : null);

    this.renderHeading();
    this.renderSummary();
    this.renderYears();
    this.renderHeatmap();
    this.renderDetail();
  }

  renderHeading() {
    const { total, year } = this.data;
    const period = year ? `em ${year}` : 'no último ano';
    const text = total === 0
      ? `Nenhuma tarefa concluída ${period}`
      : `${this.plural(total, 'tarefa concluída', 'tarefas concluídas')} ${period}`;
    this.el.heading.querySelector('span').textContent = text;
  }

  renderSummary() {
    const { active_days, longest_streak, current_streak, busiest_day, total, year, today } = this.data;
    const isCurrentWindow = !year || year === Number(today.slice(0, 4));

    const tiles = [
      { label: 'Concluídas', value: total, hint: year ? String(year) : 'últimos 12 meses', icon: 'check-circle' },
      { label: 'Dias ativos', value: active_days, hint: 'com ao menos 1 conclusão', icon: 'calendar-check' },
      { label: 'Maior sequência', value: `${longest_streak} ${longest_streak === 1 ? 'dia' : 'dias'}`, hint: 'dias seguidos', icon: 'trending-up' },
      isCurrentWindow
        ? { label: 'Sequência atual', value: `${current_streak} ${current_streak === 1 ? 'dia' : 'dias'}`, hint: current_streak ? 'continue assim!' : 'conclua algo hoje', icon: 'flame' }
        : { label: 'Dia mais produtivo', value: busiest_day ? String(busiest_day.count) : '0', hint: busiest_day ? this.longDate(busiest_day.date) : '—', icon: 'star' }
    ];

    this.el.summary.innerHTML = tiles.map(t => `
      <div class="border border-slate-200 rounded-xl p-3">
        <div class="flex items-center justify-between text-slate-500 mb-1">
          <span class="text-[11px] font-bold uppercase tracking-wider">${this.esc(t.label)}</span>
          <i data-lucide="${t.icon}" class="w-3.5 h-3.5 text-slate-400"></i>
        </div>
        <div class="text-xl font-black text-slate-900 font-mono">${this.esc(t.value)}</div>
        <div class="text-[11px] text-slate-500 mt-0.5 truncate">${this.esc(t.hint)}</div>
      </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  renderYears() {
    const { years, year } = this.data;
    const options = [{ value: null, label: 'Último ano' }, ...years.map(y => ({ value: y, label: String(y) }))];

    this.el.years.innerHTML = options.map(o => {
      const active = (o.value ?? null) === (year ?? null);
      const cls = active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 border border-slate-200';
      return `<button type="button" data-year="${o.value ?? ''}" aria-pressed="${active}"
        class="px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors ${cls}">${this.esc(o.label)}</button>`;
    }).join('');

    this.el.years.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.year;
        this.onYearChange(val ? Number(val) : null);
      });
    });
  }

  renderHeatmap() {
    const { start, end, today, busiest_day } = this.data;
    const startDate = this.parse(start);
    const endDate = this.parse(end);
    const max = busiest_day ? busiest_day.count : 0;

    // O grid começa sempre no domingo da semana do primeiro dia.
    const gridStart = this.addDays(startDate, -startDate.getDay());
    const totalDays = Math.round((endDate - gridStart) / 86400000) + 1;
    const weeks = Math.ceil(totalDays / 7);

    let cells = '';
    const monthLabels = [];
    let lastMonth = -1;
    let lastLabelWeek = 0;

    for (let w = 0; w < weeks; w++) {
      // Rótulo do mês: na primeira semana em que ele aparece.
      const weekStart = this.addDays(gridStart, w * 7);
      const labelDay = weekStart < startDate ? startDate : weekStart;
      if (labelDay.getMonth() !== lastMonth) {
        lastMonth = labelDay.getMonth();
        // Se o mês anterior ocupou menos de 3 colunas (mês parcial no início), troca o rótulo dele.
        if (monthLabels.length && w - lastLabelWeek < 3) monthLabels.pop();
        monthLabels.push({ week: w, text: this.MONTHS_SHORT[lastMonth] });
        lastLabelWeek = w;
      }

      for (let i = 0; i < 7; i++) {
        const day = this.addDays(weekStart, i);
        if (day < startDate || day > endDate) {
          cells += '<span class="hm-cell is-blank" aria-hidden="true"></span>';
          continue;
        }
        const k = this.key(day);
        if (k > today) {
          cells += '<span class="hm-cell is-future" aria-hidden="true"></span>';
          continue;
        }
        const count = this.counts.get(k) || 0;
        const label = `${count ? this.plural(count, 'tarefa concluída', 'tarefas concluídas') : 'Nenhuma tarefa concluída'} em ${this.longDate(k)}`;
        cells += `<button type="button" class="hm-cell" data-date="${k}" data-count="${count}" data-level="${this.level(count, max)}"
          aria-label="${this.esc(label)}" aria-pressed="${k === this.selected}"></button>`;
      }
    }

    const months = monthLabels.map(m =>
      `<span class="text-[11px] text-slate-500 leading-none" style="grid-column:${m.week + 1}; grid-row:1; white-space:nowrap">${m.text}</span>`
    ).join('');

    const dayLabels = ['', 'Seg', '', 'Qua', '', 'Sex', ''].map(t =>
      `<span class="text-[11px] text-slate-500 leading-[12px] h-3">${t}</span>`
    ).join('');

    this.el.heatmap.innerHTML = `
      <div class="overflow-x-auto pb-1" id="hm-scroll">
        <div class="inline-flex gap-2">
          <div class="flex flex-col gap-[3px] pt-[19px] pr-1">${dayLabels}</div>
          <div>
            <div class="hm-months mb-[3px]" style="grid-template-columns: repeat(${weeks}, 12px)">${months}</div>
            <div class="hm-grid" id="hm-grid">${cells}</div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3 mt-3 text-[11px] text-slate-500">
        <span>Cada quadrado é um dia. Clique para ver o que foi concluído.</span>
        <div class="flex items-center gap-1.5 shrink-0">
          <span>Menos</span>
          ${[0, 1, 2, 3, 4].map(l => `<span class="hm-legend-cell" style="background-color: var(--hm-${l})"></span>`).join('')}
          <span>Mais</span>
        </div>
      </div>
    `;

    const scroller = this.el.heatmap.querySelector('#hm-scroll');
    scroller.scrollLeft = scroller.scrollWidth; // mostra os dias mais recentes

    const grid = this.el.heatmap.querySelector('#hm-grid');
    grid.addEventListener('click', e => {
      const btn = e.target.closest('button.hm-cell');
      if (btn) this.select(btn.dataset.date);
    });
    grid.addEventListener('mouseover', e => {
      const btn = e.target.closest('button.hm-cell');
      if (btn) this.showTooltip(btn);
    });
    grid.addEventListener('mouseout', e => {
      if (e.target.closest('button.hm-cell')) this.hideTooltip();
    });
    grid.addEventListener('focusin', e => {
      const btn = e.target.closest('button.hm-cell');
      if (btn) this.showTooltip(btn);
    });
    grid.addEventListener('focusout', () => this.hideTooltip());
    scroller.addEventListener('scroll', () => this.hideTooltip(), { passive: true });
  }

  // ---------- tooltip ----------

  showTooltip(btn) {
    this.hideTooltip();
    const count = Number(btn.dataset.count);
    const d = this.parse(btn.dataset.date);
    const when = `${d.getDate()} de ${this.MONTHS_SHORT[d.getMonth()]}. de ${d.getFullYear()}`;
    const tip = document.createElement('div');
    tip.className = 'hm-tooltip';
    tip.innerHTML = `<strong>${count ? this.plural(count, 'tarefa concluída', 'tarefas concluídas') : 'Nenhuma tarefa concluída'}</strong> em ${when}`;
    document.body.appendChild(tip);

    const rect = btn.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const x = Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8);
    tip.style.left = `${x}px`;
    tip.style.top = `${rect.top - 6}px`;
    this.tooltip = tip;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  // ---------- detalhe do dia ----------

  select(dateStr) {
    this.selected = dateStr;
    this.el.heatmap.querySelectorAll('button.hm-cell').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.date === dateStr));
    });
    this.renderDetail();
  }

  renderDetail() {
    const box = this.el.detail;
    if (!this.selected) {
      box.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i data-lucide="sprout" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
          <p class="text-sm font-semibold text-slate-600">Nada concluído neste período ainda.</p>
          <p class="text-xs text-slate-500 mt-1">Quando você concluir uma tarefa, ela acende um quadrado aqui.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const items = this.itemsByDay.get(this.selected) || [];
    const pillClass = {
      'Suporte': 'pill-cat-suporte', 'Bugfix': 'pill-cat-bugfix', 'Deploy': 'pill-cat-deploy',
      'Desenvolvimento': 'pill-cat-desenvolvimento', 'Manutenção': 'pill-cat-manutencao', 'Reunião': 'pill-cat-reuniao'
    };

    const header = `
      <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
        <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
        ${items.length ? this.plural(items.length, 'tarefa concluída', 'tarefas concluídas') : 'Nenhuma tarefa concluída'}
        em ${this.esc(this.longDate(this.selected))}
      </h4>`;

    if (!items.length) {
      box.innerHTML = header + '<p class="text-xs text-slate-500">Dia sem conclusões.</p>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    box.innerHTML = header + `<ul class="space-y-2">${items.map(it => `
      <li>
        <button type="button" data-id="${it.id}"
          class="w-full text-left border border-slate-200 hover:border-slate-300 rounded-xl p-3 transition-colors">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${pillClass[it.category] || 'pill-cat-reuniao'}">${this.esc(it.category)}</span>
            <span class="font-bold text-sm text-slate-900">${this.esc(it.title)}</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">${this.esc(it.system_client)} &bull; Prioridade ${this.esc(it.priority)}</div>
          ${it.resolution_notes ? `<p class="text-xs text-slate-700 mt-2 leading-relaxed">${this.esc(it.resolution_notes)}</p>` : ''}
        </button>
      </li>`).join('')}</ul>`;

    box.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => this.onItemClick(Number(btn.dataset.id)));
    });
    if (window.lucide) window.lucide.createIcons();
  }
}
