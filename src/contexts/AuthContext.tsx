import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { useData } from './DataContext';

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

// Mock users for demo (fallback when no users in database)
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
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Load users from localStorage and Supabase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Load from localStorage first
        const localUsers = localStorage.getItem('cached_users');
        if (localUsers) {
          const parsedUsers = JSON.parse(localUsers);
          setAllUsers([...mockUsers, ...parsedUsers]);
        } else {
          setAllUsers(mockUsers);
        }

        // Try to load from Supabase if online
        try {
          const { SupabaseService } = await import('../services/supabaseService');
          const supabaseUsers = await SupabaseService.getAllUsers();
          if (supabaseUsers.length > 0) {
            setAllUsers([...mockUsers, ...supabaseUsers]);
            localStorage.setItem('cached_users', JSON.stringify(supabaseUsers));
          }
        } catch (error) {
          console.warn('No se pudieron cargar usuarios desde Supabase:', error);
        }

      } catch (error) {
        console.error('Error cargando usuarios:', error);
        setAllUsers(mockUsers);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const login = async (username: string, password: string, storeId?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔑 Intentando login...', { username, storeId });
      
      // Find user in all available users (mock + database)
      const foundUser = allUsers.find(u => 
        u.username === username && u.isActive
      );
      
      if (foundUser && password === '123456') {
        // For employees, validate access to the store
        if (foundUser.role === 'employee' && foundUser.storeId !== storeId) {
          console.log('❌ Empleado no tiene acceso a esta tienda');
          return false;
        }
        
        // For admin, allow any store or use their default store
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