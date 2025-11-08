import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import {
  FaRegCalendarAlt,
  FaClipboardList,
  FaUser,
  FaTimes,
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaChartBar,
} from "react-icons/fa";

export default function Profile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Jp Macaspac");
  const [userEmail, setUserEmail] = useState(localStorage.getItem("userEmail") || "jp.macaspac@gmail.com");
  const [userPhone] = useState(localStorage.getItem("userPhone") || "09123456789");
  const [profilePicture, setProfilePicture] = useState(localStorage.getItem("profilePicture") || "");
  const userRole = localStorage.getItem("userRole") || "Admin";
  const userId = localStorage.getItem("userId");

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState(userEmail);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Alert states
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState(""); // 'success' or 'error'

  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_URL || "http://192.168.1.16:8081";

  // Fetch latest user info from backend (so frontend reflects DB values)
  React.useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const res = await axios.get(`${API_BASE}/api/users/${userId}`);
        if (res.data && res.data.user) {
          const u = res.data.user;
          if (u.fullname) {
            setUserName(u.fullname);
            localStorage.setItem('userName', u.fullname);
          }
          if (u.email) {
            setUserEmail(u.email);
            localStorage.setItem('userEmail', u.email);
          }
          if (u.role) {
            // update role if provided
            // keep localStorage role key for other parts of app
            localStorage.setItem('userRole', u.role);
          }
        }
      } catch (err) {
        // silently ignore; fallback to localStorage values
        console.warn('Failed to fetch user from API', err);
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, API_BASE]);

  const showAlert = (message, type) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMessage("");
      setAlertType("");
    }, 3000);
  };

  const handlePasswordModalOpen = () => {
    setNewEmail(userEmail);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordModal(true);
  };

  // (Edit profile functionality removed — profile fields are read-only in UI)

  const handlePasswordEmailUpdate = async () => {
    if (!currentPassword) {
      showAlert("Please enter your current password", "error");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showAlert("New passwords do not match", "error");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      showAlert("New password must be at least 6 characters", "error");
      return;
    }

    try {
      const updateData = { currentPassword, email: newEmail };
      if (newPassword) updateData.newPassword = newPassword;

      const response = await axios.put(`${API_BASE}/api/users/${userId}/security`, updateData);

      if (response.data.success) {
        if (newEmail !== userEmail) {
          setUserEmail(newEmail);
          localStorage.setItem("userEmail", newEmail);
        }

        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showAlert("Security settings updated successfully!", "success");
      }
    } catch (error) {
      console.error("Failed to update security settings:", error);
      const errorMessage = error.response?.data?.message || "Failed to update. Please check your current password.";
      showAlert(errorMessage, "error");
    }
  };

  // edit modal handlers removed

  const handlePasswordCancel = () => {
    setNewEmail(userEmail);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordModal(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePicture(base64String);
        localStorage.setItem("profilePicture", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-gray-800 min-h-screen text-white font-sans flex flex-col">
      {/* Alert Notification */}
      {alertMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          alertType === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <p className="text-white font-semibold">{alertMessage}</p>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md border-b-2 border-[#A1F1FA]">
        <h1 className="text-xl font-bold">AgriCool</h1>

        <div className="relative">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs">{userName[0]}</span>
              )}
            </div>
            <span className="text-sm">{userName}</span>
          </div>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-md shadow-lg p-2 z-10">
              <button
                onClick={() => navigate('/profile')}
                className="block w-full text-left px-3 py-1 hover:bg-gray-700 rounded"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="block w-full text-left px-3 py-1 hover:bg-gray-700 rounded text-red-400"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar + Profile */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="bg-gray-900 w-20 flex flex-col items-center p-4 gap-6 border-r-2 border-[#A1F1FA]">
          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Dashboard"
            onClick={() => navigate('/dashboard')}
          >
            <FaChartBar className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Daily Log"
            onClick={() => navigate('/daily-logs')}
          >
            <FaRegCalendarAlt className="text-2xl" />
          </button>

          <button
            className="hover:text-[#A1F1FA] transition duration-200"
            title="Records"
            onClick={() => navigate('/records')}
          >
            <FaClipboardList className="text-2xl" />
          </button>

          <div className="flex-1"></div>

          <div className="w-6 h-6 bg-gray-600 rounded-md"></div>
        </aside>

        {/* Main Profile Content: parent is flex so we can center inner box using m-auto */}
        <main className="flex-1 p-6 overflow-auto flex">
          {/* m-auto on this inner container centers it within the main flex area both vertically and horizontally,
              without forcing an oversized min-height (so no big bottom gap). */}
          <div className="m-auto w-full max-w-6xl">
            <h2 className="text-xl font-bold mb-7 text-[#A1F1FA]">Profile</h2>

            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              {/* Left Content - Combined Profile Info + Security */}
              <div className="flex-1 bg-gray-700 rounded-lg p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#A1F1FA] mb-4">Profile Information</h3>
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-1">Full Name</h4>
                      <p className="text-gray-300 break-words">{userName || "Not provided"}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-1">Email Address</h4>
                      <p className="text-gray-300 break-all">{userEmail || "Not provided"}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[#A1F1FA] mb-1">Phone Number</h4>
                      <p className="text-gray-300 break-words">{userPhone || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-600">
                  <h3 className="text-xl font-bold text-[#A1F1FA] mb-4">Security Settings</h3>
                  <button
                    onClick={handlePasswordModalOpen}
                    className="bg-[#A1F1FA] hover:bg-[#11363d] text-gray-900 font-semibold px-5 py-2.5 rounded-md shadow transition"
                  >
                    Change Email & Password
                  </button>
                </div>
              </div>

              {/* Right Profile Card */}
              <div className="w-full md:w-1/3 bg-gray-700 rounded-lg p-8 flex flex-col items-center space-y-3 self-stretch">
                <div className="relative group">
                  <input
                    type="file"
                    id="profilePictureInput"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="profilePictureInput"
                    className="w-28 h-28 bg-gray-600 rounded-full flex items-center justify-center mb-2 cursor-pointer overflow-hidden relative"
                  >
                    {profilePicture ? (
                      <>
                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <FaCamera className="text-white text-xl mb-1" />
                          <span className="text-white text-xs text-center px-2">Add Picture</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <FaUser className="text-5xl text-white group-hover:opacity-30 transition-opacity" />
                        <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                          <FaCamera className="text-white text-xl mb-1" />
                          <span className="text-white text-xs text-center px-2">Add Picture</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
                <h3 className="text-lg font-semibold mt-2">{userName}</h3>
                <p className="text-[#A1F1FA] font-semibold">{userRole}</p>

                <div className="mt-3 space-y-1 text-center flex-1 flex flex-col justify-center">
                  <p className="text-sm text-gray-300 break-all mb-2">{userEmail}</p>
                  <p className="text-sm text-gray-300">{userPhone}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit profile removed - fields are read-only */}

      {/* Change Password & Email Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-700 rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#A1F1FA]">Change Email & Password</h3>
              <button
                onClick={handlePasswordCancel}
                className="text-gray-400 hover:text-white transition"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
                  placeholder="Enter new email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  Current Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">
                  New Password (leave empty to keep current)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A1F1FA]"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePasswordCancel}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordEmailUpdate}
                className="flex-1 bg-[#A1F1FA] hover:bg-[#8DD9E8] text-gray-900 font-semibold px-4 py-2 rounded-md transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMessage && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-md text-white ${
            alertType === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {alertMessage}
        </div>
      )}
    </div>
  );
}
