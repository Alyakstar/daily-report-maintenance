import { NavLink } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: "▦" },
  { to: "/input", label: "Input Daily Report", icon: "＋" },
  { to: "/history", label: "Report History", icon: "▤" },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong>Maintenance</strong>
            <span>Daily Report</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot"></span>
          Supabase Cloud
          <small>Cloud database connected</small>
        </div>
      </aside>

      {open && <button className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Close menu" />}

      <div className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <div className="topbar-title">
            <span className="desktop-only">EPSD Sunter II • Maintenance Department</span>
            <span className="mobile-only">Maintenance Daily Report</span>
          </div>
          <div className="prototype-pill">Prototype</div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
