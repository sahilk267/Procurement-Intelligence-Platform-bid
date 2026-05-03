import { Link } from "wouter";
import { Search, Bell, UserCircle, AlertTriangle, Clock, FileWarning, Target, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

const TYPE_ICON: Record<string, any> = {
  tender_deadline: Clock,
  document_expired: FileWarning,
  document_expiry: FileWarning,
  stale_bid: Target,
};

const SEV_COLOR: Record<string, string> = {
  urgent: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

export function AppHeader() {
  const { user, logout } = useAuth();
  const { data } = useNotifications();

  const notifications: any[] = data?.data || [];
  const unread: number = data?.unread || 0;
  const preview = notifications.slice(0, 5);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger />
      <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tenders, bids..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unread > 0 && (
                <Badge className="bg-red-500 text-white text-[10px] h-5 px-1.5">
                  {unread} unread
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {preview.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                All clear — no alerts right now
              </div>
            ) : (
              preview.map((n: any) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                return (
                  <DropdownMenuItem key={n.id} asChild className="cursor-pointer p-0">
                    <Link href={n.link} className="flex items-start gap-3 px-3 py-2.5 w-full">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${SEV_COLOR[n.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug line-clamp-1">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-0">
              <Link href="/notifications" className="flex items-center justify-between px-3 py-2 text-sm font-medium text-primary cursor-pointer w-full">
                View all notifications
                <ChevronRight className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-6 w-6" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
