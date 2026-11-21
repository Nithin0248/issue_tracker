import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { projectApi } from '../api';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext(null);

/** The signed-in user's project list, shared by the sidebar, dashboard and projects page. */
export function ProjectsProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setProjects(await projectApi.list());
    } catch {
      /* the page that needs the data shows its own error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const value = useMemo(() => ({ projects, loading, refresh }), [projects, loading, refresh]);
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  return useContext(ProjectsContext);
}
