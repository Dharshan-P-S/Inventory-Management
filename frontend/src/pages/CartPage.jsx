import React from 'react';
import Cart from '../components/Cart';

function CartPage({ cartItems, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="page-container">
      <Cart
        cartItems={cartItems}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
      />
    </div>
  );
}

export default CartPage;