import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@/services/query/reactQueryLite";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { SocErrorBoundary } from "@/components/errors/ErrorBoundary";
import { queryClient } from "@/services/query/queryClient";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SocErrorBoundary fallbackTitle="SOC shell fault">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </SocErrorBoundary>
  </React.StrictMode>,
);
