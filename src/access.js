import { createContext, useContext } from 'react';
import { canDo } from './menu';

const AccessContext = createContext({ role: '', permissions: null, title: '', username: '' });

export function AccessProvider({ role, permissions, title, username, children }) {
  return <AccessContext.Provider value={{ role, permissions, title: title || '', username: username || '' }}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const { role, permissions, title, username } = useContext(AccessContext);
  return {
    role,
    title: title || '',
    username: username || '',
    can: (screen, action) => canDo(role, permissions, screen, action),
  };
}
