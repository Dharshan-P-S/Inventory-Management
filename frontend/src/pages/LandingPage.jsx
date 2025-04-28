import React, { useState, useEffect, useRef } from 'react'; // Import hooks
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion'; // Import motion, AnimatePresence, and useInView
import './LandingPage.css';

// Animation variants for staggering children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Stagger animation of child elements
      delayChildren: 0.3, // Wait a bit before starting children animations
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 },
  },
};

const techItemHover = {
  scale: 1.1,
  transition: { duration: 0.2 }
};

// Variants for the fixed buttons fade in/out
const fixedButtonsVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

function LandingPage() {
  const [showFixedButtons, setShowFixedButtons] = useState(true);
  const footerRef = useRef(null); // Ref to track the footer element

  // Refs and inView states for each section
  const aboutRef = useRef(null);
  const inViewAbout = useInView(aboutRef, { amount: "some" });

  const whyRef = useRef(null);
  const inViewWhy = useInView(whyRef, { amount: "some" });

  const userFlowRef = useRef(null);
  const inViewUserFlow = useInView(userFlowRef, { amount: "some" });

  const footerMotionRef = useRef(null); // Renamed to avoid conflict with footerRef
  const inViewFooter = useInView(footerMotionRef, { amount: "some" });


  useEffect(() => {
    const handleScroll = () => {
      if (footerRef.current) {
        const footerTop = footerRef.current.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        // Hide fixed buttons if the top of the footer is within, say, 100px of the bottom of the viewport
        setShowFixedButtons(footerTop > windowHeight - 100);
      } else {
        // Fallback if ref not ready, hide when scrolled down significantly
        setShowFixedButtons(window.scrollY < document.body.scrollHeight - window.innerHeight - 150);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  return (
    // Use motion.div for the main container with variants
    <motion.div
      className="landing-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Fixed Buttons Container */}
      <AnimatePresence>
        {showFixedButtons && (
          <motion.div
            className="fixed-actions"
            variants={fixedButtonsVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }} // Smooth transition
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login" className="btn btn-fixed btn-primary-fixed">Login</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register" className="btn btn-fixed btn-secondary-fixed">Register</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with motion */}
      <motion.header className="landing-header" variants={itemVariants}>
        <h1>Welcome to Inventory Management System</h1> {/* Changed Name */}
        <p className="tagline">Streamline Your Stock, Simplify Your Business.</p>
      </motion.header>

      {/* About Section with motion */}
      <motion.section
        ref={aboutRef} // Assign ref
        className="landing-about"
        variants={itemVariants}
        initial="hidden"
        animate={inViewAbout ? "visible" : "hidden"} // Control animation with inView
      >
        <h2>About the Project</h2>
        <p>
          Inventory Management System is a comprehensive solution designed to help businesses
          efficiently track and manage their inventory. Whether you're a small shop or a growing
          enterprise, our platform provides the tools you need to stay organized, reduce waste,
          and make informed decisions. From adding new items and updating stock levels to
          tracking sales and managing user access, we've got you covered.
        </p>
      </motion.section>

      {/* Why Choose Us Section with motion */}
      <motion.section
        ref={whyRef} // Assign ref
        className="landing-why"
        variants={itemVariants}
        initial="hidden"
        animate={inViewWhy ? "visible" : "hidden"} // Control animation with inView
      >
        <h2>Why Choose Us?</h2>
        <ul>
          <li><strong>Real-time Tracking:</strong> Keep an accurate count of your stock levels instantly.</li>
          <li><strong>User Roles:</strong> Differentiate between owners and customers with specific permissions.</li>
          <li><strong>History Logs:</strong> Track edits, sales, and deletions for accountability.</li>
          <li><strong>Secure Authentication:</strong> Robust login, registration, and password management.</li>
          <li><strong>Intuitive Interface:</strong> Easy-to-use design for seamless operation.</li>
        </ul>
      </motion.section>

      {/* User Flow Section with motion */}
      <motion.section
        ref={userFlowRef} // Assign ref
        className="landing-user-flow"
        variants={itemVariants}
        initial="hidden"
        animate={inViewUserFlow ? "visible" : "hidden"} // Control animation with inView
      >
        <h2>Experience the Inventory Management System</h2>
        <p>
          See how easy it is to manage your inventory with our intuitive system.
        </p><br />
        <div className="user-flow-steps">
          <div className="flow-step">
            {/* Replaced with Wikimedia Commons User Icon */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/commons/thumb/7/7c/User_font_awesome.svg/512px-User_font_awesome.svg.png" alt="Login" />
            <h3>Login</h3>
            <p>Securely access your account.</p>
          </div>
          <div className="flow-step">
            {/* Replaced with Wikimedia Commons Plus Icon */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/commons/thumb/6/69/Plus_big.svg/640px-Plus_big.svg.png" alt="Add Item" />
            <h3>Add Items</h3>
            <p>Easily add new products to your inventory.</p>
          </div>
          <div className="flow-step">
            {/* Replaced with Wikimedia Commons List Icon */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/commons/thumb/4/4d/Noun_Project_list_icon_119366_cc.svg/640px-Noun_Project_list_icon_119366_cc.svg.png" alt="View Inventory" />
            <h3>View Inventory</h3>
            <p>Get a clear overview of your current stock.</p>
          </div>
          <div className="flow-step">
            {/* Replaced with Wikimedia Commons Shopping Cart Icon */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/commons/thumb/d/df/Shopping_cart_icon.svg/512px-Shopping_cart_icon.svg.png" alt="Manage Orders" />
            <h3>Manage Orders</h3>
            <p>Process and track customer orders efficiently.</p>
          </div>
        </div>
      </motion.section>

      {/* Footer with motion */}
      <motion.footer
        ref={footerMotionRef} // Assign ref
        className="landing-footer"
        variants={itemVariants}
        initial="hidden"
        animate={inViewFooter ? "visible" : "hidden"} // Control animation with inView
      >
        <p>Ready to get started?</p>
        <motion.div className="landing-actions" variants={itemVariants}>
          {/* Add motion to buttons for subtle hover effect */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/login" className="btn btn-primary">Login</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </motion.div>
        </motion.div>
      </motion.footer>
    </motion.div>
  );
}

export default LandingPage;
