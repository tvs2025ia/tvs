import React, { useState, useEffect } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function OfflineSyncStatus() {
  const { 
    isOnline, 
    syncStatus, 
    pendingSyncCount, 
    lastSyncResult,
    forceSyncNow 
  } = useOfflineSync();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await forceSyncNow();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'border-red-200 bg-red-50';
    if (syncStatus?.type === 'syncing' || isManualSyncing) return 'border-yellow-200 bg-yellow-50';
    if (pendingSyncCount > 0) return 'border-orange-200 bg-orange-50';
    return 'border-green-200 bg-green-50';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5 text-red-600" />;
    if (syncStatus?.type === 'syncing' || isManualSyncing) return <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />;
    if (pendingSyncCount > 0) return <Clock className="w-5 h-5 text-orange-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Sin conexión - Modo offline';
    if (syncStatus?.type === 'syncing' || isManualSyncing) return 'Sincronizando datos...';
    if (pendingSyncCount > 0) return `${pendingSyncCount} elementos pendientes`;
    return 'Todos los datos sincronizados';
  };

  // Auto-collapse after successful sync
  useEffect(() => {
    if (syncStatus?.type === 'success' && isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, isExpanded]);

  return (
    <div className={`border rounded-lg transition-all duration-200 ${getStatusColor()}`}>
      {/* Main status bar */}
      <div 
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {getStatusText()}
              </p>
              {syncStatus?.message && (
                <p className="text-xs text-gray-600 mt-1">
                  {syncStatus.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isOnline && pendingSyncCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualSync();
                }}
                disabled={isManualSyncing}
                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Sincronizar ahora"
              >
                <RefreshCw className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* Connection details */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Estado de conexión:</span>
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                {isOnline ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Pending sync count */}
          {pendingSyncCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Elementos pendientes:</span>
              <span className="font-medium text-orange-600">{pendingSyncCount}</span>
            </div>
          )}

          {/* Last sync result */}
          {lastSyncResult && (
            <div className="text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Última sincronización:</span>
                <div className="flex items-center space-x-2">
                  {lastSyncResult.success > 0 && (
                    <span className="text-green-600">{lastSyncResult.success} ✓</span>
                  )}
                  {lastSyncResult.errors > 0 && (
                    <span className="text-red-600">{lastSyncResult.errors} ✗</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Offline mode explanation */}
          {!isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Modo offline activo</p>
                  <ul className="space-y-0.5 text-blue-700">
                    <li>• Las ventas se guardan localmente</li>
                    <li>• Los datos se sincronizarán automáticamente</li>
                    <li>• El POS sigue funcionando normalmente</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}