import React, { useState, useMemo } from 'react';
import GroceryItem from './GroceryItem';
import './GroceryList.css'; // Import CSS for styling

function GroceryList({ items, onAddToCart, currentUser, onDeleteItem, onUpdateItem }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterConfig, setFilterConfig] = useState({
    minPrice: '',
    maxPrice: '',
    minQuantityAvailable: '', // Renamed
    maxQuantityAvailable: '', // Renamed
  });
  const [activeFilters, setActiveFilters] = useState({ // Store the applied filters
    minPrice: null,
    maxPrice: null,
    minQuantityAvailable: null, // Renamed
    maxQuantityAvailable: null, // Renamed
    availability: 'all', // 'all', 'available', 'outOfStock'
  });
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'outOfStock'
  const [showControls, setShowControls] = useState(false); // State to toggle controls visibility

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
      // Third click resets sort for this key
      key = null;
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterConfig(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setActiveFilters({
        minPrice: filterConfig.minPrice !== '' ? parseFloat(filterConfig.minPrice) : null,
        maxPrice: filterConfig.maxPrice !== '' ? parseFloat(filterConfig.maxPrice) : null,
        minQuantityAvailable: filterConfig.minQuantityAvailable !== '' ? parseInt(filterConfig.minQuantityAvailable, 10) : null, // Renamed
        maxQuantityAvailable: filterConfig.maxQuantityAvailable !== '' ? parseInt(filterConfig.maxQuantityAvailable, 10) : null, // Renamed
    });
  };

  const clearFilters = () => {
    setFilterConfig({ minPrice: '', maxPrice: '', minQuantityAvailable: '', maxQuantityAvailable: '' }); // Renamed
    setActiveFilters({ minPrice: null, maxPrice: null, minQuantityAvailable: null, maxQuantityAvailable: null, availability: 'all' }); // Renamed and added availability
    setAvailabilityFilter('all'); // Reset availability filter
  };

  const clearSort = () => {
    setSortConfig({ key: null, direction: 'ascending' });
  };

  const sortedAndFilteredItems = useMemo(() => {
    let processedItems = [...items];

    // Apply Filters
    processedItems = processedItems.filter(item => {
        const price = parseFloat(item.price);
        const quantityAvailable = parseInt(item.quantityAvailable, 10); // Use correct property and parse
        const priceMatch = (activeFilters.minPrice === null || price >= activeFilters.minPrice) &&
                           (activeFilters.maxPrice === null || price <= activeFilters.maxPrice);
        const availabilityMatch = (activeFilters.minQuantityAvailable === null || quantityAvailable >= activeFilters.minQuantityAvailable) && // Use correct state and item property
                                  (activeFilters.maxQuantityAvailable === null || quantityAvailable <= activeFilters.maxQuantityAvailable); // Use correct state and item property
        return priceMatch && availabilityMatch;
    });


    // Apply Sorting
    if (sortConfig.key !== null) {
      processedItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric vs string comparison
        if (sortConfig.key === 'price') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        } else if (sortConfig.key === 'quantityAvailable') { // Use correct key
          // Use parseInt for quantityAvailable (stock count)
          aValue = parseInt(aValue, 10);
          bValue = parseInt(bValue, 10);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply Availability Filter (Out of Stock / Available)
    if (availabilityFilter === 'available') {
        processedItems = processedItems.filter(item => parseInt(item.quantityAvailable, 10) > 0);
    } else if (availabilityFilter === 'outOfStock') {
        processedItems = processedItems.filter(item => parseInt(item.quantityAvailable, 10) === 0);
    }


    // Apply Sorting
    if (sortConfig.key !== null) {
      processedItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle numeric vs string comparison
        if (sortConfig.key === 'price') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        } else if (sortConfig.key === 'quantityAvailable') { // Use correct key
          // Use parseInt for quantityAvailable (stock count)
          aValue = parseInt(aValue, 10);
          bValue = parseInt(bValue, 10);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return processedItems;
  }, [items, sortConfig, activeFilters, availabilityFilter]); // Depend on activeFilters and availabilityFilter

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const handleAvailabilityFilter = (status) => {
    // If clicking the same button again, reset to 'all'
    setAvailabilityFilter(prev => prev === status ? 'all' : status);
  };

  return (
    <div className="grocery-list-container">
      <h2>Groceries</h2>

      {/* Toggle Button for Controls */}
      <div className="toggle-controls-container">
        <button onClick={() => setShowControls(!showControls)} className="toggle-controls-button">
          Sort & Filter {showControls ? ' ▲' : ' ▼'}
        </button>
      </div>

      {/* Conditionally render controls */}
      {showControls && (
        <>
          {/* Sorting Controls */}
          <div className="controls-container sort-controls">
        <span>Sort by:</span>
        <button onClick={() => handleSort('name')} className={sortConfig.key === 'name' ? 'active' : ''}>
          Name{getSortIndicator('name')}
        </button>
        <button onClick={() => handleSort('price')} className={sortConfig.key === 'price' ? 'active' : ''}>
          Price{getSortIndicator('price')}
        </button>
        <button onClick={() => handleSort('quantityAvailable')} className={sortConfig.key === 'quantityAvailable' ? 'active' : ''}> {/* Use correct key */}
          Availability{getSortIndicator('quantityAvailable')} {/* Use correct key */}
        </button>
        {sortConfig.key && <button onClick={clearSort} className="clear-button">Clear Sort</button>}
      </div>

      {/* Filtering Controls */}
      <div className="controls-container filter-controls">
        <span>Filter by:</span>
        <div className="filter-group">
          <label>Price:</label>
          <input
            type="number"
            name="minPrice"
            placeholder="Min"
            value={filterConfig.minPrice}
            onChange={handleFilterChange}
            min="0"
            step="0.01"
          />
          <span>-</span>
          <input
            type="number"
            name="maxPrice"
            placeholder="Max"
            value={filterConfig.maxPrice}
            onChange={handleFilterChange}
            min="0"
            step="0.01"
          />
        </div>
        <div className="filter-group">
          <label>Availability:</label>
          <input
            type="number"
            name="minQuantityAvailable" // Renamed
            placeholder="Min"
            value={filterConfig.minQuantityAvailable} // Renamed
            onChange={handleFilterChange}
            min="0"
            step="1"
          />
          <span>-</span>
          <input
            type="number"
            name="maxQuantityAvailable" // Renamed
            placeholder="Max"
            value={filterConfig.maxQuantityAvailable} // Renamed
            onChange={handleFilterChange}
            min="0"
            step="1"
          />
        </div>
        <button onClick={applyFilters} className="apply-button">Apply Filters</button>
        {(activeFilters.minPrice !== null || activeFilters.maxPrice !== null || activeFilters.minQuantityAvailable !== null || activeFilters.maxQuantityAvailable !== null) && ( // Use correct state keys
            <button onClick={clearFilters} className="clear-button">Clear Filters</button>
        )}
        {/* Wrapper for Availability Buttons to force new line */}
        <div className="availability-buttons-wrapper">
            <button
                onClick={() => handleAvailabilityFilter('available')}
                className={`available-button ${availabilityFilter === 'available' ? 'active' : ''}`}
        >
            Available
        </button>
        <button
            onClick={() => handleAvailabilityFilter('outOfStock')}
            className={`out-of-stock-button ${availabilityFilter === 'outOfStock' ? 'active' : ''}`}
        >
            Out of Stock
            </button>
          </div>
          </div>
        </>
      )}

      <div className="grocery-list items-grid">
        {sortedAndFilteredItems.length > 0 ? (
          sortedAndFilteredItems.map(item => (
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
