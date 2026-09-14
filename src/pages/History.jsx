import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

  const [date, setDate] = useState("All");
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
  // AVAILABLE DATES
  // =========================================================

  const dates = useMemo(() => {
    return [
      ...new Set(
        reports
          .map((report) => report.date)
          .filter(Boolean)
      ),
    ]
      .sort()
      .reverse();
  }, [reports]);

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

        const dateOk =
          date === "All" ||
          report.date === date;

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
    date,
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
  // RENDER PDF
  // =========================================================

  async function renderPdf(
    fileName
  ) {
    setExporting(true);

    try {
      // Tunggu React render ReportDocument
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            350
          )
      );

      if (!pdfRef.current) {
        throw new Error(
          "Template PDF belum siap."
        );
      }

      const canvas =
        await html2canvas(
          pdfRef.current,
          {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#ffffff",
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

      const maxWidth =
        pageWidth -
        margin * 2;

      const maxHeight =
        pageHeight -
        margin * 2;

      const ratio = Math.min(
        maxWidth /
          canvas.width,
        maxHeight /
          canvas.height
      );

      const width =
        canvas.width *
        ratio;

      const height =
        canvas.height *
        ratio;

      const x =
        (pageWidth -
          width) /
        2;

      const y =
        (pageHeight -
          height) /
        2;

      pdf.addImage(
        canvas.toDataURL(
          "image/png"
        ),
        "PNG",
        x,
        y,
        width,
        height
      );

      pdf.save(fileName);
    } catch (err) {
      console.error(err);

      alert(
        `Export PDF gagal: ${
          err.message || err
        }`
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
      renderPdf(
        `Daily-Report-${report.date}-${report.machine}.pdf`
      );
    }, 150);
  }

  // =========================================================
  // DOWNLOAD FULL DAILY REPORT
  // =========================================================

  function downloadFull() {
    if (
      filtered.length === 0
    ) {
      alert(
        "Tidak ada data untuk didownload."
      );

      return;
    }

    /*
      Kita cek kombinasi header Daily Report.

      Contoh satu group:
      2026-09-14 | White | Night Shift

      Kalau hasil filter punya lebih dari satu group,
      jangan dicampur ke satu PDF karena header-nya
      hanya bisa menampilkan satu tanggal dan satu shift.
    */

    const groups = {};

    filtered.forEach(
      (report) => {
        const key = `${
          report.date || ""
        }|${
          report.teamShift ||
          ""
        }|${
          report.workShift ||
          ""
        }`;

        if (!groups[key]) {
          groups[key] =
            [];
        }

        groups[key].push(
          report
        );
      }
    );

    const groupKeys =
      Object.keys(groups);

    if (
      groupKeys.length > 1
    ) {
      alert(
        "Data yang tampil masih terdiri dari beberapa tanggal atau shift.\n\n" +
          "Gunakan filter sampai report hanya memiliki satu kombinasi:\n" +
          "Tanggal + Team Shift + Work Shift.\n\n" +
          "Setelah itu klik Download Full Daily Report lagi."
      );

      return;
    }

    const firstReport =
      filtered[0];

    const safeWorkShift =
      String(
        firstReport.workShift ||
          "Shift"
      ).replaceAll(
        " ",
        "-"
      );

    const safeTeamShift =
      String(
        firstReport.teamShift ||
          "Team"
      ).replaceAll(
        " ",
        "-"
      );

    setExportReports(
      filtered
    );

    setTimeout(() => {
      renderPdf(
        `Daily-Report-${firstReport.date}-${safeTeamShift}-${safeWorkShift}.pdf`
      );
    }, 150);
  }

  // =========================================================
  // RESET FILTER
  // =========================================================

  function resetFilters() {
    setSearch("");

    setDate("All");

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

          {/* DATE */}

          <label>
            <span>
              Tanggal
            </span>

            <select
              value={date}
              onChange={(
                event
              ) =>
                setDate(
                  event.target
                    .value
                )
              }
            >

              <option value="All">
                Semua Tanggal
              </option>

              {dates.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatDate(
                      item
                    )}
                  </option>
                )
              )}

            </select>
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
              Full PDF dapat
              dibuat selama hasil
              filter hanya memiliki
              satu tanggal dan satu
              shift.
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

      {exportReports.length >
        0 && (

        <div className="pdf-hidden-container">

          <ReportDocument
            reports={
              exportReports
            }
            reportRef={
              pdfRef
            }
          />

        </div>

      )}

    </div>
  );
}