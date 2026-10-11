"use client";

import { BrowserRouter as Router, Routes, Route } from "@/lib/router-shim";
import { AuthProvider } from "@/lib/auth-shim";
import HomePage from "@/views/Home";
import LoginPage from "@/views/Login";
import AuthCallbackPage from "@/views/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
