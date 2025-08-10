import { Outlet } from "react-router";
import Header from "./header";
import Footer from "./footer";
import { Toaster } from "./ui/sonner";
import WalletConnectModal from "./wallet-connect-modal";
import { useIsMobile } from "@/hooks/use-mobile";

const RootLayout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="w-full bg-background text-primary">
      <div className="grid min-h-screen grid-rows-[auto_1fr_auto]">
        <Header className="z-10" />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster position={isMobile ? "top-right" : "bottom-right"} />
      <WalletConnectModal />
    </div>
  );
};

export default RootLayout;
