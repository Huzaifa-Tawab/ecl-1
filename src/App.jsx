import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EclCalculator from './Components/ECL Calculator/ecl';
import Sidebar from './Components/Sidebar/Sidebar';
import Login from './Pages/Login/login';
// import Macro from './Components/test/Macro';
import ExcelDataParser from './Components/test/Macro';
import BaselCorrelationCalculator from './Components/test/Baselasset';
import BaselCalculator from './Components/test/Baselasset';

// Define `withSidebar` as a function that returns a new component.
const withSidebar = (Component) => {
  return () => (
    <Sidebar>
      <Component />
    </Sidebar>
  );
};

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Login/>} />
          {/* Use withSidebar as a wrapper for EclCalculator */}
          <Route path="/ecl/calculator" element={withSidebar(EclCalculator)()} />
          <Route path="/test" element={withSidebar(ExcelDataParser)()} />
          {/* <Route path="/output" element={withSidebar(Output)()} /> */}
          <Route path="/basel" element={withSidebar(BaselCalculator

          )()} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
