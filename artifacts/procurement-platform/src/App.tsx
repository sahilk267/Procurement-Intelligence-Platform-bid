import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Tenders from "@/pages/tenders";
import Bids from "@/pages/bids";
import Proposals from "@/pages/proposals";
import Analysis from "@/pages/analysis";
import Eligibility from "@/pages/eligibility";
import BoqPage from "@/pages/boq";
import Competitors from "@/pages/competitors";
import Clarifications from "@/pages/clarifications";
import Documents from "@/pages/documents";
import Knowledge from "@/pages/knowledge";
import CalendarPage from "@/pages/calendar";
import Vendors from "@/pages/vendors";
import Settings from "@/pages/settings";
import AdminPanel from "@/pages/admin";
import Suppliers from "@/pages/suppliers";
import BidCompare from "@/pages/bid-compare";
import Notifications from "@/pages/notifications";
import Watchlist from "@/pages/watchlist";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/tenders" component={Tenders} />
        <Route path="/bids" component={Bids} />
        <Route path="/proposals" component={Proposals} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/eligibility" component={Eligibility} />
        <Route path="/boq" component={BoqPage} />
        <Route path="/competitors" component={Competitors} />
        <Route path="/clarifications" component={Clarifications} />
        <Route path="/documents" component={Documents} />
        <Route path="/knowledge" component={Knowledge} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/vendors" component={Vendors} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/bids/compare" component={BidCompare} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
