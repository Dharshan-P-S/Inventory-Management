import React from 'react';
import StockUpdater from '../components/StockUpdater'; // We will create this component next

function StockUpdatePage({ groceries, onUpdateStock }) {
  return (
    <div className="page-container">
      <StockUpdater groceries={groceries} onUpdateStock={onUpdateStock} />
    </div>
  );
}

export default StockUpdatePage;
