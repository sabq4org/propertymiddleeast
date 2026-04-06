"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  Loader2,
  CalendarClock,
  Search,
  MoreVertical,
  Rocket,
  ArrowLeftRight,
  Undo2,
  ChevronDown,
  ChevronUp,
  X,
  LayoutDashboard,
  ListTodo,
  TrendingUp,
  MessageSquareText,
  ArrowRight,
  RefreshCw,
  Send,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

/* ─── Types ─── */
type TaskStatus = "pending" | "in_progress" | "completed" | "deferred";
type TaskPhase = "launch" | "post_launch";

interface Task {
  id: number;
  service_id: string;
  title: string;
  section: string;
  phase: TaskPhase;
  status: TaskStatus;
  notes: string | null;
  sort_order: number;
  completed_at: number | null;
  created_at: string;
}

interface TaskHistory {
  id: number;
  task_id: number;
  action: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  performed_by: string;
  performed_at: number;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  deferred: number;
  launchTotal: number;
  postLaunchTotal: number;
  completionRate: number;
  sections: {
    name: string;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    deferred: number;
    completionRate: number;
  }[];
}

/* ─── Config ─── */
const ADMIN_PASSWORD = "PME@2026!admin";
const AUTH_STORAGE_KEY = "pme_admin_auth";

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "قيد الانتظار", color: "#64748b", bg: "#f1f5f9", icon: Clock },
  in_progress: { label: "قيد التنفيذ", color: "#2563eb", bg: "#eff6ff", icon: Loader2 },
  completed: { label: "منجزة", color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
  deferred: { label: "مؤجلة للمرحلة التالية", color: "#d97706", bg: "#fffbeb", icon: CalendarClock },
};

const phaseConfig: Record<TaskPhase, { label: string; color: string; bg: string; icon: typeof Rocket }> = {
  launch: { label: "مع الإطلاق", color: "#1a365d", bg: "#f0f4f8", icon: Rocket },
  post_launch: { label: "بعد الإطلاق", color: "#c9956a", bg: "#fdf6f0", icon: CalendarClock },
};

const statusOptions: TaskStatus[] = ["pending", "in_progress", "completed", "deferred"];
const phaseOptions: TaskPhase[] = ["launch", "post_launch"];

