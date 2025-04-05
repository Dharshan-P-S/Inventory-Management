import React from 'react';

function CategoryFilter({ categories = [], selectedCategory, onSelectCategory }) {
  return (
    <div className="category-filter-container">
      {categories.map(category => (
        <button
          key={category}
          className={`category-button ${selectedCategory === category ? 'active' : ''}`}
          onClick={() => onSelectCategory(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;
