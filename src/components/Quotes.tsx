import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { Product, SaleItem, Quote, Customer } from '../types';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar,
  User,
  DollarSign,
  Eye,
  Edit3,
  Check,
  X,
  Clock,
  AlertCircle,
  Package,
  Truck,
  Minus
} from 'lucide-react';

// --- NUEVO: estilos impresión ---
const usePrintStyles = () => {
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #quote-print, #quote-print * { visibility: visible !important; }
        #quote-print { position: absolute; left: 0; top: 0; width: 90vw !important; background: white; font-size: 13px; line-height: 1.4; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
};

export function Quotes() {
  usePrintStyles(); // --- Aplica estilos impresión ---

  const { products, quotes, customers, addQuote, updateQuote } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const storeProducts = products.filter(p => p.storeId === currentStore?.id);
  const storeCustomers = customers.filter(c => c.storeId === currentStore?.id);
  const storeQuotes = quotes.filter(q => q.storeId === currentStore?.id);
  
  const filteredQuotes = storeQuotes.filter(quote => {
    const customer = storeCustomers.find(c => c.id === quote.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  // MODAL CREAR/EDITAR
  const CreateQuoteModal = ({ onClose, onSave, quote }: {
    onClose: () => void;
    onSave: (quote: Quote) => void;
    quote?: Quote;
  }) => {
    // Si es edición, precarga datos
    const [selectedCustomerId, setSelectedCustomerId] = useState(quote?.customerId || '');
    const [cart, setCart] = useState<SaleItem[]>(quote?.items || []);
    const [discount, setDiscount] = useState(quote?.discount || 0);
    const [shippingCost, setShippingCost] = useState(quote?.shippingCost || 0);
    const [validDays, setValidDays] = useState(
      quote ? Math.max(1, Math.ceil((new Date(quote.validUntil).getTime() - new Date().getTime()) / (24 * 3600 * 1000))) : 30
    );
    const [selectedProduct, setSelectedProduct] = useState('');
    // NUEVO: estado para precio personalizado
    const [customPrice, setCustomPrice] = useState<number | ''>('');

    useEffect(() => {
      // Cuando selecciona producto, precarga el precio
      if (selectedProduct) {
        const prod = storeProducts.find(p => p.id === selectedProduct);
        setCustomPrice(prod ? prod.price : '');
      } else {
        setCustomPrice('');
      }
    }, [selectedProduct]);

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - discount + shippingCost;

    // MODIFICADO: permite precio personalizado
    const addToCart = (productId: string) => {
      const product = storeProducts.find(p => p.id === productId);
      if (!product || customPrice === '' || Number(customPrice) <= 0) return;

      const price = Number(customPrice);
      const existingItem = cart.find(item => item.productId === productId);
      if (existingItem) {
        setCart(prev => prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1, unitPrice: price, total: (item.quantity + 1) * price }
            : item
        ));
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: price,
          total: price
        };
        setCart(prev => [...prev, newItem]);
      }
      setSelectedProduct('');
      setCustomPrice('');
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setCart(prev => prev.filter(item => item.productId !== productId));
        return;
      }
      setCart(prev => prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
          : item
      ));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCustomerId || cart.length === 0) {
        alert('Selecciona un cliente y agrega productos');
        return;
      }
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const newQuote: Quote = {
        id: quote?.id || Date.now().toString(),
        storeId: quote?.storeId || currentStore?.id || '1',
        customerId: selectedCustomerId,
        items: cart,
        subtotal,
        discount,
        shippingCost,
        total,
        validUntil,
        status: quote?.status || 'pending',
        createdAt: quote?.createdAt || new Date(),
        employeeId: quote?.employeeId || user?.id || '1'
      };

      onSave(newQuote);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">{quote ? 'Editar Cotización' : 'Nueva Cotización'}</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {storeCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válida por (días)
                  </label>
                  <input
                    type="number"
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="365"
                  />
                </div>
              </div>
              {/* Add Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agregar Producto
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar producto</option>
                    {storeProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                  {/* NUEVO: campo para editar precio */}
                  {selectedProduct && (
                    <input
                      type="number"
                      value={customPrice}
                      min="1"
                      onChange={e => setCustomPrice(Number(e.target.value))}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Precio"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => selectedProduct && addToCart(selectedProduct)}
                    disabled={!selectedProduct || customPrice === '' || Number(customPrice) <= 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Cart Items */}
              {cart.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <span className="ml-4 font-semibold text-gray-900 min-w-[80px] text-right">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descuento
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Envío
                  </label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-lg text-green-600">
                      {formatCurrency(total)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {quote ? 'Actualizar Cotización' : 'Crear Cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // MODAL VER
  const ViewQuoteModal = ({ quote, onClose }: {
    quote: Quote;
    onClose: () => void;
  }) => {
    const customer = storeCustomers.find(c => c.id === quote.customerId);
    const isExpired = new Date() > new Date(quote.validUntil);

    const updateStatus = (newStatus: Quote['status']) => {
      updateQuote({ ...quote, status: newStatus });
      onClose();
    };

    // --- imprimir cotización ---
    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto" id="quote-print">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Cotización #{quote.id}</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 no-print">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              {/* Info Cotización */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">{customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                    {getStatusText(quote.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de Creación</p>
                  <p className="font-medium text-gray-900">{new Date(quote.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Válida Hasta</p>
                  <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {new Date(quote.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {/* Productos */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {quote.items.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Totales */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(quote.discount)}</span>
                  </div>
                )}
                {quote.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Envío:</span>
                    <span>{formatCurrency(quote.shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
              {/* BOTÓN IMPRIMIR */}
              <button
                onClick={handlePrint}
                className="w-full bg-blue-600 text-white py-2 mt-4 rounded-lg hover:bg-blue-700 transition-colors no-print"
              >
                Imprimir Cotización
              </button>
              {/* Acciones aceptar/rechazar */}
              {quote.status === 'pending' && !isExpired && (
                <div className="flex space-x-3 no-print">
                  <button
                    onClick={() => updateStatus('accepted')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aceptar</span>
                  </button>
                  <button
                    onClick={() => updateStatus('rejected')}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // TABLA COTIZACIONES
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Cotización</span>
        </button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{storeQuotes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {storeQuotes.filter(q => q.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Check className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Aceptadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {storeQuotes.filter(q => q.status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(storeQuotes.reduce((sum, q) => sum + q.total, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar cotizaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="accepted">Aceptadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="expired">Expiradas</option>
          </select>
        </div>
      </div>
      {/* Quotes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cotización
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Válida Hasta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map(quote => {
                const customer = storeCustomers.find(c => c.id === quote.customerId);
                const isExpired = new Date() > new Date(quote.validUntil);
                return (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{quote.id}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{customer?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(quote.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(isExpired && quote.status === 'pending' ? 'expired' : quote.status)}`}>
                        {getStatusText(isExpired && quote.status === 'pending' ? 'expired' : quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className={isExpired ? 'text-red-600' : ''}>
                        {new Date(quote.validUntil).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setViewingQuote(quote)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* --- Botón editar para TODOS los usuarios --- */}
                      <button
                        onClick={() => setEditingQuote(quote)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredQuotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron cotizaciones</p>
          </div>
        )}
      </div>
      {/* Modals */}
      {showCreateModal && (
        <CreateQuoteModal
          onClose={() => setShowCreateModal(false)}
          onSave={(quote) => addQuote(quote)}
        />
      )}
      {editingQuote && (
        <CreateQuoteModal
          quote={editingQuote}
          onClose={() => setEditingQuote(null)}
          onSave={(quote) => updateQuote(quote)}
        />
      )}
      {viewingQuote && (
        <ViewQuoteModal
          quote={viewingQuote}
          onClose={() => setViewingQuote(null)}
        />
      )}
    </div>
  );
}
