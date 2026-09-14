import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import { LINES, LINE_COLORS } from "../constants";
import { getReports } from "../utils/storage";
import { monthKey } from "../utils/format";

function monthLabel(value) {
  if (!value) return "Semua Bulan";
  const [y, m] = value.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "long", year: "numeric"
  });
}

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [line, setLine] = useState("All");
  const [machine, setMachine] = useState("All");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getReports();
        if (!mounted) return;
        setReports(data);
        const firstMonth = [...new Set(data.map((r) => monthKey(r.date)).filter(Boolean))].sort().reverse()[0] || "";
        setMonth(firstMonth);
      } catch (err) {
        console.error(err);
        setError(err.message || "Gagal mengambil data dari Supabase.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const months = useMemo(
    () => [...new Set(reports.map((r) => monthKey(r.date)).filter(Boolean))].sort().reverse(),
    [reports]
  );

  const availableMachines = useMemo(() => {
    const base = line === "All" ? reports : reports.filter((r) => r.line === line);
    return [...new Set(base.map((r) => r.machine).filter(Boolean))].sort();
  }, [reports, line]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const monthOk = !month || monthKey(r.date) === month;
      const lineOk = line === "All" || r.line === line;
      const machineOk = machine === "All" || r.machine === machine;
      return monthOk && lineOk && machineOk;
    });
  }, [reports, month, line, machine]);

  const chartData = useMemo(() => {
    const totals = Object.fromEntries(LINES.map((l) => [l, 0]));
    filtered.forEach((r) => {
      if (totals[r.line] !== undefined) totals[r.line] += Number(r.lineStop) || 0;
    });
    return LINES.map((l) => ({ line: l, minutes: totals[l] }));
  }, [filtered]);

  const totalMinutes = filtered.reduce((sum, r) => sum + (Number(r.lineStop) || 0), 0);
  const highest = [...chartData].sort((a, b) => b.minutes - a.minutes)[0];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Dashboard Line Stop</h1>
          <p>Monitor akumulasi menit line stop dari database Supabase.</p>
        </div>
      </div>

      {error && <div className="error-banner"><strong>Supabase error:</strong> {error}</div>}
      {loading && <div className="info-banner"><strong>Loading...</strong><span>Mengambil data dari Supabase.</span></div>}

      <section className="filter-card">
        <div className="filter-grid">
          <label><span>Bulan</span><select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">Semua Bulan</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
          <label><span>Line</span><select value={line} onChange={(e) => { setLine(e.target.value); setMachine("All"); }}><option value="All">Semua Line</option>{LINES.map((l) => <option key={l}>{l}</option>)}</select></label>
          <label><span>Mesin</span><select value={machine} onChange={(e) => setMachine(e.target.value)}><option value="All">Semua Mesin</option>{availableMachines.map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><div className="metric-icon red">⏱</div><div><span>Total Line Stop</span><strong>{totalMinutes}<small> menit</small></strong></div></article>
        <article className="metric-card"><div className="metric-icon blue">▤</div><div><span>Total Problem</span><strong>{filtered.length}<small> record</small></strong></div></article>
        <article className="metric-card"><div className="metric-icon orange">↗</div><div><span>Line Tertinggi</span><strong className="metric-text">{highest?.minutes ? highest.line : "-"}</strong><small>{highest?.minutes || 0} menit</small></div></article>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Akumulasi Line Stop per Line</h2><p>{monthLabel(month)} • dalam menit</p></div><div className="legend-chip">Live from Supabase</div></div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 12, left: -12, bottom: 22 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="line" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={62} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(148,163,184,.10)" }} formatter={(value) => [`${value} menit`, "Line Stop"]} />
              <Bar dataKey="minutes" radius={[8, 8, 0, 0]} maxBarSize={68}>
                {chartData.map((entry) => <Cell key={entry.line} fill={LINE_COLORS[entry.line]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="success-banner"><strong>Cloud database active.</strong><span>Data sekarang dibaca dari Supabase, jadi device berbeda akan melihat data yang sama.</span></div>
    </div>
  );
}
