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
  Filter,
  X,
  LayoutDashboard,
  ListTodo,
  TrendingUp,
  ChevronLeft,
  MessageSquareText,
  ArrowRight,
  RefreshCw,
  Send,
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
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "12px 24px",
        borderRadius: 12,
        background: type === "success" ? "#059669" : "#dc2626",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "slideUp 0.3s ease",
      }}
    >
      {type === "success" ? <CheckCircle2 size={18} /> : <X size={18} />}
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
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            minWidth: 200,
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                fontSize: 13,
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
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "#fff",
        fontSize: 13,
        color: "var(--color-text)",
        minWidth: 140,
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left 12px center",
        paddingLeft: 32,
      }}
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TasksPage() {
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
    } catch (e) {
      showToast("حدث خطأ في تحميل البيانات", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
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
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 4px 20px rgba(26,54,93,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Image src="/logo.png" alt="PME" width={36} height={36} style={{ borderRadius: 8 }} />
          <div>
            <h1 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 700 }}>Property Middle East</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: 12 }}>لوحة إدارة المهام</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <NavButton
            active={view === "dashboard"}
            onClick={() => setView("dashboard")}
            icon={<LayoutDashboard size={16} />}
            label="لوحة المتابعة"
          />
          <NavButton
            active={view === "tasks"}
            onClick={() => setView("tasks")}
            icon={<ListTodo size={16} />}
            label="المهام"
          />
        </div>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(255,255,255,0.8)",
            fontSize: 13,
            textDecoration: "none",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 200ms",
          }}
        >
          خارطة الخدمات
          <ArrowLeft size={14} />
        </Link>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading && tasks.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: 400 }}>
            <div style={{ textAlign: "center" }}>
              <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
              <p style={{ marginTop: 16, color: "var(--color-muted)" }}>جاري تحميل المهام...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ display: "grid", placeItems: "center", minHeight: 400 }}>
            <div style={{ textAlign: "center" }}>
              <ListTodo size={48} style={{ color: "var(--color-muted)", marginBottom: 16 }} />
              <h2 style={{ color: "var(--color-text)", marginBottom: 8 }}>لا توجد مهام بعد</h2>
              <p style={{ color: "var(--color-muted)", marginBottom: 24 }}>اضغط الزر أدناه لإدخال المهام من بيانات الخدمات</p>
              <button
                onClick={handleSeed}
                style={{
                  padding: "12px 32px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                إدخال المهام
              </button>
            </div>
          </div>
        ) : view === "dashboard" ? (
          <DashboardView stats={stats} onNavigate={(v) => setView(v as any)} />
        ) : view === "detail" && selectedTask ? (
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
        ) : (
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
        )}
      </main>

      {/* Keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV BUTTON
   ═══════════════════════════════════════════════════════════════ */
function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 10,
        border: "none",
        background: active ? "rgba(255,255,255,0.2)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        transition: "all 200ms",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD VIEW
   ═══════════════════════════════════════════════════════════════ */
function DashboardView({ stats, onNavigate }: { stats: Stats | null; onNavigate: (v: string) => void }) {
  if (!stats) return null;

  const statCards = [
    { label: "إجمالي المهام", value: stats.total, color: "#1a365d", bg: "#f0f4f8", icon: <ListTodo size={22} /> },
    { label: "منجزة", value: stats.completed, color: "#059669", bg: "#ecfdf5", icon: <CheckCircle2 size={22} />, extra: `${stats.completionRate}%` },
    { label: "قيد التنفيذ", value: stats.inProgress, color: "#2563eb", bg: "#eff6ff", icon: <Loader2 size={22} /> },
    { label: "مؤجلة", value: stats.deferred, color: "#d97706", bg: "#fffbeb", icon: <CalendarClock size={22} /> },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text)", margin: "0 0 4px" }}>لوحة المتابعة</h2>
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>تتبع تقدم مهام إطلاق منصة Property Middle East</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              padding: "24px 20px",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              background: "#fff",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
          >
            {card.extra && (
              <span style={{ position: "absolute", top: 12, left: 12, fontSize: 11, fontWeight: 700, color: card.color, background: card.bg, padding: "2px 8px", borderRadius: 99 }}>
                {card.extra}
              </span>
            )}
            <span style={{ color: card.color }}>{card.icon}</span>
            <span style={{ fontSize: 36, fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>{card.value}</span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{card.label}</span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{ padding: 28, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={20} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>نسبة الإنجاز الكلية</h3>
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, color: "var(--color-primary)" }}>{stats.completionRate}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--color-muted)" }}>{stats.completed} من {stats.total} مهمة</span>
        </div>
        <div style={{ height: 12, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
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
        <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 13, color: "var(--color-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Rocket size={14} /> مع الإطلاق: {stats.launchTotal}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CalendarClock size={14} /> بعد الإطلاق: {stats.postLaunchTotal}
          </span>
        </div>
      </div>

      {/* Phase Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div
          onClick={() => onNavigate("tasks")}
          style={{ padding: 24, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", cursor: "pointer", boxShadow: "var(--shadow-sm)", transition: "all 200ms" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Rocket size={20} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>مهام الإطلاق</h3>
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, color: "var(--color-primary)" }}>{stats.launchTotal}</span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>مهمة مطلوبة للإطلاق</p>
        </div>
        <div
          onClick={() => onNavigate("tasks")}
          style={{ padding: 24, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", cursor: "pointer", boxShadow: "var(--shadow-sm)", transition: "all 200ms" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CalendarClock size={20} style={{ color: "var(--color-secondary)" }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>مهام ما بعد الإطلاق</h3>
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, color: "var(--color-secondary)" }}>{stats.postLaunchTotal}</span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>مهمة مؤجلة لما بعد الإطلاق</p>
        </div>
      </div>

      {/* Section Stats */}
      <div style={{ padding: 28, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>تقدم الأقسام</h3>
        <div style={{ display: "grid", gap: 16 }}>
          {stats.sections.map((sec, i) => (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{sec.name}</span>
                <span style={{ color: "var(--color-muted)" }}>{sec.completed}/{sec.total} ({sec.completionRate}%)</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${sec.completionRate}%`, borderRadius: 99, background: "linear-gradient(90deg, #1a365d, #2d4a7c)", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigate to tasks */}
      <button
        onClick={() => onNavigate("tasks")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "2px solid var(--color-primary)",
          background: "transparent",
          color: "var(--color-primary)",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 200ms",
        }}
      >
        <ListTodo size={18} />
        عرض جميع المهام
        <ArrowLeft size={16} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TASKS LIST VIEW
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
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>المهام</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-muted)" }}>{tasks.length} مهمة</p>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "#fff",
            color: "var(--color-text)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: 16,
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          background: "#fff",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في المهام..."
            style={{
              width: "100%",
              padding: "8px 40px 8px 14px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              outline: "none",
            }}
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
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <X size={14} />
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Task Groups */}
      {Object.keys(groupedTasks).length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--color-muted)" }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>لا توجد مهام مطابقة للفلاتر المحددة</p>
        </div>
      ) : (
        Object.entries(groupedTasks).map(([section, sectionTasks]) => (
          <div key={section} style={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <button
              onClick={() => onToggleSection(section)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "16px 20px",
                border: "none",
                background: "var(--color-primary-light)",
                cursor: "pointer",
                textAlign: "right",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-primary)" }}>{section}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  background: "rgba(26,54,93,0.1)",
                  padding: "2px 10px",
                  borderRadius: 99,
                }}>
                  {sectionTasks.length}
                </span>
              </div>
              {expandedSections.has(section) ? <ChevronUp size={18} style={{ color: "var(--color-primary)" }} /> : <ChevronDown size={18} style={{ color: "var(--color-primary)" }} />}
            </button>
            {expandedSections.has(section) && (
              <div style={{ padding: "8px 12px 12px" }}>
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        margin: "4px 0",
        borderRadius: 12,
        border: `1px solid ${task.status === "completed" ? "#bbf7d0" : "transparent"}`,
        background: task.status === "completed" ? "#f0fdf4" : "#fafbfc",
        transition: "all 200ms",
        opacity: isLoading ? 0.6 : 1,
        cursor: "pointer",
        gap: 12,
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
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 99,
          border: `2px solid ${sc.color}`,
          background: task.status === "completed" ? sc.color : "transparent",
          color: task.status === "completed" ? "#fff" : sc.color,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          transition: "all 200ms",
        }}
      >
        {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <StatusIcon size={14} />}
      </button>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text)",
            textDecoration: task.status === "completed" ? "line-through" : "none",
            opacity: task.status === "completed" ? 0.7 : 1,
          }}
        >
          {task.title}
        </h3>
        {task.completed_at && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#059669" }}>
            أُنجزت: {formatDate(task.completed_at)}
          </p>
        )}
      </div>

      {/* Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, color: sc.color, background: sc.bg }}>
          {sc.label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, color: pc.color, background: pc.bg }}>
          {pc.label}
        </span>
      </div>

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu
          trigger={
            <button style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "var(--color-muted)" }}>
              <MoreVertical size={16} />
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
   DETAIL VIEW
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
    <div style={{ display: "grid", gap: 20 }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 0",
          border: "none",
          background: "transparent",
          color: "var(--color-primary)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ArrowRight size={16} />
        العودة للمهام
      </button>

      {/* Task Header */}
      <div style={{ padding: 28, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800 }}>{task.title}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 99, color: sc.color, background: sc.bg }}>{sc.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 99, color: pc.color, background: pc.bg }}>{pc.label}</span>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--color-muted)" }}>القسم: {task.section}</p>
            {task.completed_at && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#059669", fontWeight: 600 }}>
                تاريخ الإنجاز: {formatDate(task.completed_at)}
              </p>
            )}
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-muted)" }}>تاريخ الإنشاء: {formatDate(task.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>الإجراءات</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* Status buttons */}
          {statusOptions.filter((s) => s !== task.status).map((s) => {
            const cfg = statusConfig[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                onClick={() => onUpdateStatus(task.id, s)}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: `1px solid ${cfg.color}30`,
                  background: cfg.bg,
                  color: cfg.color,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            );
          })}
          {/* Phase toggle */}
          <button
            onClick={() => onUpdatePhase(task.id, nextPhase)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "#f8fafc",
              color: "var(--color-text)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <ArrowLeftRight size={14} />
            نقل إلى {phaseConfig[nextPhase].label}
          </button>
          {/* Undo */}
          <button
            onClick={() => onUndo(task.id)}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Undo2 size={14} />
            تراجع
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquareText size={18} />
          الملاحظات
        </h3>
        {task.notes && (
          <div style={{ padding: 14, borderRadius: 10, background: "#f8fafc", border: "1px solid var(--color-border)", marginBottom: 12, fontSize: 13, lineHeight: 1.8 }}>
            {task.notes}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="أضف ملاحظة..."
            rows={2}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => onAddNote(task.id)}
            disabled={!noteText.trim() || isLoading}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-primary)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: noteText.trim() ? "pointer" : "not-allowed",
              opacity: noteText.trim() ? 1 : 0.5,
              alignSelf: "flex-end",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Send size={14} />
            إرسال
          </button>
        </div>
      </div>

      {/* History */}
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid var(--color-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>سجل التغييرات</h3>
        {history.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>لا توجد تغييرات مسجلة بعد</p>
        ) : (
          <div style={{ display: "grid", gap: 0 }}>
            {history.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: i < history.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 99, background: "var(--color-primary)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                    {actionLabels[entry.action] || entry.action}
                  </div>
                  {entry.action !== "note_added" && (
                    <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                      من <strong>{valueLabels(entry.from_value)}</strong> إلى <strong>{valueLabels(entry.to_value)}</strong>
                    </div>
                  )}
                  {entry.note && (
                    <div style={{ fontSize: 12, color: "var(--color-text)", marginTop: 4, padding: "6px 10px", background: "#f8fafc", borderRadius: 8 }}>
                      {entry.note}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4 }}>
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
