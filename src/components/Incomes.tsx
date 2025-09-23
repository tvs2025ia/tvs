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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

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

  // Obtener años disponibles desde los datos de ingresos
  const availableYears = [...new Set(allIncomes.map(i => new Date(i.date).getFullYear()))]
    .sort((a, b) => b - a);

  // Definir los meses
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

  // Obtener días disponibles para el mes y año seleccionados
  const getDaysInMonth = () => {
    if (!selectedYear || !selectedMonth) return [];
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const filteredIncomes = allIncomes.filter(income => {
    const incomeDate = new Date(income.date);
    const incomeYear = incomeDate.getFullYear();
    const incomeMonth = incomeDate.getMonth();
    const incomeDay = incomeDate.getDate();
    
    const matchesSearch = income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || income.category === categoryFilter;
    const matchesYear = selectedYear === '' || incomeYear.toString() === selectedYear;
    const matchesMonth = selectedMonth === '' || incomeMonth.toString() === selectedMonth;
    const matchesDay = selectedDay === '' || incomeDay.toString() === selectedDay;
    
    return matchesSearch && matchesCategory && matchesYear && matchesMonth && matchesDay;
  });

  // Obtener todas las categorías disponibles
  const allCategories = [...new Set([
    'Ventas Directas',
    'Abonos de Separados', 
    'Otros Ingresos'
  ])].sort();

  // Calcular estadísticas basadas en los ingresos filtrados
  const filteredSalesIncomes = filteredIncomes.filter(i => i.type === 'sale');
  const filteredLayawayIncomes = filteredIncomes.filter(i => i.type === 'layaway');
  const filteredOtherIncomes = filteredIncomes.filter(i => i.type === 'other');

  // Calcular estadísticas del mes actual (sin filtros para mostrar comparativa)
  const thisMonth = new Date();
  const thisMonthIncomes = allIncomes.filter(i => 
    i.date.getMonth() === thisMonth.getMonth() &&
    i.date.getFullYear() === thisMonth.getFullYear()
  );

  // Función para obtener el texto del período filtrado
  const getFilteredPeriodText = () => {
    if (!selectedYear && !selectedMonth && !selectedDay) return 'Total Histórico';
    
    const parts = [];
    if (selectedDay) parts.push(`Día ${selectedDay}`);
    if (selectedMonth) {
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      parts.push(monthName || `Mes ${parseInt(selectedMonth) + 1}`);
    }
    if (selectedYear) parts.push(selectedYear);
    
    return parts.length > 0 ? parts.join(' de ') : 'Total Histórico';
  };

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
              <p className="text-sm font-medium text-gray-600">{getFilteredPeriodText()}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(filteredIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mes (Real)</p>
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
              <p className="text-sm font-medium text-gray-600">Ventas (Filtradas)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(filteredSalesIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Abonos (Filtrados)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(filteredLayawayIncomes.reduce((sum, i) => sum + i.amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Búsqueda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedMonth('');
                setSelectedDay('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDay('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedYear}
            >
              <option value="">Todos</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedYear || !selectedMonth}
            >
              <option value="">Todos</option>
              {getDaysInMonth().map(day => (
                <option key={day} value={day.toString()}>{day}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de filtros rápidos */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              const today = new Date();
              setSelectedYear(today.getFullYear().toString());
              setSelectedMonth(today.getMonth().toString());
              setSelectedDay(today.getDate().toString());
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setSelectedYear(today.getFullYear().toString());
              setSelectedMonth(today.getMonth().toString());
              setSelectedDay('');
            }}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
          >
            Este Mes
          </button>
          <button
            onClick={() => {
              const today = new Date();
              setSelectedYear(today.getFullYear().toString());
              setSelectedMonth('');
              setSelectedDay('');
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
          >
            Este Año
          </button>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setSelectedYear(new Date().getFullYear().toString());
              setSelectedMonth('');
              setSelectedDay('');
            }}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || categoryFilter || selectedYear || selectedMonth || selectedDay) && (
          <div className="bg-blue-50 rounded-lg p-3 mt-4">
            <p className="text-blue-700 text-sm font-medium">
              Mostrando <span className="font-bold">{filteredIncomes.length}</span> registros
              {getFilteredPeriodText() !== 'Total Histórico' && ` para ${getFilteredPeriodText()}`}
              {categoryFilter && ` en categoría "${categoryFilter}"`}
              {searchTerm && ` que coinciden con "${searchTerm}"`}
            </p>
          </div>
        )}
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