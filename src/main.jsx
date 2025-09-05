import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import { supabase } from "./lib/supabase";

// Handle auth callback
const HandleAuthCallback = () => {
  useEffect(() => {
    // Check if we have a hash in the URL (auth callback)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Let Supabase handle the auth callback
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          // Remove the hash from the URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      });
    }
  }, []);

  return <App />;
};

const router = createBrowserRouter([
  { 
    path: "/", 
    element: <HandleAuthCallback /> 
  }
], {
  basename: "/moods"
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
