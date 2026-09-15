import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import ReportDocument from "../components/ReportDocument";

import {
  getReport,
  getReportsByGroup,
} from "../utils/storage";

export default function SavedPreview() {
  const { id } = useParams();

  const navigate = useNavigate();

  const reportRef = useRef(null);

  const [busy, setBusy] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [reports, setReports] =
    useState([]);

  const [error, setError] =
    useState("");

  /* =========================================================
     LOAD SAVED DAILY REPORT GROUP

     1. Cari row berdasarkan ID
     2. Ambil Date + Team Shift + Work Shift
     3. Ambil seluruh problem dalam group tersebut
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadReportGroup() {
      setLoading(true);
      setError("");

      try {
        /*
         * ID digunakan untuk mencari
         * identitas Daily Report.
         */
        const selectedReport =
          await getReport(id);

        /*
         * Setelah tahu Date + Team Shift
         * + Work Shift, ambil semua
         * problem pada Daily Report
         * yang sama.
         */
        const group =
          await getReportsByGroup(
            selectedReport.date,
            selectedReport.teamShift,
            selectedReport.workShift
          );

        if (!active) {
          return;
        }

        /*
         * Fallback:
         * kalau karena suatu alasan query
         * group kosong, minimal row yang
         * dipilih tetap bisa ditampilkan.
         */
        if (group.length > 0) {
          setReports(group);
        } else {
          setReports([
            selectedReport,
          ]);
        }
      } catch (err) {
        console.error(err);

        if (!active) {
          return;
        }

        setError(
          err?.message ||
            "Report tidak ditemukan."
        );

        setReports([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReportGroup();

    return () => {
      active = false;
    };
  }, [id]);

  /* =========================================================
     EXPORT WHOLE GROUP TO PDF
  ========================================================= */

  async function exportPdf() {
    if (
      !reportRef.current ||
      reports.length === 0
    ) {
      return;
    }

    setBusy(true);

    try {
      const canvas =
        await html2canvas(
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
        (pageWidth - margin * 2) /
          canvas.width,

        (pageHeight - margin * 2) /
          canvas.height
      );

      const width =
        canvas.width * ratio;

      const height =
        canvas.height * ratio;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height
      );

      const firstReport =
        reports[0];

      const safeTeamShift =
        String(
          firstReport.teamShift || ""
        ).replace(/\s+/g, "-");

      const safeWorkShift =
        String(
          firstReport.workShift || ""
        ).replace(/\s+/g, "-");

      pdf.save(
        `Daily-Report-${firstReport.date}-${safeTeamShift}-${safeWorkShift}.pdf`
      );
    } catch (err) {
      console.error(
        "PDF export failed:",
        err
      );

      alert(
        "Export PDF gagal dibuat. Silakan coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="page">
        <div className="info-banner">
          <strong>
            Loading...
          </strong>

          <span>
            Mengambil Daily Report dari
            Supabase.
          </span>
        </div>
      </div>
    );
  }

  /* =========================================================
     NOT FOUND / ERROR
  ========================================================= */

  if (reports.length === 0) {
    return (
      <div className="page">
        <div className="missing-card">
          <h2>
            Report tidak ditemukan.
          </h2>

          <p>
            {error}
          </p>

          <button
            className="button button-primary"
            onClick={() =>
              navigate("/history")
            }
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  const firstReport =
    reports[0];

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="page">

      {/* HEADER */}

      <div className="page-heading">
        <div>
          <span className="eyebrow">
            SAVED REPORT
          </span>

          <h1>
            Daily Report Preview
          </h1>

          <p>
            Menampilkan seluruh problem
            dengan Date, Team Shift, dan
            Work Shift yang sama.
          </p>
        </div>
      </div>

      {/* GROUP INFORMATION */}

      <div
        className="info-banner"
        style={{
          marginTop: 0,
          marginBottom: "15px",
        }}
      >
        <span>
          ℹ️
        </span>

        <div>
          <strong>
            Daily Report Group
          </strong>

          <div>
            {firstReport.date}
            {" • "}
            {firstReport.teamShift}
            {" • "}
            {firstReport.workShift}
            {" • "}
            {reports.length} Problem
            {reports.length > 1
              ? "s"
              : ""}
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}

      <div className="preview-actions">
        <button
          className="button button-ghost"
          onClick={() =>
            navigate("/history")
          }
          disabled={busy}
        >
          ← Back to History
        </button>

        <button
          className="button button-primary"
          onClick={exportPdf}
          disabled={busy}
        >
          {busy
            ? "Creating PDF..."
            : "Export Full PDF"}
        </button>
      </div>

      {/* REPORT */}

      <div className="preview-shell">
        <ReportDocument
          reports={reports}
          reportRef={reportRef}
        />
      </div>
    </div>
  );
}
