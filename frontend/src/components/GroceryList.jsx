import React, { useState } from 'react';
import GroceryItem from './GroceryItem';
import SearchBar from './SearchBar';

function GroceryList({ items, onAddToCart }) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grocery-list-container">
      <h2>Groceries</h2>
      <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      <div className="grocery-list">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <GroceryItem
              key={item.id}
              item={item}
              onAddToCart={onAddToCart}
            />
          ))
        ) : (
          <p>No matching items found.</p>
        )}
      </div>
    </div>
  );
}

export default GroceryList;