import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddItemForm from '../components/AddItem';

function NewItemPage({ onAddItem, apiError }) {
  const navigate = useNavigate();

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

      {/* Pass the new handler as the onSubmit prop */}
      <AddItemForm onSubmit={handleFormSubmit} />
    </div>
  );
}

export default NewItemPage;