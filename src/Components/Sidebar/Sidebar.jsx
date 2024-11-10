import { NavLink } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SidebarMenu from "./SidebarMenu";
import { routes } from "./routes";

const SideBar = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);

  const toggle = () => setIsOpen(!isOpen);

  const inputAnimation = {
    hidden: { width: 0, padding: 0, transition: { duration: 0.2 } },
    show: { width: "140px", padding: "5px 15px", transition: { duration: 0.2 } },
  };

  const showAnimation = {
    hidden: { width: 0, opacity: 0, transition: { duration: 0.5 } },
    show: { opacity: 1, width: "auto", transition: { duration: 0.5 } },
  };

  const handleMenuClick = (index) => {
    setActiveMenu(activeMenu === index ? null : index); // Toggle the current menu or close it
    setIsOpen(true);
  };

  return (
    <div className="main-container">
      <motion.div
        animate={{ width: isOpen ? "auto" : "45px", transition: { duration: 0.5, type: "spring", damping: 10 } }}
        className="sidebar"
      >
        <div className="top_section">
          <AnimatePresence>
            {isOpen && (
              <motion.h1 variants={showAnimation} initial="hidden" animate="show" exit="hidden" className="logo">
                ECL
              </motion.h1>
            )}
          </AnimatePresence>
          <div className="bars">
            <FaBars onClick={toggle} />
          </div>
        </div>

        <section className="routes">
          {routes.map((route, index) => {
            if (route.subRoutes) {
              return (
                <SidebarMenu
                  key={index}
                  setIsOpen={setIsOpen}
                  route={route}
                  showAnimation={showAnimation}
                  isOpen={isOpen}
                  isActive={activeMenu === index} // Pass active state
                  onClick={() => handleMenuClick(index)} // Toggle sub-menu
                />
              );
            }

            return (
              <NavLink to={route.path} key={index} className="link" activeClassName="active">
                <div className="icon">{route.icon}</div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div variants={showAnimation} initial="hidden" animate="show" exit="hidden" className="link_text">
                      {route.name}
                    </motion.div>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </section>
      </motion.div>
      {children}
    </div>
  );
};

export default SideBar;
