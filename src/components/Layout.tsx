import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useData } from '../contexts/DataContext';
import { OfflineIndicator } from './OfflineIndicator';
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
  ChevronRight
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

    // Verificar si cambió el usuario
    if (user && isConnected && lastUserId !== currentUserId) {
      console.log('🔄 Layout: Detectado cambio de usuario, refrescando datos...');
      refreshData();
    }

    // Actualizar estado previo
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
  
  // ✅ Usar hook de sincronización simplificado
  const syncStatus = useDataSync();

  // Detectar el tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // En móvil, siempre colapsar el sidebar por defecto
      if (mobile) {
        setSidebarCollapsed(true);
      } else {
        // En desktop, restaurar el estado del sidebar
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

  // ✅ Función para manejar cambio de tienda
  const handleStoreChange = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      console.log('🏪 Layout: Cambiando tienda a', store.name);
      setCurrentStore(store);
    }
  };

  // ✅ Función para alternar el estado del sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // ✅ Componente de estado de conexión simplificado
  const ConnectionStatus = ({ className = "" }) => {
    const statusIcon = isConnected ? (
      <Cloud className="w-4 h-4 text-green-500" />
    ) : (
      <CloudOff className="w-4 h-4 text-orange-500" />
    );
    
    const statusText = isConnected ? 'Online' : 'Offline';
    const statusColor = isConnected ? 'text-green-600' : 'text-orange-600';
    
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {statusIcon}
        <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
      </div>
    );
  };

  // ✅ Componente de elemento de navegación para sidebar colapsado (solo ícono)
  const CollapsedNavigationItem = ({ item }: { item: any }) => {
    const active = currentPage === item.id;
    
    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        className={`w-full flex items-center justify-center p-3 my-1 rounded-lg transition-all duration-200 ${
          active 
            ? 'bg-blue-50 text-blue-700 shadow-sm' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title={item.name}
      >
        <item.icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
      </button>
    );
  };

  // ✅ Componente de elemento de navegación para sidebar expandido
  const ExpandedNavigationItem = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
    const baseClasses = `w-full flex items-center px-3 py-3 text-left font-medium rounded-lg transition-all duration-200 ${
      isMobile ? 'text-sm' : 'text-sm xl:text-base xl:px-4'
    }`;
    
    const activeClasses = currentPage === item.id 
      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm' 
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';

    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        className={`${baseClasses} ${activeClasses}`}
      >
        <div className="flex items-center">
          <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${
            isMobile ? '' : 'xl:w-6 xl:h-6 xl:mr-4'
          } ${currentPage === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="truncate">{item.name}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ Mensaje de advertencia si no hay conexión */}
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

      {/* Mobile/Tablet sidebar overlay */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)} 
        />
        
        {/* Mobile sidebar */}
        <div 
          className={`fixed top-0 left-0 w-80 sm:w-72 md:w-80 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile sidebar header - FIJO */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">POS Sistema</h1>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">
                {user?.username} • {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
              </div>
              {/* ✅ Estado de conexión en mobile */}
              <ConnectionStatus className="mt-2" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile store selector - FIJO */}
          {currentStore && (
            <div className="flex-shrink-0 p-4 border-b bg-gray-50">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                {user?.role === 'admin' ? 'TIENDA ACTUAL' : 'TIENDA'}
              </label>
              {user?.role === 'admin' ? (
                <select
                  value={currentStore.id}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium text-gray-900 p-2 bg-white rounded-md border">
                  {currentStore.name}
                </div>
              )}
            </div>
          )}

          {/* Mobile navigation + logout - CON SCROLL */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-2 px-2">
              {/* Navigation items */}
              <div className="space-y-1 mb-4">
                {filteredNavigation.map((item) => (
                  <ExpandedNavigationItem key={item.id} item={item} isMobile={true} />
                ))}
              </div>

              {/* Logout button dentro del área scrolleable */}
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
            
            {/* Espacio extra al final para asegurar scroll completo */}
            <div className="h-4"></div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-16 xl:w-16' : 'lg:w-64 xl:w-72'
      }`}>
        <div className="flex flex-col flex-grow bg-white shadow-lg border-r border-gray-200 h-full">
          {/* Desktop header - FIJO */}
          <div className={`flex-shrink-0 p-4 border-b border-gray-200 ${sidebarCollapsed ? 'px-3' : 'px-6'}`}>
            {!sidebarCollapsed ? (
              <>
                <h1 className="text-xl xl:text-2xl font-bold text-gray-900">POS Sistema</h1>
                <div className="mt-2 text-sm text-gray-600">
                  {user?.username} • {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
                </div>
                {/* ✅ Estado de conexión en desktop */}
                <ConnectionStatus className="mt-3" />
              </>
            ) : (
              <div className="flex justify-center">
                <div className="text-xl font-bold text-blue-600">POS</div>
              </div>
            )}
          </div>
          
          {/* Desktop store selector - FIJO (solo visible cuando está expandido) */}
          {currentStore && !sidebarCollapsed && (
            <div className="flex-shrink-0 p-4 xl:p-6 border-b border-gray-200 bg-gray-50">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                {user?.role === 'admin' ? 'TIENDA ACTUAL' : 'TIENDA'}
              </label>
              {user?.role === 'admin' ? (
                <select
                  value={currentStore.id}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="w-full p-2 xl:p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium text-gray-900 p-2 xl:p-3 bg-white rounded-md border">
                  {currentStore.name}
                </div>
              )}
            </div>
          )}

          {/* Desktop navigation + logout - CON SCROLL */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className={`py-4 ${sidebarCollapsed ? 'px-2' : 'px-3 xl:px-4'}`}>
              {/* Navigation items */}
              <div className={`${sidebarCollapsed ? 'space-y-0' : 'space-y-1'} mb-6`}>
                {filteredNavigation.map((item) => (
                  sidebarCollapsed ? (
                    <CollapsedNavigationItem key={item.id} item={item} />
                  ) : (
                    <ExpandedNavigationItem key={item.id} item={item} />
                  )
                ))}
              </div>

              {/* Desktop logout dentro del área scrolleable */}
              {!sidebarCollapsed && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={logout}
                    className="w-full flex items-center px-3 xl:px-4 py-3 xl:py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm xl:text-base font-medium"
                  >
                    <LogOut className="w-5 h-5 xl:w-6 xl:h-6 mr-3 xl:mr-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
            
            {/* Espacio extra al final para asegurar scroll completo */}
            <div className="h-6"></div>
          </div>

          {/* Botón para colapsar/expandir sidebar (solo desktop) */}
          {!isMobile && (
            <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-16 xl:pl-16' : 'lg:pl-64 xl:pl-72'
      }`}>
        {/* Mobile top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Current page indicator for mobile */}
            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-gray-900">
                {navigation.find(item => item.id === currentPage)?.name || 'Dashboard'}
              </span>
            </div>

            {/* Store info for mobile */}
            <div className="flex items-center space-x-2 text-sm">
              <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-700 truncate max-w-24 sm:max-w-none">
                {currentStore?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Botón para expandir sidebar colapsado (solo desktop) */}
        {sidebarCollapsed && !isMobile && (
          <div className="hidden lg:block absolute top-4 left-4 z-10">
            <button
              onClick={toggleSidebar}
              className="p-2 bg-white rounded-md shadow-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Expandir menú"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Offline Sync Indicator */}
      <OfflineIndicator />
    </div>
  );
}