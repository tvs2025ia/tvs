import React, { useState } from 'react';
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
  Package
} from 'lucide-react';

export function POS() {
  const { products, paymentMethods, addSale, customers, getActiveReceiptTemplate } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // NUEVO: Estados para pago/impresión
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<Sale | null>(null);

  const storeProducts = products.filter(p => p.storeId === currentStore?.id);
  const storeCustomers = customers ? customers.filter(c => c.storeId === currentStore?.id) : [];
  const activeReceiptTemplate = getActiveReceiptTemplate(currentStore?.id || '1');
  const filteredProducts = storeProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalWithDiscount = subtotal - discount;
  const finalTotal = totalWithDiscount + shippingCost;
  const paymentDeduction = finalTotal * (selectedPaymentMethod.discountPercentage / 100);
  const netTotal = finalTotal - paymentDeduction;
  const invoiceNumber = `INV-${Date.now()}`;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(prev => prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        ));
      }
    } else {
      if (product.stock > 0) {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          total: product.price
        };
        setCart(prev => [...prev, newItem]);
      }
    }
  };

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
    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setShippingCost(0);
    setSelectedCustomerId('');
    setAmountReceived('');
    setLastSaleData(null);
  };

  // Procesa venta, pero solo después de imprimir recibo
  const processSale = async (sale: Sale) => {
    setProcessingPayment(true);
    try {
      addSale(sale);
      clearCart();
      setShowPaymentModal(false);
      setShowReceiptModal(false);
      alert(`Venta procesada exitosamente!\nFactura: ${sale.invoiceNumber}\nTotal: ${formatCurrency(sale.total)}`);
    } catch (error) {
      alert('Error al procesar la venta');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Modal recibo/imprimir
  const handleConfirmPayment = () => {
    if (!amountReceived || Number(amountReceived) < finalTotal) {
      alert('El monto recibido debe ser igual o mayor al total.');
      return;
    }
    // Prepara datos para recibo
    const sale: Sale = {
      id: crypto.randomUUID(),
      storeId: currentStore.id,
      employeeId: user.id,
      items: cart,
      subtotal,
      discount,
      shippingCost,
      total: finalTotal,
      netTotal,
      paymentMethod: selectedPaymentMethod.name,
      paymentMethodDiscount: selectedPaymentMethod.discountPercentage,
      date: new Date(),
      invoiceNumber,
      customerId: selectedCustomerId || undefined
    };
    setLastSaleData(sale);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
    // Espera a que el usuario imprima antes de registrar venta
    if (lastSaleData) processSale(lastSaleData);
  };

  // Estilos de impresión para recibo térmico
  React.useEffect(() => {
    const style = document.createElement('style');
    const template = activeReceiptTemplate;
    const width = template?.thermalWidth || 58;
    const fontSize = template?.fontSize || 11;

    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #receipt, #receipt * { visibility: visible !important; }
        #receipt {
          position: absolute;
          left: 0;
          top: 0;
          width: ${width}mm !important;
          font-size: ${fontSize}px;
          line-height: 1.2;
          background: white;
          padding: 5px;
        }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [activeReceiptTemplate]);

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <LocalImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-32 object-cover rounded-lg mb-3"
      />
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
        <p className="text-sm text-gray-500">{product.category}</p>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
          <span className="text-sm text-gray-500">{product.stock} unidades</span>
        </div>
        <button
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Products Section */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Punto de Venta</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos por nombre, SKU o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Carrito</h2>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                {cart.length}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">{item.productName}</h4>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={product ? item.quantity >= product.stock : false}
                          className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Venta sin cliente</option>
                {storeCustomers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Descuento"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-sm text-gray-500">COP</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-gray-400" />
              <input
                type="number"
                placeholder="Costo de envío"
                value={shippingCost || ''}
                onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-sm text-gray-500">COP</span>
            </div>
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Envío:</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Procesar Venta
              </button>
              <button
                onClick={clearCart}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpiar Carrito
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Procesar Pago</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={selectedPaymentMethod.id}
                  onChange={(e) => {
                    const method = paymentMethods.find(m => m.id === e.target.value);
                    if (method) setSelectedPaymentMethod(method);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {paymentMethods.filter(m => m.isActive).map(method => (
                    <option key={method.id} value={method.id}>
                      {method.name} {method.discountPercentage > 0 && `(-${method.discountPercentage}%)`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto recibido</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={e => setAmountReceived(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={finalTotal}
                  placeholder="¿Cuánto paga el cliente?"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total a cobrar al cliente:</span>
                  <span className="font-semibold">{formatCurrency(finalTotal)}</span>
                </div>
                {selectedPaymentMethod.discountPercentage > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Deducción {selectedPaymentMethod.name}:</span>
                      <span>-{formatCurrency(paymentDeduction)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-green-600 pt-2 border-t border-gray-200">
                      <span>Total neto para la tienda:</span>
                      <span>{formatCurrency(netTotal)}</span>
                    </div>
                  </>
                )}
                {(amountReceived !== '' && Number(amountReceived) >= finalTotal) && (
                  <div className="flex justify-between text-sm text-green-700 pt-2 border-t border-gray-200">
                    <span>Cambio a devolver:</span>
                    <span>{formatCurrency(Number(amountReceived) - finalTotal)}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={processingPayment || amountReceived === '' || Number(amountReceived) < finalTotal}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt & Print Modal */}
      {showReceiptModal && lastSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-[320px] p-4 text-sm font-mono" id="receipt">
            {/* Header */}
            {activeReceiptTemplate?.headerText && (
              <div className="text-center font-bold mb-2 whitespace-pre-line">
                {activeReceiptTemplate.headerText}
              </div>
            )}

            {/* Date */}
            {activeReceiptTemplate?.showDate && (
              <div>Fecha: {new Date(lastSaleData.date).toLocaleString()}</div>
            )}

            {/* Invoice Number */}
            {activeReceiptTemplate?.showInvoiceNumber && (
              <div>Factura: {lastSaleData.invoiceNumber}</div>
            )}

            {/* Employee */}
            {activeReceiptTemplate?.showEmployee && (
              <div>Empleado: {user?.username}</div>
            )}

            {/* Customer */}
            {activeReceiptTemplate?.showCustomer && (
              <div>Cliente: {lastSaleData.customerId ? storeCustomers.find(c => c.id === lastSaleData.customerId)?.name : 'Venta rápida'}</div>
            )}

            {/* Payment Method */}
            {activeReceiptTemplate?.showPaymentMethod && (
              <div>Método de Pago: {lastSaleData.paymentMethod}</div>
            )}

            <hr className="my-2" />

            {/* Item Details */}
            {activeReceiptTemplate?.showItemDetails && lastSaleData.items.map(item => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.productName} x{item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}

            <hr className="my-2" />

            {/* Totals */}
            {activeReceiptTemplate?.showTotals && (
              <>
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(lastSaleData.subtotal)}</span></div>
                {lastSaleData.discount > 0 && (
                  <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(lastSaleData.discount)}</span></div>
                )}
                {lastSaleData.shippingCost > 0 && (
                  <div className="flex justify-between"><span>Envío:</span><span>{formatCurrency(lastSaleData.shippingCost)}</span></div>
                )}
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(lastSaleData.total)}</span></div>
                <div className="flex justify-between"><span>Pagó:</span><span>{formatCurrency(Number(amountReceived))}</span></div>
                <div className="flex justify-between"><span>Cambio:</span><span>{formatCurrency(Number(amountReceived) - lastSaleData.total)}</span></div>
                {lastSaleData.paymentMethodDiscount > 0 && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Desc. {lastSaleData.paymentMethod}:</span>
                    <span>-{formatCurrency(lastSaleData.total * (lastSaleData.paymentMethodDiscount / 100))}</span>
                  </div>
                )}
                {lastSaleData.netTotal !== lastSaleData.total && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Total Neto:</span>
                    <span>{formatCurrency(lastSaleData.netTotal)}</span>
                  </div>
                )}
              </>
            )}

            <hr className="my-2" />

            {/* Footer */}
            {activeReceiptTemplate?.footerText && (
              <div className="text-center text-xs whitespace-pre-line">
                {activeReceiptTemplate.footerText}
              </div>
            )}

            <button
              onClick={handlePrintReceipt}
              className="w-full bg-blue-600 text-white py-2 mt-4 rounded-lg hover:bg-blue-700"
            >
              Imprimir recibo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
