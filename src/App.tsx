import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { HashRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Page from "./components/Layout/Page";
import PageFooter from "./components/Layout/PageFooter";
import PageHeader from "./components/Layout/PageHeader";
import { Provider as AxonBridgeProvider } from "./contexts/AxonBridgeContext";
import AxonBridgeApp from "./views/AxonBridgeApp";

function App() {
  const queryClient = new QueryClient();
  const [activeView, setActiveView] = useState<string>("deposit");
  const handleViewChange = (view: string) => {
    setActiveView(view);
  };
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AxonBridgeProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/v1" />}></Route>
            <Route
              path=":version/"
              element={
                <Page>
                  <PageHeader onViewChange={handleViewChange}></PageHeader>
                  <AxonBridgeApp activeView={activeView} />
                  <PageFooter></PageFooter>
                </Page>
              }
            ></Route>
          </Routes>
        </AxonBridgeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
