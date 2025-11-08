import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";
import MarketDetailPage from "./pages/MarketDetailPage";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/market/:marketId" element={<MarketDetailPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
