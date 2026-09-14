import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import ReportDocument from "../components/ReportDocument";
import { saveReport } from "../utils/storage";

export default function PreviewReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const reportRef = useRef(null);

  const [savingPdf, setSavingPdf] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [savedRecord, setSavedRecord] = useState(null);

  const draft = location.state?.draft;

  if (!draft) {
    return (
      <div className="page">
        <div className="missing-card">
          <h2>Tidak ada draft report.</h2>

          <p>
            Silakan isi Daily Report terlebih dahulu.
          </p>

          <button
            className="button button-primary"
            onClick={() => navigate("/input")}
          >
            Ke Input Report
          </button>
        </div>
      </div>
    );
  }

  async function save() {
    if (savingReport) return;

    setSavingReport(true);

    setShowSuccess(false);
    setShowError(false);
    setErrorMessage("");

    try {
      const record = await saveReport(draft);

      setSavedRecord(record);

      setShowSuccess(true);
    } catch (err) {
      console.error(err);

      let message =
        err?.message ||
        "Terjadi kesalahan saat menyimpan report.";

      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes("failed to fetch")) {
        message =
          "Tidak dapat terhubung ke Supabase. Periksa koneksi internet lalu coba lagi.";
      }

      if (lowerMessage.includes("row-level security")) {
        message =
          "Supabase menolak proses penyimpanan. Periksa konfigurasi Row Level Security.";
      }

      if (lowerMessage.includes("duplicate")) {
        message =
          "Data yang sama kemungkinan sudah tersimpan di database.";
      }

      setErrorMessage(message);
      setShowError(true);
    } finally {
      setSavingReport(false);
    }
  }

  async function exportPdf() {
    if (!reportRef.current) return;

    setSavingPdf(true);

    try {
      const canvas = await html2canvas(
        reportRef.current,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }
      );

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      const margin = 6;

      const ratio = Math.min(
        (pageWidth - margin * 2) / canvas.width,
        (pageHeight - margin * 2) / canvas.height
      );

      const w = canvas.width * ratio;
      const h = canvas.height * ratio;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageWidth - w) / 2,
        (pageHeight - h) / 2,
        w,
        h
      );

      pdf.save(
        `Daily-Report-${draft.date}.pdf`
      );
    } catch (err) {
      console.error(err);

      setErrorMessage(
        "Export PDF gagal dibuat. Silakan coba lagi."
      );

      setShowError(true);
    } finally {
      setSavingPdf(false);
    }
  }

  function goToSavedReport() {
    setShowSuccess(false);

    if (savedRecord?.id) {
      navigate(`/history/${savedRecord.id}`, {
        replace: true,
      });
    } else {
      navigate("/history");
    }
  }

  function addAnotherReport() {
    setShowSuccess(false);

    navigate("/input");
  }

  return (
    <div className="page">

      {/* HEADER */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            CHECK BEFORE SAVE
          </span>

          <h1>
            Preview Daily Report
          </h1>

          <p>
            Periksa isi report sebelum disimpan ke database cloud.
          </p>
        </div>

        <div className="step-badge">
          <b className="done">✓</b>

          <span>
            Input
          </span>

          <i></i>

          <b>
            2
          </b>

          <span>
            Preview
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS
          BAGIAN INI TETAP SEPERTI KODE ASLI KAMU
      */}
      <div className="preview-actions">

        <button
          className="button button-ghost"
          onClick={() =>
            navigate("/input", {
              state: { draft },
            })
          }
        >
          ← Back to Edit
        </button>

        <div className="action-cluster">

          <button
            className="button button-secondary"
            onClick={exportPdf}
            disabled={savingPdf || savingReport}
          >
            {savingPdf
              ? "Creating PDF..."
              : "Export PDF"}
          </button>

          <button
            className="button button-primary"
            onClick={save}
            disabled={savingReport || savingPdf}
          >
            {savingReport
              ? "Saving..."
              : "Save to Supabase"}
          </button>

        </div>
      </div>

      {/* REPORT PREVIEW */}
      <div className="preview-shell">
        <ReportDocument
          reports={[draft]}
          reportRef={reportRef}
        />
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="status-modal-overlay">

          <div className="status-modal">

            <div className="status-icon success-status-icon">
              ✓
            </div>

            <span className="status-label success-status-label">
              REPORT SAVED
            </span>

            <h2>
              Successfully Saved!
            </h2>

            <p className="status-description">
              Daily Report berhasil disimpan ke Supabase.
            </p>

            <div className="status-report-info">

              <div>
                <span>
                  Line
                </span>

                <strong>
                  {draft.line || "-"}
                </strong>
              </div>

              <div>
                <span>
                  Machine
                </span>

                <strong>
                  {draft.machine || "-"}
                </strong>
              </div>

              <div>
                <span>
                  Line Stop
                </span>

                <strong>
                  {draft.lineStop || 0}'
                </strong>
              </div>

            </div>

            <div className="status-modal-actions">

              <button
                className="button button-secondary"
                onClick={addAnotherReport}
              >
                + Add Another Report
              </button>

              <button
                className="button button-primary"
                onClick={goToSavedReport}
              >
                View Saved Report
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ERROR MODAL */}
      {showError && (
        <div className="status-modal-overlay">

          <div className="status-modal">

            <div className="status-icon error-status-icon">
              !
            </div>

            <span className="status-label error-status-label">
              OPERATION FAILED
            </span>

            <h2>
              Terjadi Kesalahan
            </h2>

            <p className="status-description">
              Proses belum berhasil. Data report kamu tetap aman di halaman ini.
            </p>

            <div className="error-message-box">

              <strong>
                Error Detail
              </strong>

              <p>
                {errorMessage}
              </p>

            </div>

            <div className="status-modal-actions">

              <button
                className="button button-secondary"
                onClick={() =>
                  setShowError(false)
                }
              >
                Back to Report
              </button>

              <button
                className="button button-primary"
                onClick={() => {
                  setShowError(false);
                  save();
                }}
              >
                Try Save Again
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}