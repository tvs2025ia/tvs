import React from "react";
import { X } from "lucide-react";

interface Props {
  layaway: any;
  closeModal: () => void;
}

export const LayawayDetailModal: React.FC<Props> = ({
  layaway,
  closeModal,
}) => {
  const totalPaid = layaway.payments.reduce(
    (sum: number, p: any) => sum + p.amount,
    0
  );
  const remainingBalance = layaway.total - totalPaid;
  const progress = (totalPaid / layaway.total) * 100;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md mx-auto rounded-lg p-4 relative">
        <button
          onClick={closeModal}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4">Detalle del Separado</h2>

        <p className="font-medium">Cliente: {layaway.customerId}</p>

        <div className="mt-3 space-y-1">
          <p>
            <span className="font-bold">Total:</span> ${layaway.total}
          </p>
          <p className="text-green-600">
            <span className="font-bold">Pagado:</span> ${totalPaid}
          </p>
          <p className="text-orange-600">
            <span className="font-bold">Saldo:</span> ${remainingBalance}
          </p>
        </div>

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

        <div className="mt-4">
          <h3 className="font-medium mb-2">Pagos:</h3>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {layaway.payments.map((p: any, i: number) => (
              <li
                key={i}
                className="flex justify-between text-sm border-b pb-1"
              >
                <span>{new Date(p.date).toLocaleDateString()}</span>
                <span>${p.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
