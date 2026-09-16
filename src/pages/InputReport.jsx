import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LINES,
  SOURCES,
  FINISHING_MACHINES,
} from "../constants";
import { currentDateInput } from "../utils/format";

const initialForm = {
  date: currentDateInput(),
  line: "",
  machine: "",
  machineOption: "",
  source: "",
  teamShift: "White",
  workShift: "Night Shift",
  problem: "",
  lineStop: "",
  frequency: "1",
  pic: "",
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

  const [form, setForm] = useState(
    location.state?.draft || initialForm
  );

  const navigate = useNavigate();

  const [photoSource, setPhotoSource] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const cameraPreviewRef = useRef(null);
  const photoCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const problemFileRef = useRef(null);
  const actionFileRef = useRef(null);

  function change(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      // Kalau line berubah, reset mesin
      if (name === "line") {
        return {
          ...prev,
          line: value,
          machine: "",
          machineOption: "",
        };
      }

      // Khusus dropdown mesin Finishing
      if (name === "machineOption") {
        return {
          ...prev,
          machineOption: value,
          machine: value === "Others" ? "" : value,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
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

  function removeImage(field, nameField) {
  setForm((prev) => ({
    ...prev,
    [field]: "",
    [nameField]: "",
  }));
}

function stopCamera() {
  if (cameraStreamRef.current) {
    cameraStreamRef.current
      .getTracks()
      .forEach((track) => track.stop());

    cameraStreamRef.current = null;
  }

  if (cameraPreviewRef.current) {
    cameraPreviewRef.current.srcObject = null;
  }
}

async function openCamera(target) {
  setCameraError("");
  setCameraTarget(target);

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera API tidak tersedia.");
    }

    stopCamera();

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

    cameraStreamRef.current = stream;

    setTimeout(() => {
      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = stream;

        cameraPreviewRef.current
          .play()
          .catch((error) => {
            console.error(
              "Camera preview error:",
              error
            );
          });
      }
    }, 100);
  } catch (error) {
    console.error("Camera error:", error);

    setCameraError(
      "Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan."
    );
  }
}

function closeCamera() {
  stopCamera();

  setCameraTarget(null);
  setCameraError("");
}

function capturePhoto() {
  const camera = cameraPreviewRef.current;
  const canvas = photoCanvasRef.current;

  if (!camera || !canvas) {
    return;
  }

  if (!camera.videoWidth || !camera.videoHeight) {
    alert("Kamera belum siap. Tunggu sebentar lalu coba lagi.");
    return;
  }

  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;

  const context = canvas.getContext("2d");

  context.drawImage(
    camera,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const photo = canvas.toDataURL(
    "image/jpeg",
    0.9
  );

  if (cameraTarget === "problem") {
    setForm((prev) => ({
      ...prev,
      problemImage: photo,
      problemImageName: `problem-camera-${Date.now()}.jpg`,
    }));
  }

  if (cameraTarget === "action") {
    setForm((prev) => ({
      ...prev,
      actionImage: photo,
      actionImageName: `action-camera-${Date.now()}.jpg`,
    }));
  }

  closeCamera();
}

useEffect(() => {
  return () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
    }
  };
}, []);

  function next(e) {
    e.preventDefault();

    const required = [
      "teamShift",
      "workShift",
      "date",
      "line",
      "machine",
      "source",
      "lineStop",
      "frequency",
      "problem",
      "rootcause",
      "action",
      "pic",
    ];

    const missing = required.some(
      (key) => String(form[key]).trim() === ""
    );

    if (missing) {
      alert(
        "Mohon lengkapi semua field wajib (*) sebelum preview."
      );
      return;
    }

    if (Number(form.lineStop) < 0) {
      alert("Line Stop tidak boleh kurang dari 0 menit.");
      return;
    }

    if (Number(form.frequency) < 1) {
      alert("Frequency minimal 1 kali.");
      return;
    }

    navigate("/preview", {
      state: {
        draft: {
          ...form,
          lineStop: Number(form.lineStop),
          frequency: Number(form.frequency),
        },
      },
    });
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            DAILY REPORT
          </span>

          <h1>Input Problem</h1>

          <p>
            Isi detail problem. Data belum disimpan sebelum kamu
            melakukan konfirmasi di halaman Preview.
          </p>
        </div>

        <div className="step-badge">
          <b>1</b>
          <span>Input</span>
          <i></i>
          <b className="muted">2</b>
          <span className="muted-text">
            Preview
          </span>
        </div>
      </div>

      <form
        className="form-panel"
        onSubmit={next}
      >
        <div className="form-section-title">
          <div>
            <h2>Informasi Problem</h2>
            <p>Field bertanda * wajib diisi.</p>
          </div>
        </div>

        {/* =========================
            TEAM SHIFT + WORK SHIFT
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>Team Shift *</span>

            <select
              name="teamShift"
              value={form.teamShift}
              onChange={change}
              required
            >
              <option value="White">
                White
              </option>

              <option value="Red">
                Red
              </option>
            </select>

            <small>
              Akan tampil di header report dalam format:
              ( White ) / ( Red )
            </small>
          </label>

          <label className="field">
            <span>Work Shift *</span>

            <select
              name="workShift"
              value={form.workShift}
              onChange={change}
              required
            >
              <option value="Day Shift">
                Day Shift
              </option>

              <option value="Night Shift">
                Night Shift
              </option>
            </select>

            <small>
              Tanggal dan shift akan mengikuti input user.
            </small>
          </label>
        </div>

        {/* =========================
            DATE + LINE
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>Tanggal Report *</span>

            <input
              type="date"
              name="date"
              value={form.date}
              onChange={change}
              required
            />
          </label>

          <label className="field">
            <span>Line *</span>

            <select
              name="line"
              value={form.line}
              onChange={change}
              required
            >
              <option value="">
                Pilih line...
              </option>

              {LINES.map((line) => (
                <option
                  key={line}
                  value={line}
                >
                  {line}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* =========================
            MACHINE + SOURCE
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>Mesin *</span>

            {form.line === "Finishing" ? (
              <>
                <select
                  name="machineOption"
                  value={form.machineOption || ""}
                  onChange={change}
                  required
                >
                  <option value="">
                    Pilih mesin...
                  </option>

                  {FINISHING_MACHINES.map(
                    (machine) => (
                      <option
                        key={machine}
                        value={machine}
                      >
                        {machine}
                      </option>
                    )
                  )}
                </select>

                {form.machineOption ===
                  "Others" && (
                  <input
                    type="text"
                    name="machine"
                    value={form.machine}
                    onChange={change}
                    placeholder="Masukkan nama mesin lainnya..."
                    required
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                name="machine"
                value={form.machine}
                onChange={change}
                placeholder="Contoh: Flask Closing"
                required
              />
            )}
          </label>

          <label className="field">
            <span>Source *</span>

            <select
              name="source"
              value={form.source}
              onChange={change}
              required
            >
              <option value="">
                Pilih source...
              </option>

              {SOURCES.map((source) => (
                <option
                  key={source}
                  value={source}
                >
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* =========================
            LINE STOP + FREQUENCY
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>
              Line Stop (menit) *
            </span>

            <div className="input-suffix">
              <input
                type="number"
                min="0"
                step="1"
                name="lineStop"
                value={form.lineStop}
                onChange={change}
                placeholder="0"
                required
              />

              <span>minute</span>
            </div>

            <small>
              Di output report otomatis tampil sebagai
              contoh: 14'
            </small>
          </label>

          <label className="field">
            <span>
              Frequency (kali) *
            </span>

            <div className="input-suffix">
              <input
                type="number"
                min="1"
                step="1"
                name="frequency"
                value={form.frequency}
                onChange={change}
                placeholder="1"
                required
              />

              <span>kali</span>
            </div>

            <small>
              Jumlah kejadian problem.
            </small>
          </label>
        </div>

        {/* =========================
            PROBLEM + ROOTCAUSE
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>Problem *</span>

            <textarea
              name="problem"
              value={form.problem}
              onChange={change}
              rows="4"
              placeholder="Deskripsikan problem yang terjadi..."
              required
            />
          </label>

          <label className="field">
            <span>Rootcause *</span>

            <textarea
              name="rootcause"
              value={form.rootcause}
              onChange={change}
              rows="4"
              placeholder="Tuliskan penyebab utama..."
              required
            />
          </label>
        </div>

        {/* =========================
            ACTION + PIC
        ========================== */}

        <div className="form-grid two">
          <label className="field">
            <span>Action *</span>

            <textarea
              name="action"
              value={form.action}
              onChange={change}
              rows="4"
              placeholder="Tuliskan tindakan penanggulangan..."
              required
            />
          </label>

          <label className="field">
            <span>PIC *</span>

            <input
              type="text"
              name="pic"
              value={form.pic}
              onChange={change}
              placeholder="Contoh: Alya"
              required
            />

            <small>
              Person in charge untuk penanganan problem.
            </small>
          </label>
        </div>

        {/* =========================
            FOTO
        ========================== */}

        <div className="form-grid two">
          {/* FOTO PROBLEM */}

          <div className="field">
            <span>
              Ilustrasi Problem
            </span>

<label
  className="upload-box"
  onClick={(e) => {
    if (e.target === problemFileRef.current) {
      return;
    }

    if (!form.problemImage) {
      e.preventDefault();
      setPhotoSource("problem");
    }
  }}
>
              <input
                ref={problemFileRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  imageChange(
                    e,
                    "problemImage",
                    "problemImageName"
                  )
                }
              />

              {form.problemImage ? (
                <div className="upload-preview">
                  <img
                    src={form.problemImage}
                    alt="Preview problem"
                  />

                  <div>
                    <strong>
                      Foto terpilih
                    </strong>

                    <small>
                      {form.problemImageName ||
                        "Existing image"}
                    </small>
                    <button
                  type="button"
                  className="remove-image-button"
                  onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                removeImage(
              "problemImage",
            "problemImageName"
          );
        }}
>
  ✕ Remove Photo
</button>
                  </div>
                </div>
              ) : (
                <div className="upload-empty">
                  <b>＋</b>

                  <strong>
                    Pilih foto problem
                  </strong>

                  <small>
                    JPG / PNG, maksimal 3 MB
                  </small>
                </div>
              )}
            </label>
          </div>

          {/* FOTO ACTION */}

          <div className="field">
            <span>
              Ilustrasi Penanggulangan
            </span>

