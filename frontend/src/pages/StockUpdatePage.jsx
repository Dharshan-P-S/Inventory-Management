import React from 'react';
import { motion } from 'framer-motion'; // Import motion
import StockUpdater from '../components/StockUpdater'; // We will create this component next

// Define variants locally or import from a shared file
const pageVariants = {
  initial: { opacity: 0, x: "-100vw" },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: "100vw" }
};

const pageTransition = { type: "tween", ease: "anticipate", duration: 0.3 }; // Faster duration

function StockUpdatePage({ groceries, onUpdateStock }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="page-container" // Apply existing class here
    >
      <StockUpdater groceries={groceries} onUpdateStock={onUpdateStock} />
    </motion.div>
  );
}

export default StockUpdatePage;
