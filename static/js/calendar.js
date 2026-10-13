/**
 * Motor de Calendário Interativo para DevAgenda (Mês e Semana) - Tema Cinza Claro Tradicional
 */
class DevCalendar {
  constructor(options = {}) {
    this.container = options.container;
    this.currentDate = new Date();
    this.viewMode = options.viewMode || 'month'; // 'month' | 'week'
    this.events = [];
    this.onDayClick = options.onDayClick || (() => {});
    this.onEventClick = options.onEventClick || (() => {});
    this.onMonthChange = options.onMonthChange || (() => {});
  }

  setEvents(events) {
    this.events = events;
    this.render();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  prev() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    }
    this.render();
    this.onMonthChange(this.getMonthString());
  }

  next() {
    if (this.viewMode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    }
    this.render();
    this.onMonthChange(this.getMonthString());
  }

  today() {
    this.currentDate = new Date();
    this.render();
    this.onMonthChange(this.getMonthString());
  }

  getMonthString() {
    const year = this.currentDate.getFullYear();
    const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  getHeaderTitle() {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const year = this.currentDate.getFullYear();

    if (this.viewMode === 'month') {
      return `${months[this.currentDate.getMonth()]} de ${year}`;
    } else {
      // Semana
      const weekStart = this.getStartOfWeek(this.currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const startMonth = months[weekStart.getMonth()].substring(0, 3);
      const endMonth = months[weekEnd.getMonth()].substring(0, 3);
      
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${year}`;
    }
  }

  getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  formatDateYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Pendente': return 'badge-status-pendente';
      case 'Em Andamento': return 'badge-status-emandamento';
      case 'Aguardando': return 'badge-status-aguardando';
      case 'Concluído': return 'badge-status-concluido';
      case 'Cancelado': return 'badge-status-cancelado';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  getPriorityDot(priority) {
    switch (priority) {
      case 'Urgente': return '<span class="w-2.5 h-2.5 rounded-full bg-rose-500 pulse-urgent inline-block shrink-0 shadow-sm"></span>';
      case 'Alta': return '<span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0 shadow-sm"></span>';
      case 'Normal': return '<span class="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0 shadow-sm"></span>';
      case 'Baixa': return '<span class="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block shrink-0 shadow-sm"></span>';
      default: return '';
    }
  }

  getCategoryPill(category) {
    switch (category) {
      case 'Suporte': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-suporte shadow-xs">SUPORTE</span>';
      case 'Bugfix': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-bugfix shadow-xs">BUG</span>';
      case 'Deploy': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-deploy shadow-xs">DEPLOY</span>';
      case 'Desenvolvimento': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-desenvolvimento shadow-xs">DEV</span>';
      case 'Manutenção': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-manutencao shadow-xs">MANUT</span>';
      case 'Reunião': return '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold pill-cat-reuniao shadow-xs">REUNIÃO</span>';
      default: return `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-semibold">${category}</span>`;
    }
  }

  render() {
    if (!this.container) return;

    if (this.viewMode === 'month') {
      this.renderMonthView();
    } else {
      this.renderWeekView();
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const todayStr = this.formatDateYMD(new Date());

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    let html = `
      <div class="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <!-- Dias da Semana Cabeçalho -->
        <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider text-center py-3">
          ${weekDays.map((d, idx) => `
            <div class="${idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-700'}">
              <span class="hidden md:inline">${d}</span>
              <span class="md:hidden">${d.substring(0, 3)}</span>
            </div>
          `).join('')}
        </div>

        <!-- Grade de Dias -->
        <div class="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-100">
    `;

    // Dias do mês anterior (padding)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = lastDayPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateYMD(prevDate);
      html += this.renderDayCell(dateStr, dayNum, false, todayStr);
    }

    // Dias do mês atual
    for (let dayNum = 1; dayNum <= lastDayCurrentMonth; dayNum++) {
      const currDate = new Date(year, month, dayNum);
      const dateStr = this.formatDateYMD(currDate);
      html += this.renderDayCell(dateStr, dayNum, true, todayStr);
    }

    // Dias do próximo mês (padding para fechar a grade de 35 ou 42 células)
    const totalRendered = firstDayIndex + lastDayCurrentMonth;
    const remaining = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = this.formatDateYMD(nextDate);
      html += this.renderDayCell(dateStr, dayNum, false, todayStr);
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachCellEvents();
  }

  renderDayCell(dateStr, dayNum, isCurrentMonth, todayStr) {
    const isToday = (dateStr === todayStr);
    const dayEvents = this.events.filter(e => {
      return e.start_date <= dateStr && e.end_date >= dateStr;
    });

    const isWeekend = new Date(dateStr + 'T00:00:00').getDay() === 0 || new Date(dateStr + 'T00:00:00').getDay() === 6;

    let cellBg = isCurrentMonth ? (isWeekend ? 'bg-slate-50/70' : 'bg-white') : 'bg-slate-100/60 opacity-60';
    if (isToday) {
      cellBg = 'bg-blue-50/70 ring-2 ring-inset ring-blue-500/80';
    }

    let eventsHtml = '';
    const maxVisible = 3;
    const visibleEvents = dayEvents.slice(0, maxVisible);
    const hiddenCount = dayEvents.length - maxVisible;

    for (const event of visibleEvents) {
      const priorityDot = this.getPriorityDot(event.priority);
      const badgeClass = this.getStatusBadgeClass(event.status);

      eventsHtml += `
        <div 
          data-event-id="${event.id}" 
          class="appointment-badge cursor-pointer p-1.5 rounded-lg text-xs border ${badgeClass} hover:shadow-md transition-all flex flex-col gap-0.5 shadow-2xs group"
          title="${event.title} (${event.system_client}) - ${event.status}"
        >
          <div class="flex items-center justify-between gap-1 overflow-hidden">
            <span class="flex items-center gap-1.5 min-w-0">
              ${priorityDot}
              <span class="font-bold truncate text-slate-900 text-[11px] group-hover:text-blue-700 transition-colors">
                ${event.title}
              </span>
            </span>
            ${event.start_time ? `<span class="text-[10px] font-mono font-semibold text-slate-600 shrink-0">${event.start_time}</span>` : ''}
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-600 font-medium">
            <span class="truncate">${event.system_client}</span>
            <span class="text-[9px] uppercase tracking-wider font-bold">${event.status}</span>
          </div>
        </div>
      `;
    }

    if (hiddenCount > 0) {
      eventsHtml += `
        <button 
          data-view-day="${dateStr}"
          class="btn-more-events w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
        >
          + ${hiddenCount} ${hiddenCount === 1 ? 'outro' : 'outros'}...
        </button>
      `;
    }

    return `
      <div 
        data-date="${dateStr}" 
        class="calendar-day-cell group relative p-2 ${cellBg} hover:bg-blue-50/30 transition-colors flex flex-col justify-between"
      >
        <!-- Topo da célula: Número do dia e botão de add -->
        <div class="flex items-center justify-between mb-1.5">
          <span class="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-lg ${
            isToday 
              ? 'bg-blue-600 text-white shadow-sm' 
              : (isCurrentMonth ? 'text-slate-800' : 'text-slate-400')
          }">
            ${dayNum}
          </span>
          <button 
            type="button"
            data-date-add="${dateStr}"
            title="Agendar compromisso neste dia"
            class="add-prompt-btn opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white hover:bg-blue-600 rounded-md transition-all duration-150"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Lista de Compromissos do Dia -->
        <div class="space-y-1.5 flex-1 min-h-[60px]">
          ${eventsHtml}
        </div>
      </div>
    `;
  }

  renderWeekView() {
    const weekStart = this.getStartOfWeek(this.currentDate);
    const todayStr = this.formatDateYMD(new Date());
    const weekDaysNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    let html = `
      <div class="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <!-- Grade Semanal (7 Colunas) -->
        <div class="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
    `;

    for (let i = 0; i < 7; i++) {
      const dayDate = days[i];
      const dateStr = this.formatDateYMD(dayDate);
      const isToday = (dateStr === todayStr);

      const dayEvents = this.events.filter(e => {
        return e.start_date <= dateStr && e.end_date >= dateStr;
      }).sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));

      html += `
        <div class="flex flex-col min-h-[450px] ${isToday ? 'bg-blue-50/20' : 'bg-white'}">
          <!-- Cabeçalho do Dia na Semana -->
          <div class="p-3 border-b border-slate-200 flex items-center justify-between ${isToday ? 'bg-blue-50' : 'bg-slate-50'}">
            <div>
              <span class="block text-xs font-bold uppercase tracking-wider text-slate-500">
                ${weekDaysNames[i]}
              </span>
              <span class="text-lg font-extrabold ${isToday ? 'text-blue-600' : 'text-slate-900'}">
                ${dayDate.getDate()}
              </span>
            </div>
            <button 
              type="button"
              data-date-add="${dateStr}"
              class="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-600 hover:text-white px-2 py-1 rounded-lg transition-colors font-bold shadow-xs"
              title="Inserir compromisso"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Novo</span>
            </button>
          </div>

          <!-- Lista de Eventos no Dia -->
          <div class="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px] bg-slate-50/30">
      `;

      if (dayEvents.length === 0) {
        html += `
          <div 
            data-date-add="${dateStr}"
            class="h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/40 cursor-pointer p-4 transition-all text-center group"
          >
            <i data-lucide="calendar-plus" class="w-6 h-6 mb-1 text-slate-400 group-hover:text-blue-600 transition-colors"></i>
            <span class="text-xs font-semibold">Livre</span>
            <span class="text-[10px] text-slate-400 font-medium">Clique para agendar</span>
          </div>
        `;
      } else {
        for (const event of dayEvents) {
          const badgeClass = this.getStatusBadgeClass(event.status);
          const priorityDot = this.getPriorityDot(event.priority);
          const catPill = this.getCategoryPill(event.category);

          html += `
            <div 
              data-event-id="${event.id}"
              class="appointment-badge cursor-pointer p-3 rounded-xl border ${badgeClass} hover:shadow-md transition-all shadow-xs group space-y-1.5"
            >
              <div class="flex items-center justify-between gap-1">
                <span class="flex items-center gap-1.5">
                  ${priorityDot}
                  <span class="font-mono text-xs font-bold text-slate-700">
                    ${event.start_time || 'Dia Todo'}
                  </span>
                </span>
                ${catPill}
              </div>

              <h4 class="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                ${event.title}
              </h4>

              <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
                <span class="truncate">${event.system_client}</span>
                <span class="text-[10px] uppercase font-bold tracking-wider">${event.status}</span>
              </div>
            </div>
          `;
        }
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachCellEvents();
  }

  attachCellEvents() {
    // Clique no dia ou no botão "+" de adicionar
    const addButtons = this.container.querySelectorAll('[data-date-add]');
    addButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = btn.getAttribute('data-date-add');
        this.onDayClick(dateStr);
      });
    });

    // Clique na célula do dia para adicionar rapidamente
    const cells = this.container.querySelectorAll('.calendar-day-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.appointment-badge') || e.target.closest('.btn-more-events')) {
          return; // Evento do compromisso
        }
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          this.onDayClick(dateStr);
        }
      });
    });

    // Clique no badge do compromisso
    const badges = this.container.querySelectorAll('.appointment-badge');
    badges.forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventId = badge.getAttribute('data-event-id');
        if (eventId) {
          this.onEventClick(eventId);
        }
      });
    });

    // Botão de ver mais eventos em um dia
    const moreBtns = this.container.querySelectorAll('.btn-more-events');
    moreBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = btn.getAttribute('data-view-day');
        this.onDayClick(dateStr);
      });
    });
  }
}
