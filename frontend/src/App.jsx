import "./index.css";
import { Routes, Route } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import RootLayout from "./components/root-layout";
import Home from "./pages/home";
import Token from "./pages/token";
import CreateAgent from "./pages/create-agent";
import { WagmiProvider } from "wagmi";
import { config } from "./wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/agent" element={<Token />} />
              <Route path="/create" element={<CreateAgent />} />
            </Route>
          </Routes>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}

export default App; 