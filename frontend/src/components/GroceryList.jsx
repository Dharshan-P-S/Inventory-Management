import React from 'react'; // Removed useState
import GroceryItem from './GroceryItem';
// Removed SearchBar import as it's now in HomePage

// Simplified props: only receives the already filtered items
// Added onUpdateItem prop
function GroceryList({ items, onAddToCart, currentUser, onDeleteItem, onUpdateItem }) {
  // Removed searchTerm state and handleSearchChange function
  // Removed filtering logic as it's done in HomePage

  return (
    <div className="grocery-list-container">
      <h2>Groceries</h2>
      {/* SearchBar removed from here */}
      <div className="grocery-list items-grid"> {/* Added items-grid class */}
        {items.length > 0 ? (
          items.map(item => (
            <GroceryItem
              key={item.id}
              item={item}
              onAddToCart={onAddToCart}
              currentUser={currentUser} // Pass currentUser down
              onDeleteItem={onDeleteItem} // Pass onDeleteItem down
              onUpdateItem={onUpdateItem} // Pass onUpdateItem down
            />
          ))
        ) : (
          // Updated message for combined filtering
          <p>No matching items found for the current search and category.</p>
        )}
      </div>
    </div>
  );
}

export default GroceryList;
