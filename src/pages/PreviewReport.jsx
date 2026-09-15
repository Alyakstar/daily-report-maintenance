import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import ReportDocument from "../components/ReportDocument";

import {
  getReportsByGroup,
  saveReport,
} from "../utils/storage";

export default function PreviewReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const reportRef = useRef(null);

  const draft = location.state?.draft;

  const [existingReports, setExistingReports] =
    useState([]);

  const [loadingReports, setLoadingReports] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [savingPdf, setSavingPdf] =
    useState(false);

  const [savingReport, setSavingReport] =
    useState(false);

  const [showSuccess, setShowSuccess] =
    useState(false);

  const [showError, setShowError] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [savedRecord, setSavedRecord] =
    useState(null);

  /* =========================================================
     LOAD EXISTING REPORTS

     Group:
     Date + Team Shift + Work Shift
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function loadExistingReports() {
      if (!draft) {
        setLoadingReports(false);
        return;
      }

      setLoadingReports(true);
      setLoadError("");

      try {
        const reports =
          await getReportsByGroup(
            draft.date,
            draft.teamShift,
            draft.workShift
          );

        if (!active) return;

        setExistingReports(reports);
      } catch (err) {
        console.error(
          "Failed loading existing reports:",
          err
        );

        if (!active) return;

        setLoadError(
          err?.message ||
            "Existing report tidak dapat dimuat."
        );
      } finally {
        if (active) {
          setLoadingReports(false);
        }
      }
    }

    loadExistingReports();

    return () => {
      active = false;
    };
  }, [
    draft?.date,
    draft?.teamShift,
    draft?.workShift,
  ]);

  /* =========================================================
     REPORTS SHOWN IN PREVIEW

     Before save:
     existing + draft

     After save:
     existing + saved record

     This prevents duplicate rows after Save.
  ========================================================= */

  const previewReports = useMemo(() => {
    if (!draft) {
      return [];
    }

    if (savedRecord) {
      const alreadyExists =
        existingReports.some(
          (item) =>
            String(item.id) ===
            String(savedRecord.id)
        );

      if (alreadyExists) {
        return existingReports;
      }

      return [
        ...existingReports,
        savedRecord,
      ];
    }

    return [
      ...existingReports,
      draft,
    ];
  }, [
    existingReports,
    draft,
    savedRecord,
  ]);

  /* =========================================================
     NO DRAFT
  ========================================================= */

  if (!draft) {
    return (
      <div className="page">
        <div className="missing-card">
          <h2>Tidak ada draft report.</h2>

          <p>
            Silakan isi Daily Report terlebih
            dahulu.
          </p>

          <button
            className="button button-primary"
            onClick={() =>
              navigate("/input")
            }
          >
            Ke Input Report
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     SAVE CURRENT DRAFT

     IMPORTANT:
     Only the current draft is inserted.
     Existing rows are never overwritten.
  ========================================================= */

  async function save() {
    if (
      savingReport ||
      savedRecord
    ) {
      return;
    }

    setSavingReport(true);

    setShowSuccess(false);
    setShowError(false);

    setErrorMessage("");

    try {
      const record =
        await saveReport(draft);

      setSavedRecord(record);

      /*
       * Refetch the group after save.
       *
       * This is useful if another user
       * also saved a report at almost
       * the same time.
       */
      try {
        const latestReports =
          await getReportsByGroup(
            draft.date,
            draft.teamShift,
            draft.workShift
          );

        setExistingReports(
          latestReports
        );
      } catch (refreshError) {
        console.warn(
          "Report saved, but group refresh failed:",
          refreshError
        );
      }

      setShowSuccess(true);
    } catch (err) {
      console.error(err);

      let message =
        err?.message ||
        "Terjadi kesalahan saat menyimpan report.";

      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes(
          "failed to fetch"
        )
      ) {
        message =
          "Tidak dapat terhubung ke Supabase. Periksa koneksi internet lalu coba lagi.";
      }

      if (
        lowerMessage.includes(
          "row-level security"
        )
      ) {
        message =
          "Supabase menolak proses penyimpanan. Periksa konfigurasi Row Level Security.";
      }

      if (
        lowerMessage.includes(
          "duplicate"
        )
      ) {
        message =
          "Data yang sama kemungkinan sudah tersimpan di database.";
      }

      setErrorMessage(message);
      setShowError(true);
    } finally {
      setSavingReport(false);
    }
  }

  /* =========================================================
     EXPORT CURRENT GROUP TO PDF
  ========================================================= */

  async function exportPdf() {
    if (
      !reportRef.current ||
      loadingReports
    ) {
      return;
    }

    setSavingPdf(true);

    setShowError(false);
    setErrorMessage("");

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

      const w =
        canvas.width * ratio;

      const h =
        canvas.height * ratio;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageWidth - w) / 2,
        (pageHeight - h) / 2,
        w,
        h
      );

      const safeTeamShift =
        String(
          draft.teamShift || ""
        ).replace(/\s+/g, "-");

      const safeWorkShift =
        String(
          draft.workShift || ""
        ).replace(/\s+/g, "-");

      pdf.save(
        `Daily-Report-${draft.date}-${safeTeamShift}-${safeWorkShift}.pdf`
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

  /* =========================================================
     VIEW SAVED REPORT
  ========================================================= */

  function goToSavedReport() {
    setShowSuccess(false);

    if (savedRecord?.id) {
      navigate(
        `/history/${savedRecord.id}`,
        {
          replace: true,
        }
      );
    } else {
      navigate("/history");
    }
  }

  /* =========================================================
     ADD ANOTHER PROBLEM

     Keep:
     - Date
     - Team Shift
     - Work Shift

     Other fields are cleared by InputReport
     only if it supports these carried values.

     For safety we pass a draft containing
     the same report identity.
  ========================================================= */

  function addAnotherReport() {
    setShowSuccess(false);

    navigate("/input", {
      state: {
        draft: {
          date: draft.date,

          teamShift:
            draft.teamShift,

          workShift:
            draft.workShift,

          line: "",
          machine: "",
          machineOption: "",
          source: "",

          lineStop: "",
          frequency: "1",

          problem: "",
          rootcause: "",
          action: "",
          pic: "",

          problemImage: "",
          problemImageName: "",

          actionImage: "",
          actionImageName: "",
        },
      },
    });
  }

  return (
    <div className="page">
      {/* =============================================
          HEADER
      ============================================= */}

      <div className="page-heading">
        <div>
          <span className="eyebrow">
            CHECK BEFORE SAVE
          </span>

          <h1>
            Preview Daily Report
          </h1>

          <p>
            Periksa isi report sebelum
            disimpan ke database cloud.
          </p>
        </div>

        <div className="step-badge">
          <b className="done">
            ✓
          </b>

          <span>
            Input
          </span>

          <i />

          <b>
            2
          </b>

          <span>
            Preview
          </span>
        </div>
      </div>

      {/* =============================================
          EXISTING DATA INFORMATION
      ============================================= */}

      {!loadingReports &&
        !loadError &&
        existingReports.length > 0 && (
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
                Existing Daily Report Found
              </strong>

              <div>
                {existingReports.length} problem
                {existingReports.length > 1
                  ? "s"
                  : ""}{" "}
                untuk tanggal, Team Shift,
                dan Work Shift yang sama sudah
                tersimpan.
                {!savedRecord &&
                  " Draft kamu ditambahkan di baris terakhir Preview."}
              </div>
            </div>
          </div>
        )}

      {loadError && (
        <div className="error-banner">
          Existing report gagal dimuat:{" "}
          {loadError}
        </div>
      )}

      {/* =============================================
          ACTION BUTTONS
      ============================================= */}

      <div className="preview-actions">
        <button
          className="button button-ghost"
          onClick={() =>
            navigate("/input", {
              state: {
                draft,
              },
            })
          }
          disabled={
            savingReport ||
            savingPdf
          }
        >
          ← Back to Edit
        </button>

        <div className="action-cluster">
          <button
            className="button button-secondary"
            onClick={exportPdf}
            disabled={
              savingPdf ||
              savingReport ||
              loadingReports
            }
          >
            {savingPdf
              ? "Creating PDF..."
              : "Export PDF"}
          </button>

          <button
            className="button button-primary"
            onClick={save}
            disabled={
              savingReport ||
              savingPdf ||
              loadingReports ||
              Boolean(savedRecord)
            }
          >
            {savingReport
              ? "Saving..."
              : savedRecord
              ? "Saved ✓"
              : "Save to Supabase"}
          </button>
        </div>
      </div>

      {/* =============================================
          LOADING
      ============================================= */}

      {loadingReports && (
        <div
          className="info-banner"
          style={{
            marginTop: 0,
            marginBottom: "15px",
          }}
        >
          Loading existing Daily Report...
        </div>
      )}

      {/* =============================================
          REPORT PREVIEW

          Existing Supabase data
          +
          Current draft
      ============================================= */}

      <div className="preview-shell">
        <ReportDocument
          reports={previewReports}
          reportRef={reportRef}
        />
      </div>

      {/* =============================================
          SUCCESS MODAL
      ============================================= */}

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
              Problem berhasil ditambahkan
              ke Daily Report yang sama di
              Supabase.
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
                onClick={
                  addAnotherReport
                }
              >
                + Add Another Problem
              </button>

              <button
                className="button button-primary"
                onClick={
                  goToSavedReport
                }
              >
                View Saved Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================
          ERROR MODAL
      ============================================= */}

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
              Proses belum berhasil. Data
              report kamu tetap aman di
              halaman ini.
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

              {!savedRecord && (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setShowError(false);
                    save();
                  }}
                >
                  Try Save Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
