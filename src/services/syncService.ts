import { OfflineService } from './offlineService';
import { SupabaseService } from './supabaseService';
import { Sale, Expense, CashMovement, Product, Customer } from '../types';

export class SyncService {
  private static isOnline = navigator.onLine;
  private static syncInProgress = false;
  private static syncCallbacks: Array<(status: SyncStatus) => void> = [];
  private static connectionRetries = 0;
  private static maxRetries = 3;

  static init(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Initial sync if online
    if (this.isOnline) {
      this.syncPendingData();
    }

    console.log('📄 SyncService inicializado');
  }

  private static handleOnline(): void {
    console.log('🌐 Conexión restaurada - iniciando sincronización');
    this.isOnline = true;
    this.connectionRetries = 0; // Reset retry counter
    this.notifyCallbacks({ type: 'online', message: 'Conexión restaurada' });
    this.syncPendingData();
  }

  private static handleOffline(): void {
    console.log('🔴 Conexión perdida - modo offline activado');
    this.isOnline = false;
    this.notifyCallbacks({ type: 'offline', message: 'Trabajando sin conexión' });
  }

  static getConnectionStatus(): boolean {
    return this.isOnline;
  }

  static onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  private static notifyCallbacks(status: SyncStatus): void {
    this.syncCallbacks.forEach(callback => callback(status));
  }

