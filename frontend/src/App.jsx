import "./index.css";
import { Routes, Route, useLocation } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import RootLayout from "./components/root-layout";
import Home from "./pages/home";
import Agent from "./pages/agent";
import CreateAgent from "./pages/create-agent";
import NotFound from "./pages/not-found";
import WrongNetworkModal from "./components/wrong-network-modal";
import SignatureConfirmationModal from "./components/signature-confirmation-modal";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThreadStore } from "./shared/store";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        console.log("Global Error Logged", error);
      },
    },
  },
});

// Component to track route changes and clear thread state
function RouteChangeTracker() {
  const location = useLocation();
  const { clearSelectedThread } = useThreadStore();

  useEffect(() => {
    clearSelectedThread();
    console.log("Route changed, cleared selectedThreadId:", location.pathname);
  }, [location.pathname, clearSelectedThread]);

  return null; // This component doesn't render anything
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RouteChangeTracker />
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/agents/:uniqueId" element={<Agent />} />
              <Route path="/create" element={<CreateAgent />} />
            </Route>
            {/* Catch-all route for undefined routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WrongNetworkModal />
          <SignatureConfirmationModal />
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export default App;
