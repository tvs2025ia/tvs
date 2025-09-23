import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { 
  Search, 
  DollarSign, 
  Calendar,
  TrendingUp,
  ShoppingCart,
  CreditCard
} from 'lucide-react';

export function Incomes() {
  const { 
    sales,
    cashMovements = []
  } = useData();
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Calcular ingresos por ventas directas (desde sales)
  const salesIncomes = sales
    .filter(s => s.storeId === currentStore?.id)
    .map(s => ({
      id: `sale-${s.id}`,
      storeId: s.storeId,
      description: `Venta ${s.invoiceNumber}`,
      amount: s.total,
      category: 'Ventas Directas',
      paymentMethod: s.paymentMethod,
      date: new Date(s.date),
      employeeId: s.employeeId,
      type: 'sale' as const
    }));

  // Calcular ingresos por abonos de separados (buscar en description ya que type no tiene layaway_payment)
  const layawayIncomes = cashMovements
    .filter(m => 
      m.storeId === currentStore?.id && 
      (m.description.toLowerCase().includes('abono') || 
       m.description.toLowerCase().includes('separado') ||
       m.description.toLowerCase().includes('layaway'))
    )
    .map(m => ({
      id: `layaway-${m.id}`,
      storeId: m.storeId,
      description: m.description,
      amount: m.amount,
      category: 'Abonos de Separados',
      paymentMethod: 'Efectivo', // Valor por defecto ya que paymentMethod no existe en CashMovement
      date: new Date(m.date),
      employeeId: m.employeeId,
      type: 'layaway' as const
    }));

  // Otros ingresos en efectivo (filtrar solo ventas y movimientos positivos)
  const otherIncomes = cashMovements
    .filter(m => 
      m.storeId === currentStore?.id && 
      m.type === 'sale' &&
      !m.description.toLowerCase().includes('abono') &&
      !m.description.toLowerCase().includes('separado') &&
      m.amount > 0
    )
    .map(m => ({
      id: `other-${m.id}`,
      storeId: m.storeId,
      description: m.description,
      amount: m.amount,
      category: 'Otros Ingresos',
      paymentMethod: 'Efectivo',
      date: new Date(m.date),
      employeeId: m.employeeId,
      type: 'other' as const
    }));

  // Combinar todos los ingresos
  const allIncomes = [
    ...salesIncomes,
    ...layawayIncomes,
    ...otherIncomes
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredIncomes = allIncomes.filter(income => {
    const matchesSearch = income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || income.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Obtener todas las categorías disponibles
  const allCategories = [...new Set([
    'Ventas Directas',
    'Abonos de Separados', 
    'Otros Ingresos'
  ])].sort();

  // Calcular estadísticas del mes actual
  const thisMonth = new Date();
  const thisMonthIncomes = allIncomes.filter(i => 
    i.date.getMonth() === thisMonth.getMonth() &&
    i.date.getFullYear() === thisMonth.getFullYear()
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'Ventas Directas':
        return ShoppingCart;
      case 'Abonos de Separados':
        return CreditCard;
      default:
        return DollarSign;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Ventas Directas':
        return 'bg-green-100 text-green-800';
      case 'Abonos de Separados':
        return 'bg-blue-100 text-blue-800';
      case 'Otros Ingresos':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ingresos</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(allIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(thisMonthIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <ShoppingCart className="w-8 h-8 text-emerald-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos por Ventas</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(salesIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Abonos Separados</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(layawayIncomes.reduce((sum, i) => sum + i.amount, 0))}
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
                placeholder="Buscar ingresos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las categorías</option>
            {allCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incomes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredIncomes.map(income => {
                const Icon = getIconForCategory(income.category);
                return (
                  <tr key={income.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{income.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(income.category)}`}>
                        {income.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {income.paymentMethod || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      +{formatCurrency(income.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.date instanceof Date
                        ? income.date.toLocaleDateString()
                        : new Date(income.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {income.date instanceof Date
                        ? income.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(income.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        income.type === 'sale' ? 'bg-green-100 text-green-800' :
                        income.type === 'layaway' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {income.type === 'sale' ? 'Venta Directa' :
                         income.type === 'layaway' ? 'Abono' :
                         'Otro'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredIncomes.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron ingresos</p>
          </div>
        )}
      </div>
    </div>
  );
}