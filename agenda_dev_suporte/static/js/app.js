/**
 * Controlador Principal do Frontend DevAgenda
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificação de Autenticação
  const token = API.getToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  // 2. Estado Global
  const state = {
    user: null,
    currentTab: 'calendar', // 'calendar' | 'list' | 'history'
    viewMode: 'month',      // 'month' | 'week'
    appointments: [],
    historyLogs: [],
    stats: {},
    systems: [],
    filters: {
      search: '',
      status: 'Todos',
      category: 'Todas',
      priority: 'Todas',
      system_client: 'Todos',
      month: ''
    },
    editingAppointmentId: null,
    viewingAppointmentId: null
  };

  // 3. Elementos do DOM
  const dom = {
    userName: document.getElementById('user-name'),
    userRole: document.getElementById('user-role'),
    userAvatar: document.getElementById('user-avatar'),
    btnLogout: document.getElementById('btn-logout'),
    
    // Stats Cards
    statTotal: document.getElementById('stat-total'),
    statPending: document.getElementById('stat-pending'),
    statInProgress: document.getElementById('stat-in-progress'),
    statCompleted: document.getElementById('stat-completed'),
    statUrgent: document.getElementById('stat-urgent'),
    statToday: document.getElementById('stat-today'),

    // Navegação de Abas
    tabCalendarBtn: document.getElementById('tab-calendar-btn'),
    tabListBtn: document.getElementById('tab-list-btn'),
    tabHistoryBtn: document.getElementById('tab-history-btn'),
    viewCalendarSection: document.getElementById('view-calendar-section'),
    viewListSection: document.getElementById('view-list-section'),
    viewHistorySection: document.getElementById('view-history-section'),

    // Controles do Calendário
    calPrevBtn: document.getElementById('cal-prev-btn'),
    calNextBtn: document.getElementById('cal-next-btn'),
    calTodayBtn: document.getElementById('cal-today-btn'),
    calTitle: document.getElementById('cal-title'),
    calModeMonthBtn: document.getElementById('cal-mode-month'),
    calModeWeekBtn: document.getElementById('cal-mode-week'),
    calendarContainer: document.getElementById('calendar-container'),

    // Filtros e Pesquisa
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    filterCategory: document.getElementById('filter-category'),
    filterPriority: document.getElementById('filter-priority'),
    filterSystem: document.getElementById('filter-system'),
    btnResetFilters: document.getElementById('btn-reset-filters'),

    // Botões de Ação Global
    btnNewAppointment: document.getElementById('btn-new-appointment'),

    // Lista de Resultados
    listContainer: document.getElementById('list-container'),
    listEmptyState: document.getElementById('list-empty-state'),

    // Histórico
    historyContainer: document.getElementById('history-container'),
    historyFilterAction: document.getElementById('history-filter-action'),
    historySearchInput: document.getElementById('history-search-input'),

    // Modal de Criar/Editar
    modalAppointment: document.getElementById('modal-appointment'),
    modalAppointmentTitle: document.getElementById('modal-appointment-title'),
    formAppointment: document.getElementById('form-appointment'),
    btnCloseAppointmentModal: document.getElementById('btn-close-appointment-modal'),
    btnCancelAppointment: document.getElementById('btn-cancel-appointment'),

    // Campos do Formulário
    inputTitle: document.getElementById('app-title'),
    inputSystem: document.getElementById('app-system'),
    inputCategory: document.getElementById('app-category'),
    inputPriority: document.getElementById('app-priority'),
    inputStatus: document.getElementById('app-status'),
    inputStartDate: document.getElementById('app-start-date'),
    inputStartTime: document.getElementById('app-start-time'),
    inputEndDate: document.getElementById('app-end-date'),
    inputEndTime: document.getElementById('app-end-time'),
    inputIsAllDay: document.getElementById('app-is-all-day'),
    inputDescription: document.getElementById('app-description'),
    inputExternalLink: document.getElementById('app-external-link'),
    inputResolutionNotes: document.getElementById('app-resolution-notes'),
    fieldResolutionWrapper: document.getElementById('field-resolution-wrapper'),
    datalistSystems: document.getElementById('systems-datalist'),

    // Modal de Detalhes
    modalDetails: document.getElementById('modal-details'),
    btnCloseDetailsModal: document.getElementById('btn-close-details-modal'),
    detailsContent: document.getElementById('details-content'),
    btnEditFromDetails: document.getElementById('btn-edit-from-details'),
    btnDeleteFromDetails: document.getElementById('btn-delete-from-details'),
    btnQuickStart: document.getElementById('btn-quick-start'),
    btnQuickComplete: document.getElementById('btn-quick-complete'),

    // Modal de Conclusão Rápida
    modalQuickComplete: document.getElementById('modal-quick-complete'),
    formQuickComplete: document.getElementById('form-quick-complete'),
    quickCompleteNotes: document.getElementById('quick-complete-notes'),
    btnCancelQuickComplete: document.getElementById('btn-cancel-quick-complete'),

    // Modal Perfil / Senha
    btnOpenProfile: document.getElementById('btn-open-profile'),
    modalProfile: document.getElementById('modal-profile'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    formUpdateProfile: document.getElementById('form-update-profile'),
    profileNameInput: document.getElementById('profile-name-input'),
    profileEmailInput: document.getElementById('profile-email-input'),
    formChangePassword: document.getElementById('form-change-password'),
    profileUserName: document.getElementById('profile-user-name'),
    profileUserRole: document.getElementById('profile-user-role'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // 4. Inicializar Calendário
  const calendar = new DevCalendar({
    container: dom.calendarContainer,
    viewMode: state.viewMode,
    onDayClick: (dateStr) => {
      openAppointmentModal(null, dateStr);
    },
    onEventClick: (eventId) => {
      openDetailsModal(eventId);
    },
    onMonthChange: (monthStr) => {
      state.filters.month = monthStr;
      updateCalendarTitle();
      loadAppointments();
    }
  });

  // 5. Funções de Toast / Alerta
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600/90 text-white border-emerald-500',
      error: 'bg-rose-600/90 text-white border-rose-500',
      info: 'bg-blue-600/90 text-white border-blue-500'
    };
    const icons = {
      success: 'check-circle-2',
      error: 'alert-triangle',
      info: 'info'
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm font-medium animate-scale-up ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span>${message}</span>
    `;

    dom.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // 6. Atualização de Dados da API
  async function loadUser() {
    try {
      const user = await API.getMe();
      state.user = user;
      dom.userName.textContent = user.name;
      dom.userRole.textContent = user.role.toUpperCase();
      dom.userAvatar.textContent = user.name.substring(0, 2).toUpperCase();
      dom.profileUserName.textContent = `${user.name} (@${user.username})`;
      dom.profileUserRole.textContent = `Função: ${user.role}`;
    } catch (err) {
      console.error('Falha ao obter perfil do usuário');
    }
  }

  async function loadStats() {
    try {
      const stats = await API.getStats();
      state.stats = stats;
      dom.statTotal.textContent = stats.total_appointments;
      dom.statPending.textContent = stats.pending;
      dom.statInProgress.textContent = stats.in_progress;
      dom.statCompleted.textContent = stats.completed;
      dom.statUrgent.textContent = stats.urgent;
      dom.statToday.textContent = stats.today_count;
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }

  async function loadSystems() {
    try {
      const systems = await API.getSystems();
      state.systems = systems;

      // Atualizar filtro de sistemas
      const currentSelected = dom.filterSystem.value;
      dom.filterSystem.innerHTML = '<option value="Todos">Todos os Sistemas</option>';
      dom.datalistSystems.innerHTML = '';

      systems.forEach(sys => {
        // Opção no filtro
        const opt = document.createElement('option');
        opt.value = sys;
        opt.textContent = sys;
        dom.filterSystem.appendChild(opt);

        // Opção no datalist do form
        const dlOpt = document.createElement('option');
        dlOpt.value = sys;
        dom.datalistSystems.appendChild(dlOpt);
      });

      if (systems.includes(currentSelected)) {
        dom.filterSystem.value = currentSelected;
      }
    } catch (err) {
      console.error('Erro ao carregar sistemas:', err);
    }
  }

  async function loadAppointments() {
    try {
      const filters = { ...state.filters };
      if (state.currentTab === 'calendar') {
        // No calendário, se não tiver busca ou status específico, foca no mês para otimizar
        if (!filters.search && filters.status === 'Todos' && filters.system_client === 'Todos') {
          filters.month = calendar.getMonthString();
        } else {
          delete filters.month;
        }
      } else {
        delete filters.month;
      }

      const appointments = await API.getAppointments(filters);
      state.appointments = appointments;

      calendar.setEvents(appointments);
      renderListView(appointments);
      updateCalendarTitle();
    } catch (err) {
      showToast('Erro ao carregar compromissos: ' + err.message, 'error');
    }
  }

  async function loadHistory() {
    try {
      const action = dom.historyFilterAction.value;
      const search = dom.historySearchInput.value.trim();
      const logs = await API.getHistory({ action, search, limit: 150 });
      state.historyLogs = logs;
      renderHistoryView(logs);
    } catch (err) {
      showToast('Erro ao carregar histórico: ' + err.message, 'error');
    }
  }

  function updateCalendarTitle() {
    dom.calTitle.textContent = calendar.getHeaderTitle();
  }

  // 7. Renderização da Visão em Lista / Tabela
  function renderListView(appointments) {
    if (!dom.listContainer) return;

    if (appointments.length === 0) {
      dom.listContainer.innerHTML = '';
      dom.listEmptyState.classList.remove('hidden');
      return;
    }

    dom.listEmptyState.classList.add('hidden');

    let html = `
      <div class="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <th class="p-4">Prioridade</th>
              <th class="p-4">Atividade / Chamado</th>
              <th class="p-4">Sistema / Cliente</th>
              <th class="p-4">Tipo</th>
              <th class="p-4">Data & Horário</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-sm">
    `;

    appointments.forEach(app => {
      const badgeClass = calendar.getStatusBadgeClass(app.status);
      const priorityDot = calendar.getPriorityDot(app.priority);
      const catPill = calendar.getCategoryPill(app.category);

      html += `
        <tr class="hover:bg-slate-50 transition-colors group">
          <td class="p-4 whitespace-nowrap">
            <div class="flex items-center gap-2">
              ${priorityDot}
              <span class="text-xs font-semibold text-slate-700">${app.priority}</span>
            </div>
          </td>
          <td class="p-4">
            <div class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer" onclick="window.viewEvent(${app.id})">
              ${app.title}
            </div>
            ${app.description ? `<p class="text-xs text-slate-500 truncate max-w-xs mt-0.5">${app.description}</p>` : ''}
          </td>
          <td class="p-4 whitespace-nowrap font-semibold text-slate-700">
            ${app.system_client}
          </td>
          <td class="p-4 whitespace-nowrap">
            ${catPill}
          </td>
          <td class="p-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-600">
            <div>${app.start_date} ${app.start_time || ''}</div>
            ${app.end_date !== app.start_date ? `<div class="text-[10px] text-slate-400">até ${app.end_date}</div>` : ''}
          </td>
          <td class="p-4 whitespace-nowrap">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}">
              ${app.status}
            </span>
          </td>
          <td class="p-4 whitespace-nowrap text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button 
                onclick="window.viewEvent(${app.id})" 
                class="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Ver Detalhes"
              >
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="window.editEvent(${app.id})" 
                class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button 
                onclick="window.deleteEvent(${app.id}, '${app.title.replace(/'/g, "\\'")}')" 
                class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Excluir"
              >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    dom.listContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  // 8. Renderização do Histórico e Auditoria
  function renderHistoryView(logs) {
    if (!dom.historyContainer) return;

    if (logs.length === 0) {
      dom.historyContainer.innerHTML = `
        <div class="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
          <i data-lucide="history" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
          <p class="text-sm font-semibold text-slate-600">Nenhum registro de histórico encontrado com os filtros atuais.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = `
      <div class="relative pl-6 border-l-2 border-slate-200 space-y-6">
    `;

    logs.forEach(log => {
      const dt = new Date(log.timestamp);
      const formattedDate = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      let actionBadge = '';
      switch (log.action) {
        case 'CRIACAO':
          actionBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">CRIADO</span>';
          break;
        case 'CONCLUSAO':
          actionBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">CONCLUÍDO</span>';
          break;
        case 'STATUS':
          actionBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">STATUS</span>';
          break;
        case 'EDICAO':
          actionBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">ALTERAÇÃO</span>';
          break;
        case 'EXCLUSAO':
          actionBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">EXCLUÍDO</span>';
          break;
        default:
          actionBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${log.action}</span>`;
      }

      html += `
        <div class="timeline-item relative group">
          <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition-colors">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                ${actionBadge}
                ${log.appointment_title ? `<span class="font-bold text-slate-900 text-sm">${log.appointment_title}</span>` : ''}
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-500 font-mono font-medium">
                <span><i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>${formattedDate}</span>
                <span>&bull;</span>
                <span class="text-slate-700 font-sans font-semibold">${log.user_name || 'Sistema'}</span>
              </div>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed font-sans">
              ${log.description}
            </p>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    dom.historyContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  // 9. Modais: Criação e Edição
  function openAppointmentModal(app = null, defaultDate = null) {
    state.editingAppointmentId = app ? app.id : null;
    dom.modalAppointmentTitle.textContent = app ? 'Editar Atividade / Suporte' : 'Novo Agendamento';

    // Toggle campo de resolução se status for Concluído
    const checkResolutionDisplay = () => {
      if (dom.inputStatus.value === 'Concluído') {
        dom.fieldResolutionWrapper.classList.remove('hidden');
      } else {
        dom.fieldResolutionWrapper.classList.add('hidden');
      }
    };
    dom.inputStatus.onchange = checkResolutionDisplay;

    if (app) {
      dom.inputTitle.value = app.title;
      dom.inputSystem.value = app.system_client;
      dom.inputCategory.value = app.category;
      dom.inputPriority.value = app.priority;
      dom.inputStatus.value = app.status;
      dom.inputStartDate.value = app.start_date;
      dom.inputStartTime.value = app.start_time || '09:00';
      dom.inputEndDate.value = app.end_date || app.start_date;
      dom.inputEndTime.value = app.end_time || '10:00';
      dom.inputIsAllDay.checked = app.is_all_day;
      dom.inputDescription.value = app.description || '';
      dom.inputExternalLink.value = app.external_link || '';
      dom.inputResolutionNotes.value = app.resolution_notes || '';
    } else {
      dom.formAppointment.reset();
      const targetDate = defaultDate || calendar.formatDateYMD(new Date());
      dom.inputStartDate.value = targetDate;
      dom.inputEndDate.value = targetDate;
      dom.inputStartTime.value = '09:00';
      dom.inputEndTime.value = '10:00';
      dom.inputPriority.value = 'Normal';
      dom.inputCategory.value = 'Suporte';
      dom.inputStatus.value = 'Pendente';
      dom.inputSystem.value = 'ERP Corporativo';
    }

    checkResolutionDisplay();
    dom.modalAppointment.classList.remove('hidden');
  }

  function closeAppointmentModal() {
    dom.modalAppointment.classList.add('hidden');
    state.editingAppointmentId = null;
  }

  dom.btnCloseAppointmentModal.addEventListener('click', closeAppointmentModal);
  dom.btnCancelAppointment.addEventListener('click', closeAppointmentModal);

  dom.formAppointment.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      title: dom.inputTitle.value.trim(),
      system_client: dom.inputSystem.value.trim(),
      category: dom.inputCategory.value,
      priority: dom.inputPriority.value,
      status: dom.inputStatus.value,
      start_date: dom.inputStartDate.value,
      start_time: dom.inputStartTime.value,
      end_date: dom.inputEndDate.value || dom.inputStartDate.value,
      end_time: dom.inputEndTime.value,
      is_all_day: dom.inputIsAllDay.checked,
      description: dom.inputDescription.value.trim(),
      external_link: dom.inputExternalLink.value.trim() || null,
      resolution_notes: dom.inputResolutionNotes.value.trim() || null
    };

    try {
      if (state.editingAppointmentId) {
        await API.updateAppointment(state.editingAppointmentId, data);
        showToast('Compromisso atualizado com sucesso!');
      } else {
        await API.createAppointment(data);
        showToast('Novo compromisso registrado com sucesso!');
      }

      closeAppointmentModal();
      await loadAppointments();
      await loadStats();
      await loadSystems();
    } catch (err) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    }
  });

  // 10. Modal de Detalhes
  async function openDetailsModal(id) {
    try {
      const app = await API.getAppointment(id);
      state.viewingAppointmentId = id;

      const badgeClass = calendar.getStatusBadgeClass(app.status);
      const priorityDot = calendar.getPriorityDot(app.priority);
      const catPill = calendar.getCategoryPill(app.category);

      let historyTimelineHtml = '';
      if (app.history && app.history.length > 0) {
        historyTimelineHtml = `
          <div class="mt-6 pt-6 border-t border-slate-200">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-blue-600"></i>
              Linha do Tempo e Histórico do Chamado
            </h4>
            <div class="relative pl-5 border-l-2 border-slate-200 space-y-3">
              ${app.history.map(h => {
                const dt = new Date(h.timestamp);
                const timeStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `
                  <div class="timeline-item relative text-xs">
                    <div class="flex items-center justify-between text-slate-500">
                      <span class="font-bold text-slate-800">${h.user_name || 'Sistema'}</span>
                      <span class="font-mono text-[10px] text-slate-500">${timeStr}</span>
                    </div>
                    <p class="text-slate-700 mt-1">${h.description}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      dom.detailsContent.innerHTML = `
        <div class="space-y-4">
          <!-- Cabeçalho com Badges -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              ${catPill}
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}">
                ${app.status}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
              ${priorityDot}
              <span>Prioridade: ${app.priority}</span>
            </div>
          </div>

          <!-- Título -->
          <h3 class="text-xl font-extrabold text-slate-900">${app.title}</h3>

          <!-- Grid de Informações -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span class="text-slate-500 block uppercase tracking-wider font-bold text-[10px]">Sistema / Cliente</span>
              <span class="text-slate-900 font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                <i data-lucide="server" class="w-3.5 h-3.5 text-blue-600"></i>
                ${app.system_client}
              </span>
            </div>
            <div>
              <span class="text-slate-500 block uppercase tracking-wider font-bold text-[10px]">Responsável / Criador</span>
              <span class="text-slate-900 font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                <i data-lucide="user" class="w-3.5 h-3.5 text-indigo-600"></i>
                ${app.creator_name}
              </span>
            </div>
            <div>
              <span class="text-slate-500 block uppercase tracking-wider font-bold text-[10px]">Início</span>
              <span class="text-slate-800 font-mono font-semibold mt-0.5 block">
                ${app.start_date} ${app.start_time ? `às ${app.start_time}` : '(Dia todo)'}
              </span>
            </div>
            <div>
              <span class="text-slate-500 block uppercase tracking-wider font-bold text-[10px]">Previsão de Término</span>
              <span class="text-slate-800 font-mono font-semibold mt-0.5 block">
                ${app.end_date} ${app.end_time ? `às ${app.end_time}` : ''}
              </span>
            </div>
          </div>

          <!-- Descrição -->
          ${app.description ? `
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Descrição Técnica</h4>
              <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                ${app.description}
              </div>
            </div>
          ` : ''}

          <!-- Link Externo -->
          ${app.external_link ? `
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Link do Ticket / Repositório</h4>
              <a href="${app.external_link}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 font-semibold">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                ${app.external_link}
              </a>
            </div>
          ` : ''}

          <!-- Solução Técnica / Resolução -->
          ${app.resolution_notes ? `
            <div class="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl">
              <h4 class="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
                Solução Técnica & Resolução
              </h4>
              <p class="text-xs text-emerald-900 leading-relaxed whitespace-pre-line font-medium">
                ${app.resolution_notes}
              </p>
            </div>
          ` : ''}

          <!-- Linha do Tempo -->
          ${historyTimelineHtml}
        </div>
      `;

      // Atualizar botões de ação rápida no rodapé
      if (app.status === 'Concluído') {
        dom.btnQuickStart.classList.add('hidden');
        dom.btnQuickComplete.classList.add('hidden');
      } else if (app.status === 'Em Andamento') {
        dom.btnQuickStart.classList.add('hidden');
        dom.btnQuickComplete.classList.remove('hidden');
      } else {
        dom.btnQuickStart.classList.remove('hidden');
        dom.btnQuickComplete.classList.remove('hidden');
      }

      dom.modalDetails.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      showToast('Erro ao carregar detalhes: ' + err.message, 'error');
    }
  }

  dom.btnCloseDetailsModal.addEventListener('click', () => {
    dom.modalDetails.classList.add('hidden');
  });

  // Ações de Detalhes
  dom.btnEditFromDetails.addEventListener('click', async () => {
    dom.modalDetails.classList.add('hidden');
    const app = await API.getAppointment(state.viewingAppointmentId);
    openAppointmentModal(app);
  });

  dom.btnDeleteFromDetails.addEventListener('click', async () => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await API.deleteAppointment(state.viewingAppointmentId);
        showToast('Compromisso excluído.');
        dom.modalDetails.classList.add('hidden');
        await loadAppointments();
        await loadStats();
      } catch (err) {
        showToast('Erro ao excluir: ' + err.message, 'error');
      }
    }
  });

  dom.btnQuickStart.addEventListener('click', async () => {
    try {
      await API.updateStatus(state.viewingAppointmentId, 'Em Andamento');
      showToast('Status alterado para "Em Andamento"');
      openDetailsModal(state.viewingAppointmentId);
      await loadAppointments();
      await loadStats();
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  });

  dom.btnQuickComplete.addEventListener('click', () => {
    dom.modalQuickComplete.classList.remove('hidden');
    dom.quickCompleteNotes.value = '';
    dom.quickCompleteNotes.focus();
  });

  dom.btnCancelQuickComplete.addEventListener('click', () => {
    dom.modalQuickComplete.classList.add('hidden');
  });

  dom.formQuickComplete.addEventListener('submit', async (e) => {
    e.preventDefault();
    const notes = dom.quickCompleteNotes.value.trim();
    try {
      await API.updateStatus(state.viewingAppointmentId, 'Concluído', notes);
      showToast('Atividade concluída com sucesso!');
      dom.modalQuickComplete.classList.add('hidden');
      openDetailsModal(state.viewingAppointmentId);
      await loadAppointments();
      await loadStats();
    } catch (err) {
      showToast('Erro ao concluir: ' + err.message, 'error');
    }
  });

  // Funções Globais expostas no window para os botões de ação na tabela
  window.viewEvent = (id) => openDetailsModal(id);
  window.editEvent = async (id) => {
    const app = await API.getAppointment(id);
    openAppointmentModal(app);
  };
  window.deleteEvent = async (id, title) => {
    if (confirm(`Deseja realmente excluir "${title}"?`)) {
      try {
        await API.deleteAppointment(id);
        showToast('Compromisso excluído.');
        await loadAppointments();
        await loadStats();
      } catch (err) {
        showToast('Erro ao excluir: ' + err.message, 'error');
      }
    }
  };

  // 11. Alternância de Abas (Calendário, Lista, Histórico)
  function switchTab(newTab) {
    state.currentTab = newTab;

    // Reset styles de botões
    [dom.tabCalendarBtn, dom.tabListBtn, dom.tabHistoryBtn].forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm', 'font-bold');
      btn.classList.add('text-slate-600', 'hover:text-slate-900', 'hover:bg-white', 'font-semibold');
    });

    dom.viewCalendarSection.classList.add('hidden');
    dom.viewListSection.classList.add('hidden');
    dom.viewHistorySection.classList.add('hidden');

    if (newTab === 'calendar') {
      dom.tabCalendarBtn.classList.add('bg-blue-600', 'text-white', 'shadow-sm', 'font-bold');
      dom.tabCalendarBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-white', 'font-semibold');
      dom.viewCalendarSection.classList.remove('hidden');
      loadAppointments();
    } else if (newTab === 'list') {
      dom.tabListBtn.classList.add('bg-blue-600', 'text-white', 'shadow-sm', 'font-bold');
      dom.tabListBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-white', 'font-semibold');
      dom.viewListSection.classList.remove('hidden');
      loadAppointments();
    } else if (newTab === 'history') {
      dom.tabHistoryBtn.classList.add('bg-blue-600', 'text-white', 'shadow-sm', 'font-bold');
      dom.tabHistoryBtn.classList.remove('text-slate-600', 'hover:text-slate-900', 'hover:bg-white', 'font-semibold');
      dom.viewHistorySection.classList.remove('hidden');
      loadHistory();
    }
  }

  dom.tabCalendarBtn.addEventListener('click', () => switchTab('calendar'));
  dom.tabListBtn.addEventListener('click', () => switchTab('list'));
  dom.tabHistoryBtn.addEventListener('click', () => switchTab('history'));

  // 12. Controles de Calendário
  dom.calPrevBtn.addEventListener('click', () => calendar.prev());
  dom.calNextBtn.addEventListener('click', () => calendar.next());
  dom.calTodayBtn.addEventListener('click', () => calendar.today());

  dom.calModeMonthBtn.addEventListener('click', () => {
    state.viewMode = 'month';
    dom.calModeMonthBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs transition-all';
    dom.calModeWeekBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
    calendar.setViewMode('month');
    updateCalendarTitle();
  });

  dom.calModeWeekBtn.addEventListener('click', () => {
    state.viewMode = 'week';
    dom.calModeWeekBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs transition-all';
    dom.calModeMonthBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all';
    calendar.setViewMode('week');
    updateCalendarTitle();
  });

  // 13. Pesquisa e Filtros
  let searchTimeout = null;
  dom.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value.trim();
      loadAppointments();
    }, 250);
  });

  dom.filterStatus.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    loadAppointments();
  });

  dom.filterCategory.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    loadAppointments();
  });

  dom.filterPriority.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    loadAppointments();
  });

  dom.filterSystem.addEventListener('change', (e) => {
    state.filters.system_client = e.target.value;
    loadAppointments();
  });

  dom.btnResetFilters.addEventListener('click', () => {
    dom.searchInput.value = '';
    dom.filterStatus.value = 'Todos';
    dom.filterCategory.value = 'Todas';
    dom.filterPriority.value = 'Todas';
    dom.filterSystem.value = 'Todos';
    state.filters = {
      search: '',
      status: 'Todos',
      category: 'Todas',
      priority: 'Todas',
      system_client: 'Todos',
      month: calendar.getMonthString()
    };
    loadAppointments();
  });

  // Filtros do Histórico
  dom.historyFilterAction.addEventListener('change', loadHistory);
  let historySearchTimeout = null;
  dom.historySearchInput.addEventListener('input', () => {
    clearTimeout(historySearchTimeout);
    historySearchTimeout = setTimeout(loadHistory, 300);
  });

  // 14. Botão Novo Agendamento
  dom.btnNewAppointment.addEventListener('click', () => openAppointmentModal());

  // 15. Perfil e Troca de Senha
  dom.btnOpenProfile.addEventListener('click', () => {
    if (state.user) {
      dom.profileNameInput.value = state.user.name || '';
      dom.profileEmailInput.value = state.user.email || '';
    }
    dom.modalProfile.classList.remove('hidden');
  });

  dom.btnCloseProfileModal.addEventListener('click', () => {
    dom.modalProfile.classList.add('hidden');
  });

  // Salvar novo nome de exibição do usuário
  dom.formUpdateProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = dom.profileNameInput.value.trim();
    const email = dom.profileEmailInput.value.trim();

    if (!name) {
      showToast('O nome não pode estar em branco.', 'error');
      return;
    }

    try {
      const updatedUser = await API.updateProfile({ name, email: email || null });
      state.user = updatedUser;
      localStorage.setItem('devagenda_user', JSON.stringify(updatedUser));
      dom.userName.textContent = updatedUser.name;
      dom.userAvatar.textContent = updatedUser.name.substring(0, 2).toUpperCase();
      dom.profileUserName.textContent = `${updatedUser.name} (@${updatedUser.username})`;
      showToast('Nome atualizado com sucesso!');
    } catch (err) {
      showToast('Erro ao atualizar perfil: ' + err.message, 'error');
    }
  });

  dom.formChangePassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const curr = document.getElementById('current-pwd').value;
    const newP = document.getElementById('new-pwd').value;
    const confP = document.getElementById('confirm-pwd').value;

    if (newP !== confP) {
      showToast('A nova senha e a confirmação não coincidem.', 'error');
      return;
    }

    try {
      await API.changePassword(curr, newP);
      showToast('Senha alterada com sucesso!');
      dom.formChangePassword.reset();
      dom.modalProfile.classList.add('hidden');
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  });

  // 16. Logout
  dom.btnLogout.addEventListener('click', async () => {
    if (confirm('Deseja realmente sair do sistema?')) {
      await API.logout();
    }
  });

  // 17. Inicialização
  await loadUser();
  await loadStats();
  await loadSystems();
  await loadAppointments();
  updateCalendarTitle();

  if (window.lucide) window.lucide.createIcons();
});
