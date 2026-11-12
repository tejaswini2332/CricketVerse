import React from "react";
import { CricketProvider, useCricket } from "./context/CricketContext";
import { Header } from "./components/Header";
import { NavTabs } from "./components/NavTabs";
import { PavilionTab } from "./components/PavilionTab";
import { CollectionTab } from "./components/CollectionTab";
import { MarketplaceTab } from "./components/MarketplaceTab";
import { FantasyTab } from "./components/FantasyTab";
import { TicketsTab } from "./components/TicketsTab";
import { PollsTab } from "./components/PollsTab";
import { TournamentsTab } from "./components/TournamentsTab";
import { CardSvgModal } from "./components/CardSvgModal";
import { WalletHelpModal } from "./components/WalletHelpModal";
import { Toast } from "./components/Toast";

const MainContent: React.FC = () => {
  const { currentTab } = useCricket();

  return (
    <div className="cricket-app-wrapper">
      <Header />
      <main className="main-layout">
        <NavTabs />

        {currentTab === "cards" && <PavilionTab />}
        {currentTab === "collection" && <CollectionTab />}
        {currentTab === "marketplace" && <MarketplaceTab />}
        {currentTab === "fantasy" && <FantasyTab />}
        {currentTab === "tickets" && <TicketsTab />}
        {currentTab === "polls" && <PollsTab />}
        {currentTab === "tournaments" && <TournamentsTab />}
      </main>

      <CardSvgModal />
      <WalletHelpModal />
      <Toast />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CricketProvider>
      <MainContent />
    </CricketProvider>
  );
};

export default App;
