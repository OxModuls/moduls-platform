import "./index.css";
import { Routes, Route } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import RootLayout from "./components/root-layout";
import Home from "./pages/home";
import Agent from "./pages/agent";
import CreateAgent from "./pages/create-agent";
import NotFound from "./pages/not-found";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/agents/:uniqueId" element={<Agent />} />
              <Route path="/create" element={<CreateAgent />} />
            </Route>
            {/* Catch-all route for undefined routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export default App;
