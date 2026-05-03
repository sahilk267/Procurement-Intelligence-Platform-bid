import { Link, useLocation } from "wouter";
import { 
  Briefcase, 
  LayoutDashboard, 
  FileText, 
  Search, 
  Building2, 
  Calculator, 
  FolderOpen, 
  BookOpen, 
  CalendarDays, 
  Users, 
  MessageSquare, 
  Settings,
  Target,
  ShieldCheck,
  Package,
  Scale,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const primaryNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tenders", url: "/tenders", icon: Search },
  { title: "Bids Pipeline", url: "/bids", icon: Target },
  { title: "Bid Comparison", url: "/bids/compare", icon: Scale },
  { title: "Proposals", url: "/proposals", icon: FileText },
];

const intelligenceNav = [
  { title: "AI Analysis", url: "/analysis", icon: Briefcase },
  { title: "Eligibility", url: "/eligibility", icon: Building2 },
  { title: "BOQ Intel", url: "/boq", icon: Calculator },
  { title: "Competitors", url: "/competitors", icon: Users },
  { title: "Clarifications", url: "/clarifications", icon: MessageSquare },
];

const resourcesNav = [
  { title: "Documents", url: "/documents", icon: FolderOpen },
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Vendors & OEMs", url: "/vendors", icon: Users },
  { title: "Suppliers", url: "/suppliers", icon: Package },
  { title: "Settings", url: "/settings", icon: Settings },
];

const ADMIN_ROLES = ["company_owner", "admin", "super_admin", "manager"];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) => location.startsWith(url);
  const isAdmin = user && ADMIN_ROLES.includes(user.role || "");

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="py-4">
        <div className="flex items-center gap-2 px-4">
          <div className="bg-primary text-primary-foreground p-1 rounded">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="font-bold text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden">
            ProcureIntel
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin Panel">
                    <Link href="/admin" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
