import React from 'react';
import { motion } from 'framer-motion'; // Import motion
import Cart from '../components/Cart';

// Define variants locally or import from a shared file
const pageVariants = {
  initial: { opacity: 0, x: "-100vw" },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: "100vw" }
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 }; // Faster duration

// Add onBuy to props
function CartPage({ cartItems, onIncrease, onDecrease, onRemove, onBuy }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-container" // Apply existing class here
    >
      <Cart
        cartItems={cartItems}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
        onBuy={onBuy} // Pass onBuy down to Cart
      />
    </motion.div>
  );
}

export default CartPage;
