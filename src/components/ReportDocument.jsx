import { LINES } from "../constants";
import { formatReportDate } from "../utils/format";

const SOURCE_COLUMNS = ["BM", "PM", "IMP", "CM"];

export default function ReportDocument({ reports = [], reportRef }) {
  const summary = Object.fromEntries(LINES.map((line) => [line, 0]));
  reports.forEach((item) => {
    if (summary[item.line] !== undefined) summary[item.line] += Number(item.lineStop) || 0;
  });

  const first = reports[0] || {};
  const reportDate = first.date;
  const teamShift = first.teamShift || "White";
  const workShift = first.workShift || "Night Shift";

  return (
    <div className="report-paper exact-report" ref={reportRef}>
      <section className="exact-top-header">
        <div className="exact-company">
          <strong>PT TMMIN</strong>
          <span>EPSD SUNTER II</span>
          <span>Maintenance Department</span>
        </div>
        <div className="exact-title-block">
          <h2>DAILY REPORT PROBLEM</h2>
          <p>{formatReportDate(reportDate)} ( {teamShift} ) {workShift}</p>
        </div>
      </section>

      <div className="yellow-strip" />

      <section className="exact-summary-strip">
        {LINES.map((line) => (
          <div className="exact-summary-box" key={line}>
            <span>{line.toUpperCase()}</span>
            <strong>{summary[line]}'</strong>
          </div>
        ))}
      </section>

      <table className="exact-report-table">
        <thead>
          <tr className="main-head-row">
            <th rowSpan="2" className="col-no">NO</th>
            <th rowSpan="2" className="col-line">LINE</th>
            <th rowSpan="2" className="col-machine">MESIN</th>
            <th colSpan="4" className="source-group">SOURCE</th>
            <th rowSpan="2" className="col-problem">PROBLEM</th>
            <th rowSpan="2" className="col-stop">LINE STOP</th>
            <th rowSpan="2" className="col-root">ROOTCAUSE</th>
            <th rowSpan="2" className="col-img-problem">ILUSTRASI PROBLEM</th>
            <th rowSpan="2" className="col-action">ACTION</th>
            <th rowSpan="2" className="col-img-action">ILUSTRASI<br/>PENANGGULANGAN</th>
          </tr>
          <tr className="source-head-row">
            <th className="source-bm">BM</th>
            <th className="source-pm">PM</th>
            <th className="source-imp">IMP</th>
            <th className="source-cm">CM</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((item, index) => (
            <tr key={item.id || index}>
              <td className="center">{index + 1}</td>
              <td>{item.line}</td>
              <td>{item.machine}</td>
              {SOURCE_COLUMNS.map((source) => (
                <td className="center source-check" key={source}>
                  {item.source === source ? "✓" : ""}
                </td>
              ))}
              <td>{item.problem}</td>
              <td className="center exact-line-stop">{item.lineStop}'</td>
              <td>{item.rootcause}</td>
              <td className="exact-image-cell">
                {item.problemImage ? <img src={item.problemImage} alt="Problem" /> : <strong>N/A</strong>}
              </td>
              <td>{item.action}</td>
              <td className="exact-image-cell">
                {item.actionImage ? <img src={item.actionImage} alt="Penanggulangan" /> : <strong>N/A</strong>}
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr><td colSpan="13" className="empty-report-row">NO DATA</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
