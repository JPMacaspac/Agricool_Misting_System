import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/Profile";
import DailyLogs from './pages/DailyLogs'; 
import Records from './pages/Records';
import Reports from './components/Reports';

export default function App() {
  // Define apiBase - Use existing env variable
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8081';

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/daily-logs" element={<DailyLogs />} />
        <Route path="/records" element={<Records />} />
        <Route path="/reports" element={<Reports apiBase={apiBase} />} />
      </Routes>
    </Router>
  );
}