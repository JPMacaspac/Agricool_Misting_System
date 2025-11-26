import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import axios from 'axios';

export default function NotificationPanel({ apiBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get(`${apiBase}/api/notifications/unread-count`);
        setUnreadCount(response.data.count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [apiBase]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      const fetchNotifications = async () => {
        try {
          const response = await axios.get(`${apiBase}/api/notifications?limit=20`);
          setNotifications(response.data);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      };
      fetchNotifications();
    }
  }, [isOpen, apiBase]);

  const markAsRead = async (id) => {
    try {
      await axios.post(`${apiBase}/api/notifications/mark-read/${id}`);
      setNotifications(prev =>
        prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${apiBase}/api/notifications/mark-all-read`);
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'pump_on':
        return '💧';
      case 'pump_off':
        return '🛑';
      case 'high_temp':
        return '🔥';
      case 'low_water':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-700 transition-colors"
      >
        <FaBell className="text-xl text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-gray-800 border-2 border-[#A1F1FA] rounded-lg shadow-2xl z-50 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#A1F1FA]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #1f2937;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #4b5563;
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #6b7280;
                }
              `}</style>
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FaBell className="text-4xl mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-blue-900/20' : 'hover:bg-gray-700/50'
                      }`}
                      onClick={() => !notif.isRead && markAsRead(notif.id)}
                    >
                      <div className="flex gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${!notif.isRead ? 'text-white' : 'text-gray-300'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}