  static async syncPendingData(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: 0, errors: 0, details: [] };
    }

    this.syncInProgress = true;
    this.notifyCallbacks({ type: 'syncing', message: 'Sincronizando datos...' });

    const result: SyncResult = { success: 0, errors: 0, details: [] };

    try {
      // Test connection with retry logic
      const connected = await this.testConnectionWithRetry();
      if (!connected) {
        throw new Error('No se pudo conectar a Supabase después de varios intentos');
      }

      const syncQueue = await OfflineService.getSyncQueue();
      console.log(`📄 Sincronizando ${syncQueue.length} elementos pendientes`);

      // Process sync queue in order
      for (const item of syncQueue) {
        try {
          await this.syncItem(item);
          await OfflineService.removeSyncQueueItem(item.id);
          result.success++;
          result.details.push(`✅ ${item.type}: ${this.getItemDescription(item)}`);
        } catch (error) {
          console.error(`❌ Error sincronizando ${item.type}:`, error);
          
          // Increment retry count
          await OfflineService.incrementSyncRetries(item.id);
          
          // Remove from queue if too many retries
          if (item.retries >= 3) {
            await OfflineService.removeSyncQueueItem(item.id);
            result.details.push(`❌ ${item.type}: Eliminado después de 3 intentos fallidos`);
          }
          
          result.errors++;
          result.details.push(`❌ ${item.type}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      if (result.success > 0) {
        this.notifyCallbacks({ 
          type: 'success', 
          message: `${result.success} elementos sincronizados` 
        });
      }

      if (result.errors > 0) {
        this.notifyCallbacks({ 
          type: 'error', 
          message: `${result.errors} errores de sincronización` 
        });
      }

    } catch (error) {
      console.error('❌ Error durante sincronización:', error);
      this.notifyCallbacks({ 
        type: 'error', 
        message: 'Error de sincronización' 
      });
      result.errors++;
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Test connection with retry logic
  private static async testConnectionWithRetry(): Promise<boolean> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const connected = await SupabaseService.testConnection();
        if (connected) {
          this.connectionRetries = 0;
          return true;
        }
      } catch (error) {
        console.warn(`Intento de conexión ${i + 1}/${this.maxRetries} falló:`, error);
      }
      
      // Wait before retry (exponential backoff)
      if (i < this.maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.connectionRetries = this.maxRetries;
    return false;
  }

  private static async syncItem(item: any): Promise<void> {
    switch (item.type) {
      case 'sale':
        await SupabaseService.saveSale(item.data);
        await OfflineService.markSaleSynced(item.data.id);
        break;
      case 'expense':
        await SupabaseService.saveExpense(item.data);
        break;
      case 'cashMovement':
        // Cash movements are typically derived from sales/expenses
        // so they might not need separate sync
        break;
      case 'product':
        await SupabaseService.saveProduct(item.data);
        break;
      case 'customer':
        await SupabaseService.saveCustomer(item.data);
        break;
      default:
        throw new Error(`Tipo de sincronización desconocido: ${item.type}`);
    }
  }

  private static getItemDescription(item: any): string {
    switch (item.type) {
      case 'sale':
        return `Venta ${item.data.invoiceNumber}`;
      case 'expense':
        return `Gasto: ${item.data.description}`;
      case 'product':
        return `Producto: ${item.data.name}`;
      case 'customer':
        return `Cliente: ${item.data.name}`;
      default:
        return item.type;
    }
  }

  static async getPendingSyncCount(): Promise<number> {
    const queue = await OfflineService.getSyncQueue();
    return queue.length;
  }

  static async forceSyncNow(): Promise<SyncResult> {
    this.syncInProgress = false; // Reset flag to allow manual sync
    return await this.syncPendingData();
  }

  // Data loading with offline fallback and better error handling
  static async loadDataWithFallback(storeId: string): Promise<{
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    expenses: Expense[];
    cashMovements: CashMovement[];
    source: 'online' | 'offline';
  }> {
    try {
      if (this.isOnline) {
        // Try to load from Supabase first
        console.log('🔄 Intentando cargar datos desde Supabase...');
        
        const [products, customers, sales, expenses] = await Promise.allSettled([
          SupabaseService.getAllProducts(storeId),
          SupabaseService.getAllCustomers(storeId),
          SupabaseService.getAllSales(storeId),
          SupabaseService.getAllExpenses(storeId)
        ]);

        // Extract successful results
        const productsData = products.status === 'fulfilled' ? products.value : [];
        const customersData = customers.status === 'fulfilled' ? customers.value : [];
        const salesData = sales.status === 'fulfilled' ? sales.value : [];
        const expensesData = expenses.status === 'fulfilled' ? expenses.value : [];

        // Log any failures
        if (products.status === 'rejected') console.warn('Error cargando productos:', products.reason);
        if (customers.status === 'rejected') console.warn('Error cargando clientes:', customers.reason);
        if (sales.status === 'rejected') console.warn('Error cargando ventas:', sales.reason);
        if (expenses.status === 'rejected') console.warn('Error cargando gastos:', expenses.reason);

        // Cache data offline for future use
        try {
          await Promise.allSettled([
            OfflineService.saveProductsOffline(productsData),
            OfflineService.saveCustomersOffline(customersData)
          ]);
        } catch (cacheError) {
          console.warn('Error guardando datos en cache offline:', cacheError);
        }

        console.log('📡 Datos cargados desde Supabase (parcial o completo)');
        
        return {
          products: productsData,
          customers: customersData,
          sales: salesData,
          expenses: expensesData,
          cashMovements: [], // Will be calculated from sales/expenses
          source: 'online'
        };
      }
    } catch (error) {
      console.warn('⚠️ Error cargando desde Supabase, usando datos offline:', error);
    }

    // Fallback to offline data
    try {
      const [products, customers, sales, expenses, cashMovements] = await Promise.allSettled([
        OfflineService.getProductsOffline(storeId),
        OfflineService.getCustomersOffline(storeId),
        OfflineService.getSalesOffline(storeId),
        OfflineService.getExpensesOffline(storeId),
        OfflineService.getCashMovementsOffline(storeId)
      ]);

      console.log('💾 Datos cargados desde IndexedDB');

      return {
        products: products.status === 'fulfilled' ? products.value : [],
        customers: customers.status === 'fulfilled' ? customers.value : [],
        sales: sales.status === 'fulfilled' ? sales.value : [],
        expenses: expenses.status === 'fulfilled' ? expenses.value : [],
        cashMovements: cashMovements.status === 'fulfilled' ? cashMovements.value : [],
        source: 'offline'
      };
    } catch (offlineError) {
      console.error('❌ Error cargando datos offline:', offlineError);
      
      // Return empty data as last resort
      return {
        products: [],
        customers: [],
        sales: [],
        expenses: [],
        cashMovements: [],
        source: 'offline'
      };
    }
  }
}

export interface SyncStatus {
  type: 'online' | 'offline' | 'syncing' | 'success' | 'error';
  message: string;
}

export interface SyncResult {
  success: number;
  errors: number;
  details: string[];
}