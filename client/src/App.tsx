import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Login from './components/Login';



const App: React.FC = () => {

  

  return (
    <Router>
      <Routes>
        <Route path='/login' element={<Login />} />
         <Route path="/" element={<Login/>} />
      </Routes>
    </Router>
  );
};

export default App;
