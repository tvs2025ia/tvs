import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useData } from '../contexts/DataContext'; // ✅ Agregar useData
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
  Wifi,
  WifiOff,
  AlertCircle,
  Cloud,
  CloudOff // ✅ Nuevos iconos para estado offline
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

// ✅ Hook de sincronización integrado
function useDataSync() {
  const { user } = useAuth();
  const { refreshData, isConnected, isLoading } = useData();
  const [lastUserData, setLastUserData] = useState<{userId: string | null, storeId: string | null}>({
    userId: null,
    storeId: null
  });

  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentStoreId = user?.storeId || null;

    // Verificar si cambió el usuario o la tienda
    const userChanged = lastUserData.userId !== currentUserId;
    const storeChanged = lastUserData.storeId !== currentStoreId;

    if (user && isConnected && (userChanged || storeChanged)) {
      console.log('🔄 Layout: Detectado cambio de usuario/tienda, refrescando datos...', {
        userId: currentUserId,
        storeId: currentStoreId,
        userChanged,
        storeChanged
      });

      // Refrescar datos
      refreshData();
    }

    // Actualizar estado previo
    setLastUserData({ userId: currentUserId, storeId: currentStoreId });
  }, [user, isConnected, refreshData, lastUserData.userId, lastUserData.storeId]);

  return { isLoading, isConnected };
}

export function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const { stores, currentStore, setCurrentStore } = useStore();
  const { products, sales, customers, isLoading: dataLoading } = useData(); // ✅ Acceder a datos para mostrar contadores
  
  // ✅ Usar hook de sincronización
  const { isLoading: syncLoading, isConnected } = useDataSync();

  // Detectar el tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Cerrar sidebar en móvil cuando se redimensiona a desktop
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  // ✅ Agregar contadores a los elementos de navegación
  const getItemCounter = (itemId: string) => {
    switch (itemId) {
      case 'inventory':
        return products.length;
      case 'sales':
        return sales.length;
      case 'customers':
        return customers.length;
      default:
        return null;
    }
  };

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
      console.log('🏪 Layout: Cambiando tienda de', currentStore?.name, 'a', store.name);
      setCurrentStore(store);
      // El hook useDataSync detectará este cambio y refrescará los datos
    }
  };

  // ✅ Componente de estado de conexión
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
      {(dataLoading || syncLoading) && (
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
    );
  };

  // ✅ Componente de elemento de navegación con contador
  const NavigationItem = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
    const counter = getItemCounter(item.id);
    const baseClasses = `w-full flex items-center justify-between px-3 py-3 text-left font-medium rounded-lg transition-all duration-200 ${
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
        {counter !== null && counter > 0 && (
          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
            currentPage === item.id 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {counter}
          </span>
        )}
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
                  disabled={dataLoading || syncLoading} // ✅ Deshabilitar durante carga
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
                  <NavigationItem key={item.id} item={item} isMobile={true} />
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 xl:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white shadow-lg border-r border-gray-200 h-full">
          {/* Desktop header - FIJO */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <h1 className="text-xl xl:text-2xl font-bold text-gray-900">POS Sistema</h1>
            <div className="mt-2 text-sm text-gray-600">
              {user?.username} • {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
            </div>
            {/* ✅ Estado de conexión en desktop */}
            <ConnectionStatus className="mt-3" />
          </div>
          
          {/* Desktop store selector - FIJO */}
          {currentStore && (
            <div className="flex-shrink-0 p-4 xl:p-6 border-b border-gray-200 bg-gray-50">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                {user?.role === 'admin' ? 'TIENDA ACTUAL' : 'TIENDA'}
              </label>
              {user?.role === 'admin' ? (
                <select
                  value={currentStore.id}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="w-full p-2 xl:p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={dataLoading || syncLoading} // ✅ Deshabilitar durante carga
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
            <div className="py-4 xl:py-6 px-3 xl:px-4">
              {/* Navigation items */}
              <div className="space-y-1 mb-6">
                {filteredNavigation.map((item) => (
                  <NavigationItem key={item.id} item={item} />
                ))}
              </div>

              {/* Desktop logout dentro del área scrolleable */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-3 xl:px-4 py-3 xl:py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm xl:text-base font-medium"
                >
                  <LogOut className="w-5 h-5 xl:w-6 xl:h-6 mr-3 xl:mr-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
            
            {/* Espacio extra al final para asegurar scroll completo */}
            <div className="h-6"></div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 xl:pl-72">
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