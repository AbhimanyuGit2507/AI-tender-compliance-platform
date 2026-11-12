/**
 * BidKaro — Frontend API Client Service
 * Connects React UI to FastAPI backend with full JWT authentication,
 * Company Vault CRUD, real-time SSE streams, and PDF page rendering.
 */

const TOKEN_KEY = 'bidkaro_access_token';
const TENANT_KEY = 'bidkaro_tenant_id';

class ApiService {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.tenantId = localStorage.getItem(TENANT_KEY) || null;
  }

  getToken() {
    return this.token || localStorage.getItem(TOKEN_KEY);
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  setAuth(token, tenantId) {
    this.token = token;
    this.tenantId = tenantId;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (tenantId) localStorage.setItem(TENANT_KEY, tenantId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bidkaro:auth-changed'));
    }
  }

  clearAuth() {
    this.token = null;
    this.tenantId = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
  }

  clearToken() {
    this.clearAuth();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  logout() {
    this.clearAuth();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bidkaro:unauthorized'));
    }
  }

  async request(endpoint, options = {}, isRetry = false) {
    const headers = {
      ...(options.headers || {}),
    };

    const activeToken = this.getToken();
    if (activeToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('bidkaro:unauthorized'));
          }
        }
        let errMessage = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.detail || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return response;
    } catch (err) {
      console.warn(`API call failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // ── Authentication ────────────────────────────────────────────────
  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let msg = 'Login failed';
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.tenant_id);
    return data;
  }

  async register(companyName, name, email, password, gstin = null) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: companyName,
        name,
        email,
        password,
        gstin,
      }),
    });
    if (!res.ok) {
      let msg = 'Registration failed';
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.tenant_id);
    return data;
  }

  async sendOtp(email) {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      let msg = 'Failed to dispatch verification code';
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    return await res.json();
  }

  async verifyOtp(email, otp, companyName = null) {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        otp,
        company_name: companyName || undefined,
      }),
    });
    if (!res.ok) {
      let msg = 'Invalid or expired verification code';
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.tenant_id);
    return data;
  }

  async loginWithGoogle(credential, companyName = null) {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential,
        company_name: companyName || undefined,
      }),
    });
    if (!res.ok) {
      let msg = 'Google authentication failed';
      try {
        const err = await res.json();
        msg = err.detail || msg;
      } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    this.setAuth(data.access_token, data.tenant_id);
    return data;
  }

  async getAuditLogs(limit = 50, offset = 0, action = null) {
    let url = `/api/auth/audit-logs?limit=${limit}&offset=${offset}`;
    if (action) url += `&action=${encodeURIComponent(action)}`;
    return await this.request(url);
  }

  async triggerCreditExpiryCheck() {
    return await this.request('/api/plans/trigger-expiry-check', { method: 'POST' });
  }

  async checkLowBalance(threshold = 10) {
    return await this.request(`/api/plans/check-low-balance?threshold=${threshold}`, { method: 'POST' });
  }

  async getMe() {
    return await this.request('/api/auth/me');
  }

  // ── Health ────────────────────────────────────────────────────────
  async checkHealth() {
    try {
      return await this.request('/api/health');
    } catch {
      return { status: 'offline', service: 'BidKaro Local Preview' };
    }
  }

  // ── Company Vault CRUD ────────────────────────────────────────────
  async getCompanyVault() {
    return await this.request('/api/company/vault');
  }

  async updateCompanyVault(vaultData) {
    return await this.request('/api/company/vault', {
      method: 'PUT',
      body: JSON.stringify(vaultData),
    });
  }

  async addCompanyProject(projectData) {
    return await this.request('/api/company/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async deleteCompanyProject(projectId) {
    return await this.request(`/api/company/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async addCompanyCertificate(certData) {
    return await this.request('/api/company/certificates', {
      method: 'POST',
      body: JSON.stringify(certData),
    });
  }

  async deleteCompanyCertificate(certId) {
    return await this.request(`/api/company/certificates/${certId}`, {
      method: 'DELETE',
    });
  }

  async getCompanyCredits() {
    return await this.request('/api/company/credits');
  }

  // ── Tenders & Upload ──────────────────────────────────────────────
  async uploadTender(files, tenderTitle = 'Untitled Tender') {
    const formData = new FormData();
    formData.append('tender_title', tenderTitle);
    for (const f of files) {
      formData.append('files', f);
    }
    return await this.request('/api/tenders/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async listTenders() {
    return await this.request('/api/tenders');
  }

  async getTender(tenderId) {
    return await this.request(`/api/tenders/${tenderId}`);
  }

  async getTenderDetail(tenderId) {
    return await this.getTender(tenderId);
  }

  async transferTenderToVault(tenderId) {
    return await this.request(`/api/tenders/${tenderId}/transfer-to-vault`, {
      method: 'POST',
    });
  }

  async deleteTender(tenderId) {
    return await this.request(`/api/tenders/${tenderId}`, {
      method: 'DELETE',
    });
  }

  getTenderPageImageUrl(tenderId, pageNumber = 1) {
    return `/api/tenders/${tenderId}/pages/${pageNumber}/image`;
  }

  subscribeTenderStatus(tenderId, onProgress, onComplete, onError) {
    const url = `/api/tenders/${tenderId}/status`;
    const eventSource = new EventSource(url);

    const handleEventData = (rawData) => {
      try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        if (data.error) {
          eventSource.close();
          if (onError) onError(new Error(data.error));
          return;
        }

        if (onProgress) {
          onProgress({
            step: data.step || 'Processing tender...',
            percent: data.percent !== undefined ? data.percent : 50,
            ...data,
          });
        }

        if (data.done || data.percent >= 100 || data.all_complete) {
          eventSource.close();
          if (onComplete) onComplete(data);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.addEventListener('progress', (e) => handleEventData(e.data));
    eventSource.onmessage = (e) => handleEventData(e.data);

    eventSource.onerror = (err) => {
      eventSource.close();
      if (onError) onError(new Error('SSE connection interrupted or closed'));
    };

    return () => eventSource.close();
  }

  connectTenderStatusSSE(tenderId, onMessage, onComplete, onError) {
    return this.subscribeTenderStatus(tenderId, onMessage, onComplete, onError);
  }

  // ── RAG / Copilot ─────────────────────────────────────────────────
  async queryRAG(tenderId, question, topK = 6) {
    return await this.request(`/api/rag/${tenderId}/query`, {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    });
  }

  // ── Compliance & Pre-Bid Queries ──────────────────────────────────
  async getComplianceMatrix(tenderId) {
    return await this.request(`/api/compliance/${tenderId}`);
  }

  async runComplianceCheck(tenderId) {
    return await this.request(`/api/compliance/${tenderId}/check`, {
      method: 'POST',
    });
  }

  async getPreBidQueries(tenderId) {
    return await this.request(`/api/compliance/${tenderId}/pre-bid-queries`);
  }

  // ── BOQ ───────────────────────────────────────────────────────────
  async getBOQ(tenderId) {
    return await this.request(`/api/boq/${tenderId}`);
  }

  getBOQExportUrl(tenderId) {
    return `/api/boq/${tenderId}/export`;
  }

  // ── Corrigendum ───────────────────────────────────────────────────
  async getCorrigenda(tenderId) {
    return await this.request(`/api/corrigendum/${tenderId}`);
  }

  async applyCorrigendum(tenderId) {
    return await this.request(`/api/corrigendum/${tenderId}/apply`, {
      method: 'POST',
    });
  }

  // ── Company Facts (Legacy/Raw) ────────────────────────────────────
  async getCompanyFacts(category = null) {
    const q = category ? `?category=${category}` : '';
    return await this.request(`/api/company/facts${q}`);
  }

  async saveCompanyFact(fact) {
    return await this.request('/api/company/facts', {
      method: 'POST',
      body: JSON.stringify(fact),
    });
  }

  async uploadOldBid(file) {
    const formData = new FormData();
    formData.append('file', file);
    return await this.request('/api/company/upload-old-bid', {
      method: 'POST',
      body: formData,
    });
  }

  // ── Document Generation & Final Audit ─────────────────────────────
  async compileBid(tenderId, docType = 'all', customFields = {}) {
    return await this.request(`/api/generation/${tenderId}/compile`, {
      method: 'POST',
      body: JSON.stringify({ doc_type: docType, custom_fields: customFields }),
    });
  }

  async compileDocument(tenderId, docType = 'cover_letter', customFields = {}) {
    return await this.compileBid(tenderId, docType, customFields);
  }

  async listGeneratedDocuments(tenderId) {
    return await this.request(`/api/generation/${tenderId}/documents`);
  }

  async runFinalAudit(tenderId) {
    return await this.request(`/api/generation/${tenderId}/audit`, {
      method: 'POST',
    });
  }

  getDownloadDocxUrl(tenderId, docId) {
    return `/api/generation/${tenderId}/download/${docId}`;
  }

  async downloadDocxFile(tenderId, docId, filename = 'bid_document.docx') {
    const token = this.getToken();
    const res = await fetch(`/api/generation/${tenderId}/download/${docId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to download compiled document');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadBOQFile(tenderId, filename = 'Schedule_of_Rates_BOQ.xlsx') {
    const token = this.getToken();
    const res = await fetch(`/api/boq/${tenderId}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to export BOQ spreadsheet');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ── Plans & Credits ───────────────────────────────────────────────
  async listPlans() {
    return await this.request('/api/plans');
  }

  async getCredits() {
    return await this.request('/api/plans/credits');
  }

  async topUpCredits(credits, planTier = 'growth_pack', amountInr = 0, description = 'Credit Top-Up') {
    return await this.request('/api/plans/top-up', {
      method: 'POST',
      body: JSON.stringify({
        credits,
        plan_tier: planTier,
        amount_inr: amountInr,
        description,
      }),
    });
  }

  // ── Razorpay Payment Gateway ───────────────────────────────────────
  async createRazorpayOrder(planId) {
    return await this.request('/api/plans/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    });
  }

  async verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id }) {
    return await this.request('/api/plans/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        plan_id,
      }),
    });
  }

  // ── Live Tender Discovery & Instant Import ────────────────────────
  async getDiscoveryFeed({ q = '', portal = '', category = '', qualifiedOnly = false, minValue = null, maxValue = null } = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (portal && portal !== 'all') params.set('portal', portal);
    if (category && category !== 'all') params.set('category', category);
    if (qualifiedOnly) params.set('qualified_only', 'true');
    if (minValue != null) params.set('min_value', String(minValue));
    if (maxValue != null) params.set('max_value', String(maxValue));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/api/discovery/feed${qs}`);
  }

  async importDiscoveryTender(externalId) {
    return await this.request(`/api/discovery/${externalId}/import`, {
      method: 'POST',
    });
  }

  // ── Onboarding ────────────────────────────────────────────────────
  async completeOnboarding() {
    return await this.request('/api/auth/me/onboarding', { method: 'PATCH' });
  }

  async updateProfile(data) {
    return await this.request('/api/auth/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ── Guest Trial ───────────────────────────────────────────────────
  async getTrialStatus() {
    try {
      return await this.request('/api/trial/status');
    } catch {
      return { available: true, message: 'Check available' };
    }
  }

  async submitGuestTrial(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/trial/analyze', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let msg = 'Analysis failed';
      try {
        const err = await res.json();
        msg = err.detail?.message || err.detail || msg;
      } catch (_) {}
      const error = new Error(msg);
      error.isTrialExhausted = res.status === 429;
      throw error;
    }
    return await res.json();
  }

  // ── Admin Control Center APIs ─────────────────────────────────────
  async getAdminMetrics() {
    return await this.request('/api/admin/metrics');
  }

  async getAdminTenants({ page = 1, limit = 25, search = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/api/admin/tenants${qs}`);
  }

  async getAdminTenantDossier(tenantId) {
    return await this.request(`/api/admin/tenants/${tenantId}`);
  }

  async grantAdminCredits(tenantId, delta, reason) {
    return await this.request(`/api/admin/tenants/${tenantId}/credits`, {
      method: 'POST',
      body: JSON.stringify({ delta: Number(delta), reason }),
    });
  }

  async updateAdminTenantStatus(tenantId, isActive, reason = '') {
    return await this.request(`/api/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: Boolean(isActive), reason }),
    });
  }

  async updateAdminTenantPlan(tenantId, planTier, reason = '') {
    return await this.request(`/api/admin/tenants/${tenantId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ plan_tier: planTier, reason }),
    });
  }

  async getAdminPlans() {
    return await this.request('/api/admin/plans');
  }

  async createAdminPlan(planData) {
    return await this.request('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
  }

  async updateAdminPlan(planId, planData) {
    return await this.request(`/api/admin/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async getAdminSettings() {
    return await this.request('/api/admin/settings');
  }

  async updateAdminSetting(key, value, description = '') {
    return await this.request(`/api/admin/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  }

  async getAdminAuditLogs({ page = 1, limit = 50, action = '', search = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (action) params.set('action', action);
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/api/admin/audit-logs${qs}`);
  }

  async getAdminEmailLogs({ page = 1, limit = 50, search = '' } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request(`/api/admin/email-logs${qs}`);
  }
}

export const api = new ApiService();
export default api;