/* ─── API Helpers ─── */
async function fetchTasks(params?: Record<string, string>) {
  const url = new URL("/api/tasks", window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/tasks?action=stats");
  return res.json();
}

async function fetchSections(): Promise<string[]> {
  const res = await fetch("/api/tasks?action=sections");
  return res.json();
}

async function fetchTaskDetail(id: number): Promise<{ task: Task; history: TaskHistory[] }> {
  const res = await fetch(`/api/tasks?action=detail&id=${id}`);
  return res.json();
}

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function seedTasks() {
  const res = await fetch("/api/tasks/seed", { method: "POST" });
  return res.json();
}

/* ─── Utility ─── */
function formatDate(ts: number | string | null) {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─── Responsive CSS ─── */
const RESPONSIVE_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

  /* ─── Header ─── */
  .tasks-header {
    background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 4px 20px rgba(26,54,93,0.3);
    gap: 12px;
    flex-wrap: wrap;
  }
  .tasks-header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .tasks-header-brand h1 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
  }
  .tasks-header-brand p {
    margin: 0;
    color: rgba(255,255,255,0.7);
    font-size: 11px;
  }
  .tasks-header-nav {
    display: flex;
    gap: 4px;
  }
  .tasks-header-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255,255,255,0.8);
    font-size: 12px;
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.2);
    transition: all 200ms;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .nav-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 12px;
    border-radius: 10px;
    border: none;
    font-size: 12px;
    cursor: pointer;
    transition: all 200ms;
    white-space: nowrap;
  }
  .nav-btn.active {
    background: rgba(255,255,255,0.2);
    color: #fff;
    font-weight: 700;
  }
  .nav-btn:not(.active) {
    background: transparent;
    color: rgba(255,255,255,0.65);
    font-weight: 400;
  }

  /* ─── Main Content ─── */
  .tasks-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 16px 80px;
  }

  /* ─── Dashboard ─── */
  .dash-title h2 { font-size: 24px; font-weight: 800; margin: 0 0 4px; color: var(--color-text); }
  .dash-title p { color: var(--color-muted); font-size: 13px; margin: 0; }
  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .dash-stat-card {
    padding: 18px 14px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: #fff;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .dash-stat-value { font-size: 28px; font-weight: 800; color: var(--color-text); line-height: 1; }
  .dash-stat-label { font-size: 12px; color: var(--color-muted); text-align: center; }
  .dash-stat-extra {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 99px;
  }
  .dash-progress-card {
    padding: 20px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: #fff;
    box-shadow: var(--shadow-sm);
  }
  .dash-progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .dash-progress-rate { font-size: 28px; font-weight: 800; color: var(--color-primary); }
  .dash-phase-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .dash-phase-card {
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: #fff;
    box-shadow: var(--shadow-sm);
  }
  .dash-phase-value { font-size: 28px; font-weight: 800; }
  .dash-sections-card {
    padding: 20px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: #fff;
    box-shadow: var(--shadow-sm);
  }

  /* ─── Filters ─── */
  .filters-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: #fff;
    align-items: center;
  }
  .filter-search {
    position: relative;
    flex: 1 1 180px;
    min-width: 0;
  }
  .filter-search input {
    width: 100%;
    padding: 8px 36px 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }
  .filter-select {
    padding: 8px 12px;
    padding-left: 28px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: #fff;
    font-size: 12px;
    color: var(--color-text);
    cursor: pointer;
    outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left 10px center;
    min-width: 0;
    flex: 0 1 auto;
    max-width: 100%;
  }

  /* ─── Task Card ─── */
  .task-card {
    display: flex;
    align-items: center;
    padding: 12px;
    margin: 3px 0;
    border-radius: 10px;
    transition: all 200ms;
    cursor: pointer;
    gap: 10px;
  }
  .task-card-status {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 99px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all 200ms;
    border-width: 2px;
    border-style: solid;
  }
  .task-card-title {
    flex: 1;
    min-width: 0;
  }
  .task-card-title h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .task-card-badges {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .task-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 99px;
    white-space: nowrap;
  }
  .task-card-actions {
    flex-shrink: 0;
  }

  /* ─── Detail View ─── */
  .detail-card {
    padding: 20px;
    border-radius: 14px;
    border: 1px solid var(--color-border);
    background: #fff;
    box-shadow: var(--shadow-sm);
  }
  .detail-title { font-size: 20px; font-weight: 800; margin: 0 0 10px; }
  .detail-actions-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .detail-action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .detail-note-row {
    display: flex;
    gap: 8px;
  }
  .detail-note-row textarea {
    flex: 1;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    font-size: 13px;
    resize: vertical;
    outline: none;
    font-family: inherit;
    min-width: 0;
  }

  /* ─── Section Accordion ─── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 14px 16px;
    border: none;
    background: var(--color-primary-light);
    cursor: pointer;
    text-align: right;
  }
  .section-header-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .section-header-info span:first-child {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .section-count {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-primary);
    background: rgba(26,54,93,0.1);
    padding: 2px 8px;
    border-radius: 99px;
    flex-shrink: 0;
  }
  .section-tasks-wrap {
    padding: 6px 8px 8px;
  }

  /* ─── Login Screen ─── */
  .login-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%);
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .login-card {
    background: #fff;
    border-radius: 20px;
    padding: 36px 28px;
    max-width: 380px;
    width: 100%;
    box-shadow: 0 25px 60px rgba(0,0,0,0.3);
    text-align: center;
  }

  /* ─── Dropdown ─── */
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    min-width: 180px;
    z-index: 100;
    overflow: hidden;
  }

  /* ═══════════════════════════════════════
     MOBILE RESPONSIVE (max-width: 640px)
     ═══════════════════════════════════════ */
  @media (max-width: 640px) {
    .tasks-header {
      padding: 12px 14px;
      gap: 8px;
    }
    .tasks-header-brand h1 {
      font-size: 13px;
    }
    .tasks-header-brand p {
      font-size: 10px;
    }
    .tasks-header-brand img,
    .tasks-header-brand .logo-img {
      width: 28px !important;
      height: 28px !important;
    }
    .nav-btn {
      padding: 6px 8px;
      font-size: 11px;
      gap: 3px;
    }
    .tasks-header-link {
      font-size: 11px;
      padding: 5px 8px;
    }
    .tasks-main {
      padding: 14px 10px 60px;
    }

    /* Dashboard */
    .dash-title h2 { font-size: 20px; }
    .dash-title p { font-size: 12px; }
    .dash-stat-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .dash-stat-card {
      padding: 14px 10px;
    }
    .dash-stat-value { font-size: 22px; }
    .dash-stat-label { font-size: 11px; }
    .dash-progress-card { padding: 16px; }
    .dash-progress-rate { font-size: 24px; }
    .dash-phase-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .dash-phase-card { padding: 14px; }
    .dash-phase-value { font-size: 22px; }
    .dash-sections-card { padding: 16px; }

    /* Filters */
    .filters-bar {
      padding: 10px;
      gap: 6px;
    }
    .filter-search {
      flex: 1 1 100%;
    }
    .filter-select {
      flex: 1 1 calc(50% - 4px);
      font-size: 11px;
      padding: 7px 10px;
      padding-left: 24px;
    }

    /* Task Card */
    .task-card {
      padding: 10px 8px;
      gap: 8px;
      flex-wrap: wrap;
    }
    .task-card-title h3 {
      font-size: 12px;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .task-card-badges {
      order: 4;
      width: 100%;
      padding-right: 36px;
    }
    .task-badge {
      font-size: 9px;
      padding: 2px 6px;
    }
    .task-card-status {
      width: 26px;
      height: 26px;
    }

    /* Section */
    .section-header {
      padding: 12px 12px;
    }
    .section-header-info span:first-child {
      font-size: 13px;
    }
    .section-tasks-wrap {
      padding: 4px 4px 6px;
    }

    /* Detail */
    .detail-card { padding: 16px; }
    .detail-title { font-size: 17px; }
    .detail-action-btn {
      padding: 6px 10px;
      font-size: 11px;
    }
    .detail-note-row {
      flex-direction: column;
    }

    /* Login */
    .login-card {
      padding: 28px 20px;
      border-radius: 16px;
    }
  }

  /* ═══════════════════════════════════════
     TABLET (641px - 768px)
     ═══════════════════════════════════════ */
  @media (min-width: 641px) and (max-width: 768px) {
    .dash-stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .dash-stat-value { font-size: 26px; }
  }
`;

/* ─── Toast Component ─── */
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "10px 20px",
        borderRadius: 12,
        background: type === "success" ? "#059669" : "#dc2626",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "slideUp 0.3s ease",
        maxWidth: "90vw",
        textAlign: "center",
      }}
    >
      {type === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
      {message}
    </div>
  );
}

/* ─── Dropdown Menu ─── */
function DropdownMenu({
  trigger,
  items,
}: {
  trigger: React.ReactNode;
  items: { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className="dropdown-menu">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: "transparent",
                fontSize: 12,
                color: item.danger ? "#dc2626" : "var(--color-text)",
                textAlign: "right",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Select Dropdown ─── */
function SelectDropdown({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="filter-select"
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════════════════ */
function AdminLoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      try { sessionStorage.setItem(AUTH_STORAGE_KEY, "true"); } catch {}
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "linear-gradient(135deg, #1a365d, #2d4a7c)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 16px",
        }}>
          <Lock size={24} color="#fff" />
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#1a365d" }}>منطقة محمية</h2>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b" }}>أدخل كلمة المرور للوصول إلى إدارة المهام</p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 44px 12px 14px",
                borderRadius: 10,
                border: `2px solid ${error ? "#dc2626" : "#e2e8f0"}`,
                fontSize: 14,
                outline: "none",
                textAlign: "center",
                fontFamily: "inherit",
                transition: "border-color 200ms",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#94a3b8",
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>
              كلمة المرور غير صحيحة
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #1a365d, #2d4a7c)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 200ms",
            }}
          >
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TasksPage() {
  /* ─── Auth State ─── */
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);

  // Check session on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored === "true") setIsAdmin(true);
    } catch {}
  }, []);

  /* ─── State ─── */
  const [view, setView] = useState<"dashboard" | "tasks" | "detail">("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  // Detail view
  const [noteText, setNoteText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  /* ─── Data Loading ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, statsData, sectionsData] = await Promise.all([
        fetchTasks(),
        fetchStats(),
        fetchSections(),
      ]);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setStats(statsData);
      setSections(sectionsData);
    } catch {
      showToast("حدث خطأ في تحميل البيانات", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  /* ─── Navigation with Auth Check ─── */
  const handleNavToTasks = () => {
    if (isAdmin) {
      setView("tasks");
    } else {
      setShowLoginScreen(true);
    }
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setShowLoginScreen(false);
    setView("tasks");
  };

  /* ─── Actions ─── */
  const handleUpdateStatus = async (taskId: number, status: TaskStatus) => {
    setActionLoading(taskId);
    try {
      await postAction({ action: "updateStatus", taskId, status });
      showToast(`تم تحديث الحالة إلى: ${statusConfig[status].label}`, "success");
      await loadAll();
      if (selectedTask?.id === taskId) {
        const detail = await fetchTaskDetail(taskId);
        setSelectedTask(detail.task);
        setTaskHistory(detail.history);
      }
    } catch { showToast("حدث خطأ أثناء تحديث الحالة", "error"); }
    setActionLoading(null);
  };

  const handleUpdatePhase = async (taskId: number, phase: TaskPhase) => {
    setActionLoading(taskId);
    try {
      await postAction({ action: "updatePhase", taskId, phase });
      showToast(`تم نقل المهمة إلى: ${phaseConfig[phase].label}`, "success");
      await loadAll();
      if (selectedTask?.id === taskId) {
        const detail = await fetchTaskDetail(taskId);
        setSelectedTask(detail.task);
        setTaskHistory(detail.history);
      }
    } catch { showToast("حدث خطأ أثناء نقل المهمة", "error"); }
    setActionLoading(null);
  };

  const handleUndo = async (taskId: number) => {
    setActionLoading(taskId);
    try {
      await postAction({ action: "undo", taskId });
      showToast("تم التراجع عن آخر إجراء", "success");
      await loadAll();
      if (selectedTask?.id === taskId) {
        const detail = await fetchTaskDetail(taskId);
        setSelectedTask(detail.task);
        setTaskHistory(detail.history);
      }
    } catch { showToast("لا يوجد إجراء للتراجع عنه", "error"); }
    setActionLoading(null);
  };

  const handleAddNote = async (taskId: number) => {
    if (!noteText.trim()) return;
    setActionLoading(taskId);
    try {
      await postAction({ action: "addNote", taskId, note: noteText.trim() });
      showToast("تمت إضافة الملاحظة", "success");
      setNoteText("");
      await loadAll();
      const detail = await fetchTaskDetail(taskId);
      setSelectedTask(detail.task);
      setTaskHistory(detail.history);
    } catch { showToast("حدث خطأ أثناء إضافة الملاحظة", "error"); }
    setActionLoading(null);
  };

  const openTaskDetail = async (task: Task) => {
    setSelectedTask(task);
    setView("detail");
    setNoteText("");
    try {
      const detail = await fetchTaskDetail(task.id);
      setSelectedTask(detail.task);
      setTaskHistory(detail.history);
    } catch { setTaskHistory([]); }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const result = await seedTasks();
      showToast(result.message || `تم إدخال ${result.count} مهمة`, "success");
      await loadAll();
    } catch { showToast("حدث خطأ أثناء إدخال البيانات", "error"); }
    setLoading(false);
  };

  /* ─── Filtered Tasks ─── */
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (phaseFilter !== "all" && t.phase !== phaseFilter) return false;
      if (sectionFilter !== "all" && t.section !== sectionFilter) return false;
      if (search && !t.title.includes(search)) return false;
      return true;
    });
  }, [tasks, statusFilter, phaseFilter, sectionFilter, search]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const task of filteredTasks) {
      if (!groups[task.section]) groups[task.section] = [];
      groups[task.section].push(task);
    }
    return groups;
  }, [filteredTasks]);

  const hasFilters = statusFilter !== "all" || phaseFilter !== "all" || sectionFilter !== "all" || search.length > 0;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Auto-expand all sections on first load
  useEffect(() => {
    if (Object.keys(groupedTasks).length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(Object.keys(groupedTasks)));
    }
  }, [groupedTasks]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <style>{RESPONSIVE_CSS}</style>

      {/* Login Screen Overlay */}
      {showLoginScreen && (
        <AdminLoginScreen onLogin={handleAdminLogin} />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="tasks-header">
        <div className="tasks-header-brand">
          <Image src="/logo.png" alt="PME" width={32} height={32} className="logo-img" style={{ borderRadius: 8 }} />
          <div>
            <h1>Property Middle East</h1>
            <p>لوحة إدارة المهام</p>
          </div>
        </div>
        <div className="tasks-header-nav">
          <button
            className={`nav-btn ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <LayoutDashboard size={14} />
            المتابعة
          </button>
          <button
            className={`nav-btn ${view === "tasks" || view === "detail" ? "active" : ""}`}
            onClick={handleNavToTasks}
          >
            <ListTodo size={14} />
            المهام
            {!isAdmin && <Lock size={10} style={{ opacity: 0.6 }} />}
          </button>
        </div>
        <Link href="/" className="tasks-header-link">
          خارطة الخدمات
          <ArrowLeft size={12} />
        </Link>
      </header>

      {/* Main Content */}
      <main className="tasks-main">
        {loading && tasks.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: 300 }}>
            <div style={{ textAlign: "center" }}>
              <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
              <p style={{ marginTop: 14, color: "var(--color-muted)", fontSize: 14 }}>جاري تحميل المهام...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          isAdmin ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 300 }}>
              <div style={{ textAlign: "center" }}>
                <ListTodo size={40} style={{ color: "var(--color-muted)", marginBottom: 14 }} />
                <h2 style={{ color: "var(--color-text)", marginBottom: 8, fontSize: 18 }}>لا توجد مهام بعد</h2>
                <p style={{ color: "var(--color-muted)", marginBottom: 20, fontSize: 13 }}>اضغط الزر أدناه لإدخال المهام</p>
                <button
                  onClick={handleSeed}
                  style={{
                    padding: "10px 28px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  إدخال المهام
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", placeItems: "center", minHeight: 300 }}>
              <div style={{ textAlign: "center" }}>
                <Loader2 size={40} style={{ color: "var(--color-muted)", marginBottom: 14 }} />
                <h2 style={{ color: "var(--color-text)", marginBottom: 8, fontSize: 18 }}>جاري إعداد المهام</h2>
                <p style={{ color: "var(--color-muted)", fontSize: 13 }}>يتم تجهيز المهام حالياً، يرجى المحاولة لاحقاً</p>
              </div>
            </div>
          )
        ) : view === "dashboard" ? (
          <DashboardView stats={stats} isAdmin={isAdmin} onNavigate={(v) => {
            if (v === "tasks" && !isAdmin) {
              setShowLoginScreen(true);
            } else {
              setView(v as "dashboard" | "tasks");
            }
          }} />
        ) : view === "detail" && selectedTask && isAdmin ? (
          <DetailView
            task={selectedTask}
            history={taskHistory}
            actionLoading={actionLoading}
            noteText={noteText}
            onNoteChange={setNoteText}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePhase={handleUpdatePhase}
            onUndo={handleUndo}
            onAddNote={handleAddNote}
            onBack={() => setView("tasks")}
          />
        ) : isAdmin ? (
          <TasksListView
            tasks={filteredTasks}
            groupedTasks={groupedTasks}
            sections={sections}
            search={search}
            statusFilter={statusFilter}
            phaseFilter={phaseFilter}
            sectionFilter={sectionFilter}
            hasFilters={hasFilters}
            expandedSections={expandedSections}
            actionLoading={actionLoading}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onPhaseFilterChange={setPhaseFilter}
            onSectionFilterChange={setSectionFilter}
            onClearFilters={() => { setSearch(""); setStatusFilter("all"); setPhaseFilter("all"); setSectionFilter("all"); }}
            onToggleSection={toggleSection}
            onOpenDetail={openTaskDetail}
            onUpdateStatus={handleUpdateStatus}
            onUpdatePhase={handleUpdatePhase}
            onUndo={handleUndo}
            onRefresh={loadAll}
          />
        ) : (
          <DashboardView stats={stats} isAdmin={false} onNavigate={() => setShowLoginScreen(true)} />
        )}
      </main>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW (PUBLIC)
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ stats, isAdmin, onNavigate }: { stats: Stats | null; isAdmin: boolean; onNavigate: (v: string) => void }) {
  if (!stats) return null;

  const statCards = [
    { label: "إجمالي المهام", value: stats.total, color: "#1a365d", bg: "#f0f4f8", icon: <ListTodo size={20} /> },
    { label: "منجزة", value: stats.completed, color: "#059669", bg: "#ecfdf5", icon: <CheckCircle2 size={20} />, extra: `${stats.completionRate}%` },
    { label: "قيد التنفيذ", value: stats.inProgress, color: "#2563eb", bg: "#eff6ff", icon: <Loader2 size={20} /> },
    { label: "مؤجلة", value: stats.deferred, color: "#d97706", bg: "#fffbeb", icon: <CalendarClock size={20} /> },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Title */}
      <div className="dash-title" style={{ textAlign: "center", marginBottom: 4 }}>
        <h2>لوحة المتابعة</h2>
        <p>تتبع تقدم مهام إطلاق منصة Property Middle East</p>
      </div>

      {/* Stat Cards */}
      <div className="dash-stat-grid">
        {statCards.map((card, i) => (
          <div key={i} className="dash-stat-card">
            {card.extra && (
              <span className="dash-stat-extra" style={{ color: card.color, background: card.bg }}>
                {card.extra}
              </span>
            )}
            <span style={{ color: card.color }}>{card.icon}</span>
            <span className="dash-stat-value">{card.value}</span>
            <span className="dash-stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="dash-progress-card">
        <div className="dash-progress-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>نسبة الإنجاز الكلية</h3>
          </div>
          <span className="dash-progress-rate">{stats.completionRate}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>{stats.completed} من {stats.total} مهمة</span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${stats.completionRate}%`,
              borderRadius: 99,
              background: "linear-gradient(90deg, #059669, #10b981)",
              transition: "width 0.6s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--color-muted)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Rocket size={13} /> مع الإطلاق: {stats.launchTotal}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CalendarClock size={13} /> بعد الإطلاق: {stats.postLaunchTotal}
          </span>
        </div>
      </div>

      {/* Phase Cards */}
      <div className="dash-phase-grid">
        <div className="dash-phase-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Rocket size={18} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>مهام الإطلاق</h3>
          </div>
          <span className="dash-phase-value" style={{ color: "var(--color-primary)" }}>{stats.launchTotal}</span>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-muted)" }}>مهمة مطلوبة للإطلاق</p>
        </div>
        <div className="dash-phase-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <CalendarClock size={18} style={{ color: "var(--color-secondary)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>مهام ما بعد الإطلاق</h3>
          </div>
          <span className="dash-phase-value" style={{ color: "var(--color-secondary)" }}>{stats.postLaunchTotal}</span>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-muted)" }}>مهمة مؤجلة لما بعد الإطلاق</p>
        </div>
      </div>

      {/* Section Stats */}
      <div className="dash-sections-card">
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>تقدم الأقسام</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {stats.sections.map((sec, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{sec.name}</span>
                <span style={{ color: "var(--color-muted)" }}>{sec.completed}/{sec.total} ({sec.completionRate}%)</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${sec.completionRate}%`, borderRadius: 99, background: "linear-gradient(90deg, #1a365d, #2d4a7c)", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigate to tasks - only for admin */}
      {isAdmin && (
        <button
          onClick={() => onNavigate("tasks")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "2px solid var(--color-primary)",
            background: "transparent",
            color: "var(--color-primary)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 200ms",
          }}
        >
          <ListTodo size={16} />
          عرض جميع المهام
          <ArrowLeft size={14} />
        </button>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   TASKS LIST VIEW (ADMIN ONLY)
   ═══════════════════════════════════════════════════════════════ */
function TasksListView({
  tasks,
  groupedTasks,
  sections,
  search,
  statusFilter,
  phaseFilter,
  sectionFilter,
  hasFilters,
  expandedSections,
  actionLoading,
  onSearchChange,
  onStatusFilterChange,
  onPhaseFilterChange,
  onSectionFilterChange,
  onClearFilters,
  onToggleSection,
  onOpenDetail,
  onUpdateStatus,
  onUpdatePhase,
  onUndo,
  onRefresh,
}: {
  tasks: Task[];
  groupedTasks: Record<string, Task[]>;
  sections: string[];
  search: string;
  statusFilter: string;
  phaseFilter: string;
  sectionFilter: string;
  hasFilters: boolean;
  expandedSections: Set<string>;
  actionLoading: number | null;
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: string) => void;
  onPhaseFilterChange: (v: string) => void;
  onSectionFilterChange: (v: string) => void;
  onClearFilters: () => void;
  onToggleSection: (s: string) => void;
  onOpenDetail: (t: Task) => void;
  onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void;
  onUndo: (id: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>المهام</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-muted)" }}>{tasks.length} مهمة</p>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "#fff",
            color: "var(--color-text)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-search">
          <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في المهام..."
          />
        </div>
        <SelectDropdown
          value={statusFilter}
          options={statusOptions.map((s) => ({ value: s, label: statusConfig[s].label }))}
          onChange={onStatusFilterChange}
          placeholder="جميع الحالات"
        />
        <SelectDropdown
          value={phaseFilter}
          options={phaseOptions.map((p) => ({ value: p, label: phaseConfig[p].label }))}
          onChange={onPhaseFilterChange}
          placeholder="جميع المراحل"
        />
        <SelectDropdown
          value={sectionFilter}
          options={sections.map((s) => ({ value: s, label: s }))}
          onChange={onSectionFilterChange}
          placeholder="جميع الأقسام"
        />
        {hasFilters && (
          <button
            onClick={onClearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <X size={12} />
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Task Groups */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-muted)" }}>
          <Search size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
          <p style={{ fontSize: 13 }}>لا توجد مهام مطابقة للفلاتر المحددة</p>
        </div>
      ) : (
        Object.entries(groupedTasks).map(([section, sectionTasks]) => (
          <div key={section} style={{ borderRadius: 14, border: "1px solid var(--color-border)", background: "#fff", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <button
              onClick={() => onToggleSection(section)}
              className="section-header"
            >
              <div className="section-header-info">
                <span>{section}</span>
                <span className="section-count">{sectionTasks.length}</span>
              </div>
              {expandedSections.has(section) ? <ChevronUp size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />}
            </button>
            {expandedSections.has(section) && (
              <div className="section-tasks-wrap">
                {sectionTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    actionLoading={actionLoading}
                    onOpenDetail={onOpenDetail}
                    onUpdateStatus={onUpdateStatus}
                    onUpdatePhase={onUpdatePhase}
                    onUndo={onUndo}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TASK CARD
   ═══════════════════════════════════════════════════════════════ */
function TaskCard({
  task,
  actionLoading,
  onOpenDetail,
  onUpdateStatus,
  onUpdatePhase,
  onUndo,
}: {
  task: Task;
  actionLoading: number | null;
  onOpenDetail: (t: Task) => void;
  onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void;
  onUndo: (id: number) => void;
}) {
  const sc = statusConfig[task.status];
  const pc = phaseConfig[task.phase];
  const isLoading = actionLoading === task.id;
  const StatusIcon = sc.icon;

  const nextPhase: TaskPhase = task.phase === "launch" ? "post_launch" : "launch";

  return (
    <div
      className="task-card"
      style={{
        border: `1px solid ${task.status === "completed" ? "#bbf7d0" : "transparent"}`,
        background: task.status === "completed" ? "#f0fdf4" : "#fafbfc",
        opacity: isLoading ? 0.6 : 1,
      }}
      onClick={() => onOpenDetail(task)}
    >
      {/* Status Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const nextStatus: TaskStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : task.status === "completed" ? "pending" : "pending";
          onUpdateStatus(task.id, nextStatus);
        }}
        title="تغيير الحالة"
        className="task-card-status"
        style={{
          borderColor: sc.color,
          background: task.status === "completed" ? sc.color : "transparent",
          color: task.status === "completed" ? "#fff" : sc.color,
        }}
      >
        {isLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <StatusIcon size={12} />}
      </button>

      {/* Title */}
      <div className="task-card-title">
        <h3
          style={{
            textDecoration: task.status === "completed" ? "line-through" : "none",
            opacity: task.status === "completed" ? 0.7 : 1,
          }}
        >
          {task.title}
        </h3>
        {task.completed_at && (
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#059669" }}>
            أُنجزت: {formatDate(task.completed_at)}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="task-card-badges">
        <span className="task-badge" style={{ color: sc.color, background: sc.bg }}>
          {sc.label}
        </span>
        <span className="task-badge" style={{ color: pc.color, background: pc.bg }}>
          {pc.label}
        </span>
      </div>

      {/* Actions */}
      <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <button style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--color-muted)" }}>
              <MoreVertical size={14} />
            </button>
          }
          items={[
            ...statusOptions.filter((s) => s !== task.status).map((s) => ({
              label: statusConfig[s].label,
              icon: (() => { const I = statusConfig[s].icon; return <I size={13} />; })(),
              onClick: () => onUpdateStatus(task.id, s),
            })),
            {
              label: `نقل إلى ${phaseConfig[nextPhase].label}`,
              icon: <ArrowLeftRight size={13} />,
              onClick: () => onUpdatePhase(task.id, nextPhase),
            },
            {
              label: "تراجع عن آخر إجراء",
              icon: <Undo2 size={13} />,
              onClick: () => onUndo(task.id),
              danger: true,
            },
          ]}
        />
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DETAIL VIEW (ADMIN ONLY)
   ═══════════════════════════════════════════════════════════════ */
function DetailView({
  task,
  history,
  actionLoading,
  noteText,
  onNoteChange,
  onUpdateStatus,
  onUpdatePhase,
  onUndo,
  onAddNote,
  onBack,
}: {
  task: Task;
  history: TaskHistory[];
  actionLoading: number | null;
  noteText: string;
  onNoteChange: (v: string) => void;
  onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void;
  onUndo: (id: number) => void;
  onAddNote: (id: number) => void;
  onBack: () => void;
}) {
  const sc = statusConfig[task.status];
  const pc = phaseConfig[task.phase];
  const isLoading = actionLoading === task.id;
  const nextPhase: TaskPhase = task.phase === "launch" ? "post_launch" : "launch";

  const actionLabels: Record<string, string> = {
    status_change: "تغيير الحالة",
    phase_change: "تغيير المرحلة",
    note_added: "إضافة ملاحظة",
  };

  const valueLabels = (val: string | null) => {
    if (!val) return "—";
    if (statusConfig[val as TaskStatus]) return statusConfig[val as TaskStatus].label;
    if (phaseConfig[val as TaskPhase]) return phaseConfig[val as TaskPhase].label;
    return val;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 0",
          border: "none",
          background: "transparent",
          color: "var(--color-primary)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ArrowRight size={14} />
        العودة للمهام
      </button>

      {/* Task Header */}
      <div className="detail-card">
        <h2 className="detail-title">{task.title}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 99, color: sc.color, background: sc.bg }}>{sc.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 99, color: pc.color, background: pc.bg }}>{pc.label}</span>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-muted)" }}>القسم: {task.section}</p>
        {task.completed_at && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#059669", fontWeight: 600 }}>
            تاريخ الإنجاز: {formatDate(task.completed_at)}
          </p>
        )}
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-muted)" }}>تاريخ الإنشاء: {formatDate(task.created_at)}</p>
      </div>

      {/* Actions */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>الإجراءات</h3>
        <div className="detail-actions-wrap">
          {statusOptions.filter((s) => s !== task.status).map((s) => {
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => onUpdateStatus(task.id, s)}
                disabled={isLoading}
                className="detail-action-btn"
                style={{
                  border: `1px solid ${cfg.color}30`,
                  background: cfg.bg,
                  color: cfg.color,
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Icon size={13} />
                {cfg.label}
              </button>
            );
          })}
          <button
            onClick={() => onUpdatePhase(task.id, nextPhase)}
            disabled={isLoading}
            className="detail-action-btn"
            style={{
              border: "1px solid var(--color-border)",
              background: "#f8fafc",
              color: "var(--color-text)",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <ArrowLeftRight size={13} />
            نقل إلى {phaseConfig[nextPhase].label}
          </button>
          <button
            onClick={() => onUndo(task.id)}
            disabled={isLoading}
            className="detail-action-btn"
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#dc2626",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Undo2 size={13} />
            تراجع
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquareText size={16} />
          الملاحظات
        </h3>
        {task.notes && (
          <div style={{ padding: 12, borderRadius: 10, background: "#f8fafc", border: "1px solid var(--color-border)", marginBottom: 10, fontSize: 12, lineHeight: 1.8 }}>
            {task.notes}
          </div>
        )}
        <div className="detail-note-row">
          <textarea
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="أضف ملاحظة..."
            rows={2}
          />
          <button
            onClick={() => onAddNote(task.id)}
            disabled={!noteText.trim() || isLoading}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: noteText.trim() ? "pointer" : "not-allowed",
              opacity: noteText.trim() ? 1 : 0.5,
              alignSelf: "flex-end",
              display: "flex",
              alignItems: "center",
              gap: 5,
              whiteSpace: "nowrap",
            }}
          >
            <Send size={13} />
            إرسال
          </button>
        </div>
      </div>

      {/* History */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>سجل التغييرات</h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 12, textAlign: "center", padding: 16 }}>لا توجد تغييرات مسجلة بعد</p>
        ) : (
          <div style={{ display: "grid", gap: 0 }}>
            {history.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < history.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--color-primary)", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                    {actionLabels[entry.action] || entry.action}
                  </div>
                  {entry.action !== "note_added" && (
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                      من <strong>{valueLabels(entry.from_value)}</strong> إلى <strong>{valueLabels(entry.to_value)}</strong>
                    </div>
                  )}
                  {entry.note && (
                    <div style={{ fontSize: 11, color: "var(--color-text)", marginTop: 4, padding: "5px 8px", background: "#f8fafc", borderRadius: 8 }}>
                      {entry.note}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 3 }}>
                    {entry.performed_by} • {formatDate(entry.performed_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ArrowLeft for header link ─── */
function ArrowLeft(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
