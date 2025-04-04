import React from 'react';

function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  return (
    <div className="cart-item">
      <span>{item.name} (Rs. {item.price.toFixed(2)})</span>
      <div className="cart-item-controls">
        <button onClick={() => onDecrease(item.id)} disabled={item.quantity <= 1}>-</button>
        <span>{item.quantity}</span>
        <button onClick={() => onIncrease(item.id)}>+</button>
        <button onClick={() => onRemove(item.id)} className="remove-button">Remove</button>
      </div>
    </div>
  );
}

export default CartItem;