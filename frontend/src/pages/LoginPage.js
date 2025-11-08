import React, { useState } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import bg from "../bg.jpg";
import logo from "../logo.svg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8081/login", { email, password });
      if (!res.data.user) {
        if (res.data.message && res.data.message.toLowerCase().includes("email")) {
          alert("There is no existing account for this email.");
        } else {
          alert("Invalid credentials");
        }
        return;
      }
  localStorage.setItem("token", res.data.token || "");
  localStorage.setItem("userName", res.data.user.fullname);
  // store id and email so other pages can fetch latest user info from backend
  if (res.data.user.id) localStorage.setItem("userId", String(res.data.user.id));
  if (res.data.user.email) localStorage.setItem("userEmail", res.data.user.email);
  if (res.data.user.role) localStorage.setItem("userRole", res.data.user.role);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials";
      alert(msg);
    }
  };

  return (
    <div
      className="h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="flex items-center justify-center w-full h-full">
        <form
          onSubmit={handleLogin}
          className="bg-gray-900/80 p-8 rounded-xl shadow-lg text-white backdrop-blur-md w-96"
        >
          <div className="text-center mb-6">
            <img src={logo} alt="logo" className="mx-auto w-12 mb-2" />
            <h2 className="text-2xl font-semibold">Welcome Back</h2>
          </div>

          <input
            type="email"
            placeholder="email@gmail.com"
            className="block mb-4 p-3 w-full text-black rounded focus:outline-none"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative mb-6">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="block p-3 w-full text-black rounded focus:outline-none"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button type="submit" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded w-full font-bold">
            Next →
          </button>

          <p className="text-sm text-center mt-4">
            Don’t have an account?{" "}
            <span
              className="text-blue-400 cursor-pointer hover:underline"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
