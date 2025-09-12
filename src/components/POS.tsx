import React, { useState, useEffect } from 'react';
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
  Edit3,
  User,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  Percent,
  DollarSign
} from 'lucide-react';

export function POS() {
  const { products, paymentMethods, addSale, customers, getActiveReceiptTemplate } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  // Estados para pago/impresión
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<Sale | null>(null);
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);

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

  // Detectar si es dispositivo móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      // En móvil, colapsar el carrito por defecto
      if (window.innerWidth < 1024) {
        setIsCartExpanded(false);
      } else {
        setIsCartExpanded(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Establecer el estado inicial
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar vista desde localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('posViewMode');
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      setViewMode(savedViewMode);
    }
  }, []);

  // Guardar vista en localStorage
  const toggleViewMode = () => {
    const newViewMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newViewMode);
    localStorage.setItem('posViewMode', newViewMode);
  };

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

  // Nueva función para actualizar precio unitario
  const updateUnitPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, unitPrice: newPrice, total: item.quantity * newPrice }
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
    setShowAdditionalOptions(false);
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
    <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3">
        <LocalImage
          src={product.imageUrl}
          alt={product.name}
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {product.category}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-lg font-bold text-green-600">
              {formatCurrency(product.price)}
            </span>
            <span className="text-xs sm:text-sm text-gray-500">
              {product.stock} und.
            </span>
          </div>
          <button
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
          >
            {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  );

  const ProductGridCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <LocalImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-32 object-cover rounded-lg mb-3"
      />
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
        <p className="text-xs text-gray-500 truncate">{product.category}</p>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-green-600">{formatCurrency(product.price)}</span>
          <span className="text-xs text-gray-500">{product.stock} und.</span>
        </div>
        <button
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-xs"
        >
          {product.stock === 0 ? 'Sin Stock' : 'Agregar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 overflow-hidden">
      {/* Products Section */}
      <div className={`${isMobile ? (isCartExpanded ? 'hidden' : 'flex-1') : 'flex-1 lg:w-1/2'} p-3 sm:p-6 overflow-auto`}>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Punto de Venta</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleViewMode}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista lista"
              >
                <List className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={toggleViewMode}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista cuadrícula"
              >
                <Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Buscar productos por nombre, SKU o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <ProductGridCard key={product.id} product={product} />
            ))}
          </div>
        )}
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Cart Section - Mobile Toggle Button */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-4 right-4 z-30">
          <button
            onClick={() => setIsCartExpanded(!isCartExpanded)}
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Cart Section */}
      <div className={`
        ${isMobile 
          ? `fixed inset-0 bg-white z-40 transform transition-transform duration-300 ${isCartExpanded ? 'translate-y-0' : 'translate-y-full'} overflow-y-auto` 
          : 'w-full lg:w-1/2 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[50vh] lg:max-h-none'
        }
      `}>
        {/* Cart Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Carrito</h2>
            {cart.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                {cart.length}
              </span>
            )}
          </div>
          
          {isMobile && (
            <button 
              onClick={() => setIsCartExpanded(false)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {cart.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">El carrito está vacío</p>
              {isMobile && (
                <button
                  onClick={() => setIsCartExpanded(false)}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Continuar comprando
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {item.productName}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatCurrency(item.unitPrice)} c/u
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 rounded-md bg-gray-200 hover:bg-gray-300"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="text-sm sm:text-base font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={product && item.quantity >= product.stock}
                          className="p-1 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-bold text-green-600">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Editar precio unitario */}
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Precio:</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateUnitPrice(item.productId, Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                        min="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 sm:p-6 space-y-4 flex-shrink-0">
            {/* Botón para mostrar/ocultar opciones adicionales */}
            <button
              onClick={() => setShowAdditionalOptions(!showAdditionalOptions)}
              className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-medium">Opciones adicionales</span>
              {showAdditionalOptions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Opciones adicionales (cliente, descuento, envío) */}
            {showAdditionalOptions && (
              <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                {/* Selección de cliente */}
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Cliente general</option>
                    {storeCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descuento */}
                <div className="flex items-center space-x-2">
                  <Percent className="w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    placeholder="Descuento"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                </div>

                {/* Costo de envío */}
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    placeholder="Costo de envío"
                    value={shippingCost || ''}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Resumen de compra */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>+{formatCurrency(shippingCost)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-2 mt-1">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Proceder al pago
              </button>
              
              <button
                onClick={clearCart}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                Limpiar carrito
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Procesar Pago</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Método de pago</label>
                <select
                  value={selectedPaymentMethod.name}
                  onChange={(e) => setSelectedPaymentMethod(paymentMethods.find(pm => pm.name === e.target.value) || paymentMethods[0])}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {paymentMethods.map(method => (
                    <option key={method.name} value={method.name}>
                      {method.name} ({method.discountPercentage}% desc.)
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Monto recibido</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
                    placeholder="0"
                    min={finalTotal}
                  />
                </div>
              </div>
              
              {amountReceived && Number(amountReceived) > 0 && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Cambio a devolver:</span>
                    <span className="font-medium">
                      {formatCurrency(Math.max(0, Number(amountReceived) - finalTotal))}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!amountReceived || Number(amountReceived) < finalTotal}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Recibo de Venta</h3>
            
            <div id="receipt" className="bg-white p-4 border border-dashed border-gray-300 mb-4">
              <div className="text-center mb-4">
                <h2 className="font-bold text-lg">{currentStore?.name}</h2>
                <p className="text-sm">{currentStore?.address}</p>
                <p className="text-sm">Tel: {currentStore?.phone}</p>
                <p className="text-xs mt-2">NIT: {currentStore?.nit}</p>
              </div>
              
              <div className="border-t border-b border-gray-300 py-2 my-2 text-xs">
                <div className="flex justify-between">
                  <span>Factura:</span>
                  <span>{lastSaleData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{lastSaleData.date.toLocaleDateString()} {lastSaleData.date.toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendedor:</span>
                  <span>{user.name}</span>
                </div>
              </div>
              
              <div className="my-3 text-xs">
                <div className="font-bold border-b border-gray-300 pb-1 mb-1">Productos</div>
                {lastSaleData.items.map(item => (
                  <div key={item.productId} className="flex justify-between py-1">
                    <span>{item.productName} x{item.quantity}</span>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-300 pt-2 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastSaleData.subtotal)}</span>
                </div>
                {lastSaleData.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(lastSaleData.discount)}</span>
                  </div>
                )}
                {lastSaleData.shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span>Envío:</span>
                    <span>+{formatCurrency(lastSaleData.shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-300 mt-1 pt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastSaleData.total)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Pagado con:</span>
                  <span>{lastSaleData.paymentMethod}</span>
                </div>
                {lastSaleData.paymentMethodDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Descuento por pago:</span>
                    <span>{lastSaleData.paymentMethodDiscount}%</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-300 mt-1 pt-1">
                  <span>NETO:</span>
                  <span>{formatCurrency(lastSaleData.netTotal)}</span>
                </div>
              </div>
              
              <div className="text-center mt-4 text-xs">
                <p>¡Gracias por su compra!</p>
                <p className="mt-2">Vuelva pronto</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Imprimir y finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}