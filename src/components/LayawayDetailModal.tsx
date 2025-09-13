import React from "react";
import { X, Plus } from "lucide-react";

interface Props {
  layaway: any;
  closeModal: () => void;
  storeCustomers: any[];
  onAddPayment?: (layaway: any) => void;
}

export const LayawayDetailModal: React.FC<Props> = ({
  layaway,
  closeModal,
  storeCustomers,
  onAddPayment,
}) => {
  const totalPaid = layaway.payments?.reduce(
    (sum: number, p: any) => sum + p.amount,
    0
  ) || 0;
  const remainingBalance = layaway.total - totalPaid;
  const progress = Math.min((totalPaid / layaway.total) * 100, 100);

  const customer = storeCustomers.find((c: any) => c.id === layaway.customerId);

  const handleAddPaymentClick = () => {
    if (onAddPayment) {
      onAddPayment(layaway);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md mx-auto rounded-lg p-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4">Detalle del Separado</h2>

        <div className="space-y-4">
          {/* Información del cliente */}
          <div>
            <p className="font-medium text-gray-900">Cliente:</p>
            <p className="text-blue-600">{customer?.name || "Cliente no encontrado"}</p>
          </div>

          {/* Información financiera */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-bold text-lg">${layaway.total?.toLocaleString() || "0"}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600">Pagado</p>
              <p className="font-bold text-lg text-green-600">${totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-sm text-orange-600">Saldo</p>
              <p className="font-bold text-lg text-orange-600">${remainingBalance.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-600">Estado</p>
              <p className="font-bold text-lg text-blue-600">
                {remainingBalance <= 0 ? 'Completado' : 'Activo'}
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 h-3 rounded-full">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">
              {progress.toFixed(1)}% completado
            </p>
          </div>

          {/* Botón para agregar abono */}
          {remainingBalance > 0 && (
            <button
              onClick={handleAddPaymentClick}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Abono</span>
            </button>
          )}

          {/* Historial de pagos */}
          <div className="mt-4">
            <h3 className="font-medium mb-2 text-gray-900">Historial de Pagos:</h3>
            {layaway.payments?.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {layaway.payments.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-green-50 p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-green-900">${p.amount?.toLocaleString() || "0"}</p>
                      <p className="text-sm text-green-600">
                        {new Date(p.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(p.date).toLocaleTimeString()}
                      </p>
                      {p.notes && (
                        <p className="text-xs text-gray-400">{p.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No hay pagos registrados</p>
              </div>
            )}
          </div>

          {/* Productos del separado */}
          <div className="mt-4">
            <h3 className="font-medium mb-2 text-gray-900">Productos:</h3>
            <div className="space-y-2">
              {layaway.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.quantity} x ${item.unitPrice}</p>
                  </div>
                  <p className="font-medium">${item.total}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};