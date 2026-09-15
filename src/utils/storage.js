import { requireSupabase } from "../lib/supabase";

const BUCKET = "report-images";

/* =========================================================
   DATABASE → APP FORMAT
========================================================= */

function dbToApp(row) {
  return {
    id: row.id,
    date: row.report_date,
    line: row.line,
    machine: row.machine,
    source: row.source,
    teamShift: row.team_shift,
    workShift: row.work_shift,
    problem: row.problem,
    lineStop: row.line_stop,
    frequency: row.frequency ?? 1,
    pic: row.pic || "",
    rootcause: row.rootcause,
    problemImage: row.problem_image_url || "",
    action: row.action,
    actionImage: row.action_image_url || "",
    problemImagePath: row.problem_image_path || "",
    actionImagePath: row.action_image_path || "",
    createdAt: row.created_at,
  };
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(",");

  const mime =
    meta.match(/data:(.*?);base64/)?.[1] ||
    "image/jpeg";

  const binary = atob(data);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], {
    type: mime,
  });
}

function extensionFromMime(mime) {
  if (mime.includes("png")) {
    return "png";
  }

  if (mime.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

async function uploadDataUrl(dataUrl, prefix) {
  if (
    !dataUrl ||
    !dataUrl.startsWith("data:")
  ) {
    return {
      url: dataUrl || "",
      path: "",
    };
  }

  const client = requireSupabase();

  const blob = dataUrlToBlob(dataUrl);

  const ext = extensionFromMime(blob.type);

  const path =
    `${new Date().getFullYear()}/` +
    `${crypto.randomUUID()}-${prefix}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type,
    });

  if (error) {
    throw error;
  }

  const { data } = client.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
  };
}

/* =========================================================
   GET ALL REPORTS
========================================================= */

export async function getReports() {
  const client = requireSupabase();

  const { data, error } = await client
    .from("daily_reports")
    .select("*")
    .order("report_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(dbToApp);
}

/* =========================================================
   GET SINGLE REPORT
========================================================= */

export async function getReport(id) {
  const client = requireSupabase();

  const { data, error } = await client
    .from("daily_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return dbToApp(data);
}

/* =========================================================
   GET ONE DAILY REPORT GROUP

   Satu report ditentukan berdasarkan:
   - Date
   - Team Shift
   - Work Shift

   Contoh:
   15 Sep 2026 + White + Night Shift

   Semua problem dengan kombinasi tersebut akan
   dianggap sebagai satu Daily Report.
========================================================= */

export async function getReportsByGroup(
  date,
  teamShift,
  workShift
) {
  const client = requireSupabase();

  if (!date || !teamShift || !workShift) {
    return [];
  }

  const { data, error } = await client
    .from("daily_reports")
    .select("*")
    .eq("report_date", date)
    .eq("team_shift", teamShift)
    .eq("work_shift", workShift)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data || []).map(dbToApp);
}

/* =========================================================
   SAVE REPORT

   IMPORTANT:
   Fungsi ini selalu INSERT row baru.

   Jadi problem User B TIDAK akan overwrite
   problem User A.
========================================================= */

export async function saveReport(report) {
  const client = requireSupabase();

  const [problemImage, actionImage] =
    await Promise.all([
      uploadDataUrl(
        report.problemImage,
        "problem"
      ),

      uploadDataUrl(
        report.actionImage,
        "action"
      ),
    ]);

  const payload = {
    report_date: report.date,

    line: report.line,

    machine: report.machine,

    source: report.source,

    team_shift: report.teamShift,

    work_shift: report.workShift,

    problem: report.problem,

    line_stop:
      Number(report.lineStop) || 0,

    frequency:
      Number(report.frequency) || 1,

    pic: report.pic,

    rootcause: report.rootcause,

    problem_image_url:
      problemImage.url || null,

    problem_image_path:
      problemImage.path || null,

    action: report.action,

    action_image_url:
      actionImage.url || null,

    action_image_path:
      actionImage.path || null,
  };

  const { data, error } = await client
    .from("daily_reports")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return dbToApp(data);
}

/* =========================================================
   DELETE SINGLE REPORT ROW
========================================================= */

export async function deleteReport(id) {
  const client = requireSupabase();

  const report = await getReport(id);

  const paths = [
    report.problemImagePath,
    report.actionImagePath,
  ].filter(Boolean);

  if (paths.length) {
    const { error: storageError } =
      await client.storage
        .from(BUCKET)
        .remove(paths);

    if (storageError) {
      console.warn(
        "Image cleanup failed:",
        storageError.message
      );
    }
  }

  const { error } = await client
    .from("daily_reports")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}