<label
  className="upload-box"
  onClick={(e) => {
    if (e.target === actionFileRef.current) {
      return;
    }

    if (!form.actionImage) {
      e.preventDefault();
      setPhotoSource("action");
    }
  }}
>
              <input
               ref={actionFileRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  imageChange(
                    e,
                    "actionImage",
                    "actionImageName"
                  )
                }
              />

              {form.actionImage ? (
                <div className="upload-preview">
                  <img
                    src={form.actionImage}
                    alt="Preview action"
                  />

                  <div>
                    <strong>
                      Foto terpilih
                    </strong>

                    <small>
                      {form.actionImageName ||
                        "Existing image"}
                    </small>
                    <button
  type="button"
  className="remove-image-button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    removeImage(
      "actionImage",
      "actionImageName"
    );
  }}
>
  ✕ Remove Photo
</button>
                  </div>
                </div>
              ) : (
                <div className="upload-empty">
                  <b>＋</b>

                  <strong>
                    Pilih foto penanggulangan
                  </strong>

                  <small>
                    JPG / PNG, maksimal 3 MB
                  </small>
                </div>
              )}
            </label>
          </div>
        </div>

       {photoSource && (
  <div
    className="photo-source-overlay"
    onClick={() => setPhotoSource(null)}
  >
    <div
      className="photo-source-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="photo-source-close"
        onClick={() => setPhotoSource(null)}
      >
        ×
      </button>

      <h3>Tambahkan Ilustrasi</h3>

      <p>Pilih sumber foto</p>

      <button
        type="button"
        className="photo-source-option"
        onClick={() => {
          const target = photoSource;

          setPhotoSource(null);

          if (target === "problem") {
            problemFileRef.current?.click();
          }

          if (target === "action") {
            actionFileRef.current?.click();
          }
        }}
      >
        <span className="photo-source-icon">
          🖼️
        </span>

        <span>
          <strong>Upload Foto</strong>
          <small>
            Pilih dari galeri atau file perangkat
          </small>
        </span>
      </button>

      <button
        type="button"
        className="photo-source-option"
        onClick={() => {
          const target = photoSource;

          setPhotoSource(null);

          openCamera(target);
        }}
      >
        <span className="photo-source-icon">
          📷
        </span>

        <span>
          <strong>Ambil Foto</strong>
          <small>
            Gunakan kamera HP atau webcam
          </small>
        </span>
      </button>

      <button
        type="button"
        className="photo-source-cancel"
        onClick={() => setPhotoSource(null)}
      >
        Batal
      </button>
    </div>
  </div>
)} 

