import { useAuth } from "@/lib/AuthContext";

/**
 * Returns { role, isAdmin, isClient, isLoading }
 * role === "admin" if user.role === "admin"
 * role === "user" / "client" otherwise
 */
export function useUserRole() {
  const { user, isLoadingAuth } = useAuth();

  const isAdmin = user?.role === "admin";
  const isClient = !!user && !isAdmin;

  return {
    role: isAdmin ? "admin" : "client",
    isAdmin,
    isClient,
    isLoading: isLoadingAuth,
  };
}