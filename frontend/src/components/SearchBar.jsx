import React from 'react';

function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="search-bar-container">
    <input
      type="text"
      placeholder="Search groceries..."
      value={searchTerm}
      onChange={onSearchChange}
      className="search-bar"
    />
    </div>
  );
}

export default SearchBar;