{cameraTarget && (
  <div className="photo-source-overlay">
    <div className="camera-photo-modal">
      <div className="camera-photo-header">
        <div>
          <h3>Ambil Foto</h3>

          <p>
            Arahkan kamera ke objek lalu ambil foto.
          </p>
        </div>

        <button
          type="button"
          className="photo-source-close"
          onClick={closeCamera}
        >
          ×
        </button>
      </div>

      {cameraError ? (
        <div className="camera-photo-error">
          {cameraError}
        </div>
      ) : (
        <div className="camera-photo-preview">
          <video
            ref={cameraPreviewRef}
            autoPlay
            playsInline
            muted
          />
        </div>
      )}

      <canvas
        ref={photoCanvasRef}
        style={{ display: "none" }}
      />

      <div className="camera-photo-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={closeCamera}
        >
          Batal
        </button>

        {!cameraError && (
          <button
            type="button"
            className="button button-primary"
            onClick={capturePhoto}
          >
            📷 Ambil Foto
          </button>
        )}
      </div>
    </div>
  </div>
)}

        {/* =========================
            BUTTON
        ========================== */}

        <div className="form-actions">
          <span className="form-hint">
            Belum ada data yang disimpan.
          </span>

          <button
            type="submit"
            className="button button-primary"
          >
            Next: See Preview
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
