import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import bg from '../bg.jpg';
import logo from '../logo.svg';

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8081/signup", { name, email, password });
      if (res.data && res.data.user) {
        alert("Account created successfully!");
        navigate("/");
      } else {
        const msg = res.data?.message || "Signup failed";
        alert(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Signup failed";
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
          onSubmit={handleSignup}
          className="bg-gray-900/80 p-8 rounded-xl shadow-lg text-white backdrop-blur-md w-96"
        >
          <div className="text-center mb-6">
            <img src={logo} alt="logo" className="mx-auto w-12 mb-2" />
            <h2 className="text-2xl font-semibold">Create an Account</h2>
          </div>

          <input
            type="text"
            placeholder="Full Name"
            className="block mb-4 p-3 w-full text-black rounded focus:outline-none"
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
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

          <button type="submit" className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded w-full font-bold">
            Sign Up
          </button>

          <p className="text-sm text-center mt-4">
            Already have an account?{" "}
            <span
              className="text-blue-400 cursor-pointer hover:underline"
              onClick={() => navigate("/")}
            >
              Login here
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
