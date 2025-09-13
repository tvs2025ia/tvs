import React, { useState } from "react";
import { X } from "lucide-react";

interface LayawayPaymentModalProps {
  layaway: any;
  closeModal: () => void;
  onAddPayment: (layawayId: string, amount: number, notes: string) => void;
}

export const LayawayPaymentModal: React.FC<LayawayPaymentModalProps> = ({
  layaway,
  closeModal,
  onAddPayment,
}) => {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (amount > 0 && amount <= layaway.remainingBalance) {
      onAddPayment(layaway.id, amount, paymentNotes);
      closeModal();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md mx-auto rounded-lg p-4 relative">
        <button
          onClick={closeModal}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold mb-4">Agregar Abono</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={layaway.customerName || "Cliente desconocido"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saldo Pendiente
            </label>
            <input
              type="text"
              value={`$${layaway.remainingBalance?.toLocaleString() || "0"}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto del Abono *
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max={layaway.remainingBalance || 0}
              step="1"
              placeholder="Monto a abonar"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo: ${layaway.remainingBalance?.toLocaleString() || "0"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observaciones del abono..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Registrar Abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};