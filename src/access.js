import { createContext, useContext } from 'react';
import { canDo } from './menu';

const AccessContext = createContext({ role: '', permissions: null });

export function AccessProvider({ role, permissions, children }) {
  return <AccessContext.Provider value={{ role, permissions }}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const { role, permissions } = useContext(AccessContext);
  return {
    role,
    can: (screen, action) => canDo(role, permissions, screen, action),
  };
}
