export default function EmptyState({ title = "Belum ada data", text = "Tambahkan daily report untuk melihat data di sini." }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">▤</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
