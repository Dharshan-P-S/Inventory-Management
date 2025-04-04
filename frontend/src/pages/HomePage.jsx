import React from 'react';
import GroceryList from '../components/GroceryList';

function HomePage({ items, onAddToCart, loading, error }) {
  if (loading) return <p>Loading groceries...</p>;
  if (error) return <p>Error loading groceries: {error}</p>;

  return (
    <div className="page-container">
      <GroceryList items={items} onAddToCart={onAddToCart} />
    </div>
  );
}

export default HomePage;