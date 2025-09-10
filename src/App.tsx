import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { DataProvider, useData } from './contexts/DataContext'; // ✅ Importar useData también
import { useServiceWorker } from './hooks/useServiceWorker';
import { useOfflineSync } from './hooks/useOfflineSync';
import { OfflineSyncStatus } from './components/OfflineSyncStatus';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { LayawayComponent } from './components/Layaway';
import { Sales } from './components/Sales';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { Quotes } from './components/Quotes';
import { Purchases } from './components/Purchases';
import { Expenses } from './components/Expenses';
import { CashRegister } from './components/CashRegister';
import { Statistics } from './components/Statistics';
import { Admin } from './components/Admin';

// ✅ Componente LoadingScreen separado para mejor UX
function LoadingScreen({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
        <p className="mt-2 text-sm text-gray-500">
          {message.includes('Conectando') ? 'Estableciendo conexión con la base de datos...' : 'Por favor espera...'}
        </p>
      </div>
    </div>
  );
}

// ✅ Componente que maneja el estado de la aplicación con acceso a ambos contextos
function AppContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: dataLoading, isConnected } = useData(); // ✅ Acceder al estado de datos
  const { isSupported: swSupported, isRegistered: swRegistered } = useServiceWorker();
  const { isOnline, pendingSyncCount } = useOfflineSync();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // ✅ Mostrar mensaje específico según el estado de carga
  const getLoadingMessage = () => {
    if (authLoading) return "Verificando autenticación...";
    if (dataLoading && user) return "Conectando a la base de datos...";
    return "Cargando...";
  };

  // ✅ Loading combinado - mostrar mientras auth O data estén cargando
  if (authLoading || (user && dataLoading)) {
    return <LoadingScreen message={getLoadingMessage()} />;
  }

  // ✅ Si no hay usuario, mostrar login
  if (!user) {
    return <Login />;
  }

  // ✅ Usuario autenticado - mostrar aplicación principal
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'pos':
        return <POS />;
      case 'layaway':
        return <LayawayComponent />;
      case 'sales':
        return <Sales />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'quotes':
        return <Quotes />;
      case 'purchases':
        return <Purchases />;
      case 'expenses':
        return <Expenses />;
      case 'cash-register':
        return <CashRegister />;
      case 'stats':
        return <Statistics />;
      case 'admin':
        return <Admin />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {/* ✅ Mostrar estado de sincronización offline */}
      <div className="mb-4">
        <OfflineSyncStatus />
      </div>
      
      {renderPage()}
    </Layout>
  );
}

// ✅ Componente principal con providers
function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <DataProvider>
          {/* ✅ Usar AppContent en lugar de MainApp para mejor claridad */}
          <AppContent />
        </DataProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;