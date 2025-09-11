import { supabase } from '../lib/supabase';
import { 
  Product, Sale, Customer, Expense, Quote, Purchase, 
  User, Supplier, CashRegister, CashMovement, 
  ReceiptTemplate, Layaway, PaymentMethod 
} from '../types';

export class SupabaseService {
  private static productsTable: 'products' | 'prestashop_products' | null = null;

  private static async resolveProductsTable(): Promise<'products' | 'prestashop_products'> {
    if (this.productsTable) return this.productsTable;
    // Try modern table first
    const { error } = await supabase.from('products').select('id').limit(1);
    if (!error) {
      this.productsTable = 'products';
      return this.productsTable;
    }
    // Fallback to legacy prestashop table
    const { error: legacyError } = await supabase.from('prestashop_products').select('id').limit(1);
    if (!legacyError) {
      this.productsTable = 'prestashop_products';
      return this.productsTable;
    }
    // Default to products to surface original error later
    this.productsTable = 'products';
    return this.productsTable;
  }

  // Check if table exists
  private static async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // Products
  static async getAllProducts(storeId?: string): Promise<Product[]> {
    try {
      const table = await this.resolveProductsTable();

      if (table === 'products') {
        let query = supabase.from('products').select('*');
        if (storeId) query = query.eq('store_id', storeId);
        const { data, error } = await query;
        if (error) throw new Error(`Error fetching products: ${error.message}`);
        return (data || []).map(this.mapSupabaseToProduct);
      }

      // prestashop_products fallback
      const { data, error } = await supabase
        .from('prestashop_products')
        .select('id, name, reference, price, stock_quantity, active');
      if (error) throw new Error(`Error fetching products: ${error.message}`);
      return (data || [])
        .filter((row: any) => row.active)
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.reference || `SKU-${item.id}`,
          category: 'General',
          price: item.price || 0,
          cost: item.price ? item.price * 0.7 : 0,
          stock: item.stock_quantity || 0,
          minStock: 5,
          storeId: storeId || '1',
          imageUrl: undefined
        }));
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      return []; // Return empty array instead of throwing
    }
  }

  static async saveProduct(product: Product): Promise<Product> {
    const table = await this.resolveProductsTable();

    if (table === 'products') {
      const supabaseProduct = this.mapProductToSupabase(product);
      const { data, error } = await supabase
        .from('products')
        .upsert(supabaseProduct)
        .select()
        .single();
      if (error) throw new Error(`Error saving product: ${error.message}`);
      return this.mapSupabaseToProduct(data);
    }

    // prestashop_products fallback (limited fields)
    const { data, error } = await supabase
      .from('prestashop_products')
      .upsert({
        id: product.id,
        name: product.name,
        reference: product.sku,
        price: product.price,
        stock_quantity: product.stock,
        active: true
      })
      .select('id, name, reference, price, stock_quantity, active')
      .single();
    if (error) throw new Error(`Error saving product: ${error.message}`);
    return {
      id: data.id,
      name: data.name,
      sku: data.reference,
      category: product.category,
      price: data.price || product.price,
      cost: product.cost,
      stock: data.stock_quantity || product.stock,
      minStock: product.minStock,
      storeId: product.storeId,
      imageUrl: product.imageUrl
    };
  }

  static async deleteProduct(id: string): Promise<void> {
    const table = await this.resolveProductsTable();
    const fromTable = table === 'products' ? 'products' : 'prestashop_products';
    const { error } = await supabase.from(fromTable).delete().eq('id', id);
    if (error) throw new Error(`Error deleting product: ${error.message}`);
  }

  // Sales
  static async getAllSales(storeId?: string): Promise<Sale[]> {
    try {
      // Check if sales table exists
      const salesExists = await this.tableExists('sales');
      if (!salesExists) {
        console.warn('Sales table does not exist');
        return [];
      }

      let query = supabase.from('sales').select('*, sale_items(*)');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) {
        console.error('Error fetching sales:', error);
        return [];
      }
      return (data || []).map(this.mapSupabaseToSale);
    } catch (error) {
      console.error('Error in getAllSales:', error);
      return [];
    }
  }

  static async saveSale(sale: Sale): Promise<Sale> {
    const { error: saleError } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        store_id: sale.storeId,
        employee_id: sale.employeeId,
        customer_id: sale.customerId,
        subtotal: sale.subtotal,
        discount: sale.discount,
        shipping_cost: sale.shippingCost,
        total: sale.total,
        net_total: sale.netTotal,
        payment_method: sale.paymentMethod,
        payment_method_discount: sale.paymentMethodDiscount,
        date: sale.date.toISOString(),
        invoice_number: sale.invoiceNumber
      })
      .select()
      .single();

    if (saleError) throw new Error(`Error saving sale: ${saleError.message}`);

    // Save sale items
    const saleItems = sale.items.map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw new Error(`Error saving sale items: ${itemsError.message}`);

    return sale;
  }

  static async updateSale(sale: Sale): Promise<Sale> {
    // First, update the sale record
    const { error: saleError } = await supabase
      .from('sales')
      .update({
        store_id: sale.storeId,
        employee_id: sale.employeeId,
        customer_id: sale.customerId,
        subtotal: sale.subtotal,
        discount: sale.discount,
        shipping_cost: sale.shippingCost,
        total: sale.total,
        net_total: sale.netTotal,
        payment_method: sale.paymentMethod,
        payment_method_discount: sale.paymentMethodDiscount,
        date: sale.date.toISOString(),
        invoice_number: sale.invoiceNumber
      })
      .eq('id', sale.id);

    if (saleError) throw new Error(`Error updating sale: ${saleError.message}`);

    // Delete existing sale items
    const { error: deleteItemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', sale.id);

    if (deleteItemsError) throw new Error(`Error deleting sale items: ${deleteItemsError.message}`);

    // Insert updated sale items
    const saleItems = sale.items.map(item => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw new Error(`Error updating sale items: ${itemsError.message}`);

    return sale;
  }

  static async deleteSale(id: string): Promise<void> {
    // Delete sale items first (due to foreign key constraint)
    const { error: deleteItemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (deleteItemsError) throw new Error(`Error deleting sale items: ${deleteItemsError.message}`);

    // Delete the sale record
    const { error: deleteSaleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (deleteSaleError) throw new Error(`Error deleting sale: ${deleteSaleError.message}`);
  }

  // Customers
  static async getAllCustomers(storeId?: string): Promise<Customer[]> {
    try {
      const customersExists = await this.tableExists('customers');
      if (!customersExists) {
        console.warn('Customers table does not exist');
        return [];
      }

      let query = supabase.from('customers').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
      return (data || []).map(this.mapSupabaseToCustomer);
    } catch (error) {
      console.error('Error in getAllCustomers:', error);
      return [];
    }
  }

  static async saveCustomer(customer: Customer): Promise<Customer> {
    const supabaseCustomer = this.mapCustomerToSupabase(customer);
    const { data, error } = await supabase
      .from('customers')
      .upsert(supabaseCustomer)
      .select()
      .single();
    if (error) throw new Error(`Error saving customer: ${error.message}`);
    return this.mapSupabaseToCustomer(data);
  }

  // Expenses
  static async getAllExpenses(storeId?: string): Promise<Expense[]> {
    try {
      const expensesExists = await this.tableExists('expenses');
      if (!expensesExists) {
        console.warn('Expenses table does not exist');
        return [];
      }

      let query = supabase.from('expenses').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }
      return (data || []).map(this.mapSupabaseToExpense);
    } catch (error) {
      console.error('Error in getAllExpenses:', error);
      return [];
    }
  }

  static async saveExpense(expense: Expense): Promise<Expense> {
    const supabaseExpense = this.mapExpenseToSupabase(expense);
    const { data, error } = await supabase
      .from('expenses')
      .upsert(supabaseExpense)
      .select()
      .single();
    if (error) throw new Error(`Error saving expense: ${error.message}`);
    return this.mapSupabaseToExpense(data);
  }

  // Cash Registers
  static async getAllCashRegisters(storeId?: string): Promise<CashRegister[]> {
    try {
      const cashRegistersExists = await this.tableExists('cash_registers');
      if (!cashRegistersExists) {
        console.warn('Cash registers table does not exist');
        return [];
      }

      let query = supabase.from('cash_registers').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query.order('opened_at', { ascending: false });
      if (error) {
        console.error('Error fetching cash registers:', error);
        return [];
      }
      return (data || []).map(this.mapSupabaseToCashRegister);
    } catch (error) {
      console.error('Error in getAllCashRegisters:', error);
      return [];
    }
  }

  static async saveCashRegister(register: CashRegister): Promise<CashRegister> {
    const supabaseRegister = this.mapCashRegisterToSupabase(register);
    const { data, error } = await supabase
      .from('cash_registers')
      .upsert(supabaseRegister)
      .select()
      .single();
    if (error) throw new Error(`Error saving cash register: ${error.message}`);
    return this.mapSupabaseToCashRegister(data);
  }

  // Layaways
  static async getAllLayaways(storeId?: string): Promise<Layaway[]> {
    try {
      const layawaysExists = await this.tableExists('layaways');
      if (!layawaysExists) {
        console.warn('Layaways table does not exist');
        return [];
      }

      let query = supabase.from('layaways').select('*, layaway_items(*), layaway_payments(*)');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching layaways:', error);
        return [];
      }
      return (data || []).map(this.mapSupabaseToLayaway);
    } catch (error) {
      console.error('Error in getAllLayaways:', error);
      return [];
    }
  }

  static async saveLayaway(layaway: Layaway): Promise<Layaway> {
    const { error: layawayError } = await supabase
      .from('layaways')
      .upsert({
        id: layaway.id,
        store_id: layaway.storeId,
        customer_id: layaway.customerId,
        subtotal: layaway.subtotal,
        discount: layaway.discount,
        total: layaway.total,
        total_paid: layaway.totalPaid,
        remaining_balance: layaway.remainingBalance,
        status: layaway.status,
        created_at: layaway.createdAt.toISOString(),
        employee_id: layaway.employeeId,
        due_date: layaway.dueDate?.toISOString(),
        notes: layaway.notes
      })
      .select()
      .single();

    if (layawayError) throw new Error(`Error saving layaway: ${layawayError.message}`);

    // Handle items and payments separately if needed
    return layaway;
  }

  // Bulk operations for better performance
  static async bulkUpsertProducts(products: Product[]): Promise<Product[]> {
    const table = await this.resolveProductsTable();

    if (table === 'products') {
      const supabaseProducts = products.map(this.mapProductToSupabase);
      const { data, error } = await supabase
        .from('products')
        .upsert(supabaseProducts)
        .select();
      if (error) throw new Error(`Error bulk upserting products: ${error.message}`);
      return (data || []).map(this.mapSupabaseToProduct);
    }

    // prestashop_products fallback (limited fields)
    const { data, error } = await supabase
      .from('prestashop_products')
      .upsert(products.map(p => ({
        id: p.id,
        name: p.name,
        reference: p.sku,
        price: p.price,
        stock_quantity: p.stock,
        active: true
      })))
      .select('id, name, reference, price, stock_quantity, active');
    if (error) throw new Error(`Error bulk upserting products: ${error.message}`);

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      sku: item.reference,
      category: 'General',
      price: item.price || 0,
      cost: 0,
      stock: item.stock_quantity || 0,
      minStock: 5,
      storeId: products[0]?.storeId || '11111111-1111-1111-1111-111111111111',
      imageUrl: undefined
    }));
  }

  // Image upload to Supabase Storage
  static async uploadProductImage(file: File, productId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}.${fileExt}`;
    const filePath = `products/${fileName}`;
    const bucket = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || 'product-images';

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      if (uploadError.message?.toLowerCase().includes('bucket not found')) {
        throw new Error(`Error uploading image: Bucket "${bucket}" not found. Create a public Storage bucket with this name or set VITE_SUPABASE_IMAGE_BUCKET.`);
      }
      throw new Error(`Error uploading image: ${uploadError.message}`);
    }

    // Get public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // Check Supabase connection with better error handling
  static async testConnection(): Promise<boolean> {
    try {
      // Fallback tests
      const { error: productsError } = await supabase.from('products').select('id').limit(1);
      if (!productsError) return true;
      
      const { error: legacyError } = await supabase.from('prestashop_products').select('id').limit(1);
      return !legacyError;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Helper to fetch existing SKUs regardless of table
  static async getExistingSkus(skus: string[]): Promise<Set<string>> {
    const table = await this.resolveProductsTable();
    if (table === 'products') {
      const { data, error } = await supabase.from('products').select('sku').in('sku', skus);
      if (error) throw new Error(error.message);
      return new Set((data || []).map((d: any) => d.sku));
    }
    const { data, error } = await supabase.from('prestashop_products').select('reference').in('reference', skus);
    if (error) throw new Error(error.message);
    return new Set((data || []).map((d: any) => d.reference));
  }

  // Mapping functions (unchanged)
  private static mapSupabaseToProduct(data: any): Product {
    return {
      id: data.id,
      name: data.name,
      sku: data.sku,
      category: data.category,
      price: data.price,
      cost: data.cost,
      stock: data.stock,
      minStock: data.min_stock,
      storeId: data.store_id,
      imageUrl: data.image_url
    };
  }

  private static mapProductToSupabase(product: Product): any {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      min_stock: product.minStock,
      store_id: product.storeId,
      image_url: product.imageUrl
    };
  }

  private static mapSupabaseToSale(data: any): Sale {
    return {
      id: data.id,
      storeId: data.store_id,
      employeeId: data.employee_id,
      customerId: data.customer_id,
      items: data.sale_items?.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      })) || [],
      subtotal: data.subtotal,
      discount: data.discount,
      shippingCost: data.shipping_cost,
      total: data.total,
      netTotal: data.net_total,
      paymentMethod: data.payment_method,
      paymentMethodDiscount: data.payment_method_discount,
      date: new Date(data.date),
      invoiceNumber: data.invoice_number
    };
  }

  private static mapSupabaseToCustomer(data: any): Customer {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      storeId: data.store_id,
      totalPurchases: data.total_purchases,
      lastPurchase: data.last_purchase ? new Date(data.last_purchase) : undefined
    };
  }

  private static mapCustomerToSupabase(customer: Customer): any {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      store_id: customer.storeId,
      total_purchases: customer.totalPurchases,
      last_purchase: customer.lastPurchase?.toISOString()
    };
  }

  private static mapSupabaseToExpense(data: any): Expense {
    return {
      id: data.id,
      storeId: data.store_id,
      description: data.description,
      amount: data.amount,
      category: data.category,
      paymentMethod: data.payment_method,
      date: new Date(data.date),
      employeeId: data.employee_id
    };
  }

  private static mapExpenseToSupabase(expense: Expense): any {
    return {
      id: expense.id,
      store_id: expense.storeId,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      payment_method: expense.paymentMethod,
      date: expense.date.toISOString(),
      employee_id: expense.employeeId
    };
  }

  private static mapSupabaseToCashRegister(data: any): CashRegister {
    return {
      id: data.id,
      storeId: data.store_id,
      employeeId: data.employee_id,
      openingAmount: data.opening_amount,
      closingAmount: data.closing_amount,
      expectedAmount: data.expected_amount,
      difference: data.difference,
      expensesTurno: data.expenses_turno,
      openedAt: new Date(data.opened_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      status: data.status
    };
  }

  private static mapCashRegisterToSupabase(register: CashRegister): any {
    return {
      id: register.id,
      store_id: register.storeId,
      employee_id: register.employeeId,
      opening_amount: register.openingAmount,
      closing_amount: register.closingAmount,
      expected_amount: register.expectedAmount,
      difference: register.difference,
      expenses_turno: register.expensesTurno,
      opened_at: register.openedAt.toISOString(),
      closed_at: register.closedAt?.toISOString(),
      status: register.status
    };
  }

  private static mapSupabaseToLayaway(data: any): Layaway {
    return {
      id: data.id,
      storeId: data.store_id,
      customerId: data.customer_id,
      items: data.layaway_items?.map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      })) || [],
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      totalPaid: data.total_paid,
      remainingBalance: data.remaining_balance,
      status: data.status,
      createdAt: new Date(data.created_at),
      employeeId: data.employee_id,
      payments: data.layaway_payments?.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        date: new Date(payment.date),
        employeeId: payment.employee_id,
        notes: payment.notes
      })) || [],
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      notes: data.notes
    };
  }
}