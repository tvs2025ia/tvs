import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { BulkSalesUpload } from './BulkSalesUpload';
import { Sale, SaleItem } from '../types';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Package,
  DollarSign,
  FileText,
  Download,
  X,
  ShoppingCart,
  Clock,
  Upload,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react';

export function Sales() {
  const { sales, users, customers, getActiveReceiptTemplate, updateSale, deleteSale, paymentMethods } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const activeReceiptTemplate = getActiveReceiptTemplate(currentStore?.id || '11111111-1111-1111-1111-111111111111');
  const isAdmin = user?.role === 'admin';

  const storeSales = sales.filter(s => s.storeId === currentStore?.id);
  
  // Get available years from sales data
  const availableYears = [...new Set(storeSales.map(s => new Date(s.date).getFullYear()))]
    .sort((a, b) => b - a);

  const months = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' }
  ];

  const filteredSales = storeSales.filter(sale => {
    const saleDate = new Date(sale.date);
    const saleYear = saleDate.getFullYear();
    const saleMonth = saleDate.getMonth();
    
    const matchesSearch = sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYear === '' || saleYear.toString() === selectedYear;
    const matchesMonth = selectedMonth === '' || saleMonth.toString() === selectedMonth;
    
    return matchesSearch && matchesYear && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = users.find(u => u.id === employeeId);
    return employee?.username || 'Usuario desconocido';
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return 'Venta rápida';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Cliente desconocido';
  };

  const getTotalsByPeriod = () => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    return { totalSales, totalRevenue, totalItems };
  };

  const { totalSales, totalRevenue, totalItems } = getTotalsByPeriod();

  // Estilos de impresión para recibo térmico
  useEffect(() => {
    const style = document.createElement('style');
    const template = activeReceiptTemplate;
    const width = template?.thermalWidth || 58;
    const fontSize = template?.fontSize || 11;

    style.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #sales-receipt, #sales-receipt * { visibility: visible !important; }
        #sales-receipt {
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

  const handlePrintReceipt = (sale: Sale) => {
    setPrintingSale(sale);
    setShowReceiptModal(true);
  };

  const printThermalReceipt = () => {
    window.print();
    setShowReceiptModal(false);
    setPrintingSale(null);
  };

  const handleBulkUploadSuccess = (newSales: Sale[]) => {
    setShowBulkUpload(false);
    // Sales are already added to the context, no need to do anything else
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar la venta ${sale.invoiceNumber}?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        await deleteSale(sale.id);
        alert('Venta eliminada exitosamente');
      } catch (error) {
        alert('Error al eliminar la venta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      }
    }
  };

  const SaleDetailModal = ({ sale, onClose }: {
    sale: Sale;
    onClose: () => void;
  }) => {
    const employee = users.find(u => u.id === sale.employeeId);
    const customer = customers.find(c => c.id === sale.customerId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Factura {sale.invoiceNumber}</h3>
                <p className="text-gray-600">Venta #{sale.id}</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Sale Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Información de la Venta</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium">{new Date(sale.date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vendedor:</span>
                    <span className="font-medium">{employee?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{customer?.name || 'Venta rápida'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método de Pago:</span>
                    <span className="font-medium">{sale.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Información de Pago</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(sale.discount)}</span>
                    </div>
                  )}
                  {sale.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío:</span>
                      <span className="font-medium">{formatCurrency(sale.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                    <span>Total:</span>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>
                  {sale.paymentMethodDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-orange-600 text-sm">
                        <span>Deducción {sale.paymentMethod} ({sale.paymentMethodDiscount}%):</span>
                        <span>-{formatCurrency(sale.total * (sale.paymentMethodDiscount / 100))}</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Total Neto:</span>
                        <span>{formatCurrency(sale.netTotal)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Productos Vendidos</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Producto</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Cantidad</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Precio Unit.</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sale.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handlePrintReceipt(sale);
                  onClose();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Recibo Térmico</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Imprimir Detalle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditSaleModal = ({ sale, onClose, onSave }: {
    sale: Sale;
    onClose: () => void;
    onSave: (sale: Sale) => void;
  }) => {
    const [formData, setFormData] = useState({
      invoiceNumber: sale.invoiceNumber,
      customerId: sale.customerId || '',
      employeeId: sale.employeeId,
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discount,
      shippingCost: sale.shippingCost,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      date: sale.date.toISOString().split('T')[0],
      time: sale.date.toTimeString().split(' ')[0].substring(0, 5)
    });

    const [editingItems, setEditingItems] = useState<SaleItem[]>([...sale.items]);

    const recalculateTotals = () => {
      const itemsTotal = editingItems.reduce((sum, item) => sum + item.total, 0);
      const subtotal = itemsTotal;
      const total = subtotal - formData.discount + formData.shippingCost;

      const selectedPaymentMethod = paymentMethods.find(pm => pm.name === formData.paymentMethod);
      const paymentMethodDiscount = selectedPaymentMethod ? selectedPaymentMethod.discountPercentage : 0;
      const paymentDeduction = total * (paymentMethodDiscount / 100);
      const netTotal = total - paymentDeduction;

      setFormData(prev => ({
        ...prev,
        subtotal,
        total
      }));

      return { subtotal, total, netTotal, paymentMethodDiscount };
    };

    useEffect(() => {
      recalculateTotals();
    }, [editingItems, formData.discount, formData.shippingCost, formData.paymentMethod]);

    const addItem = () => {
      const newItem: SaleItem = {
        productId: crypto.randomUUID(),
        productName: 'Nuevo Producto',
        quantity: 1,
        unitPrice: 0,
        total: 0
      };
      setEditingItems(prev => [...prev, newItem]);
    };

    const updateItem = (index: number, field: keyof SaleItem, value: any) => {
      setEditingItems(prev => prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }));
    };

    const removeItem = (index: number) => {
      setEditingItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.invoiceNumber || editingItems.length === 0) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      const { total, netTotal, paymentMethodDiscount } = recalculateTotals();

      const fullDateString = `${formData.date}T${formData.time}:00`;
      const saleDate = new Date(fullDateString);

      const updatedSale: Sale = {
        ...sale,
        invoiceNumber: formData.invoiceNumber,
        customerId: formData.customerId || undefined,
        employeeId: formData.employeeId,
        items: editingItems,
        subtotal: formData.subtotal,
        discount: formData.discount,
        shippingCost: formData.shippingCost,
        total,
        netTotal,
        paymentMethod: formData.paymentMethod,
        paymentMethodDiscount,
        date: saleDate
      };

      onSave(updatedSale);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Editar Venta</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura *
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Venta rápida</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empleado *
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {paymentMethods.filter(pm => pm.isActive).map(method => (
                      <option key={method.id} value={method.name}>{method.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Productos</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Producto</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Cantidad</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Precio Unit.</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editingItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => updateItem(index, 'productName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descuento
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de Envío
                  </label>
                  <input
                    type="number"
                    value={formData.shippingCost}
                    onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="flex items-end">
                  <div className="w-full text-right">
                    <p className="text-sm text-gray-600">Subtotal: {formatCurrency(formData.subtotal)}</p>
                    <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(formData.total)}</p>
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
                  Actualizar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Ventas</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        <div className="flex space-x-3">
          {isAdmin && (
            <button
              onClick={() => setShowBulkUpload(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-5 h-5" />
              <span>Carga Masiva</span>
            </button>
          )}
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <ShoppingCart className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Productos Vendidos</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número de factura o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los meses</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedYear(new Date().getFullYear().toString());
              setSelectedMonth('');
            }}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sale.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">#{sale.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{getCustomerName(sale.customerId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getEmployeeName(sale.employeeId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <span className="font-medium">{sale.items.length}</span> productos
                    </div>
                    <div className="text-xs text-gray-500">
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</div>
                    {sale.paymentMethodDiscount > 0 && (
                      <div className="text-xs text-green-600">
                        Neto: {formatCurrency(sale.netTotal)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <div>
                        <div>{new Date(sale.date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(sale.date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(sale)}
                        className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Recibo</span>
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setEditingSale(sale)}
                            className="text-orange-600 hover:text-orange-900 flex items-center space-x-1"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron ventas</p>
            <p className="text-gray-400 text-sm mt-2">
              Ajusta los filtros o realiza algunas ventas para ver los registros
            </p>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
        />
      )}

      {/* Thermal Receipt Modal */}
      {showReceiptModal && printingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-[320px] p-4 text-sm font-mono" id="sales-receipt">
            {/* Header */}
            {activeReceiptTemplate?.headerText && (
              <div className="text-center font-bold mb-2 whitespace-pre-line">
                {activeReceiptTemplate.headerText}
              </div>
            )}

            {/* Date */}
            {activeReceiptTemplate?.showDate && (
              <div>Fecha: {new Date(printingSale.date).toLocaleString()}</div>
            )}

            {/* Invoice Number */}
            {activeReceiptTemplate?.showInvoiceNumber && (
              <div>Factura: {printingSale.invoiceNumber}</div>
            )}

            {/* Employee */}
            {activeReceiptTemplate?.showEmployee && (
              <div>Empleado: {getEmployeeName(printingSale.employeeId)}</div>
            )}

            {/* Customer */}
            {activeReceiptTemplate?.showCustomer && (
              <div>Cliente: {getCustomerName(printingSale.customerId)}</div>
            )}

            {/* Payment Method */}
            {activeReceiptTemplate?.showPaymentMethod && (
              <div>Método de Pago: {printingSale.paymentMethod}</div>
            )}

            <hr className="my-2" />

            {/* Item Details */}
            {activeReceiptTemplate?.showItemDetails && printingSale.items.map(item => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.productName} x{item.quantity}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}

            <hr className="my-2" />

            {/* Totals */}
            {activeReceiptTemplate?.showTotals && (
              <>
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(printingSale.subtotal)}</span></div>
                {printingSale.discount > 0 && (
                  <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(printingSale.discount)}</span></div>
                )}
                {printingSale.shippingCost > 0 && (
                  <div className="flex justify-between"><span>Envío:</span><span>{formatCurrency(printingSale.shippingCost)}</span></div>
                )}
                <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(printingSale.total)}</span></div>
                {printingSale.paymentMethodDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Desc. {printingSale.paymentMethod}:</span>
                      <span>-{formatCurrency(printingSale.total * (printingSale.paymentMethodDiscount / 100))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Total Neto:</span>
                      <span>{formatCurrency(printingSale.netTotal)}</span>
                    </div>
                  </>
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

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setPrintingSale(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={printThermalReceipt}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && isAdmin && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSave={async (updatedSale) => {
            try {
              await updateSale(updatedSale);
              setEditingSale(null);
              alert('Venta actualizada exitosamente');
            } catch (error) {
              alert('Error al actualizar la venta: ' + (error instanceof Error ? error.message : 'Error desconocido'));
            }
          }}
        />
      )}

      {/* Bulk Sales Upload Modal */}
      {showBulkUpload && isAdmin && (
        <BulkSalesUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
}
