import React from 'react';
import CartItem from './CartItem';

function Cart({ cartItems, onIncrease, onDecrease, onRemove }) {
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  return (
    <div className="cart-container">
      <h2>Shopping Cart</h2>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div>
          {cartItems.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
            />
          ))}
          <div className="cart-total">
            <strong>Total: Rs. {calculateTotal()}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;