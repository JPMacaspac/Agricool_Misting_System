import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/Profile";
import DailyLogs from './pages/DailyLogs'; 
import Records from './pages/Records';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/daily-logs" element={<DailyLogs />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Router>
  );
}
