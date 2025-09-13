import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";

import { MobileCartModal } from "./MobileCartModal";
import { LayawayDetailModal } from "./LayawayDetailModal";
import { FloatingCartButton } from "./FloatingCartButton";

import { Package, Clock } from "lucide-react";

const Layaways: React.FC = () => {
  const {
    storeProducts,
    storeLayaways,
    storeCustomers,
    createLayaway,
  } = useData();
  const { currentUser } = useAuth();

  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [viewingLayaway, setViewingLayaway] = useState<any>(null);

  const isMobile = window.innerWidth < 768;

  // --- Funciones ---
  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalCart = cart.reduce((sum, i) => {
    const product = storeProducts?.find((p) => p.id === i.productId);
    return sum + (product?.price || 0) * i.quantity;
  }, 0);

  const handleCreateLayaway = async () => {
    if (!selectedCustomerId || cart.length === 0 || !currentUser) return;

    const layawayData = {
      customerId: selectedCustomerId,
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        price: storeProducts?.find((p) => p.id === c.productId)?.price || 0,
      })),
      total: totalCart,
      paid: 0,
      remainingBalance: totalCart,
      payments: [],
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      storeId: currentUser.storeId,
    };

    await createLayaway(layawayData);
    setCart([]);
    setSelectedCustomerId("");
    setShowCart(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ======================= */}
      {/* 1. Separados Activos   */}
      {/* ======================= */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-yellow-600" /> Separados Activos
        </h2>
        <div
          className={`grid gap-4 ${
            isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {Array.isArray(storeLayaways) && storeLayaways.length > 0 ? (
            storeLayaways
              .filter((l) => l.status === "active")
              .map((layaway) => (
                <div
                  key={layaway.id}
                  className="bg-white rounded-lg border p-3 md:p-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {storeCustomers?.find((c) => c.id === layaway.customerId)?.name ||
                        "Cliente desconocido"}
                    </span>
                    <button
                      onClick={() => setViewingLayaway(layaway)}
                      className="text-blue-600 text-sm"
                    >
                      Ver
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Saldo: ${layaway.remainingBalance}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-gray-500 col-span-full">
              {!storeLayaways ? "Cargando separados..." : "No hay separados activos"}
            </p>
          )}
        </div>
      </div>

      {/* ======================= */}
      {/* 2. Productos            */}
      {/* ======================= */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" /> Productos
        </h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.isArray(storeProducts) && storeProducts.length > 0 ? (
            storeProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg border p-3 flex flex-col"
              >
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.stock} disponibles</p>
                <p className="text-sm font-bold mt-1">${product.price}</p>
                <button
                  onClick={() => addToCart(product.id)}
                  className="mt-auto bg-blue-600 text-white rounded-lg py-1 px-2 text-sm hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">
              {!storeProducts ? "Cargando productos..." : "No hay productos disponibles"}
            </p>
          )}
        </div>
      </div>

      {/* Botón flotante */}
      <FloatingCartButton onClick={() => setShowCart(true)} />

      {/* Modales */}
      {showCart && (
        <MobileCartModal
          cart={cart}
          removeFromCart={removeFromCart}
          totalCart={totalCart}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          handleCreateLayaway={handleCreateLayaway}
          closeModal={() => setShowCart(false)}
        />
      )}

      {viewingLayaway && (
        <LayawayDetailModal
          layaway={viewingLayaway}
          closeModal={() => setViewingLayaway(null)}
        />
      )}
    </div>
  );
};

// Export default y nombrado para compatibilidad
export const LayawayComponent = Layaways;
export default Layaways;
