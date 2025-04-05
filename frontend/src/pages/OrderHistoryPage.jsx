import React, { useState, useEffect } from 'react';
import OrderHistoryItem from '../components/OrderHistoryItem';
import '../App.css'; // Ensure styles are imported

const API_BASE_URL = 'http://localhost:3001/api'; // Or use a shared config

function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      console.log("Fetching orders from:", `${API_BASE_URL}/orders`);
      try {
        // TODO: Add authentication headers later if needed
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        // Sort orders by timestamp, newest first
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setOrders(data);
      } catch (e) {
        console.error("Failed to fetch orders:", e);
        setError(`Failed to load order history: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []); // Fetch orders on component mount

  if (loading) return <p className="loading-message">Loading order history...</p>;
  if (error) return <p className="error-message api-error">{error}</p>;

  return (
    <div className="page-container order-history-page">
      <h2>Order History</h2>
      {orders.length === 0 ? (
        <p className="empty-history-message">You have no past orders.</p>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <OrderHistoryItem key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;
