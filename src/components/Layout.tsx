import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useData } from '../contexts/DataContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { 
  Menu, 
  X, 
  Store, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  Settings,
  LogOut,
  DollarSign,
  FileText,
  Calculator,
  ShoppingBag,
  UserPlus,
  BarChart3,
  Home,
  Bookmark,
  Cloud,
  CloudOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

// ✅ Hook de sincronización simplificado
function useDataSync() {
  const { user } = useAuth();
  const { refreshData, isConnected } = useData();
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id || null;

    if (user && isConnected && lastUserId !== currentUserId) {
      console.log('🔄 Layout: Detectado cambio de usuario, refrescando datos...');
      refreshData();
    }

    setLastUserId(currentUserId);
  }, [user, isConnected, refreshData, lastUserId]);

  return { isConnected };
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { stores, currentStore, setCurrentStore } = useStore();
  const { isConnected } = useData();
  const { forceSyncNow, pendingSyncCount, syncStatus } = useOfflineSync();
  const [syncing, setSyncing] = useState(false);

  // ✅ Usar hook de sincronización simplificado
  const syncStatusData = useDataSync();

  // Detectar el tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState !== null) {
          setSidebarCollapsed(savedState === 'true');
        }
      }
      
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Guardar el estado de colapso en localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed, isMobile]);

  // Cerrar sidebar cuando se hace clic fuera en móvil
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen, isMobile]);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: Home, admin: false },
    { name: 'Punto de Venta', id: 'pos', icon: ShoppingCart, admin: false },
    { name: 'Separados', id: 'layaway', icon: Bookmark, admin: false },
    { name: 'Registro de Ventas', id: 'sales', icon: FileText, admin: false },
    { name: 'Inventario', id: 'inventory', icon: Package, admin: false },
    { name: 'Clientes', id: 'customers', icon: Users, admin: false },
    { name: 'Cotizaciones', id: 'quotes', icon: FileText, admin: false },
    { name: 'Compras', id: 'purchases', icon: ShoppingBag, admin: false },
    { name: 'Egresos', id: 'expenses', icon: DollarSign, admin: false },
    { name: 'Cuadre de Caja', id: 'cash-register', icon: Calculator, admin: false },
    { name: 'Estadísticas', id: 'stats', icon: BarChart3, admin: false },
    { name: 'Administración', id: 'admin', icon: Settings, admin: true },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.admin || (item.admin && user?.role === 'admin')
  );

  const handleNavigation = (itemId: string) => {
    onPageChange(itemId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleStoreChange = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      console.log('🏪 Layout: Cambiando tienda a', store.name);
      setCurrentStore(store);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // ✅ Estado de conexión con botón de sync
  const ConnectionStatus = ({ className = "" }) => {
    const statusIcon = isConnected ? (
      <Cloud className="w-4 h-4 text-green-500" />
    ) : (
      <CloudOff className="w-4 h-4 text-orange-500" />
    );
    
    const statusText = isConnected ? 'Online' : 'Offline';
    const statusColor = isConnected ? 'text-green-600' : 'text-orange-600';

    const handleManualSync = async () => {
      setSyncing(true);
      try {
        await forceSyncNow();
      } finally {
        setSyncing(false);
      }
    };

    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {statusIcon}
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
        
        {/* Botón pequeño de sync */}
        {isConnected && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
            title="Sincronizar ahora"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Mostrar pendientes */}
        {pendingSyncCount > 0 && (
          <span className="text-xs font-medium text-orange-600">
            {pendingSyncCount} pendientes
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isConnected && (
        <div className="bg-orange-50 border-b border-orange-200 p-3">
          <div className="flex items-center justify-center space-x-2 text-orange-800">
            <CloudOff className="w-5 h-5" />
            <span className="text-sm font-medium">
              Modo offline activado. Los datos se sincronizarán automáticamente al recuperar la conexión.
            </span>
          </div>
        </div>
      )}

      {/* ... resto del código del sidebar y main content sin cambios ... */}

      <div className={`transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-16 xl:pl-16' : 'lg:pl-64 xl:pl-72'
      }`}>
        <main className="flex-1 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
