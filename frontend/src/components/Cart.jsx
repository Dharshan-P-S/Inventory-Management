import React from 'react';
import CartItem from './CartItem';

// Add onBuy to the destructured props
function Cart({ cartItems, onIncrease, onDecrease, onRemove, onBuy }) {
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
          {/* Wrapper for total and buy button */}
          <div className="cart-summary">
            <div className="cart-total">
              <strong>Total: Rs. {calculateTotal()}</strong>
            </div>
            <button onClick={onBuy} className="buy-button" disabled={cartItems.length === 0}>
              Buy Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
