import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LINES, SOURCES } from "../constants";
import { currentDateInput } from "../utils/format";

const initialForm = {
  date: currentDateInput(),
  line: "",
  machine: "",
  source: "",
  teamShift: "White",
  workShift: "Night Shift",
  problem: "",
  lineStop: "",
  rootcause: "",
  problemImage: "",
  problemImageName: "",
  action: "",
  actionImage: "",
  actionImageName: "",
};

function fileToDataUrl(file, callback) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("File harus berupa gambar.");
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert("Untuk prototype, ukuran foto maksimal 3 MB.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

export default function InputReport() {
  const location = useLocation();
  const [form, setForm] = useState(location.state?.draft || initialForm);
  const navigate = useNavigate();

  function change(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function imageChange(e, field, nameField) {
    const file = e.target.files?.[0];
    fileToDataUrl(file, (url) => {
      setForm((prev) => ({
        ...prev,
        [field]: url,
        [nameField]: file.name,
      }));
    });
  }

  function next(e) {
    e.preventDefault();
    const required = ["date", "line", "machine", "source", "teamShift", "workShift", "problem", "lineStop", "rootcause", "action"];
    const missing = required.some((key) => String(form[key]).trim() === "");
    if (missing) {
      alert("Mohon lengkapi semua field wajib (*) sebelum preview.");
      return;
    }
    if (Number(form.lineStop) < 0) {
      alert("Line Stop tidak boleh kurang dari 0 menit.");
      return;
    }
    navigate("/preview", { state: { draft: { ...form, lineStop: Number(form.lineStop) } } });
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DAILY REPORT</span>
          <h1>Input Problem</h1>
          <p>Isi detail problem. Data belum disimpan sebelum kamu melakukan konfirmasi di halaman Preview.</p>
        </div>
        <div className="step-badge"><b>1</b><span>Input</span><i></i><b className="muted">2</b><span className="muted-text">Preview</span></div>
      </div>

      <form className="form-panel" onSubmit={next}>
        <div className="form-section-title">
          <div>
            <h2>Informasi Problem</h2>
            <p>Field bertanda * wajib diisi.</p>
          </div>
        </div>

        <div className="form-grid two">
          <label className="field">
            <span>Tanggal Report *</span>
            <input type="date" name="date" value={form.date} onChange={change} required />
          </label>
          <label className="field">
            <span>Line *</span>
            <select name="line" value={form.line} onChange={change} required>
              <option value="">Pilih line...</option>
              {LINES.map((line) => <option key={line}>{line}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Mesin *</span>
            <input name="machine" value={form.machine} onChange={change} placeholder="Contoh: Flask Closing" required />
          </label>
          <label className="field">
            <span>Source *</span>
            <select name="source" value={form.source} onChange={change} required>
              <option value="">Pilih source...</option>
              {SOURCES.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
        </div>

        <div className="form-grid two">
          <label className="field">
            <span>Team Shift *</span>
            <select name="teamShift" value={form.teamShift} onChange={change} required>
              <option value="White">White</option>
              <option value="Red">Red</option>
            </select>
            <small>Akan tampil di header report dalam format: ( White ) / ( Red )</small>
          </label>
          <label className="field">
            <span>Work Shift *</span>
            <select name="workShift" value={form.workShift} onChange={change} required>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
            <small>Tanggal dan shift akan mengikuti input user.</small>
          </label>
        </div>

        <div className="form-grid two">
          <label className="field">
            <span>Problem *</span>
            <textarea name="problem" value={form.problem} onChange={change} rows="4" placeholder="Deskripsikan problem yang terjadi..." required />
          </label>
          <label className="field">
            <span>Rootcause *</span>
            <textarea name="rootcause" value={form.rootcause} onChange={change} rows="4" placeholder="Tuliskan penyebab utama..." required />
          </label>
        </div>

        <div className="form-grid two">
          <label className="field">
            <span>Line Stop (menit) *</span>
            <div className="input-suffix">
              <input type="number" min="0" step="1" name="lineStop" value={form.lineStop} onChange={change} placeholder="0" required />
              <span>minute</span>
            </div>
            <small>Di output report otomatis tampil sebagai contoh: 14'</small>
          </label>
          <label className="field">
            <span>Action *</span>
            <textarea name="action" value={form.action} onChange={change} rows="4" placeholder="Tuliskan tindakan penanggulangan..." required />
          </label>
        </div>

        <div className="form-grid two">
          <div className="field">
            <span>Ilustrasi Problem</span>
            <label className="upload-box">
              <input type="file" accept="image/*" onChange={(e) => imageChange(e, "problemImage", "problemImageName")} />
              {form.problemImage ? (
                <div className="upload-preview">
                  <img src={form.problemImage} alt="Preview problem" />
                  <div><strong>Foto terpilih</strong><small>{form.problemImageName || "Existing image"}</small></div>
                </div>
              ) : (
                <div className="upload-empty">
                  <b>＋</b>
                  <strong>Pilih foto problem</strong>
                  <small>JPG / PNG, maksimal 3 MB</small>
                </div>
              )}
            </label>
          </div>

          <div className="field">
            <span>Ilustrasi Penanggulangan</span>
            <label className="upload-box">
              <input type="file" accept="image/*" onChange={(e) => imageChange(e, "actionImage", "actionImageName")} />
              {form.actionImage ? (
                <div className="upload-preview">
                  <img src={form.actionImage} alt="Preview action" />
                  <div><strong>Foto terpilih</strong><small>{form.actionImageName || "Existing image"}</small></div>
                </div>
              ) : (
                <div className="upload-empty">
                  <b>＋</b>
                  <strong>Pilih foto penanggulangan</strong>
                  <small>JPG / PNG, maksimal 3 MB</small>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="form-actions">
          <span className="form-hint">Belum ada data yang disimpan.</span>
          <button type="submit" className="button button-primary">
            Next: See Preview <span>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
