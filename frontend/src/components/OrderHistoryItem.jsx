import React from 'react';

function OrderHistoryItem({ order }) {
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid Date';
    }
  };

  return (
    <div className="order-history-item">
      <div className="order-header">
        <h3>Order #{order.orderId}</h3>
        <span className="order-date">Order Date: {formatDate(order.date)}</span>
        <span className="order-total">Total: Rs. {order.total.toFixed(2)}</span>
      </div>
      <ul className="order-item-list">
        {order.items.map(item => (
          <li key={`${order.id}-${item.id}`} className="order-item-detail">
            <span>{item.name}</span>
            <span>Qty: {item.quantity}</span>
            <span>@ Rs. {item.price.toFixed(2)} each</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default OrderHistoryItem;
