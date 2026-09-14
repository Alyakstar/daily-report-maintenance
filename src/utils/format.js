export function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatReportDate(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

export function monthKey(dateString) {
  if (!dateString) return "";
  return dateString.slice(0, 7);
}

export function currentDateInput() {
  return new Date().toISOString().slice(0, 10);
}
