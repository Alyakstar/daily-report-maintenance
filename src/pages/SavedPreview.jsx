import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportDocument from "../components/ReportDocument";
import { getReport } from "../utils/storage";

export default function SavedPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { setReport(await getReport(id)); }
      catch (err) { console.error(err); setError(err.message || "Report tidak ditemukan."); }
      finally { setLoading(false); }
    })();
  }, [id]);

  async function exportPdf() {
    if (!reportRef.current || !report) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), margin = 6;
      const ratio = Math.min((pw - margin * 2) / canvas.width, (ph - margin * 2) / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
      pdf.save(`Daily-Report-${report.date}.pdf`);
    } finally { setBusy(false); }
  }

  if (loading) return <div className="page"><div className="info-banner"><strong>Loading...</strong><span>Mengambil report dari Supabase.</span></div></div>;
  if (!report) return <div className="page"><div className="missing-card"><h2>Report tidak ditemukan.</h2><p>{error}</p><button className="button button-primary" onClick={() => navigate("/history")}>Back to History</button></div></div>;

  return <div className="page">
    <div className="page-heading"><div><span className="eyebrow">SAVED REPORT</span><h1>Daily Report Preview</h1><p>Data ini tersimpan di Supabase.</p></div></div>
    <div className="preview-actions"><button className="button button-ghost" onClick={() => navigate("/history")}>← Back to History</button><button className="button button-primary" onClick={exportPdf} disabled={busy}>{busy ? "Creating PDF..." : "Export PDF"}</button></div>
    <div className="preview-shell"><ReportDocument reports={[report]} reportRef={reportRef} /></div>
  </div>;
}
