import React, { useState, useMemo } from 'react';
import GroceryList from '../components/GroceryList';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';

// Added onUpdateItem prop
function HomePage({ items, onAddToCart, loading, error, currentUser, onDeleteItem, onUpdateItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const categories = useMemo(() => {
    const uniqueCategories = new Set(items.map(item => item.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  if (loading) return <p>Loading groceries...</p>;
  if (error) return <p>Error loading groceries: {error}</p>;

  return (
    <div className="page-container">
      <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
      />
      {/* Pass onUpdateItem down to GroceryList */}
      <GroceryList
        items={filteredItems}
        onAddToCart={onAddToCart}
        currentUser={currentUser}
        onDeleteItem={onDeleteItem}
        onUpdateItem={onUpdateItem}
      />
    </div>
  );
}

export default HomePage;
