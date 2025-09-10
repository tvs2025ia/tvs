import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Sale, Customer, Expense, Quote, Purchase, PaymentMethod, User, Supplier, CashRegister, CashMovement, ReceiptTemplate, Layaway, LayawayPayment } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { OfflineService } from '../services/offlineService';
import { SyncService } from '../services/syncService';
import { useAuth } from './AuthContext';

interface DataContextType {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  quotes: Quote[];
  purchases: Purchase[];
  paymentMethods: PaymentMethod[];
  users: User[];
  suppliers: Supplier[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  expenseCategories: string[];
  receiptTemplates: ReceiptTemplate[];
  layaways: Layaway[];
  isLoading: boolean;
  isConnected: boolean;
  connectionError: string | null;
  dbService: any;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  addQuote: (quote: Quote) => Promise<void>;
  updateQuote: (quote: Quote) => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  addPaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  updatePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  addExpenseCategory: (category: string) => void;
  deleteExpenseCategory: (category: string) => void;
  addReceiptTemplate: (template: ReceiptTemplate) => Promise<void>;
  updateReceiptTemplate: (template: ReceiptTemplate) => Promise<void>;
  deleteReceiptTemplate: (id: string) => Promise<void>;
  getActiveReceiptTemplate: (storeId: string) => ReceiptTemplate | null;
  openCashRegister: (register: CashRegister) => Promise<void>;
  closeCashRegister: (registerId: string, closingAmount: number, expensesTurno?: any[]) => Promise<void>;
  addCashMovement: (movement: CashMovement) => Promise<void>;
  addLayaway: (layaway: Layaway) => Promise<void>;
  updateLayaway: (layaway: Layaway) => Promise<void>;
  addLayawayPayment: (layawayId: string, payment: LayawayPayment) => Promise<void>;
  formatCurrency: (amount: number) => string;
  refreshData: () => Promise<void>;
  connectToDatabase: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_STORE_ID = '11111111-1111-1111-1111-111111111111';

function isValidUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Mock data for fallback
const mockProducts: Product[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Laptop HP Pavilion',
    sku: 'LP001',
    category: 'Computadores',
    price: 2500000,
    cost: 2000000,
    stock: 5,
    minStock: 2,
    storeId: DEFAULT_STORE_ID,
    imageUrl: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', discountPercentage: 0, isActive: true },
  { id: '2', name: 'Tarjeta Débito', discountPercentage: 2.5, isActive: true },
  { id: '3', name: 'Tarjeta Crédito', discountPercentage: 3.8, isActive: true },
  { id: '4', name: 'Transferencia', discountPercentage: 1.2, isActive: true },
  { id: '5', name: 'PayPal', discountPercentage: 4.2, isActive: true },
  { id: '6', name: 'Nequi', discountPercentage: 1.8, isActive: true }
];

const mockExpenseCategories: string[] = [
  'Servicios',
  'Mantenimiento',
  'Suministros',
  'Marketing',
  'Transporte',
  'Seguridad',
  'Limpieza',
  'Otros'
];

const mockReceiptTemplates: ReceiptTemplate[] = [
  {
    id: '1',
    name: 'Plantilla Principal',
    storeId: DEFAULT_STORE_ID,
    headerText: '*** RECIBO DE VENTA ***\nTienda Principal\nNIT: 123456789-1\nDir: Calle Principal 123',
    footerText: '¡Gracias por su compra!\nVisite nuestra web: www.tienda.com\nTel: +57 300 123 4567',
    showLogo: true,
    logoUrl: '',
    thermalWidth: 58,
    fontSize: 11,
    showDate: true,
    showEmployee: true,
    showCustomer: true,
    showInvoiceNumber: true,
    showPaymentMethod: true,
    showItemDetails: true,
    showTotals: true,
    isActive: true
  }
];

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@email.com',
    phone: '+57 300 123 4567',
    address: 'Calle 123, Ciudad',
    storeId: DEFAULT_STORE_ID,
    totalPurchases: 5500000,
    lastPurchase: new Date('2024-01-15')
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@tienda.com',
    role: 'admin',
    storeId: DEFAULT_STORE_ID,
    createdAt: new Date(),
    isActive: true
  }
];

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Proveedor Tech SA',
    email: 'ventas@proveedortech.com',
    phone: '+57 300 555 0001',
    address: 'Zona Industrial, Ciudad',
    contactPerson: 'Carlos Mendoza',
    isActive: true
  }
];

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const dbService = SupabaseService;
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(mockExpenseCategories);
  const [receiptTemplates, setReceiptTemplates] = useState<ReceiptTemplate[]>(mockReceiptTemplates);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [layaways, setLayaways] = useState<Layaway[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    // Initialize offline service
    OfflineService.init().catch(console.error);
    
    if (!authLoading) {
      if (user) {
        console.log('Usuario autenticado, conectando a base de datos...', { userId: user.id, storeId: user.storeId });
        connectToDatabase();
      } else {
        console.log('Usuario no autenticado, limpiando datos...');
        clearAllData();
        setIsLoading(false);
        setIsConnected(false);
        setConnectionError(null);
      }
    }
  }, [user, authLoading]);

  const clearAllData = () => {
    setProducts([]);
    setSales([]);
    setCustomers([]);
    setExpenses([]);
    setQuotes([]);
    setPurchases([]);
    setCashRegisters([]);
    setCashMovements([]);
    setLayaways([]);
    setPaymentMethods(mockPaymentMethods);
    setExpenseCategories(mockExpenseCategories);
    setReceiptTemplates(mockReceiptTemplates);
  };

  const connectToDatabase = async () => {
    if (!user) {
      console.log('No hay usuario autenticado para conectar');
      return;
    }

    try {
      setIsLoading(true);
      setIsConnected(false);
      setConnectionError(null);
      
      console.log('Conectando a Supabase...', { storeId: user.storeId });
      
      // Load data with offline fallback
      const dataResult = await SyncService.loadDataWithFallback(user.storeId);
      
      // Update state with loaded data
      setProducts(dataResult.products || []);
      setCustomers(dataResult.customers || []);
      setSales(dataResult.sales || []);
      setExpenses(dataResult.expenses || []);
      setCashMovements(dataResult.cashMovements || []);
      
      // Set connection status
      setIsConnected(dataResult.source === 'online');
      
      if (dataResult.source === 'online') {
        setConnectionError(null);
        console.log(`Datos cargados desde ${dataResult.source}:`, {
          products: dataResult.products?.length || 0,
          customers: dataResult.customers?.length || 0,
          sales: dataResult.sales?.length || 0,
          expenses: dataResult.expenses?.length || 0
        });
      } else {
        setConnectionError('Trabajando en modo offline');
        console.log('Trabajando con datos offline');
      }
      
    } catch (error) {
      console.error('Error conectando a base de datos:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Error de conexión');
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const retryConnection = async () => {
    console.log('Reintentando conexión...');
    await connectToDatabase();
  };

  const loadMockData = () => {
    setProducts(mockProducts);
    setSales([]);
    setCustomers(mockCustomers);
    setExpenses([]);
    setCashRegisters([]);
    setCashMovements([]);
    setLayaways([]);
  };

  const refreshData = async () => {
    if (!user) {
      console.log('No hay usuario autenticado');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Refrescando datos...', { storeId: user.storeId });

      const currentStoreId = user.storeId;

      // Load essential data first with error handling
      const results = await Promise.allSettled([
        SupabaseService.getAllProducts(currentStoreId),
        SupabaseService.getAllCustomers(currentStoreId)
      ]);

      // Process results
      const productsResult = results[0];
      const customersResult = results[1];

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value);
      } else {
        console.error('Error cargando productos:', productsResult.reason);
      }

      if (customersResult.status === 'fulfilled') {
        setCustomers(customersResult.value);
      } else {
        console.error('Error cargando clientes:', customersResult.reason);
      }

      console.log(`Datos esenciales cargados para tienda ${currentStoreId}`);

      // Load secondary data in background with error handling
      setTimeout(async () => {
        try {
          const secondaryResults = await Promise.allSettled([
            SupabaseService.getAllSales(currentStoreId),
            SupabaseService.getAllExpenses(currentStoreId),
            SupabaseService.getAllCashRegisters(currentStoreId),
            SupabaseService.getAllLayaways(currentStoreId)
          ]);

          // Process secondary results
          const [salesResult, expensesResult, cashRegistersResult, layawaysResult] = secondaryResults;

          if (salesResult.status === 'fulfilled') {
            setSales(salesResult.value);
          } else {
            console.error('Error cargando ventas:', salesResult.reason);
          }

          if (expensesResult.status === 'fulfilled') {
            setExpenses(expensesResult.value);
          } else {
            console.error('Error cargando gastos:', expensesResult.reason);
          }

          if (cashRegistersResult.status === 'fulfilled') {
            setCashRegisters(cashRegistersResult.value);
          } else {
            console.error('Error cargando cajas:', cashRegistersResult.reason);
          }

          if (layawaysResult.status === 'fulfilled') {
            setLayaways(layawaysResult.value);
          } else {
            console.error('Error cargando separados:', layawaysResult.reason);
          }

          console.log('Datos adicionales cargados');
        } catch (error) {
          console.error('Error cargando datos adicionales:', error);
        }
      }, 100);

    } catch (error) {
      console.error('Error refrescando datos:', error);
      setConnectionError(error instanceof Error ? error.message : 'Error refrescando datos');
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD functions with better error handling
  const addProduct = async (product: Product) => {
    const normalized: Product = {
      ...product,
      id: isValidUUID(product.id) ? product.id : crypto.randomUUID(),
      storeId: isValidUUID(product.storeId) ? product.storeId : (user?.storeId || DEFAULT_STORE_ID)
    };

    try {
      // Optimistic update
      setProducts(prev => [...prev, normalized]);

      if (isConnected) {
        try {
          const savedProduct = await SupabaseService.saveProduct(normalized);
          setProducts(prev => prev.map(p => p.id === normalized.id ? savedProduct : p));
          console.log('Producto guardado en Supabase:', normalized.name);
        } catch (error) {
          console.warn('Error guardando en Supabase, manteniendo local:', error);
        }
      } else {
        console.log('Producto guardado offline:', normalized.name);
      }
      
    } catch (error) {
      setProducts(prev => prev.filter(p => p.id !== normalized.id));
      console.error('Error guardando producto:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    const normalized: Product = {
      ...updatedProduct,
      id: isValidUUID(updatedProduct.id) ? updatedProduct.id : crypto.randomUUID(),
      storeId: isValidUUID(updatedProduct.storeId) ? updatedProduct.storeId : (user?.storeId || DEFAULT_STORE_ID)
    };

    try {
      const originalProduct = products.find(p => p.id === normalized.id);
      setProducts(prev => prev.map(p => p.id === normalized.id ? normalized : p));

      if (isConnected) {
        const savedProduct = await SupabaseService.saveProduct(normalized);
        setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
        console.log('Producto actualizado en Supabase:', normalized.name);
      }
    } catch (error) {
      const originalProduct = products.find(p => p.id === normalized.id);
      if (originalProduct) {
        setProducts(prev => prev.map(p => p.id === normalized.id ? originalProduct : p));
      }
      console.error('Error actualizando producto:', error);
      throw error;
    }
  };

  const addSale = async (sale: Sale) => {
    const normalized: Sale = {
      ...sale,
      id: isValidUUID(sale.id) ? sale.id : crypto.randomUUID(),
      storeId: isValidUUID(sale.storeId) ? sale.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(sale.employeeId) ? sale.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      customerId: sale.customerId && isValidUUID(sale.customerId) ? sale.customerId : undefined
    };
    
    try {
      setSales(prev => [...prev, normalized]);

      setProducts(prev => prev.map(p => {
        const saleItem = normalized.items.find(item => item.productId === p.id);
        if (saleItem) {
          return { ...p, stock: p.stock - saleItem.quantity };
        }
        return p;
      }));

      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalized.storeId,
        employeeId: normalized.employeeId,
        type: 'sale',
        amount: normalized.total,
        description: `Venta ${normalized.invoiceNumber}`,
        date: normalized.date,
        referenceId: normalized.id
      };
      setCashMovements(prev => [...prev, cashMovement]);

      if (isConnected) {
        try {
          await SupabaseService.saveSale(normalized);
          console.log('Venta guardada en Supabase:', normalized.invoiceNumber);
        } catch (error) {
          console.warn('Error guardando en Supabase, guardando offline:', error);
          await OfflineService.saveSaleOffline(normalized);
        }
      } else {
        await OfflineService.saveSaleOffline(normalized);
        console.log('Venta guardada offline:', normalized.invoiceNumber);
      }
    } catch (error) {
      setSales(prev => prev.filter(s => s.id !== normalized.id));
      setCashMovements(prev => prev.filter(m => m.referenceId !== normalized.id));
      console.error('Error guardando venta:', error);
      throw error;
    }
  };

  const updateSale = async (updatedSale: Sale) => {
    const normalized: Sale = {
      ...updatedSale,
      id: isValidUUID(updatedSale.id) ? updatedSale.id : crypto.randomUUID(),
      storeId: isValidUUID(updatedSale.storeId) ? updatedSale.storeId : (user?.storeId || DEFAULT_STORE_ID),
      employeeId: isValidUUID(updatedSale.employeeId) ? updatedSale.employeeId : (user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      customerId: updatedSale.customerId && isValidUUID(updatedSale.customerId) ? updatedSale.customerId : undefined
    };

    try {
      const originalSale = sales.find(s => s.id === normalized.id);
      setSales(prev => prev.map(s => s.id === normalized.id ? normalized : s));

      if (isConnected) {
        await SupabaseService.updateSale(normalized);
        console.log('Venta actualizada en Supabase:', normalized.invoiceNumber);
      }
    } catch (error) {
      const originalSale = sales.find(s => s.id === normalized.id);
      if (originalSale) {
        setSales(prev => prev.map(s => s.id === normalized.id ? originalSale : s));
      }
      console.error('Error actualizando venta:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const originalSale = sales.find(s => s.id === id);
      if (!originalSale) {
        throw new Error('Venta no encontrada');
      }

      setSales(prev => prev.filter(s => s.id !== id));

      if (isConnected) {
        await SupabaseService.deleteSale(id);
      }

      setCashMovements(prev => prev.filter(m => m.referenceId !== id));
      console.log('Venta eliminada:', originalSale.invoiceNumber);
    } catch (error) {
      const originalSale = sales.find(s => s.id === id);
      if (originalSale) {
        setSales(prev => [...prev, originalSale]);
      }
      console.error('Error eliminando venta:', error);
      throw error;
    }
  };

  const addCustomer = async (customer: Customer) => {
    const normalizedCustomer = {
      ...customer,
      storeId: customer.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      setCustomers(prev => [...prev, normalizedCustomer]);
      
      if (isConnected) {
        try {
          const savedCustomer = await SupabaseService.saveCustomer(normalizedCustomer);
          setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
          console.log('Cliente guardado en Supabase:', customer.name);
        } catch (error) {
          console.warn('Error guardando en Supabase, manteniendo local:', error);
        }
      } else {
        console.log('Cliente guardado offline:', customer.name);
      }
      
    } catch (error) {
      setCustomers(prev => prev.filter(c => c.id !== normalizedCustomer.id));
      console.error('Error guardando cliente:', error);
      throw error;
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    try {
      if (isConnected) {
        const savedCustomer = await SupabaseService.saveCustomer(updatedCustomer);
        setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
        console.log('Cliente actualizado en Supabase:', updatedCustomer.name);
      } else {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        console.log('Cliente actualizado offline:', updatedCustomer.name);
      }
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      throw error;
    }
  };

  const addExpense = async (expense: Expense) => {
    const normalizedExpense = {
      ...expense,
      storeId: expense.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: expense.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      setExpenses(prev => [...prev, normalizedExpense]);
      
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalizedExpense.storeId,
        employeeId: normalizedExpense.employeeId,
        type: 'expense',
        amount: -normalizedExpense.amount,
        description: normalizedExpense.description,
        date: normalizedExpense.date,
        referenceId: normalizedExpense.id
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      if (isConnected) {
        try {
          await SupabaseService.saveExpense(normalizedExpense);
          console.log('Gasto guardado en Supabase:', expense.description);
        } catch (error) {
          console.warn('Error guardando en Supabase, guardando offline:', error);
          await OfflineService.saveExpenseOffline(normalizedExpense);
        }
      } else {
        await OfflineService.saveExpenseOffline(normalizedExpense);
        console.log('Gasto guardado offline:', expense.description);
      }
      
    } catch (error) {
      setExpenses(prev => prev.filter(e => e.id !== normalizedExpense.id));
      setCashMovements(prev => prev.filter(m => m.referenceId !== normalizedExpense.id));
      console.error('Error guardando gasto:', error);
      throw error;
    }
  };

  // Mock implementations for other features
  const addQuote = async (quote: Quote) => {
    setQuotes(prev => [...prev, quote]);
  };

  const updateQuote = async (updatedQuote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  const addPurchase = async (purchase: Purchase) => {
    setPurchases(prev => [...prev, purchase]);
    purchase.items.forEach(item => {
      setProducts(prev => prev.map(p => 
        p.id === item.productId 
          ? { ...p, stock: p.stock + item.quantity }
          : p
      ));
    });
  };

  const addUser = async (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const updateUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const addSupplier = async (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
  };

  const updateSupplier = async (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  };

  const openCashRegister = async (register: CashRegister) => {
    const normalizedRegister = {
      ...register,
      storeId: register.storeId || user?.storeId || DEFAULT_STORE_ID,
      employeeId: register.employeeId || user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };
    
    try {
      if (isConnected) {
        const savedRegister = await SupabaseService.saveCashRegister(normalizedRegister);
        setCashRegisters(prev => [...prev, savedRegister]);
      } else {
        setCashRegisters(prev => [...prev, normalizedRegister]);
      }
      
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: normalizedRegister.storeId,
        employeeId: normalizedRegister.employeeId,
        type: 'opening',
        amount: normalizedRegister.openingAmount,
        description: 'Apertura de caja',
        date: normalizedRegister.openedAt,
        referenceId: normalizedRegister.id
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      console.log('Caja abierta');
    } catch (error) {
      console.error('Error abriendo caja:', error);
      throw error;
    }
  };

  const closeCashRegister = async (registerId: string, closingAmount: number, expensesTurno?: any[]) => {
    try {
      const register = cashRegisters.find(r => r.id === registerId);
      if (!register) return;

      const openedAt = new Date(register.openedAt);
      const closedAt = new Date();

      const salesTurno = sales.filter(sale =>
        sale.storeId === register.storeId &&
        new Date(sale.date) >= openedAt &&
        new Date(sale.date) <= closedAt
      );
      const salesTotal = salesTurno.reduce((sum, s) => sum + s.total, 0);

      const expensesTurnoArr = expenses.filter(exp =>
        exp.storeId === register.storeId &&
        new Date(exp.date) >= openedAt &&
        new Date(exp.date) <= closedAt
      );
      const expensesTotal = expensesTurnoArr.reduce((sum, e) => sum + e.amount, 0);

      const expectedAmount = register.openingAmount + salesTotal - expensesTotal;
      const difference = closingAmount - expectedAmount;

      const updatedRegister: CashRegister = {
        ...register,
        closingAmount,
        closedAt,
        status: 'closed',
        expectedAmount,
        difference,
        expensesTurno: expensesTurnoArr
      };

      if (isConnected) {
        const savedRegister = await SupabaseService.saveCashRegister(updatedRegister);
        setCashRegisters(prev => prev.map(r => r.id === registerId ? savedRegister : r));
      } else {
        setCashRegisters(prev => prev.map(r => r.id === registerId ? updatedRegister : r));
      }

      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: register.storeId,
        employeeId: register.employeeId,
        type: 'closing',
        amount: 0,
        description: `Cierre de caja - Conteo: ${formatCurrency(closingAmount)}`,
        date: new Date(),
        referenceId: registerId
      };
      setCashMovements(prev => [...prev, cashMovement]);
      
      console.log('Caja cerrada');
    } catch (error) {
      console.error('Error cerrando caja:', error);
      throw error;
    }
  };

  const addCashMovement = async (movement: CashMovement) => {
    setCashMovements(prev => [...prev, movement]);
  };

  const addLayaway = async (layaway: Layaway) => {
    const normalizedLayaway = {
      ...layaway,
      storeId: layaway.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    
    try {
      if (isConnected) {
        const savedLayaway = await SupabaseService.saveLayaway(normalizedLayaway);
        setLayaways(prev => [...prev, savedLayaway]);
      } else {
        setLayaways(prev => [...prev, normalizedLayaway]);
      }
      
      normalizedLayaway.items.forEach(item => {
        setProducts(prev => prev.map(p => 
          p.id === item.productId 
            ? { ...p, stock: p.stock - item.quantity }
            : p
        ));
      });
      
      console.log('Separado guardado');
    } catch (error) {
      console.error('Error guardando separado:', error);
      throw error;
    }
  };

  const updateLayaway = async (updatedLayaway: Layaway) => {
    try {
      if (isConnected) {
        const savedLayaway = await SupabaseService.saveLayaway(updatedLayaway);
        setLayaways(prev => prev.map(l => l.id === savedLayaway.id ? savedLayaway : l));
      } else {
        setLayaways(prev => prev.map(l => l.id === updatedLayaway.id ? updatedLayaway : l));
      }
      console.log('Separado actualizado');
    } catch (error) {
      console.error('Error actualizando separado:', error);
      throw error;
    }
  };

  const addLayawayPayment = async (layawayId: string, payment: LayawayPayment) => {
    setLayaways(prev => prev.map(layaway => {
      if (layaway.id === layawayId) {
        const newTotalPaid = layaway.totalPaid + payment.amount;
        const newRemainingBalance = layaway.total - newTotalPaid;
        const newStatus = newRemainingBalance <= 0 ? 'completed' : 'active';
        
        return {
          ...layaway,
          payments: [...layaway.payments, payment],
          totalPaid: newTotalPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus
        };
      }
      return layaway;
    }));

    const layaway = layaways.find(l => l.id === layawayId);
    if (layaway) {
      const cashMovement: CashMovement = {
        id: crypto.randomUUID(),
        storeId: layaway.storeId,
        employeeId: payment.employeeId,
        type: 'sale',
        amount: payment.amount,
        description: `Abono separado #${layawayId}`,
        date: payment.date,
        referenceId: layawayId
      };
      setCashMovements(prev => [...prev, cashMovement]);
    }
  };

  const addPaymentMethod = async (paymentMethod: PaymentMethod) => {
    setPaymentMethods(prev => [...prev, paymentMethod]);
  };

  const updatePaymentMethod = async (updatedPaymentMethod: PaymentMethod) => {
    setPaymentMethods(prev => prev.map(pm =>
      pm.id === updatedPaymentMethod.id ? updatedPaymentMethod : pm
    ));
  };

  const deletePaymentMethod = async (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const addExpenseCategory = (category: string) => {
    if (!expenseCategories.includes(category)) {
      setExpenseCategories(prev => [...prev, category].sort());
    }
  };

  const deleteExpenseCategory = (category: string) => {
    setExpenseCategories(prev => prev.filter(c => c !== category));
  };

  const addReceiptTemplate = async (template: ReceiptTemplate) => {
    const normalizedTemplate = {
      ...template,
      storeId: template.storeId || user?.storeId || DEFAULT_STORE_ID
    };
    setReceiptTemplates(prev => [...prev, normalizedTemplate]);
  };

  const updateReceiptTemplate = async (updatedTemplate: ReceiptTemplate) => {
    setReceiptTemplates(prev => prev.map(rt =>
      rt.id === updatedTemplate.id ? updatedTemplate : rt
    ));
  };

  const deleteReceiptTemplate = async (id: string) => {
    setReceiptTemplates(prev => prev.filter(rt => rt.id !== id));
  };

  const getActiveReceiptTemplate = (storeId: string): ReceiptTemplate | null => {
    return receiptTemplates.find(rt => rt.storeId === storeId && rt.isActive) || null;
  };

  const isLoadingCombined = authLoading || isLoading;

  const value = {
    products,
    sales,
    customers,
    expenses,
    quotes,
    purchases,
    paymentMethods,
    users,
    suppliers,
    cashRegisters,
    cashMovements,
    expenseCategories,
    receiptTemplates,
    layaways,
    isLoading: isLoadingCombined,
    isConnected,
    connectionError,
    dbService,
    addProduct,
    updateProduct,
    addSale,
    updateSale,
    deleteSale,
    addCustomer,
    updateCustomer,
    addExpense,
    addQuote,
    updateQuote,
    addPurchase,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addUser,
    updateUser,
    addSupplier,
    updateSupplier,
    addExpenseCategory,
    deleteExpenseCategory,
    addReceiptTemplate,
    updateReceiptTemplate,
    deleteReceiptTemplate,
    getActiveReceiptTemplate,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
    addLayaway,
    updateLayaway,
    addLayawayPayment,
    formatCurrency,
    refreshData,
    connectToDatabase,
    retryConnection
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}