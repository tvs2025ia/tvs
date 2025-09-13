import React from "react";
import { useStore } from "../contexts/StoreContext";

interface MobileCartModalProps {
  cart: { productId: string; quantity: number }[];
  removeFromCart: (productId: string) => void;
  totalCart: number;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  handleCreateLayaway: () => void;
  closeModal: () => void;
}

export const MobileCartModal: React.FC<MobileCartModalProps> = ({
  cart = [],
  removeFromCart,
  totalCart,
  selectedCustomerId,
  setSelectedCustomerId,
  handleCreateLayaway,
  closeModal,
}) => {
  const { storeProducts = [], storeCustomers = [] } = useStore();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end z-50">
      <div className="bg-white w-full md:max-w-md rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Carrito</h2>
          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Lista de productos */}
        <div className="space-y-2">
          {cart?.length > 0 ? (
            cart.map((item) => {
              const product = storeProducts?.find((p) => p.id === item.productId);
              return (
                <div
                  key={item.productId}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{product?.name || "Producto desconocido"}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} x ${product?.price || 0}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-500 text-sm"
                  >
                    Quitar
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-sm">Carrito vacío</p>
          )}
        </div>

        {/* Total */}
        <div className="mt-4 flex justify-between font-bold">
          <span>Total:</span>
          <span>${totalCart}</span>
        </div>

        {/* Selección de cliente */}
        <div className="mt-4">
          <label className="block text-sm mb-1">Cliente</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option value="">Seleccionar cliente</option>
            {storeCustomers?.length > 0 ? (
              storeCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            ) : (
              <option disabled>No hay clientes</option>
            )}
          </select>
        </div>

        {/* Botón crear separado */}
        <button
          onClick={handleCreateLayaway}
          disabled={!selectedCustomerId || cart?.length === 0}
          className="mt-4 w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:bg-gray-400"
        >
          Crear separado
        </button>
      </div>
    </div>
  );
};
