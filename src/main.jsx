import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { SocErrorBoundary } from "@/components/errors/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SocErrorBoundary fallbackTitle="SOC shell fault">
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </SocErrorBoundary>
  </React.StrictMode>,
);
