import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect } from "react";
import { FaAngleDown } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import './sidebar.css';

const menuAnimation = {
  hidden: { opacity: 0, height: 0, padding: 0, transition: { duration: 0.3, when: "afterChildren" } },
  show: { opacity: 1, height: "auto", transition: { duration: 0.3, when: "beforeChildren" } },
};

const menuItemAnimation = {
  hidden: (i) => ({ padding: 0, x: "-100%", transition: { duration: (i + 1) * 0.1 } }),
  show: (i) => ({ x: 0, transition: { duration: (i + 1) * 0.1 } }),
};

const SidebarMenu = ({ route, showAnimation, isOpen, isActive, onClick }) => {
  useEffect(() => {
    if (!isOpen) {
      onClick(null); // Collapse all when sidebar closes
    }
  }, [isOpen, onClick]);

  return (
    <>
      <div className="menu" onClick={onClick}>
        <div className="menu_item">
          <div className="icon">{route.icon}</div>
          <AnimatePresence>
            {isOpen && (
              <motion.div variants={showAnimation} initial="hidden" animate="show" exit="hidden" className="link_text">
                {route.name}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isOpen && (
          <motion.div animate={isActive ? { rotate: -90 } : { rotate: 0 }}>
            <FaAngleDown />
          </motion.div>
        )}
      </div>
      <AnimatePresence>
        {isActive && (
          <motion.div variants={menuAnimation} initial="hidden" animate="show" exit="hidden" className="menu_container">
            {route.subRoutes.map((subRoute, i) => (
              <motion.div variants={menuItemAnimation} key={i} custom={i}>
                <NavLink to={subRoute.path} className="link">
                  <div className="icon">{subRoute.icon}</div>
                  <motion.div className="link_text">{subRoute.name}</motion.div>
                </NavLink>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SidebarMenu;