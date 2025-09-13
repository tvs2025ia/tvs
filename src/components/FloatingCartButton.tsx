import React from "react";
import { ShoppingCart } from "lucide-react";

interface Props {
  onClick: () => void;
}

export const FloatingCartButton: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
    >
      <ShoppingCart className="w-6 h-6" />
    </button>
  );
};
