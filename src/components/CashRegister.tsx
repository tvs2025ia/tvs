import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { CashRegister as CashRegisterType, CashMovement, Expense } from '../types';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';

export function CashRegister() {
  const { cashRegisters, cashMovements, sales, expenses, openCashRegister, closeCashRegister, addCashMovement, users } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(0);
  const [closingAmount, setClosingAmount] = useState(0);

  // NUEVO: filtro de fechas para historial
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const storeRegisters = cashRegisters.filter(r => r.storeId === currentStore?.id);
  const currentRegister = storeRegisters.find(r => r.status === 'open');
  const storeSales = sales.filter(s => s.storeId === currentStore?.id);
  const storeExpenses = expenses.filter(e => e.storeId === currentStore?.id);

  // Filtrar egresos del turno actual
  const expensesSinceOpen: Expense[] = currentRegister
    ? storeExpenses.filter(e => new Date(e.date) >= new Date(currentRegister.openedAt))
    : [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenRegister = () => {
    if (openingAmount < 0) {
      alert('El monto de apertura debe ser mayor o igual a 0');
      return;
    }

    const newRegister: CashRegisterType = {
      id: crypto.randomUUID(),
      storeId: currentStore?.id || '11111111-1111-1111-1111-111111111111',
      employeeId: user?.id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      openingAmount,
      openedAt: new Date(),
      status: 'open'
    };

    openCashRegister(newRegister);
    setShowOpenModal(false);
    setOpeningAmount(0);
  };

  // MODIFICADO: Cerrar caja y registrar egresos del turno
  const handleCloseRegister = () => {
    if (!currentRegister) return;
    closeCashRegister(currentRegister.id, closingAmount, expensesSinceOpen);
    setShowCloseModal(false);
    setClosingAmount(0);
  };

  // NUEVO: Obtener ingresos del turno (ventas + abonos de separados)
  const getTurnoMovements = () => {
    if (!currentRegister) return [];
    return cashMovements.filter(m => 
      m.storeId === currentStore?.id &&
      m.type === 'sale' &&
      new Date(m.date) >= new Date(currentRegister.openedAt)
    );
  };
  const ingresosTurno = getTurnoMovements().reduce((sum, m) => sum + m.amount, 0);

  // --- CORREGIDO: cálculo robusto de ingresos y egresos de hoy ---
  const today = new Date();
  const todayMovementSales = cashMovements.filter(m => {
    const d = new Date(m.date);
    return m.storeId === currentStore?.id &&
      m.type === 'sale' &&
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
  });
  const todaySalesTotal = todayMovementSales.reduce((sum, m) => sum + m.amount, 0);

  const todayExpenses = storeExpenses.filter(e => {
    const expenseDate = new Date(e.date);
    return (
      expenseDate.getFullYear() === today.getFullYear() &&
      expenseDate.getMonth() === today.getMonth() &&
      expenseDate.getDate() === today.getDate()
    );
  });
  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // --- NUEVO: filtrar historial por fechas ---
  const filteredRegisters = storeRegisters.filter(register => {
    const openedAt = new Date(register.openedAt);
    const passesStart = !filterStartDate || openedAt >= new Date(filterStartDate);
    const passesEnd = !filterEndDate || openedAt <= new Date(filterEndDate + 'T23:59:59');
    return passesStart && passesEnd;
  });

  // --- NUEVO: obtener nombre de usuario por employeeId ---
  const getEmployeeName = (employeeId: string) => {
    if (!users) return 'Desconocido';
    const employee = users.find(u => u.id === employeeId);
    return employee ? employee.username : 'Desconocido';
  };

  // NUEVO: Muestra el desglose de ingresos (ventas + abonos) si quieres mostrarlo separado
  // De momento, solo se muestra el total sumado en los cuadros.

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuadre de Caja</h1>
          <p className="text-gray-600 mt-1">{currentStore?.name}</p>
        </div>
        {!currentRegister ? (
          <button
            onClick={() => setShowOpenModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Abrir Caja</span>
          </button>
        ) : (
          <button
            onClick={() => setShowCloseModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span>Cerrar Caja</span>
          </button>
        )}
      </div>

      {/* Current Register Status */}
      {currentRegister ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-green-900">Caja Abierta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-green-600">Apertura</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(currentRegister.openingAmount)}</p>
              <p className="text-xs text-green-600">{new Date(currentRegister.openedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Ingresos del turno (ventas + abonos separados)</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(ingresosTurno)}</p>
            </div>
            <div>
              <p className="text-sm text-green-600">Esperado</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}</p>
            </div>
            <div>
              <p className="text-sm text-green-600">Empleado</p>
              <p className="text-lg font-medium text-green-900">{getEmployeeName(currentRegister.employeeId)}</p>
            </div>
          </div>
          {/* Mostrar egresos del turno actual */}
          <div className="mt-4">
            <p className="text-sm text-red-600">Egresos en este turno:</p>
            <ul className="text-sm text-gray-700 ml-2">
              {expensesSinceOpen.length === 0 && <li>No hay egresos registrados.</li>}
              {expensesSinceOpen.map(e => (
                <li key={e.id}>
                  {e.description}: <strong className="text-red-600">{formatCurrency(e.amount)}</strong> ({new Date(e.date).toLocaleString()})
                </li>
              ))}
            </ul>
            {expensesSinceOpen.length > 0 && (
              <div className="mt-2 text-sm text-red-700 font-bold">
                Total egresos del turno: {formatCurrency(expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-900">Caja Cerrada</h3>
          </div>
          <p className="text-yellow-700 mt-2">Debes abrir la caja para comenzar a operar.</p>
        </div>
      )}

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Hoy (ventas + abonos)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaySalesTotal)}</p>
              <p className="text-xs text-gray-500">{todayMovementSales.length} transacciones</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <TrendingDown className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Egresos Hoy</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todayExpensesTotal)}</p>
              <p className="text-xs text-gray-500">{todayExpenses.length} registros</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Balance Hoy</p>
              <p className={`text-2xl font-bold ${todaySalesTotal - todayExpensesTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(todaySalesTotal - todayExpensesTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <Calculator className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Registros Caja</p>
              <p className="text-2xl font-bold text-gray-900">{storeRegisters.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de fecha para historial */}
      <div className="flex space-x-4 items-center mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Recent Registers - Historial de Cajas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Cajas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apertura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cierre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Esperado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diferencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Egresos Turno
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegisters.slice().reverse().map(register => (
                <tr key={register.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      register.status === 'open' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(register.openingAmount)}</div>
                    <div className="text-sm text-gray-500">{new Date(register.openedAt).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.closedAt ? new Date(register.closedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(register.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.expectedAmount ? formatCurrency(register.expectedAmount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {register.closingAmount ? formatCurrency(register.closingAmount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {register.difference !== undefined ? (
                      <span className={register.difference === 0 ? 'text-green-600' : register.difference > 0 ? 'text-blue-600' : 'text-red-600'}>
                        {register.difference > 0 ? '+' : ''}{formatCurrency(register.difference)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                    {register.expensesTurno
                      ? formatCurrency(
                          Array.isArray(register.expensesTurno)
                            ? register.expensesTurno.reduce((sum, e) => sum + (e.amount || 0), 0)
                            : 0
                        )
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRegisters.length === 0 && (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay registros de caja en este rango de fechas</p>
          </div>
        )}
      </div>

      {/* Open Register Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Abrir Caja</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto de Apertura
                </label>
                <input
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Efectivo inicial en caja</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Register Modal */}
      {showCloseModal && currentRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Cerrar Caja</h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Apertura:</span>
                  <span className="font-medium">{formatCurrency(currentRegister.openingAmount)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Ingresos del turno:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(ingresosTurno)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Egresos del turno:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Esperado:</span>
                  <span className="font-medium">{formatCurrency(currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0))}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo Contado
                </label>
                <input
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Efectivo real en caja</p>
              </div>

              {closingAmount > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Diferencia:</span>
                    <span className={`font-medium ${
                      closingAmount - (currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0)) === 0 
                        ? 'text-green-600' 
                        : closingAmount - (currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0)) > 0 
                        ? 'text-blue-600' 
                        : 'text-red-600'
                    }`}>
                      {closingAmount - (currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0)) > 0 ? '+' : ''}
                      {formatCurrency(closingAmount - (currentRegister.openingAmount + ingresosTurno - expensesSinceOpen.reduce((sum, e) => sum + e.amount, 0)))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseRegister}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cerrar Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
