import React from "react";
import { useCricket } from "../context/CricketContext";

interface TabItem {
  id: string;
  label: string;
}

const TABS: TabItem[] = [
  { id: "cards", label: "The Pavilion" },
  { id: "collection", label: "My Collection" },
  { id: "marketplace", label: "Auction Room" },
  { id: "fantasy", label: "Matchday XI" },
  { id: "tickets", label: "Stadium Passes" },
  { id: "polls", label: "Fan Polls" },
  { id: "tournaments", label: "Tournament Arena" },
];

export const NavTabs: React.FC = () => {
  const { currentTab, setCurrentTab } = useCricket();

  return (
    <nav className="sub-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${currentTab === tab.id ? "active" : ""}`}
          data-tab={tab.id}
          onClick={() => setCurrentTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
