import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import InputReport from "./pages/InputReport";
import PreviewReport from "./pages/PreviewReport";
import History from "./pages/History";
import SavedPreview from "./pages/SavedPreview";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/input" element={<InputReport />} />
        <Route path="/preview" element={<PreviewReport />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<SavedPreview />} />
      </Routes>
    </Layout>
  );
}
