import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicChat } from "@/components/public/PublicChat";
import { CanvaCallbackHandler } from "@/components/canva/CanvaCallbackHandler";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Policies from "./pages/Policies";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import RequestAccess from "./pages/RequestAccess";
import CbosSetup from "./pages/CbosSetup";

// Log environment check
console.log('[App] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[App] VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
import Report from "./pages/Report";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/cbos-setup" element={<CbosSetup />} />
          <Route path="/cbos" element={<CbosSetup />} />
          <Route path="/setup/cbos" element={<CbosSetup />} />
          <Route path="/report" element={<Report />} />
          <Route path="/auth/callback" element={<CanvaCallbackHandler />} />
          <Route path="/canva/callback" element={<CanvaCallbackHandler />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        <PublicChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
