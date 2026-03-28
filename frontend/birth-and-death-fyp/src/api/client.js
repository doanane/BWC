function normalizeApiBaseUrl(rawValue) {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';

  const normalized = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  if (normalized.endsWith('/api')) return normalized;

  try {
    const parsed = new URL(normalized);
    if (!parsed.pathname || parsed.pathname === '/') {
      return `${parsed.origin}/api`;
    }
    return normalized;
  } catch (_) {
    if (normalized === '/') return '/api';
    return normalized;
  }
}

function isLoopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes((hostname || '').toLowerCase());
}

function isLoopbackBaseUrl(urlValue) {
  if (!urlValue || urlValue.startsWith('/')) return false;
  try {
    const parsed = new URL(
      urlValue,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    );
    return isLoopbackHost(parsed.hostname);
  } catch (_) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(urlValue);
  }
}

const ENV_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || '');
const IS_LOCAL_HOST = typeof window !== 'undefined' && isLoopbackHost(window.location.hostname);
const IS_PUBLIC_OR_TUNNELED_HOST = typeof window !== 'undefined' && !IS_LOCAL_HOST;
const FORCE_PROXY_BASE = IS_PUBLIC_OR_TUNNELED_HOST && isLoopbackBaseUrl(ENV_BASE_URL);
const RAW_BASE_URL = FORCE_PROXY_BASE
  ? '/api'
  : ENV_BASE_URL || (IS_LOCAL_HOST && !import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;
export const API_BASE_URL = BASE_URL;
const IS_NGROK = BASE_URL.includes('.ngrok');
const _cache = new Map();
const CACHE_TTL = 45_000;
let _refreshing = null;

function getToken() {
  return localStorage.getItem('access_token');
}

export function clearApiCache() {
  _cache.clear();
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

async function request(path, options = {}, _isRetry = false) {
  const { skipCache = false, ...fetchOptions } = options;
  const token = getToken();
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const cacheKey = `${token ? token.slice(-12) : 'anon'}:${normalizedPath}`;

  if (isGet && !skipCache) {
    const hit = _cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(IS_NGROK && { 'ngrok-skip-browser-warning': 'true' }),
    ...fetchOptions.headers,
  };

  const res = await fetch(`${BASE_URL}${normalizedPath}`, { ...fetchOptions, method, headers });

  if (res.status === 401 && !_isRetry && !normalizedPath.startsWith('/auth/')) {
    if (!_refreshing) {
      _refreshing = tryRefreshToken().finally(() => { _refreshing = null; });
    }
    const refreshed = await _refreshing;
    if (refreshed) {
      return request(path, options, true);
    }
    window.dispatchEvent(new CustomEvent('auth:expired'));
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }

  if (res.status === 204) {
    if (!isGet) clearApiCache();
    return null;
  }

  let data;
  try { data = await res.json(); } catch (_) { data = null; }

  if (!res.ok) {
    const authRouteMissing = res.status === 404 && normalizedPath.startsWith('/auth/');
    const msg =
      (authRouteMissing && 'Authentication endpoint not found. Ensure backend runs with `uvicorn main:app` or `uvicorn app.main:app`.') ||
      (data?.detail && typeof data.detail === 'string' && data.detail) ||
      (Array.isArray(data?.detail) && data.detail.map(e => e.msg).join(', ')) ||
      `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  if (isGet && !skipCache) {
    _cache.set(cacheKey, { data, ts: Date.now() });
  } else {
    clearApiCache();
  }
  return data;
}


async function uploadFile(path, formData) {
  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 204) {
    clearApiCache();
    return null;
  }
  let data;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    const msg =
      (data?.detail && typeof data.detail === 'string' && data.detail) ||
      (Array.isArray(data?.detail) && data.detail.map(e => e.msg).join(', ')) ||
      `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  clearApiCache();
  return data;
}

/* Auth */
export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  digitalIdLogin: (body) => request('/auth/digital-id-login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => {
    clearApiCache();
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return Promise.resolve({ message: 'Logged out locally' });
    return request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  },
  me: () => request('/auth/me'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
};

/* Applications */
export const appsApi = {
  list: (params = '') => request(`/applications${params ? `?${params}` : ''}`),
  mine: (params = '') => request(`/applications/my${params ? `?${params}` : ''}`),
  get: (id) => request(`/applications/${id}`),
  createBirth: (body) => request('/applications/', { method: 'POST', body: JSON.stringify(body) }),
  createDeath: (body) => request('/applications/death', { method: 'POST', body: JSON.stringify(body) }),
  track: (ref) => request(`/applications/track/${ref}`),
  submit: (id) => request(`/applications/${id}/submit`, { method: 'POST' }),
  history: (id) => request(`/applications/${id}/history`),
};

/* Users */
export const usersApi = {
  me: () => request('/users/profile'),
  update: (body) => request('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/users/change-password', { method: 'POST', body: JSON.stringify(body) }),
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return uploadFile('/users/profile/photo', fd);
  },
  deleteAccount: () => request('/users/me', { method: 'DELETE' }),
};

/* KYC */
export const kycApi = {
  status: () => request('/kyc/status'),
  submitDocuments: (frontFile, backFile, ghanaCardNumber) => {
    const fd = new FormData();
    fd.append('front', frontFile);
    fd.append('back', backFile);
    fd.append('ghana_card_number', (ghanaCardNumber || '').replace(/[\s\-]/g, '').toUpperCase());
    return uploadFile('/kyc/submit-documents', fd);
  },
  requestDocuments: (userId, message) => {
    const fd = new FormData();
    fd.append('user_id', userId);
    fd.append('message', message);
    return uploadFile('/kyc/request-documents', fd);
  },
  submitMetamap: (verificationId, userData = {}) =>
    request('/kyc/submit-metamap', {
      method: 'POST',
      body: JSON.stringify({ verification_id: verificationId, user_data: userData }),
    }),
};

/* Accessibility */
export const accessibilityApi = {
  get: () => request('/users/me/accessibility'),
  put: (prefs) => request('/users/me/accessibility', { method: 'PUT', body: JSON.stringify(prefs) }),
};

/* Payments */
export const paymentsApi = {
  pricing: () => request('/payments/plans/pricing'),
  initiate: (body) => request('/payments/initiate', { method: 'POST', body: JSON.stringify(body) }),
  verify: (reference) => request(`/payments/verify/${reference}`),
  history: (applicationId) => request(`/payments/application/${applicationId}`),
};

/* Notifications */
export const notificationsApi = {
  list: (params = '') => request(`/notifications${params ? `?${params}` : ''}`, { skipCache: true }),
  unreadCount: () => request('/notifications/unread-count', { skipCache: true }),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
};

/* NIA Ghana Card Verification */
export const niaApi = {
  verify: (card_number, date_of_birth) =>
    request('/nia/verify', { method: 'POST', body: JSON.stringify({ card_number, date_of_birth }) }),
};

/* Contact & Feedback */
export const contactApi = {
  submit: (body) => request('/contact/', { method: 'POST', body: JSON.stringify(body) }),
  submitFeedback: (body) => request('/contact/feedback', { method: 'POST', body: JSON.stringify(body) }),
};

/* Legal references and record search */
export const recordsApi = {
  legalAct1027Reference: () => request('/misc/legal/act-1027-reference'),
  searchRecords: (record_type, reference) =>
    request('/misc/records/search', { method: 'POST', body: JSON.stringify({ record_type, reference }) }),
};

/* Chatbot */
export const chatbotApi = {
  ask: (message, history = [], language = 'English') =>
    request('/chatbot/ask', { method: 'POST', body: JSON.stringify({ message, history, language }) }),
};

/* AI Assist (Claude + Gemini fallback) */
export const aiApi = {
  formFill: (description, form_type = 'birth') =>
    request('/ai/form-fill', { method: 'POST', body: JSON.stringify({ description, form_type }) }),
  formFillFromObservation: (file, form_type = 'death', description = '') => {
    const fd = new FormData();
    fd.append('observation_file', file);
    fd.append('form_type', form_type);
    fd.append('description', description);
    return uploadFile('/ai/form-fill-from-observation', fd);
  },
  statusSummary: (status, application_type = '', reference_number = '', rejection_reason = '') =>
    request('/ai/status-summary', { method: 'POST', body: JSON.stringify({ status, application_type, reference_number, rejection_reason }) }),
  documentScreen: (base64_image, mime_type = 'image/jpeg') =>
    request('/ai/document-screen', { method: 'POST', body: JSON.stringify({ base64_image, mime_type }) }),
  health: () => request('/ai/health', { skipCache: true }),
  translate: (text, language) =>
    request('/ai/translate', { method: 'POST', body: JSON.stringify({ text, language }) }),
  documentVision: (base64_image, mime_type = 'image/jpeg', form_type = 'birth') =>
    request('/ai/document-vision', { method: 'POST', body: JSON.stringify({ base64_image, mime_type, form_type }) }),
  publicHealthSnapshot: () =>
    request('/ai/public-health-snapshot', { method: 'POST', skipCache: true }),
  citizenGuidance: (applicationId) =>
    request(`/ai/citizen-guidance/${applicationId}`, { skipCache: true }),
  ask: (question) =>
    request('/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }),
};

/* Admin */
export const adminApi = {
  overview: () => request('/analytics/super-admin/overview'),
  monthly: (year, month) => request(`/analytics/super-admin/monthly?year=${year}&month=${month}`),
  listUsers: (params = '') => request(`/users/${params ? `?${params}` : ''}`),
  getUser: (id) => request(`/users/${id}`),
  updateUser: (id, body) => request(`/users/${id}/admin-update`, { method: 'PUT', body: JSON.stringify(body) }),
  createStaff: (body) => request('/users/staff/create', { method: 'POST', body: JSON.stringify(body) }),
  userStats: () => request('/users/stats'),
  listApplications: (params = '') => request(`/applications/${params ? `?${params}` : ''}`),
  getApplication: (id) => request(`/applications/${id}`),
  updateApplicationStatus: (id, data) => request(`/applications/${id}/status`, { method: 'POST', body: JSON.stringify(data) }),
  getApplicationHistory: (id) => request(`/applications/${id}/history`),
  statusDistribution: () => request('/analytics/status-distribution'),
  regional: () => request('/analytics/regional'),
  revenueHistory: (days) => request(`/analytics/revenue?days=${days}`),
  yearlyRevenue: (year) => request(`/analytics/revenue/yearly?year=${year}`),
  staffOverview: () => request('/analytics/staff/overview'),
  auditLogs: (params = '') => request(`/audit/logs${params ? `?${params}` : ''}`),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  assignApplication: (id, staffId, note = '') =>
    request(`/applications/${id}/assign`, { method: 'POST', body: JSON.stringify({ staff_id: staffId, note }) }),
  unassignApplication: (id) =>
    request(`/applications/${id}/assign`, { method: 'POST', body: JSON.stringify({ staff_id: null }) }),
  claimApplication: (id) =>
    request(`/applications/${id}/claim`, { method: 'POST' }),
  getApplicationChat: (id) =>
    request(`/applications/${id}/chat`, { skipCache: true }),
  sendApplicationChat: (id, message) =>
    request(`/applications/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
  requestMoreInfo: (id, message, staffNote) =>
    request(`/applications/${id}/request-info`, { method: 'POST', body: JSON.stringify({ message, staff_note: staffNote }) }),
  listStaffMembers: () =>
    request('/users/staff/list', { skipCache: true }),
  staffProductivity: () =>
    request('/users/staff/productivity', { skipCache: true }),
};

export const aiAdminApi = {
  workloadSuggestion: (applications, staff) =>
    request('/ai/workload-suggestion', { method: 'POST', body: JSON.stringify({ applications, staff }) }),
  dailyBriefing: (stats) =>
    request('/ai/daily-briefing', { method: 'POST', body: JSON.stringify({ date: new Date().toISOString().split('T')[0], stats }) }),
  fraudCheck: (applicationId) =>
    request(`/ai/fraud-check/${applicationId}`, { method: 'POST' }),
};

export const aiStaffApi = {
  reviewApplication: (applicationId) =>
    request(`/ai/review-application/${applicationId}`, { method: 'POST' }),
  draftResponse: (applicationId, decision, reason = '') =>
    request(`/ai/draft-response/${applicationId}`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),
};

export const certificatesApi = {
  generate: (applicationId) =>
    request(`/certificates/generate/${applicationId}`, { method: 'POST' }),
  verify: (certNumber) =>
    request(`/certificates/verify/${certNumber}`, { skipCache: true }),
  getByApplication: (applicationId) =>
    request(`/certificates/application/${applicationId}`),
  markPrinted: (certId) =>
    request(`/certificates/${certId}/mark-printed`, { method: 'POST' }),
  download: async (certNumber) => {
    const token = getToken();
    const url = `${BASE_URL}/certificates/${certNumber}/download`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  },
};

export const statisticsApi = {
  submitRequest: (data) =>
    request('/statistics/request', { method: 'POST', body: JSON.stringify(data) }),
  getStatus: (reference) => request(`/statistics/status/${reference}`),
  downloadFile: async (reference) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/statistics/download/${reference}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Download failed');
    }
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `BDR_Statistics_${reference}.pdf`;
    return { blob, filename };
  },
  adminList: (params = '') => request(`/statistics/admin/requests${params ? `?${params}` : ''}`),
  adminGet: (reference) => request(`/statistics/admin/requests/${reference}`),
  adminUpdateStatus: (reference, body) =>
    request(`/statistics/admin/requests/${reference}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminMarkPaid: (reference) =>
    request(`/statistics/admin/requests/${reference}/mark-paid`, { method: 'POST' }),
};

export function getNotificationsWsUrl() {
  const token = getToken();
  if (!token) return null;

  const apiUrl = new URL(BASE_URL.startsWith('http') ? BASE_URL : `${window.location.origin}${BASE_URL}`);
  const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${apiUrl.host}${apiUrl.pathname}/notifications/ws?token=${encodeURIComponent(token)}`;
}

export default {
  authApi,
  appsApi,
  usersApi,
  kycApi,
  niaApi,
  accessibilityApi,
  paymentsApi,
  notificationsApi,
  contactApi,
  recordsApi,
  chatbotApi,
  aiApi,
  adminApi,
};
