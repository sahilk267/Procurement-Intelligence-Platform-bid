import { useQuery } from "@tanstack/react-query";

async function fetchNotifications() {
  const token = localStorage.getItem("token");
  if (!token) return { data: [], total: 0, unread: 0, counts: { urgent: 0, warning: 0, info: 0 } };
  const res = await fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { data: [], total: 0, unread: 0, counts: { urgent: 0, warning: 0, info: 0 } };
  return res.json();
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
