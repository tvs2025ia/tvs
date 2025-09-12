import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { LocalImage } from './LocalImage';
import { Product, SaleItem, Sale } from '../types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Truck,
  X,
  Package,
  // icons adicionales
} from 'lucide-react';

export function POS() {
  const { products, paymentMethods, addSale, customers, getActiveReceiptTemplate } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();

  // Búsqueda y productos
  const [searchTerm, setSearchTerm] = useState('');
  const storeProducts = useMemo(
    () => products.filter(p => p.storeId === currentStore?.id),
    [products, currentStore]
  );
  const filteredProducts = useMemo(
    () =>
      storeProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [storeProducts, searchTerm]
  );

  // Carrito y ajustes
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0] || { id: '', name: 'Efectivo', discountPercentage: 0, isActive: true });
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Pago/recibo/impresión
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  // Guardamos el campo como texto para mejorar la experiencia al tipear
  const [textAmountReceived, setTextAmountReceived] = useState<string>('');
  const amountReceived = useMemo(() => {
    const parsed = parseFloat(textAmountReceived as any);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [textAmountReceived]);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<Sale | null>(null);

  const storeCustomers = customers ? customers.filter(c => c.storeId === currentStore?.id) : [];
  const activeReceiptTemplate = getActiveReceiptTemplate(currentStore?.id || '1');

  // Mobile cart drawer
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Cálculos memorizados para evitar re-renderes pesados
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.total || 0), 0), [cart]);
  const totalWithDiscount = useMemo(() => subtotal - discount, [subtotal, discount]);
  const finalTotal = useMemo(() => totalWithDiscount + shippingCost, [totalWithDiscount, shippingCost]);
  const paymentDeduction = useMemo(() => finalTotal * ((selectedPaymentMethod?.discountPercentage || 0) / 100), [finalTotal, selectedPaymentMethod]);
  const netTotal = useMemo(() => finalTotal - paymentDeduction, [finalTotal, paymentDeduction]);
  const invoiceNumber = useMemo(() => `INV-${Date.now()}`, [] as any);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Añadir producto al carrito
  const addToCart = (product: Product) => {
    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(prev => prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item));
      }
      return;
    }
    if (product.stock <= 0) return;
    const newItem: SaleItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      total: product.price
    };
    setCart(prev => [...prev, newItem]);
  };

  // Actualizar cantidad
  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    if (newQuantity > product.stock) {
      return;
    }
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice } : item));
  };

  // Remover producto
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Editar precio unitario en el carrito (funcionalidad solicitada)
  const updateUnitPrice = (productId: string, newUnitPrice: number) => {
    if (!Number.isFinite(newUnitPrice) || newUnitPrice < 0) return;
    setCart(prev => prev.map(item => item.productId === productId ? { ...item, unitPrice: newUnitPrice, total: newUnitPrice * item.quantity } : item));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setShippingCost(0);
    setSelectedCustomerId('');
    setTextAmountReceived('');
    setLastSaleData(null);
  };

  // Proceso de guardar venta (no bloqueante)
  const processSale = async (sale: Sale) => {
    setProcessingPayment(true);
    try {
      // Si addSale es sincrónico costoso, lo hacemos en un microtask/async para liberar render
      await new Promise(resolve => setTimeout(resolve, 50));
      await addSale(sale);
      clearCart();
      setShowPaymentModal(false);
      setShowReceiptModal(false);
      setMobileCartOpen(false);
      alert(`Venta procesada exitosamente!\nFactura: ${sale.invoiceNumber}\nTotal: ${formatCurrency(sale.total)}`);
    } catch (error) {
      console.error('Error procesando venta', error);
      alert('Error al procesar la venta');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Preparar confirmación de pago (solo abre recibo)
  const handleConfirmPayment = () => {
    if (!textAmountReceived || amountReceived < finalTotal) {
      alert('El monto recibido debe ser igual o mayor al total.');
      return;
    }
    if (cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }
    const sale: Sale = {
      id: (crypto && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}`,
      storeId: currentStore?.id,
      employeeId: user?.id,
      items: cart,
      subtotal,
      discount,
      shippingCost,
      total: finalTotal,
      netTotal,
      paymentMethod: selectedPaymentMethod?.name || 'Efectivo',
      paymentMethodDiscount: selectedPaymentMethod?.discountPercentage || 0,
      date: new Date(),
      invoiceNumber,
      customerId: selectedCustomerId || undefined
    };
    setLastSaleData(sale);
    setShowReceiptModal(true);
  };

  // Crear una nueva ventana con el HTML del recibo, imprimir y luego procesar la venta.
  // Esto evita el bloqueo del hilo principal por window.print() en el mismo contexto.
  const printReceiptAndProcess = async (sale: Sale, amountPaid: number) => {
    try {
      // Construir HTML mínimo para impresión usando la plantilla activa (header/footer) si aplica.
      const header = activeReceiptTemplate?.headerText ? `<div style="text-align:center;font-weight:bold;white-space:pre-line;">${activeReceiptTemplate.headerText}</div>` : '';
      const footer = activeReceiptTemplate?.footerText ? `<div style="text-align:center;font-size:11px;white-space:pre-line;">${activeReceiptTemplate.footerText}</div>` : '';

      const itemsHtml = (sale.items || []).map(it => `<div style="display:flex;justify-content:space-between">${it.productName} x${it.quantity} <span>${formatCurrency(it.total)}</span></div>`).join('');
      const totalsHtml = `
        <div style="display:flex;justify-content:space-between">Subtotal: <span>${formatCurrency(sale.subtotal)}</span></div>
        ${sale.discount > 0 ? `<div style="display:flex;justify-content:space-between">Descuento: <span>- ${formatCurrency(sale.discount)}</span></div>` : ''}
        ${sale.shippingCost > 0 ? `<div style="display:flex;justify-content:space-between">Envío: <span>${formatCurrency(sale.shippingCost)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:bold">Total: <span>${formatCurrency(sale.total)}</span></div>
        <div style="display:flex;justify-content:space-between">Pagó: <span>${formatCurrency(amountPaid)}</span></div>
        <div style="display:flex;justify-content:space-between">Cambio: <span>${formatCurrency(amountPaid - sale.total)}</span></div>
      `;
      // NOTA: OMITIMOS aquí el Desc. Tarjeta Crédito y Total Neto según petición.

      const printHtml = `
        <html>
          <head>
            <title>Recibo</title>
            <style>
              body { font-family: monospace; padding: 8px; }
              .receipt { width: ${activeReceiptTemplate?.thermalWidth || 58}mm; font-size: ${activeReceiptTemplate?.fontSize || 11}px; line-height:1.2; }
              .separator { border-top:1px dashed #000; margin:6px 0; }
            </style>
          </head>
          <body>
            <div class="receipt">
              ${header}
              ${activeReceiptTemplate?.showDate ? `<div>Fecha: ${new Date(sale.date).toLocaleString()}</div>` : ''}
              ${activeReceiptTemplate?.showInvoiceNumber ? `<div>Factura: ${sale.invoiceNumber}</div>` : ''}
              ${activeReceiptTemplate?.showEmployee ? `<div>Empleado: ${user?.username || ''}</div>` : ''}
              ${activeReceiptTemplate?.showCustomer ? `<div>Cliente: ${sale.customerId ? (storeCustomers.find(c => c.id === sale.customerId)?.name || '') : 'Venta rápida'}</div>` : ''}
              ${activeReceiptTemplate?.showPaymentMethod ? `<div>Método: ${sale.paymentMethod}</div>` : ''}
              <div class="separator"></div>
              ${activeReceiptTemplate?.showItemDetails ? itemsHtml : ''}
              <div class="separator"></div>
              ${activeReceiptTemplate?.showTotals ? totalsHtml : ''}
              <div class="separator"></div>
              ${footer}
            </div>
            <script>
              setTimeout(()=>{ window.print(); setTimeout(()=>{ window.close(); }, 300); }, 200);
            </script>
          </body>
        </html>
      `;

      // Abrir ventana, escribir y dejar que el script imprima
      const w = window.open('', '_blank', 'width=400,height=600');
      if (!w) {
        // Si el popup es bloqueado, fallback: imprimir en el mismo contexto (sigue sin bloquear la UI principal porque lo hacemos después)
        window.print();
        // Procesamos la venta después
        await processSale(sale);
        return;
      }
      w.document.open();
      w.document.write(printHtml);
      w.document.close();

      // Esperar un momento para que la ventana inicie el print script y luego procesar venta sin bloquear UI.
      // Damos un tiempo razonable para que el print dialog se muestre.
      setTimeout(() => {
        // No await aquí para no bloquear la UI; processSale ya maneja su propio async.
        processSale(sale);
      }, 1200);
    } catch (err) {
      console.error('Error printing receipt', err);
      // Si falla la impresión, aun así procesamos la venta para no perder la transacción
      await processSale(sale);
    }
  };

  // Acción que se llama desde el modal de recibo
  const handlePrintReceipt = () => {
    if (!lastSaleData) return;
    // Llamamos a la función que abre ventana y procesa sin bloquear
    printReceiptAndProcess(lastSaleData, amountReceived);
  };

  // Efecto: agrega estilos de impresión global sólo si plantilla cambia (optimizado)
  useEffect(() => {
    const template = activeReceiptTemplate;
    if (!template) return;
    const style = document.createElement('style');
    const width = template.thermalWidth || 58;
    const fontSize = template.fontSize || 11;
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #receipt, #receipt * { visibility: visible !important; }
        #receipt {
          position: absolute;
          left: 0;
          top: 0;
          width: ${width}mm !important;
          font-size: ${fontSize}px !important;
          line-height: 1.2;
          background: white;
          padding: 5px;
        }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [activeReceiptTemplate]);

  // Componentes internos (Product card)
  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
      <LocalImage src={product.imageUrl} alt={product.name} className="w-full h-28 object-cover rounded-lg mb-2" />
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
        <p className="text-xs text-gray-500">{product.category}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-bold text-green-600">{formatCurrency(product.price)}</span>
          <span className="text-xs text-gray-500">{product.stock} u</span>
        </div>
        <button
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
          className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
        </button>
      </div>
    </div>
  );

  // Renderizado
  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Punto de Venta</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar productos por nombre, SKU o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-base">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Desktop Cart Section (oculto en móvil) */}
      <div className="hidden md:flex w-96 bg-white border-l border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-gray-500" />
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-0.5 rounded-full">
                {cart.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{item.productName}</h4>
                      <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={product ? item.quantity >= product.stock : false} className="w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          <label className="block">P. unit.</label>
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            value={item.unitPrice}
                            onChange={(e) => updateUnitPrice(item.productId, Number(e.target.value || 0))}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary (compacto) */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 items-center text-sm">
              <label className="text-xs text-gray-600">Cliente</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                <option value="">Venta sin cliente</option>
                {storeCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>

              <label className="text-xs text-gray-600">Descuento</label>
              <div className="flex items-center">
                <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                <span className="ml-2 text-xs text-gray-500">COP</span>
              </div>

              <label className="text-xs text-gray-600">Envío</label>
              <div className="flex items-center">
                <input type="number" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value || 0))} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                <Truck className="w-4 h-4 text-gray-400 ml-2" />
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
              {discount > 0 && (<div className="flex justify-between text-sm text-green-600"><span>Descuento:</span><span>-{formatCurrency(discount)}</span></div>)}
              {shippingCost > 0 && (<div className="flex justify-between text-sm"><span>Envío:</span><span>{formatCurrency(shippingCost)}</span></div>)}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span>Total:</span><span>{formatCurrency(finalTotal)}</span></div>
            </div>

            <div className="space-y-2">
              <button onClick={() => setShowPaymentModal(true)} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">Procesar Venta</button>
              <button onClick={clearCart} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Limpiar Carrito</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart button para móvil */}
      <button
        className="md:hidden fixed bottom-5 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg flex items-center space-x-2"
        onClick={() => setMobileCartOpen(true)}
        aria-label="Abrir carrito"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-sm font-medium">{cart.length}</span>
      </button>

      {/* Mobile Cart Drawer */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setMobileCartOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-lg p-4 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Carrito</h3>
              <button onClick={() => setMobileCartOpen(false)} className="text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">El carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{item.productName}</h4>
                        <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={product ? item.quantity >= product.stock : false} className="w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            <label className="block">P. unit.</label>
                            <input type="number" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" value={item.unitPrice} onChange={(e) => updateUnitPrice(item.productId, Number(e.target.value || 0))} min={0} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile summary */}
            {cart.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 items-center text-sm">
                  <label className="text-xs text-gray-600">Cliente</label>
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="">Venta sin cliente</option>
                    {storeCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </select>

                  <label className="text-xs text-gray-600">Descuento</label>
                  <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />

                  <label className="text-xs text-gray-600">Envío</label>
                  <input type="number" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value || 0))} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                </div>

                <div className="space-y-1 pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 && (<div className="flex justify-between text-sm text-green-600"><span>Descuento:</span><span>-{formatCurrency(discount)}</span></div>)}
                  {shippingCost > 0 && (<div className="flex justify-between text-sm"><span>Envío:</span><span>{formatCurrency(shippingCost)}</span></div>)}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span>Total:</span><span>{formatCurrency(finalTotal)}</span></div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => { setShowPaymentModal(true); setMobileCartOpen(false); }} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">Procesar Venta</button>
                  <button onClick={() => { clearCart(); setMobileCartOpen(false); }} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Limpiar Carrito</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Procesar Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select value={selectedPaymentMethod.id} onChange={(e) => {
                  const method = paymentMethods.find(m => m.id === e.target.value);
                  if (method) setSelectedPaymentMethod(method);
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {paymentMethods.filter(m => m.isActive).map(method => <option key={method.id} value={method.id}>{method.name} {method.discountPercentage > 0 && `(-${method.discountPercentage}%)`}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto recibido</label>
                <input
                  type="text"
                  value={textAmountReceived}
                  onChange={(e) => setTextAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="¿Cuánto paga el cliente?"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm"><span>Total a cobrar al cliente:</span><span className="font-semibold">{formatCurrency(finalTotal)}</span></div>

                {/* Si aplica descuento por método lo mostramos en modal, pero NO lo imprimimos */}
                {selectedPaymentMethod?.discountPercentage > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-orange-600"><span>Deducción {selectedPaymentMethod.name}:</span><span>-{formatCurrency(paymentDeduction)}</span></div>
                    {/* No se muestra "Total Neto" en la impresión, pero sí en el modal para control */}
                    <div className="flex justify-between text-sm font-medium text-green-600 pt-2 border-t border-gray-200"><span>Total neto para la tienda:</span><span>{formatCurrency(netTotal)}</span></div>
                  </>
                )}

                {(textAmountReceived !== '' && amountReceived >= finalTotal) && (
                  <div className="flex justify-between text-sm text-green-700 pt-2 border-t border-gray-200"><span>Cambio a devolver:</span><span>{formatCurrency(amountReceived - finalTotal)}</span></div>
                )}
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button onClick={handleConfirmPayment} disabled={processingPayment || textAmountReceived === '' || amountReceived < finalTotal} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                  {processingPayment ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt & Print Modal (vista previa en pantalla) */}
      {showReceiptModal && lastSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-[320px] p-4 text-sm font-mono" id="receipt">
            {activeReceiptTemplate?.headerText && (<div className="text-center font-bold mb-2 whitespace-pre-line">{activeReceiptTemplate.headerText}</div>)}
            {activeReceiptTemplate?.showDate && (<div>Fecha: {new Date(lastSaleData.date).toLocaleString()}</div>)}
            {activeReceiptTemplate?.showInvoiceNumber && (<div>Factura: {lastSaleData.invoiceNumber}</div>)}
            {activeReceiptTemplate?.showEmployee && (<div>Empleado: {user?.username}</div>)}
            {activeReceiptTemplate?.showCustomer && (<div>Cliente: {lastSaleData.customerId ? storeCustomers.find(c => c.id === lastSaleData.customerId)?.name : 'Venta rápida'}</div>)}
            {activeReceiptTemplate?.showPaymentMethod && (<div>Método de Pago: {lastSaleData.paymentMethod}</div>)}

            <hr className="my-2" />

            {activeReceiptTemplate?.showItemDetails && lastSaleData.items.map(item => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.productName} x{item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}

            <hr className="my-2" />

            {activeReceiptTemplate?.showTotals && (
              <>
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastSaleData.subtotal)}</span></div>
                {lastSaleData.discount > 0 && (<div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(lastSaleData.discount)}</span></div>)}
                {lastSaleData.shippingCost > 0 && (<div className="flex justify-between"><span>Envío:</span><span>{formatCurrency(lastSaleData.shippingCost)}</span></div>)}
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(lastSaleData.total)}</span></div>
                <div className="flex justify-between"><span>Pagó:</span><span>{formatCurrency(amountReceived)}</span></div>
                <div className="flex justify-between"><span>Cambio:</span><span>{formatCurrency(amountReceived - lastSaleData.total)}</span></div>

                {/* --------
                   IMPORTANTE: aquí OMITIMOS la línea "Desc. Tarjeta Crédito" y "Total Neto" según tu petición.
                   Si quieres eliminarlos definitivamente de la plantilla global, lo hacemos en la página de plantillas.
                -------- */}
              </>
            )}

            <hr className="my-2" />

            {activeReceiptTemplate?.footerText && (<div className="text-center text-xs whitespace-pre-line">{activeReceiptTemplate.footerText}</div>)}

            <button onClick={handlePrintReceipt} className="w-full bg-blue-600 text-white py-2 mt-3 rounded-lg hover:bg-blue-700">Imprimir recibo</button>
            <button onClick={() => { setShowReceiptModal(false); setLastSaleData(null); }} className="w-full bg-gray-200 text-gray-700 py-2 mt-2 rounded-lg hover:bg-gray-300">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
