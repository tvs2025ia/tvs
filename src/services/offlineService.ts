// src/services/offlineService.ts

import { Product, Customer, Sale, Expense, CashMovement } from '../types';

export class OfflineService {
  private static dbName = 'POSDatabase';
  private static version = 3; // Incrementé la versión para forzar la actualización

  // Inicializar la base de datos
  static async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Crear todas las object stores necesarias
        const objectStores = [
          'products', 'customers', 'sales', 'expenses', 
          'cash_movements', 'sync_queue' // Nombre consistente
        ];

        objectStores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            this.createObjectStore(db, storeName);
          }
        });
      };
    });
  }

  private static createObjectStore(db: IDBDatabase, storeName: string) {
    switch (storeName) {
      case 'products':
        const productsStore = db.createObjectStore('products', { keyPath: 'id' });
        productsStore.createIndex('storeId', 'storeId', { unique: false });
        productsStore.createIndex('sku', 'sku', { unique: true });
        break;
      
      case 'customers':
        const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
        customersStore.createIndex('storeId', 'storeId', { unique: false });
        break;
      
      case 'sales':
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('storeId', 'storeId', { unique: false });
        salesStore.createIndex('date', 'date', { unique: false });
        break;
      
      case 'expenses':
        const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expensesStore.createIndex('storeId', 'storeId', { unique: false });
        break;
      
      case 'cash_movements':
        const movementsStore = db.createObjectStore('cash_movements', { keyPath: 'id' });
        movementsStore.createIndex('storeId', 'storeId', { unique: false });
        break;
      
      case 'sync_queue':
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        break;
    }
  }

  // Obtener la base de datos (con inicialización automática)
  private static async getDB(): Promise<IDBDatabase> {
    try {
      const request = indexedDB.open(this.dbName, this.version);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        // Si necesita upgrade, se maneja automáticamente
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const objectStores = [
            'products', 'customers', 'sales', 'expenses', 
            'cash_movements', 'sync_queue'
          ];
          
          objectStores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              this.createObjectStore(db, storeName);
            }
          });
        };
      });
    } catch (error) {
      // Si hay error, intentar inicializar
      return await this.init();
    }
  }

  // Guardar venta offline
  static async saveSaleOffline(sale: Sale): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['sales', 'sync_queue'], 'readwrite');
      const salesStore = tx.objectStore('sales');
      const queueStore = tx.objectStore('sync_queue');

      // Guardar en la store local
      salesStore.put(sale);

      // Agregar a la cola de sincronización
      queueStore.put({
        id: crypto.randomUUID(),
        type: 'sale',
        data: sale,
        priority: 1,
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      tx.commit?.();
      console.log('Venta guardada offline en IndexedDB:', sale.id);
    } catch (error) {
      console.error('Error guardando venta offline:', error);
      throw error;
    }
  }

  // Guardar gasto offline
  static async saveExpenseOffline(expense: Expense): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['expenses', 'sync_queue'], 'readwrite');
      const expensesStore = tx.objectStore('expenses');
      const queueStore = tx.objectStore('sync_queue');

      // Guardar en la store local
      expensesStore.put(expense);

      // Agregar a la cola de sincronización
      queueStore.put({
        id: crypto.randomUUID(),
        type: 'expense',
        data: expense,
        priority: 1,
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      tx.commit?.();
      console.log('Gasto guardado offline en IndexedDB:', expense.id);
    } catch (error) {
      console.error('Error guardando gasto offline:', error);
      throw error;
    }
  }

  // Funciones para manejo de cola de sincronización
  static async getSyncQueue(): Promise<any[]> {
    try {
      const db = await this.getDB();
      
      if (!db.objectStoreNames.contains('sync_queue')) {
        console.warn('sync_queue object store no existe');
        return [];
      }
      
      const transaction = db.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  static async addToSyncQueue(type: string, data: any, priority: number = 0): Promise<void> {
    try {
      const db = await this.getDB();
      
      if (!db.objectStoreNames.contains('sync_queue')) {
        throw new Error('sync_queue object store no existe');
      }
      
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const syncItem = {
        id: crypto.randomUUID(),
        type,
        data,
        priority,
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await store.add(syncItem);
      await transaction.done;
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  // Verificar y crear object stores faltantes
  static async ensureObjectStores(): Promise<void> {
    const db = await this.getDB();
    const requiredStores = [
      'products', 'customers', 'sales', 'expenses', 
      'cash_movements', 'sync_queue'
    ];

    requiredStores.forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Object store ${storeName} no existe, recreando...`);
        this.createObjectStore(db, storeName);
      }
    });
  }
}

// Inicializar al importar el módulo
OfflineService.init().catch(error => {
  console.error('Error inicializando OfflineService:', error);
});
