import React from 'react';
// Removed motion import
import StockUpdater from '../components/StockUpdater'; // We will create this component next

// Removed animation variants and transition

function StockUpdatePage({ groceries, onUpdateStock }) {
  return (
    <div
      className="page-container" // Apply existing class here
    >
      <StockUpdater groceries={groceries} onUpdateStock={onUpdateStock} />
    </div>
  );
}

export default StockUpdatePage;
