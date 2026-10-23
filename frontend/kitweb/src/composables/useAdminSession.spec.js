import { describe, it, expect, vi, beforeEach } from 'vitest';

// The composable keeps one shared session for every admin page, so each test loads a
// fresh copy of it against a stubbed api.
const load = async ({ token = null, login = { success: true, token: 'new-session' } } = {}) => {
  vi.resetModules();
  const state = { token };
  const api = {
    getAdminToken: vi.fn(() => state.token),
    adminLogin: vi.fn(async () => {
      if (login.success) state.token = login.token;
      return login;
    }),
    adminLogout: vi.fn(async () => { state.token = null; }),
  };
  vi.doMock('../services/api', () => ({ api }));
  const { useAdminSession } = await import('./useAdminSession');
  return { session: useAdminSession(), api, state };
};

describe('useAdminSession', () => {
  beforeEach(() => vi.resetModules());

  it('starts signed out and only counts the admin token, never a customer one', async () => {
    const { session } = await load({ token: null });
    session.sync();
    expect(session.isAuthenticated.value).toBe(false);
    expect(session.ready.value).toBe(true);
  });

  it('picks up an existing admin session on sync', async () => {
    const { session } = await load({ token: 'abc' });
    session.sync();
    expect(session.isAuthenticated.value).toBe(true);
  });

  it('signs in with the password and clears any earlier expiry notice', async () => {
    const { session, api } = await load();
    session.sync();
    session.handleAuthError({ status: 401 });
    expect(session.sessionExpired.value).toBe(true);

    expect(await session.login('hunter2')).toBe(true);
    expect(api.adminLogin).toHaveBeenCalledWith('hunter2');
    expect(session.isAuthenticated.value).toBe(true);
    expect(session.sessionExpired.value).toBe(false);
    expect(session.loginError.value).toBe('');
  });

  it('reports a wrong password without signing in', async () => {
    const { session } = await load({ login: { success: false } });
    session.sync();
    expect(await session.login('nope')).toBe(false);
    expect(session.isAuthenticated.value).toBe(false);
    expect(session.loginError.value).not.toBe('');
  });

  it('treats a 401 from any call as an expired session', async () => {
    const { session } = await load({ token: 'abc' });
    session.sync();
    expect(session.handleAuthError({ status: 401 })).toBe(true);
    expect(session.isAuthenticated.value).toBe(false);
    expect(session.sessionExpired.value).toBe(true);
  });

  it('ignores errors that are not 401s', async () => {
    const { session } = await load({ token: 'abc' });
    session.sync();
    expect(session.handleAuthError(new Error('boom'))).toBe(false);
    expect(session.handleAuthError(null)).toBe(false);
    expect(session.isAuthenticated.value).toBe(true);
  });

  it('signs out through the Worker and forgets the session', async () => {
    const { session, api } = await load({ token: 'abc' });
    session.sync();
    await session.logout();
    expect(api.adminLogout).toHaveBeenCalled();
    expect(session.isAuthenticated.value).toBe(false);
    expect(session.sessionExpired.value).toBe(false);
  });

  it('is one shared session across callers', async () => {
    const { session } = await load({ token: 'abc' });
    session.sync();
    const { useAdminSession } = await import('./useAdminSession');
    expect(useAdminSession().isAuthenticated.value).toBe(true);
    session.handleAuthError({ status: 401 });
    expect(useAdminSession().isAuthenticated.value).toBe(false);
  });
});
