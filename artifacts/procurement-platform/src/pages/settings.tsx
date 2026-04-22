import { useGetCompanyProfile, useGetCurrentUser } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Building2, User, LogOut, Shield, Bell, CreditCard } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetCompanyProfile();
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings.</p>
      </div>

      {/* User Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Your Account</CardTitle>
          </div>
          <CardDescription>Personal account information and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {(currentUser?.name || user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentUser?.name || user?.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email || user?.email}</p>
                <Badge variant="outline" className="capitalize text-xs mt-1">{currentUser?.role || user?.role}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Company Profile</CardTitle>
          </div>
          <CardDescription>Your organization's registered details used for eligibility checks.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : profile ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-medium">{profile.name}</span>
              </div>
              {profile.registrationNumber && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">Registration No.</span>
                  <span className="font-medium">{profile.registrationNumber}</span>
                </div>
              )}
              {profile.pan && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">PAN</span>
                  <span className="font-medium">{profile.pan}</span>
                </div>
              )}
              {profile.gstin && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">GSTIN</span>
                  <span className="font-medium">{profile.gstin}</span>
                </div>
              )}
              {profile.annualTurnover && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">Annual Turnover</span>
                  <span className="font-medium">₹{(profile.annualTurnover / 10000000).toFixed(2)} Cr</span>
                </div>
              )}
              {profile.employeeCount && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium">{profile.employeeCount}</span>
                </div>
              )}
              {profile.classifications && profile.classifications.length > 0 && (
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">Classifications</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.classifications.map((c: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No company profile found.</p>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Portal Integrations</CardTitle>
          </div>
          <CardDescription>Connected government procurement portals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "GeM Portal", desc: "Government e-Marketplace", status: "Connected" },
              { name: "CPPP", desc: "Central Public Procurement Portal", status: "Connected" },
              { name: "eProcure", desc: "NIC e-Procurement System", status: "Disconnected" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.desc}</p>
                </div>
                <Badge variant={integration.status === "Connected" ? "default" : "secondary"}>
                  {integration.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
