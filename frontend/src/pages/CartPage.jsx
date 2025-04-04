import React from 'react';
import Cart from '../components/Cart';

// Add onBuy to props
function CartPage({ cartItems, onIncrease, onDecrease, onRemove, onBuy }) {
  return (
    <div className="page-container">
      <Cart
        cartItems={cartItems}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
        onBuy={onBuy} // Pass onBuy down to Cart
      />
    </div>
  );
}

export default CartPage;
