import React from "react";
import { ShoppingCart } from "lucide-react";

interface Props {
  onClick: () => void;
  itemCount?: number;
}

export const FloatingCartButton: React.FC<Props> = ({ onClick, itemCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 relative"
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
};