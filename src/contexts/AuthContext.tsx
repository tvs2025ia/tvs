import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, storeId?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  canAccessStore: (storeId: string) => boolean;
  switchStore: (storeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Mock users for demo
const mockUsers: User[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    username: 'admin',
    email: 'admin@tienda.com',
    role: 'admin',
    storeId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    username: 'empleado1',
    email: 'empleado1@tienda.com',
    role: 'employee',
    storeId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    username: 'empleado2',
    email: 'empleado2@tienda.com',
    role: 'employee',
    storeId: '22222222-2222-2222-2222-222222222222',
    createdAt: new Date(),
    isActive: true
  }
];

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular verificación de sesión inicial
    const initializeAuth = () => {
      console.log('🔍 Verificando sesión existente...');
      // En una aplicación real, aquí verificarías la sesión con tu backend
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string, storeId?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔑 Intentando login...', { username, storeId });
      
      // Autenticación simulada - en una app real, esto llamaría a tu API
      const foundUser = mockUsers.find(u => u.username === username);
      if (foundUser && password === '123456') {
        // Para empleados, validar acceso a la tienda
        if (foundUser.role === 'employee' && foundUser.storeId !== storeId) {
          console.log('❌ Empleado no tiene acceso a esta tienda');
          return false;
        }
        
        // Para admin, permitir cualquier tienda o usar su tienda por defecto
        const userWithStore = {
          ...foundUser,
          storeId: storeId || foundUser.storeId
        };
        
        setUser(userWithStore);
        console.log('✅ Login exitoso:', { 
          userId: userWithStore.id, 
          storeId: userWithStore.storeId 
        });
        
        return true;
      }
      
      console.log('❌ Credenciales incorrectas');
      return false;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const canAccessStore = (storeId: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.storeId === storeId;
  };

  const switchStore = (storeId: string): boolean => {
    if (!user) return false;
    
    if (user.role === 'admin') {
      console.log('🏪 Admin cambiando de tienda:', { 
        from: user.storeId, 
        to: storeId 
      });
      setUser(prev => prev ? { ...prev, storeId } : null);
      return true;
    }
    
    // Los empleados no pueden cambiar de tienda
    if (user.storeId !== storeId) {
      console.log('❌ Empleado no puede cambiar de tienda');
      return false;
    }
    
    return true;
  };

  const logout = () => {
    console.log('👋 Cerrando sesión...');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    canAccessStore,
    switchStore
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}