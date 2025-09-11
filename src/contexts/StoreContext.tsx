import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '../types';

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  addStore: (store: Store) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

// Mock stores for demo
const mockStores: Store[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Tienda Principal',
    address: 'Calle 123, Ciudad',
    phone: '+57 300 123 4567',
    email: 'principal@tienda.com',
    isActive: true
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sucursal Norte',
    address: 'Av. Norte 456, Ciudad',
    phone: '+57 300 123 4568',
    email: 'norte@tienda.com',
    isActive: true
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Sucursal Sur',
    address: 'Av. Sur 789, Ciudad',
    phone: '+57 300 123 4569',
    email: 'sur@tienda.com',
    isActive: true
  }
];

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [stores, setStores] = useState<Store[]>(mockStores);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);

  useEffect(() => {
    // Set first store as default
    if (stores.length > 0 && !currentStore) {
      setCurrentStoreState(stores[0]);
    }
  }, [stores, currentStore]);

  const setCurrentStore = (store: Store) => {
    setCurrentStoreState(store);
    // No localStorage - session-based store selection
    // In production, this could be stored in user preferences in Supabase
  };

  const addStore = (store: Store) => {
    setStores(prevStores => [...prevStores, store]);
    // In production, this would also save to Supabase
  };

  const value = {
    stores,
    currentStore,
    setCurrentStore,
    addStore
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}
