import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { useStore } from "../contexts/StoreContext";
import { useAuth } from "../contexts/AuthContext";

// Importaciones condicionales para evitar errores de compilación
let MobileCartModal: any;
let LayawayDetailModal: any;
let FloatingCartButton: any;

try {
  MobileCartModal = require("./MobileCartModal").MobileCartModal;
} catch (e) {
  MobileCartModal = () => <div>MobileCartModal no disponible</div>;
}

try {
  LayawayDetailModal = require("./LayawayDetailModal").LayawayDetailModal;
} catch (e) {
  LayawayDetailModal = () => <div>LayawayDetailModal no disponible</div>;
}

try {
  FloatingCartButton = require("./FloatingCartButton").FloatingCartButton;
} catch (e) {
  FloatingCartButton = () => <div>FloatingCartButton no disponible</div>;
}

import { Package, Clock } from "lucide-react";

interface CartItem {
  productId: string;
  quantity: number;
}

const Layaways: React.FC = () => {
  const {
    products,
    layaways,
    customers,
    // createLayaway podría no existir, así que lo manejamos condicionalmente
  } = useData();
  const { currentStore } = useStore();
  const { user } = useAuth();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [viewingLayaway, setViewingLayaway] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtrar productos y clientes por storeId
  const filteredProducts = products?.filter((p: any) => p.storeId === currentStore?.id) || [];
  const filteredCustomers = customers?.filter((c: any) => c.storeId === currentStore?.id) || [];
  const filteredLayaways = layaways?.filter((l: any) => l.storeId === currentStore?.id) || [];

  // --- Funciones ---
  const addToCart = (productId: string) => {
    const product = filteredProducts.find((p: any) => p.id === productId);
    if (!product || product.stock <= 0) return;
    
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        if (existing.quantity + 1 > product.stock) return prev;
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
    const product = filteredProducts.find((p: any) => p.id === i.productId);
    return sum + (product?.price || 0) * i.quantity;
  }, 0);

  const handleCreateLayaway = async () => {
    if (!selectedCustomerId || cart.length === 0 || !user) return;

    const layawayData = {
      customerId: selectedCustomerId,
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        price: filteredProducts.find((p: any) => p.id === c.productId)?.price || 0,
      })),
      total: totalCart,
      paid: 0,
      remainingBalance: totalCart,
      payments: [],
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      storeId: user.storeId || currentStore?.id,
    };

    try {
      // Intenta usar createLayaway si existe, de lo contrario muestra un mensaje
      if (typeof (useData() as any).createLayaway === 'function') {
        await (useData() as any).createLayaway(layawayData);
        alert('Separado creado exitosamente');
      } else {
        alert('Función createLayaway no disponible. El separado no se guardó.');
        console.log('Datos del separado:', layawayData);
      }
      
      setCart([]);
      setSelectedCustomerId("");
      setShowCart(false);
    } catch (error) {
      console.error('Error al crear separado:', error);
      alert('Error al crear el separado');
    }
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
          {filteredLayaways.length > 0 ? (
            filteredLayaways
              .filter((l: any) => l.status === "active")
              .map((layaway: any) => (
                <div
                  key={layaway.id}
                  className="bg-white rounded-lg border p-3 md:p-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {filteredCustomers.find((c: any) => c.id === layaway.customerId)?.name ||
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
              {!layaways ? "Cargando separados..." : "No hay separados activos"}
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
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-lg border p-3 flex flex-col"
              >
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.stock} disponibles</p>
                <p className="text-sm font-bold mt-1">${product.price}</p>
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={product.stock <= 0}
                  className="mt-auto bg-blue-600 text-white rounded-lg py-1 px-2 text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {product.stock <= 0 ? 'Sin stock' : 'Agregar'}
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">
              {!products ? "Cargando productos..." : "No hay productos disponibles"}
            </p>
          )}
        </div>
      </div>

      {/* Botón flotante */}
      {cart.length > 0 && (
        <FloatingCartButton 
          onClick={() => setShowCart(true)} 
          itemCount={cart.length}
        />
      )}

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
          storeCustomers={filteredCustomers}
          storeProducts={filteredProducts}
        />
      )}

      {viewingLayaway && (
        <LayawayDetailModal
          layaway={viewingLayaway}
          closeModal={() => setViewingLayaway(null)}
          storeCustomers={filteredCustomers}
        />
      )}
    </div>
  );
};

// Export default y nombrado para compatibilidad
export const LayawayComponent = Layaways;
export default Layaways;