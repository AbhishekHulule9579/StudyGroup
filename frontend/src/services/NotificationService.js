// Simple API wrapper for notifications
import apiClient from "../api";

export async function getAllNotifications(userId) {
  const res = await apiClient.get(`/notifications/user/${userId}`);
  return res.data;
}

export async function markNotificationRead(id) {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(userId) {
  await apiClient.put(`/notifications/user/${userId}/read-all`);
}

export async function deleteAllRead(userId) {
  await apiClient.delete(`/notifications/user/${userId}/read`);
}

export async function deleteSelectedNotifications(notificationIds) {
  try {
    await apiClient.delete(`/notifications/selected`, {
      data: notificationIds,
    });
  } catch (error) {
    if (error.response?.status === 403) {
      // Token expired or invalid, redirect to login
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
    throw error;
  }
}

// Utility: map backend NotificationDTO -> UI item shape
export function mapNotificationToUI(n) {
  // Support snake_case or camelCase payloads
  const createdAt = n.createdAt || n.created_at;
  const isRead = typeof n.isRead === "boolean" ? n.isRead : n.is_read;
  const type = n.type || n.category || "Updates";

  const iconMap = {
    Invites: "📬",
    Reminders: "⏰",
    Updates: "💡",
  };
  const icon = iconMap[type] || "💡";
  return {
    id: n.id,
    icon,
    message: n.message || n.title || "",
    timeAgo: formatTimeAgo(createdAt),
    isRead: !!isRead,
    type,
  };
}

function formatTimeAgo(iso) {
  if (!iso) return "Just now";
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
