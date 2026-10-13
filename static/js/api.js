/**
 * Cliente de API do DevAgenda
 */
const API = {
  getToken() {
    return localStorage.getItem('devagenda_token') || '';
  },

  setToken(token) {
    localStorage.setItem('devagenda_token', token);
  },

  clearAuth() {
    localStorage.removeItem('devagenda_token');
    localStorage.removeItem('devagenda_user');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('devagenda_user') || '{}');
    } catch {
      return {};
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.clearAuth();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocorreu um erro no servidor.');
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.access_token);
    localStorage.setItem('devagenda_user', JSON.stringify(data.user));
    return data;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearAuth();
      window.location.href = '/login';
    }
  },

  async getMe() {
    return this.request('/api/auth/me');
  },

  async updateProfile(profileData) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async changePassword(current_password, new_password) {
    return this.request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password })
    });
  },

  // Appointments
  async getAppointments(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'Todos' && value !== 'Todas') {
        params.append(key, value);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/appointments${query}`);
  },

  async getAppointment(id) {
    return this.request(`/api/appointments/${id}`);
  },

  async createAppointment(data) {
    return this.request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAppointment(id, data) {
    return this.request(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updateStatus(id, status, resolution_notes = null) {
    return this.request(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_notes })
    });
  },

  async deleteAppointment(id) {
    return this.request(`/api/appointments/${id}`, {
      method: 'DELETE'
    });
  },

  async getSystems() {
    return this.request('/api/appointments/meta/systems');
  },

  // History & Audit
  async getHistory(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'TODOS') {
        params.append(key, value);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/history${query}`);
  },

  // Stats
  async getStats() {
    return this.request('/api/stats');
  }
};
