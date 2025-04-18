import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Import motion
import AddItemForm from '../components/AddItem';

// Define variants locally or import from a shared file
const pageVariants = {
  initial: { opacity: 0, x: "-100vw" },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: "100vw" }
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 }; // Faster duration

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
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-container new-item-page" // Apply existing classes here
    >
      <h2>Add New Grocery Item</h2> {/* Keep page title here */}

      {/* Display API errors passed from App.jsx */}
      {apiError && <p className="error-message api-error">{apiError}</p>}

      {/* Pass categories and submit handler to AddItemForm */}
      <AddItemForm onSubmit={handleFormSubmit} categorySuggestions={categorySuggestions} />
    </motion.div>
  );
}

export default NewItemPage;
