import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AgeVerification from "./components/AgeVerification";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Profile from "./pages/Profile.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  const [ageVerified, setAgeVerified] = useState(
    () => localStorage.getItem("age_verified") === "true"
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!ageVerified && <AgeVerification onVerified={() => setAgeVerified(true)} />}
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile/:id" element={<Profile />} />
          {/* OAuth callback - redirect to home so auth tokens in hash are processed */}
          <Route path="/~oauth" element={<Navigate to="/" replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
