import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, userApi } from '../api';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (tokenStore.get() ? tokenStore.getUser() : null));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Any 401 from the API (expired token, deleted user) signs the person out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Refresh the profile on load: an admin may have changed this user's role since last visit.
  useEffect(() => {
    if (!tokenStore.get()) return;
    userApi
      .me()
      .then((u) => {
        tokenStore.setUser(u);
        setUser(u);
      })
      .catch(() => {});
  }, []);

  const value = useMemo(() => {
    const persist = (res) => {
      tokenStore.set(res.token);
      tokenStore.setUser(res.user);
      setUser(res.user);
      return res.user;
    };
    return {
      user,
      isAdmin: user?.role === 'ADMIN',
      canCreateProjects: Boolean(user && user.role !== 'DEVELOPER'),
      login: async (email, password) => persist(await authApi.login({ email, password })),
      register: async (name, email, password) =>
        persist(await authApi.register({ name, email, password })),
      logout,
    };
  }, [user, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
