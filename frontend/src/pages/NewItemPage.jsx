import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddItemForm from '../components/AddItem';

function NewItemPage({ onAddItem, apiError }) {
  const navigate = useNavigate();
  const [categorySuggestions, setCategorySuggestions] = useState([]);

  // Fetch existing groceries to extract categories for suggestions
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/groceries'); // Or use API_BASE_URL
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Extract unique categories
        const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
        setCategorySuggestions(categories);
      } catch (error) {
        console.error("Error fetching categories for suggestions:", error);
        // Consider setting an error state to inform the user
      }
    };

    fetchCategories();
  }, []);


  const handleFormSubmit = async (newItemData) => {
    const success = await onAddItem(newItemData);

    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="page-container new-item-page">
      <h2>Add New Grocery Item</h2> {/* Keep page title here */}

      {/* Display API errors passed from App.jsx */}
      {apiError && <p className="error-message api-error">{apiError}</p>}

      {/* Pass categories and submit handler to AddItemForm */}
      <AddItemForm onSubmit={handleFormSubmit} categorySuggestions={categorySuggestions} />
    </div>
  );
}

export default NewItemPage;
