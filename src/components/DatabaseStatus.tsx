import React from 'react';
import { useData } from '../contexts/DataContext';

export function DatabaseStatus() {
  const { isConnected, isLoading, dbService } = useData();

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          <span className="text-sm">Conectando a MySQL...</span>
        </div>
      </div>
    );
  }

  if (isConnected && dbService) {
    return (
      <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium">MySQL Conectado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
        <span className="text-sm">MySQL Desconectado - Usando datos locales</span>
      </div>
    </div>
  );
}
