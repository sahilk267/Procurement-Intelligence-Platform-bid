import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLogin] = useRoute("/login");

  useEffect(() => {
    if (!isAuthenticated && !isLogin) {
      setLocation("/login");
    } else if (isAuthenticated && location === "/") {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, location, isLogin, setLocation]);

  if (!isAuthenticated || isLogin) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
