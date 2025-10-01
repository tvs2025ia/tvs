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

  // Ingresos por ventas directas
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

  // Ingresos por abonos de separados
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
      paymentMethod: m.paymentMethod || 'Efectivo',
      date: new Date(m.date),
      employeeId: m.employeeId,
      type: 'layaway' as const
    }));

  // Otros ingresos (sin duplicar ventas)
  const otherIncomes = cashMovements
    .filter(m => 
      m.storeId === currentStore?.id && 
      m.type !== 'sale' && // 👈 evita duplicar ventas
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
      paymentMethod: m.paymentMethod || 'Efectivo',
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

  const availableYears = [...new Set(allIncomes.map(i => new Date(i.date).getFullYear()))]
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

  const allCategories = [...new Set([
    'Ventas Directas',
    'Abonos de Separados', 
    'Otros Ingresos'
  ])].sort();

  const filteredSalesIncomes = filteredIncomes.filter(i => i.type === 'sale');
  const filteredLayawayIncomes = filteredIncomes.filter(i => i.type === 'layaway');

  const thisMonth = new Date();
  const thisMonthIncomes = allIncomes.filter(i => 
    i.date.getMonth() === thisMonth.getMonth() &&
    i.date.getFullYear() === thisMonth.getFullYear()
  );

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

        {/* Resumen filtros */}
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

      {/* Tabla de Ingresos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full text-sm sm:text-base">
            <thead className="bg-gray-50 text-xs sm:text-sm">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIncomes.map((income) => {
                const Icon = getIconForCategory(income.category);
                return (
                  <tr key={income.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900">{income.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(income.category)}`}>
                        <Icon className="inline-block w-4 h-4 mr-1" />
                        {income.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{income.paymentMethod}</td>
                    <td className="px-6 py-4 text-green-600 font-medium">{formatCurrency(income.amount)}</td>
                    <td className="px-6 py-4 text-gray-900">
                      {income.date.toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {income.date.toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {income.type === 'sale' ? 'Venta' : 
                         income.type === 'layaway' ? 'Abono' : 
                         'Otro'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredIncomes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron ingresos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
