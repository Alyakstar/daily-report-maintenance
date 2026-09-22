import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import {
  LINES,
  LINE_COLORS,
} from "../constants";

import { getReports } from "../utils/storage";
import { monthKey } from "../utils/format";

/* =========================================================
   HELPERS
========================================================= */

function monthLabel(value) {
  if (!value) {
    return "Semua Bulan";
  }

  const [year, month] =
    value.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    1
  ).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/*
 * Digunakan untuk menyatukan problem
 * yang sebenarnya sama.
 *
 * Contoh:
 *
 * "Motor Overheat"
 * " motor overheat "
 * "MOTOR   OVERHEAT"
 *
 * dianggap sebagai problem yang sama.
 */
function normalizeProblem(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const [reports, setReports] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [month, setMonth] =
    useState("");

  const [line, setLine] =
    useState("All");

  const [machine, setMachine] =
    useState("All");

  /*
   * Drill-down level:
   *
   * line
   * machine
   * problem
   */
  const [chartLevel, setChartLevel] =
    useState("line");

  const [selectedLine, setSelectedLine] =
    useState("");

  const [
    selectedMachine,
    setSelectedMachine,
  ] = useState("");

  /* =========================================================
     LOAD REPORTS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data =
          await getReports();

        if (!mounted) {
          return;
        }

        setReports(data);

        const firstMonth =
          [
            ...new Set(
              data
                .map((report) =>
                  monthKey(report.date)
                )
                .filter(Boolean)
            ),
          ]
            .sort()
            .reverse()[0] || "";

        setMonth(firstMonth);
      } catch (err) {
        console.error(err);

        if (!mounted) {
          return;
        }

        setError(
          err?.message ||
            "Gagal mengambil data dari Supabase."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     AVAILABLE MONTHS
  ========================================================= */

  const months = useMemo(() => {
    return [
      ...new Set(
        reports
          .map((report) =>
            monthKey(report.date)
          )
          .filter(Boolean)
      ),
    ]
      .sort()
      .reverse();
  }, [reports]);

  /* =========================================================
     AVAILABLE MACHINES FOR FILTER
  ========================================================= */

  const availableMachines =
    useMemo(() => {
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

  /* =========================================================
     GLOBAL DASHBOARD FILTER

     Month + Line + Machine
  ========================================================= */

  const filtered = useMemo(() => {
    return reports.filter(
      (report) => {
        const monthOk =
          !month ||
          monthKey(report.date) ===
            month;

        const lineOk =
          line === "All" ||
          report.line === line;

        const machineOk =
          machine === "All" ||
          report.machine ===
            machine;

        return (
          monthOk &&
          lineOk &&
          machineOk
        );
      }
    );
  }, [
    reports,
    month,
    line,
    machine,
  ]);

  /* =========================================================
     LINE PARETO
  ========================================================= */

  const lineChartData =
    useMemo(() => {
      const totals =
        Object.fromEntries(
          LINES.map((item) => [
            item,
            0,
          ])
        );

      filtered.forEach(
        (report) => {
          if (
            totals[report.line] !==
            undefined
          ) {
            totals[report.line] +=
              Number(
                report.lineStop
              ) || 0;
          }
        }
      );

      /*
       * Pareto:
       * terbesar → terkecil
       */
      return Object.entries(totals)
        .map(
          ([name, minutes]) => ({
            name,
            minutes,
            line: name,
          })
        )
        .filter(
          (item) =>
            item.minutes > 0
        )
        .sort(
          (a, b) =>
            b.minutes -
            a.minutes
        );
    }, [filtered]);

  /* =========================================================
     MACHINE PARETO

     Data berdasarkan line yang
     diklik pada chart.
  ========================================================= */

  const machineChartData =
    useMemo(() => {
      if (!selectedLine) {
        return [];
      }

      const totals = {};

      filtered
        .filter(
          (report) =>
            report.line ===
            selectedLine
        )
        .forEach((report) => {
        const machineName =
          String(
            report.machine ||
              "Unknown Machine"
          )
            .split(" (")[0]
            .trim();

          if (!totals[machineName]) {
            totals[machineName] =
              0;
          }

          totals[machineName] +=
            Number(
              report.lineStop
            ) || 0;
        });

      return Object.entries(totals)
        .map(
          ([name, minutes]) => ({
            name,
            minutes,
          })
        )
        .filter(
          (item) =>
            item.minutes > 0
        )
        .sort(
          (a, b) =>
            b.minutes -
            a.minutes
        );
    }, [
      filtered,
      selectedLine,
    ]);

  /* =========================================================
     PROBLEM PARETO

     Data berdasarkan:
     selected Line
     +
     selected Machine
  ========================================================= */

  const problemChartData =
    useMemo(() => {
      if (
        !selectedLine ||
        !selectedMachine
      ) {
        return [];
      }

      const groups = {};

      filtered
      .filter(
        (report) =>
          report.line ===
            selectedLine &&
          String(report.machine)
            .split(" (")[0]
            .trim() === selectedMachine
      )
        .forEach((report) => {
          const normalized =
            normalizeProblem(
              report.problem
            );

          if (!normalized) {
            return;
          }

          if (!groups[normalized]) {
            groups[normalized] = {
              /*
               * Label pertama yang
               * ditemukan tetap dipakai
               * untuk display.
               */
              name: String(
                report.problem
              )
                .trim()
                .replace(
                  /\s+/g,
                  " "
                ),

              minutes: 0,

              records: 0,
            };
          }

          groups[
            normalized
          ].minutes +=
            Number(
              report.lineStop
            ) || 0;

          groups[
            normalized
          ].records += 1;
        });

      return Object.values(groups)
        .filter(
          (item) =>
            item.minutes > 0
        )
        .sort(
          (a, b) =>
            b.minutes -
            a.minutes
        );
    }, [
      filtered,
      selectedLine,
      selectedMachine,
    ]);

  /* =========================================================
     ACTIVE CHART
  ========================================================= */

  const chartData =
    chartLevel === "problem"
      ? problemChartData
      : chartLevel ===
        "machine"
      ? machineChartData
      : lineChartData;

  /* =========================================================
     METRICS
  ========================================================= */

  const totalMinutes =
    filtered.reduce(
      (sum, report) =>
        sum +
        (Number(
          report.lineStop
        ) || 0),
      0
    );

  const highest =
    lineChartData[0];

  /* =========================================================
     CHART TITLE
  ========================================================= */

  const chartTitle =
    chartLevel === "problem"
      ? "Pareto Line Stop per Problem"
      : chartLevel ===
        "machine"
      ? "Pareto Line Stop per Machine"
      : "Pareto Line Stop per Line";

  const chartDescription =
    chartLevel === "problem"
      ? `${selectedLine} • ${selectedMachine} • ${monthLabel(
          month
        )}`
      : chartLevel ===
        "machine"
      ? `${selectedLine} • ${monthLabel(
          month
        )}`
      : `${monthLabel(
          month
        )} • terbesar ke terkecil`;

  /* =========================================================
     DRILL DOWN
  ========================================================= */

  function handleBarClick(data) {
    if (!data?.name) {
      return;
    }

    if (chartLevel === "line") {
      setSelectedLine(
        data.name
      );

      setSelectedMachine("");

      setChartLevel("machine");

      return;
    }

    if (
      chartLevel === "machine"
    ) {
      setSelectedMachine(
        data.name
      );

      setChartLevel("problem");
    }
  }

  /* =========================================================
     BACK DRILL DOWN
  ========================================================= */

  function backToLine() {
    setChartLevel("line");

    setSelectedLine("");

    setSelectedMachine("");
  }

  function backToMachine() {
    setChartLevel("machine");

    setSelectedMachine("");
  }

  /* =========================================================
     GLOBAL FILTER CHANGES

     Kalau filter berubah,
     reset drill-down supaya chart
     tidak menggunakan selection lama.
  ========================================================= */

  function changeMonth(value) {
    setMonth(value);

    backToLine();
  }

  function changeLine(value) {
    setLine(value);

    setMachine("All");

    backToLine();
  }

  function changeMachine(value) {
    setMachine(value);

    backToLine();
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="page">

      {/* =============================================
          PAGE HEADING
      ============================================= */}

      <div className="page-heading">
        <div>
          <span className="eyebrow">
            OVERVIEW
          </span>

          <h1>
            Dashboard Line Stop
          </h1>

          <p>
            Pareto line stop berdasarkan
            total downtime dari database
            Supabase.
          </p>
        </div>
      </div>

      {/* =============================================
          ERROR
      ============================================= */}

      {error && (
        <div className="error-banner">
          <strong>
            Supabase error:
          </strong>{" "}
          {error}
        </div>
      )}

      {/* =============================================
          LOADING
      ============================================= */}

      {loading && (
        <div className="info-banner">
          <strong>
            Loading...
          </strong>

          <span>
            Mengambil data dari
            Supabase.
          </span>
        </div>
      )}

      {/* =============================================
          FILTER
      ============================================= */}

      <section className="filter-card">
        <div className="filter-grid">

          {/* MONTH */}

          <label>
            <span>
              Bulan
            </span>

            <select
              value={month}
              onChange={(event) =>
                changeMonth(
                  event.target.value
                )
              }
            >
              <option value="">
                Semua Bulan
              </option>

              {months.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {monthLabel(
                      item
                    )}
                  </option>
                )
              )}
            </select>
          </label>

          {/* LINE */}

          <label>
            <span>
              Line
            </span>

            <select
              value={line}
              onChange={(event) =>
                changeLine(
                  event.target.value
                )
              }
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
              Mesin
            </span>

            <select
              value={machine}
              onChange={(event) =>
                changeMachine(
                  event.target.value
                )
              }
            >
              <option value="All">
                Semua Mesin
              </option>

              {availableMachines.map(
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
      </section>

      {/* =============================================
          METRICS
      ============================================= */}

      <section className="metric-grid">

        <article className="metric-card">
          <div className="metric-icon red">
            ⏱
          </div>

          <div>
            <span>
              Total Line Stop
            </span>

            <strong>
              {totalMinutes}

              <small>
                {" "}
                menit
              </small>
            </strong>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-icon blue">
            ▤
          </div>

          <div>
            <span>
              Total Problem
            </span>

            <strong>
              {filtered.length}

              <small>
                {" "}
                record
              </small>
            </strong>
          </div>
        </article>

        <article className="metric-card">
          <div className="metric-icon orange">
            ↗
          </div>

          <div>
            <span>
              Line Tertinggi
            </span>

            <strong className="metric-text">
              {highest?.minutes
                ? highest.name
                : "-"}
            </strong>

            <small>
              {highest?.minutes || 0}{" "}
              menit
            </small>
          </div>
        </article>

      </section>

      {/* =============================================
          PARETO PANEL
      ============================================= */}

      <section className="panel">

        <div className="panel-heading">
          <div>
            <h2>
              {chartTitle}
            </h2>

            <p>
              {chartDescription}
            </p>
          </div>

          <div className="legend-chip">
            Total Line Stop
          </div>
        </div>

        {/* =========================================
            BREADCRUMB / BACK
        ========================================= */}

        {chartLevel !== "line" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <button
              type="button"
              className="button button-ghost"
              onClick={backToLine}
            >
              All Lines
            </button>

            <span>
              ›
            </span>

            {chartLevel ===
            "problem" ? (
              <>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={
                    backToMachine
                  }
                >
                  {selectedLine}
                </button>

                <span>
                  ›
                </span>

                <strong>
                  {selectedMachine}
                </strong>
              </>
            ) : (
              <strong>
                {selectedLine}
              </strong>
            )}
          </div>
        )}

        {/* =========================================
            CHART
        ========================================= */}

        <div className="chart-wrap">

          {chartData.length === 0 ? (
            <div className="empty-state">
              <h3>
                Tidak ada line stop
              </h3>

              <p>
                Tidak ada data line stop
                untuk filter yang dipilih.
              </p>
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 16,
                  right: 12,
                  left: -12,
                  bottom: 38,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                  }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={78}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill:
                      "rgba(148,163,184,.10)",
                  }}
                  formatter={(value) => [
                    `${value} menit`,
                    "Total Line Stop",
                  ]}
                />

                <Bar
                  dataKey="minutes"
                  radius={[
                    8,
                    8,
                    0,
                    0,
                  ]}
                  maxBarSize={68}
                  cursor={
                    chartLevel ===
                    "problem"
                      ? "default"
                      : "pointer"
                  }
                  onClick={
                    handleBarClick
                  }
                >
                  {chartData.map(
                    (entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={
                          chartLevel ===
                          "line"
                            ? LINE_COLORS[
                                entry.name
                              ] ||
                              "#64748b"
                            : selectedLine
                            ? LINE_COLORS[
                                selectedLine
                              ] ||
                              "#64748b"
                            : "#64748b"
                        }
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

        </div>

        {/* =========================================
            CLICK INSTRUCTION
        ========================================= */}

        {chartData.length > 0 &&
          chartLevel !== "problem" && (
            <p
              style={{
                marginTop: "8px",
                marginBottom: 0,
                fontSize: "12px",
                color: "#667085",
                textAlign: "center",
              }}
            >
              Klik bar untuk melihat detail{" "}
              {chartLevel === "line"
                ? "machine pada line tersebut."
                : "problem pada machine tersebut."}
            </p>
          )}

      </section>

      {/* =============================================
          DATABASE STATUS
      ============================================= */}

      <div className="success-banner">
        <strong>
          Cloud database active.
        </strong>

        <span>
          Data sekarang dibaca dari
          Supabase, jadi device berbeda
          akan melihat data yang sama.
        </span>
      </div>

    </div>
  );
}
