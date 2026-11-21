import client from './client';

const data = (res) => res.data;

/** Drops empty values so they are not sent as ?q=&status= */
function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
}

export const authApi = {
  login: (body) => client.post('/auth/login', body).then(data),
  register: (body) => client.post('/auth/register', body).then(data),
};

export const userApi = {
  me: () => client.get('/users/me').then(data),
  search: (q) => client.get('/users', { params: clean({ q }) }).then(data),
  all: () => client.get('/admin/users').then(data),
  setRole: (id, role) => client.patch(`/admin/users/${id}/role`, { role }).then(data),
};

export const projectApi = {
  list: () => client.get('/projects').then(data),
  get: (id) => client.get(`/projects/${id}`).then(data),
  create: (body) => client.post('/projects', body).then(data),
  update: (id, body) => client.put(`/projects/${id}`, body).then(data),
  remove: (id) => client.delete(`/projects/${id}`),
  members: (id) => client.get(`/projects/${id}/members`).then(data),
  addMember: (id, body) => client.post(`/projects/${id}/members`, body).then(data),
  setMemberRole: (id, userId, projectRole) =>
    client.patch(`/projects/${id}/members/${userId}`, { projectRole }).then(data),
  removeMember: (id, userId) => client.delete(`/projects/${id}/members/${userId}`),
};

export const ticketApi = {
  board: (projectId, params) =>
    client.get(`/projects/${projectId}/board`, { params: clean(params) }).then(data),
  search: (projectId, params) =>
    client.get(`/projects/${projectId}/tickets`, { params: clean(params) }).then(data),
  get: (id) => client.get(`/tickets/${id}`).then(data),
  create: (projectId, body) => client.post(`/projects/${projectId}/tickets`, body).then(data),
  update: (id, body) => client.put(`/tickets/${id}`, body).then(data),
  move: (id, status, position) =>
    client.patch(`/tickets/${id}/status`, { status, position }).then(data),
  assign: (id, assigneeId) => client.patch(`/tickets/${id}/assignee`, { assigneeId }).then(data),
  remove: (id) => client.delete(`/tickets/${id}`),
};

export const commentApi = {
  list: (ticketId) => client.get(`/tickets/${ticketId}/comments`).then(data),
  add: (ticketId, text) => client.post(`/tickets/${ticketId}/comments`, { text }).then(data),
  update: (id, text) => client.put(`/comments/${id}`, { text }).then(data),
  remove: (id) => client.delete(`/comments/${id}`),
};

export const attachmentApi = {
  list: (ticketId) => client.get(`/tickets/${ticketId}/attachments`).then(data),
  upload: (ticketId, file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post(`/tickets/${ticketId}/attachments`, form).then(data);
  },
  blob: (id) => client.get(`/attachments/${id}/download`, { responseType: 'blob' }).then(data),
  remove: (id) => client.delete(`/attachments/${id}`),
};

export const dashboardApi = {
  get: () => client.get('/dashboard').then(data),
};
