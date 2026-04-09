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
  Target,
  Zap,
  BarChart3,
  CircleDot,
  Activity,
  Layers,
  Timer,
  Award,
  AlertCircle,
  PauseCircle,
  PlayCircle,
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

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string; gradient: string; icon: typeof Clock }> = {
  pending: { label: "قيد الانتظار", color: "#8b5cf6", bg: "#f5f3ff", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)", icon: PauseCircle },
  in_progress: { label: "قيد التنفيذ", color: "#0ea5e9", bg: "#f0f9ff", gradient: "linear-gradient(135deg, #0ea5e9, #38bdf8)", icon: PlayCircle },
  completed: { label: "منجزة", color: "#10b981", bg: "#ecfdf5", gradient: "linear-gradient(135deg, #10b981, #34d399)", icon: CheckCircle2 },
  deferred: { label: "مؤجلة", color: "#f59e0b", bg: "#fffbeb", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", icon: CalendarClock },
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

/* ─── Animated Counter ─── */
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

/* ─── Circular Progress ─── */
function CircularProgress({ percentage, size = 120, strokeWidth = 8, color = "#10b981" }: { percentage: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
      />
    </svg>
  );
}

/* ─── CSS ─── */
const RESPONSIVE_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  /* ─── Header ─── */
  .tasks-header {
    background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%);
    padding: 16px 24px;
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
  .tasks-header-brand h1 { margin: 0; color: #fff; font-size: 16px; font-weight: 700; white-space: nowrap; }
  .tasks-header-brand p { margin: 0; color: rgba(255,255,255,0.7); font-size: 11px; }
  .tasks-header-nav { display: flex; gap: 4px; }
  .tasks-header-link {
    display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 12px;
    text-decoration: none; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
    transition: all 200ms; white-space: nowrap; flex-shrink: 0;
  }
  .nav-btn {
    display: flex; align-items: center; gap: 5px; padding: 7px 14px; border-radius: 10px;
    border: none; font-size: 12px; cursor: pointer; transition: all 200ms; white-space: nowrap;
  }
  .nav-btn.active { background: rgba(255,255,255,0.2); color: #fff; font-weight: 700; }
  .nav-btn:not(.active) { background: transparent; color: rgba(255,255,255,0.65); font-weight: 400; }

  /* ─── Main Content ─── */
  .tasks-main { max-width: 1200px; margin: 0 auto; padding: 24px 20px 80px; }

  /* ─── Dashboard ─── */
  .dash-hero {
    background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 40%, #3b5998 100%);
    border-radius: 20px;
    padding: 32px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }
  .dash-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .dash-hero-title { font-size: 28px; font-weight: 800; margin: 0 0 6px; position: relative; z-index: 1; }
  .dash-hero-sub { font-size: 14px; color: rgba(255,255,255,0.75); margin: 0; position: relative; z-index: 1; }

  .dash-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .dash-stat-card {
    padding: 24px 20px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    border: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    overflow: hidden;
    transition: all 300ms ease;
    animation: fadeIn 0.5s ease forwards;
  }
  .dash-stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  }
  .dash-stat-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    left: 0;
    height: 4px;
  }
  .dash-stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 20px;
  }
  .dash-stat-value { font-size: 36px; font-weight: 800; line-height: 1; letter-spacing: -1px; }
  .dash-stat-label { font-size: 13px; color: #94a3b8; font-weight: 500; }
  .dash-stat-change {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 99px;
  }

  /* Progress Ring Section */
  .dash-progress-section {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 32px;
    align-items: center;
    padding: 28px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .dash-progress-ring {
    position: relative;
    display: grid;
    place-items: center;
  }
  .dash-progress-ring-text {
    position: absolute;
    text-align: center;
  }
  .dash-progress-ring-value { font-size: 32px; font-weight: 800; color: var(--color-text); display: block; line-height: 1; }
  .dash-progress-ring-label { font-size: 11px; color: #94a3b8; display: block; margin-top: 2px; }
  .dash-progress-bars { display: grid; gap: 12px; }
  .dash-progress-bar-item { display: grid; gap: 6px; }
  .dash-progress-bar-header { display: flex; justify-content: space-between; align-items: center; }
  .dash-progress-bar-label { font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .dash-progress-bar-count { font-size: 12px; color: #94a3b8; font-weight: 600; }
  .dash-progress-bar-track { height: 8px; border-radius: 99px; background: #f1f5f9; overflow: hidden; }
  .dash-progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }

  /* Phase Cards */
  .dash-phase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .dash-phase-card {
    padding: 24px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 300ms ease;
  }
  .dash-phase-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.06); }
  .dash-phase-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #fff;
  }
  .dash-phase-value { font-size: 32px; font-weight: 800; line-height: 1; }
  .dash-phase-label { font-size: 13px; color: #94a3b8; }

  /* Section Progress Cards */
  .dash-sections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 12px;
  }
  .dash-section-card {
    padding: 18px 20px;
    border-radius: 14px;
    background: #fff;
    border: 1px solid #f0f0f0;
    box-shadow: 0 1px 6px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 200ms ease;
  }
  .dash-section-card:hover { border-color: #e0e0e0; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
  .dash-section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .dash-section-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.4;
    flex: 1;
    min-width: 0;
  }
  .dash-section-rate {
    font-size: 14px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 99px;
    flex-shrink: 0;
  }
  .dash-section-stats {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .dash-section-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .dash-section-bar { height: 6px; border-radius: 99px; background: #f1f5f9; overflow: hidden; }
  .dash-section-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }

  /* ─── Filters ─── */
  .filters-bar {
    display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px;
    border-radius: 14px; border: 1px solid #f0f0f0; background: #fff;
    align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  }
  .filter-search { position: relative; flex: 1 1 200px; min-width: 0; }
  .filter-search input {
    width: 100%; padding: 10px 40px 10px 14px; border-radius: 10px;
    border: 1px solid #e8e8e8; font-size: 13px; outline: none; box-sizing: border-box;
    transition: border-color 200ms;
  }
  .filter-search input:focus { border-color: var(--color-primary); }
  .filter-select {
    padding: 10px 14px; padding-left: 28px; border-radius: 10px;
    border: 1px solid #e8e8e8; background: #fff; font-size: 12px;
    color: var(--color-text); cursor: pointer; outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: left 10px center;
    min-width: 0; flex: 0 1 auto; max-width: 100%;
    transition: border-color 200ms;
  }
  .filter-select:focus { border-color: var(--color-primary); }

  /* ─── Task Card ─── */
  .task-card {
    display: flex; align-items: center; padding: 14px 16px; margin: 4px 0;
    border-radius: 12px; transition: all 200ms; cursor: pointer; gap: 12px;
    border: 1px solid transparent;
  }
  .task-card:hover { background: #f8fafc; border-color: #e8e8e8; }
  .task-card-status {
    flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px;
    display: grid; place-items: center; cursor: pointer; transition: all 200ms;
  }
  .task-card-title { flex: 1; min-width: 0; }
  .task-card-title h3 {
    margin: 0; font-size: 13px; font-weight: 600; color: var(--color-text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.5;
  }
  .task-card-badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .task-badge {
    font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 8px; white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .task-card-actions { flex-shrink: 0; }

  /* ─── Detail View ─── */
  .detail-card {
    padding: 24px; border-radius: 16px; border: 1px solid #f0f0f0;
    background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .detail-title { font-size: 22px; font-weight: 800; margin: 0 0 12px; line-height: 1.4; }
  .detail-actions-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .detail-action-btn {
    display: flex; align-items: center; gap: 6px; padding: 8px 16px;
    border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;
    white-space: nowrap; transition: all 200ms;
  }
  .detail-action-btn:hover { transform: translateY(-1px); }
  .detail-note-row { display: flex; gap: 10px; }
  .detail-note-row textarea {
    flex: 1; padding: 12px 14px; border-radius: 12px; border: 1px solid #e8e8e8;
    font-size: 13px; resize: vertical; outline: none; font-family: inherit; min-width: 0;
    transition: border-color 200ms;
  }
  .detail-note-row textarea:focus { border-color: var(--color-primary); }

  /* ─── Section Accordion ─── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 16px 20px; border: none;
    background: linear-gradient(135deg, #f8fafc, #f0f4f8); cursor: pointer; text-align: right;
    transition: background 200ms;
  }
  .section-header:hover { background: linear-gradient(135deg, #f0f4f8, #e8edf4); }
  .section-header-info { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .section-header-info span:first-child {
    font-size: 14px; font-weight: 700; color: var(--color-primary);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .section-count {
    font-size: 11px; font-weight: 700; color: #fff;
    background: var(--color-primary); padding: 2px 10px; border-radius: 99px; flex-shrink: 0;
  }
  .section-tasks-wrap { padding: 8px 12px 12px; }

  /* ─── Login Screen ─── */
  .login-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%);
    display: grid; place-items: center; padding: 16px;
  }
  .login-card {
    background: #fff; border-radius: 24px; padding: 40px 32px;
    max-width: 400px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.3); text-align: center;
  }

  /* ─── Dropdown ─── */
  .dropdown-menu {
    position: absolute; top: 100%; left: 0; margin-top: 4px;
    background: #fff; border-radius: 14px; border: 1px solid #f0f0f0;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12); min-width: 200px;
    z-index: 100; overflow: hidden;
  }

  /* ═══ MOBILE (max-width: 640px) ═══ */
  @media (max-width: 640px) {
    .tasks-header { padding: 12px 14px; gap: 8px; }
    .tasks-header-brand h1 { font-size: 13px; }
    .tasks-header-brand p { font-size: 10px; }
    .tasks-header-brand img, .tasks-header-brand .logo-img { width: 28px !important; height: 28px !important; }
    .nav-btn { padding: 6px 8px; font-size: 11px; gap: 3px; }
    .tasks-header-link { font-size: 11px; padding: 5px 8px; }
    .tasks-main { padding: 16px 12px 60px; }

    .dash-hero { padding: 24px 20px; border-radius: 16px; }
    .dash-hero-title { font-size: 22px; }
    .dash-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .dash-stat-card { padding: 18px 14px; }
    .dash-stat-value { font-size: 28px; }
    .dash-stat-icon { width: 40px; height: 40px; border-radius: 10px; }
    .dash-progress-section { grid-template-columns: 1fr; gap: 20px; padding: 20px; }
    .dash-progress-ring { justify-self: center; }
    .dash-phase-grid { grid-template-columns: 1fr; gap: 10px; }
    .dash-phase-card { padding: 18px; }
    .dash-phase-value { font-size: 26px; }
    .dash-sections-grid { grid-template-columns: 1fr; }

    .filters-bar { padding: 10px; gap: 6px; }
    .filter-search { flex: 1 1 100%; }
    .filter-select { flex: 1 1 calc(50% - 4px); font-size: 11px; padding: 8px 10px; padding-left: 24px; }

    .task-card { padding: 12px 10px; gap: 10px; flex-wrap: wrap; }
    .task-card-title h3 { font-size: 12px; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .task-card-badges { order: 4; width: 100%; padding-right: 42px; }
    .task-badge { font-size: 9px; padding: 2px 7px; }
    .task-card-status { width: 28px; height: 28px; border-radius: 8px; }

    .section-header { padding: 14px 14px; }
    .section-header-info span:first-child { font-size: 13px; }
    .section-tasks-wrap { padding: 4px 6px 8px; }

    .detail-card { padding: 18px; }
    .detail-title { font-size: 18px; }
    .detail-action-btn { padding: 7px 12px; font-size: 11px; }
    .detail-note-row { flex-direction: column; }

    .login-card { padding: 28px 20px; border-radius: 18px; }
  }

  /* ═══ TABLET (641px - 768px) ═══ */
  @media (min-width: 641px) and (max-width: 768px) {
    .dash-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .dash-stat-value { font-size: 30px; }
    .dash-sections-grid { grid-template-columns: 1fr; }
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
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
        padding: "12px 24px", borderRadius: 14,
        background: type === "success" ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #dc2626, #ef4444)",
        color: "#fff", fontSize: 13, fontWeight: 600,
        boxShadow: "0 12px 40px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 10,
        animation: "slideUp 0.3s ease", maxWidth: "90vw", textAlign: "center",
      }}
    >
      {type === "success" ? <CheckCircle2 size={16} /> : <X size={16} />}
      {message}
    </div>
  );
}

/* ─── Dropdown Menu ─── */
function DropdownMenu({
  trigger, items,
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
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "11px 16px", border: "none", background: "transparent",
                fontSize: 12, fontWeight: 500,
                color: item.danger ? "#dc2626" : "var(--color-text)",
                textAlign: "right", transition: "background 150ms",
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
  value, options, onChange, placeholder,
}: {
  value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="filter-select">
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
          width: 64, height: 64, borderRadius: 18,
          background: "linear-gradient(135deg, #1a365d, #2d4a7c)",
          display: "grid", placeItems: "center", margin: "0 auto 20px",
          boxShadow: "0 8px 24px rgba(26,54,93,0.3)",
        }}>
          <Lock size={28} color="#fff" />
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#1a365d" }}>منطقة محمية</h2>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#64748b" }}>أدخل كلمة المرور للوصول إلى إدارة المهام</p>

        <form onSubmit={handleSubmit}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              autoFocus
              style={{
                width: "100%", padding: "14px 44px 14px 14px", borderRadius: 12,
                border: `2px solid ${error ? "#dc2626" : "#e2e8f0"}`,
                fontSize: 14, outline: "none", textAlign: "center", fontFamily: "inherit",
                transition: "border-color 200ms", boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 12px", fontWeight: 600 }}>
              كلمة المرور غير صحيحة
            </p>
          )}
          <button
            type="submit"
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #1a365d, #2d4a7c)", color: "#fff",
              fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 200ms",
              boxShadow: "0 4px 16px rgba(26,54,93,0.3)",
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored === "true") setIsAdmin(true);
    } catch {}
  }, []);

  const [view, setView] = useState<"dashboard" | "tasks" | "detail">("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const [noteText, setNoteText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, statsData, sectionsData] = await Promise.all([
        fetchTasks(), fetchStats(), fetchSections(),
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

  const handleNavToTasks = () => {
    if (isAdmin) { setView("tasks"); } else { setShowLoginScreen(true); }
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setShowLoginScreen(false);
    setView("tasks");
  };

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

  useEffect(() => {
    if (Object.keys(groupedTasks).length > 0 && expandedSections.size === 0) {
      setExpandedSections(new Set(Object.keys(groupedTasks)));
    }
  }, [groupedTasks]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <style>{RESPONSIVE_CSS}</style>

      {showLoginScreen && <AdminLoginScreen onLogin={handleAdminLogin} />}
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
          <button className={`nav-btn ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>
            <LayoutDashboard size={14} />
            المتابعة
          </button>
          <button className={`nav-btn ${view === "tasks" || view === "detail" ? "active" : ""}`} onClick={handleNavToTasks}>
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
          <div style={{ display: "grid", placeItems: "center", minHeight: 400 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: "linear-gradient(135deg, #1a365d, #2d4a7c)",
                display: "grid", placeItems: "center", margin: "0 auto 20px",
                animation: "pulse 1.5s ease infinite",
              }}>
                <Loader2 size={28} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
              </div>
              <p style={{ color: "var(--color-muted)", fontSize: 14, fontWeight: 500 }}>جاري تحميل المهام...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          isAdmin ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: "#f0f4f8", display: "grid", placeItems: "center",
                  margin: "0 auto 20px",
                }}>
                  <ListTodo size={32} style={{ color: "var(--color-primary)" }} />
                </div>
                <h2 style={{ color: "var(--color-text)", marginBottom: 8, fontSize: 20, fontWeight: 800 }}>لا توجد مهام بعد</h2>
                <p style={{ color: "var(--color-muted)", marginBottom: 24, fontSize: 13 }}>اضغط الزر أدناه لإدخال المهام</p>
                <button
                  onClick={handleSeed}
                  style={{
                    padding: "12px 32px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #1a365d, #2d4a7c)", color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(26,54,93,0.3)",
                  }}
                >
                  إدخال المهام
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", placeItems: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center" }}>
                <Loader2 size={40} style={{ color: "var(--color-muted)", marginBottom: 14 }} />
                <h2 style={{ color: "var(--color-text)", marginBottom: 8, fontSize: 18 }}>جاري إعداد المهام</h2>
                <p style={{ color: "var(--color-muted)", fontSize: 13 }}>يتم تجهيز المهام حالياً، يرجى المحاولة لاحقاً</p>
              </div>
            </div>
          )
        ) : view === "dashboard" ? (
          <DashboardView stats={stats} isAdmin={isAdmin} onNavigate={(v) => {
            if (v === "tasks" && !isAdmin) { setShowLoginScreen(true); } else { setView(v as "dashboard" | "tasks"); }
          }} />
        ) : view === "detail" && selectedTask && isAdmin ? (
          <DetailView
            task={selectedTask} history={taskHistory} actionLoading={actionLoading}
            noteText={noteText} onNoteChange={setNoteText}
            onUpdateStatus={handleUpdateStatus} onUpdatePhase={handleUpdatePhase}
            onUndo={handleUndo} onAddNote={handleAddNote} onBack={() => setView("tasks")}
          />
        ) : isAdmin ? (
          <TasksListView
            tasks={filteredTasks} groupedTasks={groupedTasks} sections={sections}
            search={search} statusFilter={statusFilter} phaseFilter={phaseFilter}
            sectionFilter={sectionFilter} hasFilters={hasFilters}
            expandedSections={expandedSections} actionLoading={actionLoading}
            onSearchChange={setSearch} onStatusFilterChange={setStatusFilter}
            onPhaseFilterChange={setPhaseFilter} onSectionFilterChange={setSectionFilter}
            onClearFilters={() => { setSearch(""); setStatusFilter("all"); setPhaseFilter("all"); setSectionFilter("all"); }}
            onToggleSection={toggleSection} onOpenDetail={openTaskDetail}
            onUpdateStatus={handleUpdateStatus} onUpdatePhase={handleUpdatePhase}
            onUndo={handleUndo} onRefresh={loadAll}
          />
        ) : (
          <DashboardView stats={stats} isAdmin={false} onNavigate={() => setShowLoginScreen(true)} />
        )}
      </main>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW (PUBLIC) — REDESIGNED
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ stats, isAdmin, onNavigate }: { stats: Stats | null; isAdmin: boolean; onNavigate: (v: string) => void }) {
  if (!stats) return null;

  const statCards = [
    { label: "إجمالي المهام", value: stats.total, color: "#1a365d", gradient: "linear-gradient(135deg, #1a365d, #2d4a7c)", icon: <Layers size={22} />, change: null },
    { label: "منجزة", value: stats.completed, color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #34d399)", icon: <CheckCircle2 size={22} />, change: `${stats.completionRate}%` },
    { label: "قيد التنفيذ", value: stats.inProgress, color: "#0ea5e9", gradient: "linear-gradient(135deg, #0ea5e9, #38bdf8)", icon: <Activity size={22} />, change: null },
    { label: "مؤجلة", value: stats.deferred, color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", icon: <Timer size={22} />, change: null },
  ];

  const statusBreakdown = [
    { label: "منجزة", count: stats.completed, color: "#10b981", pct: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0 },
    { label: "قيد التنفيذ", count: stats.inProgress, color: "#0ea5e9", pct: stats.total ? Math.round((stats.inProgress / stats.total) * 100) : 0 },
    { label: "قيد الانتظار", count: stats.pending, color: "#8b5cf6", pct: stats.total ? Math.round((stats.pending / stats.total) * 100) : 0 },
    { label: "مؤجلة", count: stats.deferred, color: "#f59e0b", pct: stats.total ? Math.round((stats.deferred / stats.total) * 100) : 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Hero Section */}
      <div className="dash-hero">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
            display: "grid", placeItems: "center",
          }}>
            <Target size={22} color="#fff" />
          </div>
          <div>
            <h2 className="dash-hero-title">لوحة المتابعة</h2>
            <p className="dash-hero-sub">تتبع تقدم مهام إطلاق منصة Property Middle East</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 99,
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <Rocket size={14} />
            <span style={{ fontSize: 12 }}>مع الإطلاق: <strong>{stats.launchTotal}</strong></span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 99,
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}>
            <CalendarClock size={14} />
            <span style={{ fontSize: 12 }}>بعد الإطلاق: <strong>{stats.postLaunchTotal}</strong></span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stat-grid">
        {statCards.map((card, i) => (
          <div key={i} className="dash-stat-card" style={{ animationDelay: `${i * 100}ms`, ["--card-color" as string]: card.color }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="dash-stat-icon" style={{ background: card.gradient }}>
                {card.icon}
              </div>
              {card.change && (
                <span className="dash-stat-change" style={{ color: card.color, background: `${card.color}15` }}>
                  <TrendingUp size={11} />
                  {card.change}
                </span>
              )}
            </div>
            <div>
              <div className="dash-stat-value" style={{ color: card.color }}>
                <AnimatedNumber value={card.value} />
              </div>
              <div className="dash-stat-label">{card.label}</div>
            </div>
            <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, height: 4, background: card.gradient, borderRadius: "0 0 16px 16px" }} />
          </div>
        ))}
      </div>

      {/* Progress Ring + Status Breakdown */}
      <div className="dash-progress-section">
        <div className="dash-progress-ring">
          <CircularProgress percentage={stats.completionRate} size={140} strokeWidth={10} color="#10b981" />
          <div className="dash-progress-ring-text">
            <span className="dash-progress-ring-value">{stats.completionRate}%</span>
            <span className="dash-progress-ring-label">نسبة الإنجاز</span>
          </div>
        </div>
        <div className="dash-progress-bars">
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={18} style={{ color: "var(--color-primary)" }} />
              توزيع الحالات
            </span>
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94a3b8" }}>{stats.completed} من {stats.total} مهمة مكتملة</p>
          {statusBreakdown.map((item, i) => (
            <div key={i} className="dash-progress-bar-item">
              <div className="dash-progress-bar-header">
                <span className="dash-progress-bar-label">
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: item.color, display: "inline-block" }} />
                  {item.label}
                </span>
                <span className="dash-progress-bar-count">{item.count} ({item.pct}%)</span>
              </div>
              <div className="dash-progress-bar-track">
                <div className="dash-progress-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Cards */}
      <div className="dash-phase-grid">
        <div className="dash-phase-card">
          <div className="dash-phase-icon" style={{ background: "linear-gradient(135deg, #1a365d, #2d4a7c)" }}>
            <Rocket size={20} />
          </div>
          <div>
            <div className="dash-phase-value" style={{ color: "#1a365d" }}>
              <AnimatedNumber value={stats.launchTotal} />
            </div>
            <div className="dash-phase-label">مهام الإطلاق</div>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #1a365d, #2d4a7c)",
              width: stats.total ? `${Math.round((stats.launchTotal / stats.total) * 100)}%` : "0%",
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>
        <div className="dash-phase-card">
          <div className="dash-phase-icon" style={{ background: "linear-gradient(135deg, #c9956a, #d4a574)" }}>
            <CalendarClock size={20} />
          </div>
          <div>
            <div className="dash-phase-value" style={{ color: "#c9956a" }}>
              <AnimatedNumber value={stats.postLaunchTotal} />
            </div>
            <div className="dash-phase-label">مهام ما بعد الإطلاق</div>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginTop: 4 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #c9956a, #d4a574)",
              width: stats.total ? `${Math.round((stats.postLaunchTotal / stats.total) * 100)}%` : "0%",
              transition: "width 0.8s ease",
            }} />
          </div>
        </div>
      </div>

      {/* Section Progress — Card Grid */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -8 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={20} style={{ color: "var(--color-primary)" }} />
          تقدم الأقسام
        </h3>
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{stats.sections.length} قسم</span>
      </div>
      <div className="dash-sections-grid">
        {stats.sections.map((sec, i) => {
          const rateColor = sec.completionRate >= 75 ? "#10b981" : sec.completionRate >= 40 ? "#0ea5e9" : sec.completionRate > 0 ? "#f59e0b" : "#94a3b8";
          const rateBg = sec.completionRate >= 75 ? "#ecfdf5" : sec.completionRate >= 40 ? "#f0f9ff" : sec.completionRate > 0 ? "#fffbeb" : "#f8fafc";
          return (
            <div key={i} className="dash-section-card">
              <div className="dash-section-header">
                <span className="dash-section-name">{sec.name}</span>
                <span className="dash-section-rate" style={{ color: rateColor, background: rateBg }}>
                  {sec.completionRate}%
                </span>
              </div>
              <div className="dash-section-stats">
                {sec.completed > 0 && (
                  <span className="dash-section-stat" style={{ color: "#10b981", background: "#ecfdf5" }}>
                    <CheckCircle2 size={10} /> {sec.completed}
                  </span>
                )}
                {sec.inProgress > 0 && (
                  <span className="dash-section-stat" style={{ color: "#0ea5e9", background: "#f0f9ff" }}>
                    <Activity size={10} /> {sec.inProgress}
                  </span>
                )}
                {sec.pending > 0 && (
                  <span className="dash-section-stat" style={{ color: "#8b5cf6", background: "#f5f3ff" }}>
                    <PauseCircle size={10} /> {sec.pending}
                  </span>
                )}
                {sec.deferred > 0 && (
                  <span className="dash-section-stat" style={{ color: "#f59e0b", background: "#fffbeb" }}>
                    <Timer size={10} /> {sec.deferred}
                  </span>
                )}
                <span style={{ fontSize: 10, color: "#94a3b8", marginRight: "auto" }}>{sec.completed}/{sec.total}</span>
              </div>
              <div className="dash-section-bar">
                <div className="dash-section-bar-fill" style={{ width: `${sec.completionRate}%`, background: rateColor }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigate to tasks */}
      {isAdmin && (
        <button
          onClick={() => onNavigate("tasks")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "16px", borderRadius: 14,
            border: "none", background: "linear-gradient(135deg, #1a365d, #2d4a7c)",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            transition: "all 200ms", boxShadow: "0 4px 16px rgba(26,54,93,0.2)",
          }}
        >
          <ListTodo size={18} />
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
  tasks, groupedTasks, sections, search, statusFilter, phaseFilter, sectionFilter,
  hasFilters, expandedSections, actionLoading,
  onSearchChange, onStatusFilterChange, onPhaseFilterChange, onSectionFilterChange,
  onClearFilters, onToggleSection, onOpenDetail, onUpdateStatus, onUpdatePhase, onUndo, onRefresh,
}: {
  tasks: Task[]; groupedTasks: Record<string, Task[]>; sections: string[];
  search: string; statusFilter: string; phaseFilter: string; sectionFilter: string;
  hasFilters: boolean; expandedSections: Set<string>; actionLoading: number | null;
  onSearchChange: (v: string) => void; onStatusFilterChange: (v: string) => void;
  onPhaseFilterChange: (v: string) => void; onSectionFilterChange: (v: string) => void;
  onClearFilters: () => void; onToggleSection: (s: string) => void;
  onOpenDetail: (t: Task) => void; onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void; onUndo: (id: number) => void; onRefresh: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <ListTodo size={22} style={{ color: "var(--color-primary)" }} />
            المهام
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>{tasks.length} مهمة</p>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
            borderRadius: 10, border: "1px solid #e8e8e8", background: "#fff",
            color: "var(--color-text)", fontSize: 12, cursor: "pointer", fontWeight: 600,
            transition: "all 200ms",
          }}
        >
          <RefreshCw size={13} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-search">
          <Search size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="ابحث في المهام..." />
        </div>
        <SelectDropdown value={statusFilter} options={statusOptions.map((s) => ({ value: s, label: statusConfig[s].label }))} onChange={onStatusFilterChange} placeholder="جميع الحالات" />
        <SelectDropdown value={phaseFilter} options={phaseOptions.map((p) => ({ value: p, label: phaseConfig[p].label }))} onChange={onPhaseFilterChange} placeholder="جميع المراحل" />
        <SelectDropdown value={sectionFilter} options={sections.map((s) => ({ value: s, label: s }))} onChange={onSectionFilterChange} placeholder="جميع الأقسام" />
        {hasFilters && (
          <button
            onClick={onClearFilters}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "8px 14px",
              borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2",
              color: "#dc2626", fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}
          >
            <X size={12} />
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Task Groups */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--color-muted)" }}>
          <Search size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>لا توجد مهام مطابقة للفلاتر المحددة</p>
        </div>
      ) : (
        Object.entries(groupedTasks).map(([section, sectionTasks]) => {
          const completedCount = sectionTasks.filter(t => t.status === "completed").length;
          return (
            <div key={section} style={{ borderRadius: 16, border: "1px solid #f0f0f0", background: "#fff", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <button onClick={() => onToggleSection(section)} className="section-header">
                <div className="section-header-info">
                  <span>{section}</span>
                  <span className="section-count">{sectionTasks.length}</span>
                  {completedCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: 99 }}>
                      {completedCount} منجزة
                    </span>
                  )}
                </div>
                {expandedSections.has(section) ? <ChevronUp size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />}
              </button>
              {expandedSections.has(section) && (
                <div className="section-tasks-wrap">
                  {sectionTasks.map((task) => (
                    <TaskCard key={task.id} task={task} actionLoading={actionLoading} onOpenDetail={onOpenDetail} onUpdateStatus={onUpdateStatus} onUpdatePhase={onUpdatePhase} onUndo={onUndo} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TASK CARD
   ═══════════════════════════════════════════════════════════════ */
function TaskCard({
  task, actionLoading, onOpenDetail, onUpdateStatus, onUpdatePhase, onUndo,
}: {
  task: Task; actionLoading: number | null; onOpenDetail: (t: Task) => void;
  onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void; onUndo: (id: number) => void;
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
        background: task.status === "completed" ? "#f0fdf4" : task.status === "in_progress" ? "#f0f9ff" : "#fafbfc",
        borderColor: task.status === "completed" ? "#bbf7d0" : task.status === "in_progress" ? "#bae6fd" : "transparent",
        opacity: isLoading ? 0.6 : 1,
      }}
      onClick={() => onOpenDetail(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          const nextStatus: TaskStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : task.status === "completed" ? "pending" : "pending";
          onUpdateStatus(task.id, nextStatus);
        }}
        title="تغيير الحالة"
        className="task-card-status"
        style={{
          background: sc.gradient,
          color: "#fff",
          border: "none",
        }}
      >
        {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <StatusIcon size={14} />}
      </button>

      <div className="task-card-title">
        <h3 style={{
          textDecoration: task.status === "completed" ? "line-through" : "none",
          opacity: task.status === "completed" ? 0.65 : 1,
          color: task.status === "in_progress" ? "#0369a1" : "var(--color-text)",
        }}>
          {task.title}
        </h3>
        {task.completed_at && (
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#10b981", fontWeight: 600 }}>
            <CheckCircle2 size={9} style={{ display: "inline", verticalAlign: "middle", marginLeft: 3 }} />
            أُنجزت: {formatDate(task.completed_at)}
          </p>
        )}
      </div>

      <div className="task-card-badges">
        <span className="task-badge" style={{ color: sc.color, background: sc.bg }}>
          {sc.label}
        </span>
        <span className="task-badge" style={{ color: pc.color, background: pc.bg }}>
          {pc.label}
        </span>
      </div>

      <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <button style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #e8e8e8",
              background: "#fff", cursor: "pointer", display: "grid", placeItems: "center",
              color: "var(--color-muted)", transition: "all 200ms",
            }}>
              <MoreVertical size={14} />
            </button>
          }
          items={[
            ...statusOptions.filter((s) => s !== task.status).map((s) => ({
              label: statusConfig[s].label,
              icon: (() => { const I = statusConfig[s].icon; return <I size={14} />; })(),
              onClick: () => onUpdateStatus(task.id, s),
            })),
            {
              label: `نقل إلى ${phaseConfig[nextPhase].label}`,
              icon: <ArrowLeftRight size={14} />,
              onClick: () => onUpdatePhase(task.id, nextPhase),
            },
            {
              label: "تراجع عن آخر إجراء",
              icon: <Undo2 size={14} />,
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
  task, history, actionLoading, noteText, onNoteChange,
  onUpdateStatus, onUpdatePhase, onUndo, onAddNote, onBack,
}: {
  task: Task; history: TaskHistory[]; actionLoading: number | null;
  noteText: string; onNoteChange: (v: string) => void;
  onUpdateStatus: (id: number, s: TaskStatus) => void;
  onUpdatePhase: (id: number, p: TaskPhase) => void;
  onUndo: (id: number) => void; onAddNote: (id: number) => void; onBack: () => void;
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
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
          border: "none", background: "transparent", color: "var(--color-primary)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        <ArrowRight size={14} />
        العودة للمهام
      </button>

      {/* Task Header */}
      <div className="detail-card">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: sc.gradient,
            display: "grid", placeItems: "center", color: "#fff", flexShrink: 0,
          }}>
            {(() => { const I = sc.icon; return <I size={22} />; })()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="detail-title">{task.title}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 8, color: sc.color, background: sc.bg }}>{sc.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 8, color: pc.color, background: pc.bg }}>{pc.label}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, padding: "14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#94a3b8" }}>القسم</span>
            <span style={{ fontWeight: 600 }}>{task.section}</span>
          </div>
          {task.completed_at && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#94a3b8" }}>تاريخ الإنجاز</span>
              <span style={{ fontWeight: 600, color: "#10b981" }}>{formatDate(task.completed_at)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#94a3b8" }}>تاريخ الإنشاء</span>
            <span style={{ fontWeight: 600 }}>{formatDate(task.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={16} style={{ color: "var(--color-primary)" }} />
          الإجراءات
        </h3>
        <div className="detail-actions-wrap">
          {statusOptions.filter((s) => s !== task.status).map((s) => {
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s} onClick={() => onUpdateStatus(task.id, s)} disabled={isLoading}
                className="detail-action-btn"
                style={{ border: `1px solid ${cfg.color}25`, background: cfg.bg, color: cfg.color, opacity: isLoading ? 0.5 : 1 }}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            );
          })}
          <button
            onClick={() => onUpdatePhase(task.id, nextPhase)} disabled={isLoading}
            className="detail-action-btn"
            style={{ border: "1px solid #e8e8e8", background: "#f8fafc", color: "var(--color-text)", opacity: isLoading ? 0.5 : 1 }}
          >
            <ArrowLeftRight size={14} />
            نقل إلى {phaseConfig[nextPhase].label}
          </button>
          <button
            onClick={() => onUndo(task.id)} disabled={isLoading}
            className="detail-action-btn"
            style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", opacity: isLoading ? 0.5 : 1 }}
          >
            <Undo2 size={14} />
            تراجع
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquareText size={16} style={{ color: "var(--color-primary)" }} />
          الملاحظات
        </h3>
        {task.notes && (
          <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #f0f0f0", marginBottom: 12, fontSize: 13, lineHeight: 1.8 }}>
            {task.notes}
          </div>
        )}
        <div className="detail-note-row">
          <textarea value={noteText} onChange={(e) => onNoteChange(e.target.value)} placeholder="أضف ملاحظة..." rows={2} />
          <button
            onClick={() => onAddNote(task.id)}
            disabled={!noteText.trim() || isLoading}
            style={{
              padding: "12px 20px", borderRadius: 12, border: "none",
              background: noteText.trim() ? "linear-gradient(135deg, #1a365d, #2d4a7c)" : "#e2e8f0",
              color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: noteText.trim() ? "pointer" : "not-allowed",
              alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              boxShadow: noteText.trim() ? "0 4px 12px rgba(26,54,93,0.2)" : "none",
            }}
          >
            <Send size={13} />
            إرسال
          </button>
        </div>
      </div>

      {/* History */}
      <div className="detail-card">
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} style={{ color: "var(--color-primary)" }} />
          سجل التغييرات
        </h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 12, textAlign: "center", padding: 20 }}>لا توجد تغييرات مسجلة بعد</p>
        ) : (
          <div style={{ display: "grid", gap: 0 }}>
            {history.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex", gap: 12, padding: "12px 0",
                  borderBottom: i < history.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: entry.action === "note_added" ? "#f0f9ff" : entry.action === "status_change" ? "#ecfdf5" : "#f5f3ff",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  color: entry.action === "note_added" ? "#0ea5e9" : entry.action === "status_change" ? "#10b981" : "#8b5cf6",
                }}>
                  {entry.action === "note_added" ? <MessageSquareText size={14} /> : entry.action === "status_change" ? <Activity size={14} /> : <ArrowLeftRight size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)" }}>
                    {actionLabels[entry.action] || entry.action}
                  </div>
                  {entry.action !== "note_added" && (
                    <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 2 }}>
                      من <strong style={{ color: "var(--color-text)" }}>{valueLabels(entry.from_value)}</strong> إلى <strong style={{ color: "var(--color-text)" }}>{valueLabels(entry.to_value)}</strong>
                    </div>
                  )}
                  {entry.note && (
                    <div style={{ fontSize: 11, color: "var(--color-text)", marginTop: 4, padding: "6px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f0f0f0" }}>
                      {entry.note}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
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
