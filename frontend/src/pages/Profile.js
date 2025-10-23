import React from "react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();
  const name = localStorage.getItem("userName") || "User";

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">{name}'s Profile</h1>
      <p className="mb-6">Here you can show user info, update settings, etc.</p>
      <button
        onClick={() => navigate("/dashboard")}
        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
