import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

import { LINES } from "../constants";
import { deleteReport, getReports } from "../utils/storage";
import { formatDate } from "../utils/format";

import EmptyState from "../components/EmptyState";
import ReportDocument from "../components/ReportDocument";

export default function History() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [line, setLine] = useState("All");
  const [machine, setMachine] = useState("All");

  const [teamShift, setTeamShift] = useState("All");
  const [workShift, setWorkShift] = useState("All");

  const [exportReports, setExportReports] = useState([]);
  const [exporting, setExporting] = useState(false);

  // =========================================================
  // LOAD REPORTS
  // =========================================================

  async function load() {
    setLoading(true);

    try {
      const data = await getReports();

      setReports(data);

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Gagal mengambil data dari Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // =========================================================
  // AVAILABLE MACHINES
  // =========================================================

  const machines = useMemo(() => {
    const base =
      line === "All"
        ? reports
        : reports.filter(
            (report) =>
              report.line === line
          );

    return [
      ...new Set(
        base
          .map(
            (report) =>
              report.machine
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [reports, line]);

  // =========================================================
  // FILTER
  // =========================================================

  const filtered = useMemo(() => {
    return reports.filter(
      (report) => {
        const query =
          search
            .trim()
            .toLowerCase();

        const searchOk =
          !query ||
          [
            report.machine,
            report.problem,
            report.rootcause,
            report.action,
            report.source,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(query)
          );

        const startDateOk =
          !startDate ||
          report.date >= startDate;

        const endDateOk =
          !endDate ||
          report.date <= endDate;

        const dateOk =
          startDateOk &&
          endDateOk;

        const lineOk =
          line === "All" ||
          report.line === line;

        const machineOk =
          machine === "All" ||
          report.machine === machine;

        const teamShiftOk =
          teamShift === "All" ||
          report.teamShift ===
            teamShift;

        const workShiftOk =
          workShift === "All" ||
          report.workShift ===
            workShift;

        return (
          searchOk &&
          dateOk &&
          lineOk &&
          machineOk &&
          teamShiftOk &&
          workShiftOk
        );
      }
    );
  }, [
    reports,
    search,
    startDate,
    endDate,
    line,
    machine,
    teamShift,
    workShift,
  ]);

  // =========================================================
  // DELETE REPORT
  // =========================================================

  async function remove(id) {
    const confirmed =
      window.confirm(
        "Hapus report ini dari Supabase?"
      );

    if (!confirmed) return;

    try {
      await deleteReport(id);

      await load();
    } catch (err) {
      console.error(err);

      alert(
        `Delete gagal: ${
          err.message || err
        }`
      );
    }
  }

  // =========================================================
  // RENDER SINGLE PDF
  // =========================================================

  async function renderPdf(fileName) {
    setExporting(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (!pdfRef.current) {
        throw new Error("Template PDF belum siap.");
      }

      const canvas = await html2canvas(
        pdfRef.current,
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
      const margin = 5;

      const ratio = Math.min(
        (pageWidth - margin * 2) / canvas.width,
        (pageHeight - margin * 2) / canvas.height
      );

      const width = canvas.width * ratio;
      const height = canvas.height * ratio;

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height
      );

      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert(
        `Export PDF gagal: ${err.message || err}`
      );
    } finally {
      setExporting(false);
      setExportReports([]);
    }
  }

  // =========================================================
  // RENDER FULL PDF - ONE GROUP PER PDF PAGE
  // =========================================================

  async function renderFullPdf(fileName) {
    setExporting(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      if (!pdfRef.current) {
        throw new Error("Template PDF belum siap.");
      }

      const pages =
        pdfRef.current.querySelectorAll(
          ".full-pdf-report-page"
        );

      if (!pages.length) {
        throw new Error(
          "Tidak ada halaman report untuk diexport."
        );
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();
      const pageHeight =
        pdf.internal.pageSize.getHeight();
      const margin = 5;

      for (let index = 0; index < pages.length; index += 1) {
        const canvas = await html2canvas(
          pages[index],
          {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          }
        );

        if (index > 0) {
          pdf.addPage("a4", "landscape");
        }

        const ratio = Math.min(
          (pageWidth - margin * 2) / canvas.width,
          (pageHeight - margin * 2) / canvas.height
        );

        const width = canvas.width * ratio;
        const height = canvas.height * ratio;

        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          (pageWidth - width) / 2,
          (pageHeight - height) / 2,
          width,
          height
        );
      }

      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert(
        `Export PDF gagal: ${err.message || err}`
      );
    } finally {
      setExporting(false);
      setExportReports([]);
    }
  }

  // =========================================================
  // DOWNLOAD SINGLE PDF
  // =========================================================

  function downloadSingle(
    report
  ) {
    setExportReports([
      report,
    ]);

    setTimeout(() => {
      renderFullPdf(
        `Daily-Report-${report.date}-${report.machine}.pdf`
      );
    }, 150);
  }

  // =========================================================
  // DOWNLOAD FULL DAILY REPORT
  //
  // Filter bersifat independen:
  // - Team Shift = All  -> semua team
  // - Work Shift = All  -> semua work shift
  // - Date range        -> semua tanggal dalam rentang
  //
  // Hasil tetap dikelompokkan per:
  // Date + Team Shift + Work Shift
  // dan setiap group menjadi halaman PDF sendiri.
  // =========================================================

  function downloadFull() {
    if (filtered.length === 0) {
      alert("Tidak ada data untuk didownload.");
      return;
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      alert(
        "Start Date tidak boleh lebih besar dari End Date."
      );
      return;
    }

    setExportReports(filtered);

    const startLabel =
      startDate ||
      filtered
        .map((report) => report.date)
        .filter(Boolean)
        .sort()[0] ||
      "All-Date";

    const endLabel =
      endDate ||
      filtered
        .map((report) => report.date)
        .filter(Boolean)
        .sort()
        .at(-1) ||
      startLabel;

    const teamLabel =
      teamShift === "All"
        ? "All-Team"
        : teamShift.replaceAll(" ", "-");

    const workLabel =
      workShift === "All"
        ? "All-Work-Shift"
        : workShift.replaceAll(" ", "-");

    const dateLabel =
      startLabel === endLabel
        ? startLabel
        : `${startLabel}_to_${endLabel}`;

    setTimeout(() => {
      renderFullPdf(
        `Full-Daily-Report-${dateLabel}-${teamLabel}-${workLabel}.pdf`
      );
    }, 150);
  }

  // =========================================================
  // DOWNLOAD EXCEL RAW DATA
  // =========================================================

  function downloadExcel() {
    if (filtered.length === 0) {
      alert("Tidak ada data untuk didownload.");
      return;
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      alert(
        "Start Date tidak boleh lebih besar dari End Date."
      );
      return;
    }

    const excelRows = filtered.map((report, index) => ({
      "No.": index + 1,
      Date: report.date || "",
      "Team Shift": report.teamShift || "",
      "Work Shift": report.workShift || "",
      Line: report.line || "",
      Machine: report.machine || "",
      Source: report.source || "",
      Problem: report.problem || "",
      "Line Stop (min)": Number(report.lineStop) || 0,
      Frequency: Number(report.frequency) || 1,
      Rootcause: report.rootcause || "",
      Action: report.action || "",
      PIC: report.pic || "",
      "Created At": report.createdAt || report.created_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 13 },
      { wch: 13 },
      { wch: 15 },
      { wch: 18 },
      { wch: 24 },
      { wch: 10 },
      { wch: 40 },
      { wch: 16 },
      { wch: 12 },
      { wch: 40 },
      { wch: 40 },
      { wch: 18 },
      { wch: 24 },
    ];

    worksheet["!autofilter"] = {
      ref: worksheet["!ref"],
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Raw Data"
    );

    const startLabel =
      startDate ||
      filtered
        .map((report) => report.date)
        .filter(Boolean)
        .sort()[0] ||
      "All-Date";

    const endLabel =
      endDate ||
      filtered
        .map((report) => report.date)
        .filter(Boolean)
        .sort()
        .at(-1) ||
      startLabel;

    const dateLabel =
      startLabel === endLabel
        ? startLabel
        : `${startLabel}_to_${endLabel}`;

    const teamLabel =
      teamShift === "All"
        ? "All-Team"
        : teamShift.replaceAll(" ", "-");

    const workLabel =
      workShift === "All"
        ? "All-Work-Shift"
        : workShift.replaceAll(" ", "-");

    XLSX.writeFile(
      workbook,
      `Daily-Report-Raw-Data-${dateLabel}-${teamLabel}-${workLabel}.xlsx`
    );
  }

  // =========================================================
  // RESET FILTER
  // =========================================================

  function resetFilters() {
    setSearch("");

    setStartDate("");

    setEndDate("");

    setTeamShift("All");

    setWorkShift("All");

    setLine("All");

    setMachine("All");
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="page">

      {/* ================================================= */}
      {/* PAGE HEADER */}
      {/* ================================================= */}

      <div className="page-heading">

        <div>
          <span className="eyebrow">
            CLOUD DATABASE
          </span>

          <h1>
            Report History
          </h1>

          <p>
            Semua data di halaman
            ini dibaca langsung dari
            Supabase.
          </p>
        </div>

        <button
          className="button button-primary"
          onClick={() =>
            navigate("/input")
          }
        >
          ＋ New Report
        </button>

      </div>

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

      {error && (
        <div className="error-banner">

          <strong>
            Supabase error:
          </strong>{" "}

          {error}

        </div>
      )}

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <section className="filter-card">

        <div className="history-filter-grid six">

          {/* SEARCH */}

          <label>
            <span>
              Search
            </span>

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Mesin / problem..."
            />
          </label>

          {/* START DATE */}

          <label>
            <span>
              Start Date
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
            />
          </label>

          {/* END DATE */}

          <label>
            <span>
              End Date
            </span>

            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
            />
          </label>

          {/* TEAM SHIFT */}

          <label>
            <span>
              Team Shift
            </span>

            <select
              value={
                teamShift
              }
              onChange={(
                event
              ) =>
                setTeamShift(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                Semua
              </option>

              <option value="White">
                White
              </option>

              <option value="Red">
                Red
              </option>

            </select>
          </label>

          {/* WORK SHIFT */}

          <label>
            <span>
              Work Shift
            </span>

            <select
              value={
                workShift
              }
              onChange={(
                event
              ) =>
                setWorkShift(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                Semua
              </option>

              <option value="Day Shift">
                Day Shift
              </option>

              <option value="Night Shift">
                Night Shift
              </option>

            </select>
          </label>

          {/* LINE */}

          <label>
            <span>
              Line
            </span>

            <select
              value={line}
              onChange={(
                event
              ) => {
                setLine(
                  event.target
                    .value
                );

                setMachine(
                  "All"
                );
              }}
            >

              <option value="All">
                Semua Line
              </option>

              {LINES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>
          </label>

          {/* MACHINE */}

          <label>
            <span>
              Machine
            </span>

            <select
              value={
                machine
              }
              onChange={(
                event
              ) =>
                setMachine(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                Semua Mesin
              </option>

              {machines.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}

            </select>
          </label>

        </div>

        {/* ================================================= */}
        {/* FILTER FOOTER */}
        {/* ================================================= */}

        <div className="download-all-row">

          <div>

            <div>
              <strong>
                {
                  filtered.length
                }
              </strong>{" "}
              report ditemukan
            </div>

            <div
              style={{
                marginTop:
                  "4px",
                fontSize:
                  "11px",
                color:
                  "#98a2b3",
              }}
            >
              Full PDF mengikuti
              rentang tanggal dan filter
              shift. Pilih Semua untuk
              mengikutsertakan seluruh
              Team / Work Shift.
            </div>

          </div>

          <div
            style={{
              display:
                "flex",
              gap: "8px",
              alignItems:
                "center",
            }}
          >

            <button
              className="button button-ghost"
              onClick={
                resetFilters
              }
              disabled={
                exporting
              }
            >
              Reset Filter
            </button>

            <button
              className="button button-secondary"
              onClick={downloadExcel}
              disabled={
                exporting ||
                !filtered.length
              }
            >
              ↓ Download Excel
            </button>

            <button
              className="button button-secondary"
              onClick={
                downloadFull
              }
              disabled={
                exporting ||
                !filtered.length
              }
            >
              {exporting
                ? "Creating PDF..."
                : "↓ Download Full Daily Report"}
            </button>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <section className="panel no-padding">

        {loading ? (

          <div className="empty-state">

            <h3>
              Loading...
            </h3>

            <p>
              Mengambil report
              dari Supabase.
            </p>

          </div>

        ) : filtered.length ===
          0 ? (

          <EmptyState
            title="Report tidak ditemukan"
            text="Coba ubah filter atau tambahkan report baru."
          />

        ) : (

          <>

            {/* ============================================ */}
            {/* DESKTOP TABLE */}
            {/* ============================================ */}

            <div className="desktop-table">

              <table className="history-table">

                <thead>

                  <tr>
                    <th>
                      No.
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Shift
                    </th>

                    <th>
                      Line
                    </th>

                    <th>
                      Machine
                    </th>

                    <th>
                      Source
                    </th>

                    <th>
                      Problem
                    </th>

                    <th>
                      Line Stop
                    </th>

                    <th>
                      Action
                    </th>

                    <th>
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {filtered.map(
                    (
                      report,
                      index
                    ) => (

                      <tr
                        key={
                          report.id
                        }
                      >

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          {formatDate(
                            report.date
                          )}
                        </td>

                        <td>

                          {
                            report.teamShift
                          }

                          <br />

                          <small>
                            {
                              report.workShift
                            }
                          </small>

                        </td>

                        <td>

                          <span className="tag">
                            {
                              report.line
                            }
                          </span>

                        </td>

                        <td className="strong">
                          {
                            report.machine
                          }
                        </td>

                        <td>
                          {
                            report.source
                          }
                        </td>

                        <td className="truncate-cell">
                          {
                            report.problem
                          }
                        </td>

                        <td>

                          <span className="minute-badge">
                            {
                              report.lineStop
                            }
                            '
                          </span>

                        </td>

                        <td className="truncate-cell">
                          {
                            report.action
                          }
                        </td>

                        <td>

                          <div className="row-actions">

                            <button
                              onClick={() =>
                                navigate(
                                  `/history/${report.id}`
                                )
                              }
                            >
                              View
                            </button>

                            <button
                              className="pdf-link"
                              onClick={() =>
                                downloadSingle(
                                  report
                                )
                              }
                              disabled={
                                exporting
                              }
                            >
                              PDF
                            </button>

                            <button
                              className="danger-link"
                              onClick={() =>
                                remove(
                                  report.id
                                )
                              }
                              disabled={
                                exporting
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* ============================================ */}
            {/* MOBILE */}
            {/* ============================================ */}

            <div className="mobile-cards">

              {filtered.map(
                (report) => (

                  <article
                    className="history-card"
                    key={
                      report.id
                    }
                  >

                    <div className="history-card-top">

                      <span className="tag">
                        {
                          report.line
                        }
                      </span>

                      <span className="minute-badge">
                        {
                          report.lineStop
                        }
                        '
                      </span>

                    </div>

                    <h3>
                      {
                        report.machine
                      }
                    </h3>

                    <p>
                      {
                        report.problem
                      }
                    </p>

                    <div className="history-meta">

                      <span>
                        {formatDate(
                          report.date
                        )}
                      </span>

                      <span>
                        {
                          report.teamShift
                        }{" "}
                        •{" "}
                        {
                          report.workShift
                        }
                      </span>

                      <span>
                        {
                          report.source
                        }
                      </span>

                    </div>

                    <div className="mobile-action-grid">

                      <button
                        className="button button-secondary"
                        onClick={() =>
                          navigate(
                            `/history/${report.id}`
                          )
                        }
                      >
                        View
                      </button>

                      <button
                        className="button button-primary"
                        onClick={() =>
                          downloadSingle(
                            report
                          )
                        }
                        disabled={
                          exporting
                        }
                      >
                        PDF
                      </button>

                      <button
                        className="button button-ghost danger"
                        onClick={() =>
                          remove(
                            report.id
                          )
                        }
                        disabled={
                          exporting
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          </>

        )}

      </section>

      {/* ================================================= */}
      {/* HIDDEN PDF */}
      {/* ================================================= */}

      {exportReports.length > 0 && (
        <div
          className="pdf-hidden-container"
          ref={pdfRef}
        >
          {(() => {
            const groups = {};

            exportReports.forEach((report) => {
              const key =
                `${report.date || ""}|` +
                `${report.teamShift || ""}|` +
                `${report.workShift || ""}`;

              if (!groups[key]) {
                groups[key] = [];
              }

              groups[key].push(report);
            });

            return Object.entries(groups)
              .sort(([keyA], [keyB]) =>
                keyA.localeCompare(keyB)
              )
              .map(([key, group]) => (
                <div
                  className="full-pdf-report-page"
                  key={key}
                >
                  <ReportDocument
                    reports={group}
                  />
                </div>
              ));
          })()}
        </div>
      )}

    </div>
  );
}
