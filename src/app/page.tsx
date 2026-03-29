"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { servicesData } from "@/lib/services-data";

type SelectionType = "launch" | "postLaunch";
interface Selections {
  [serviceId: string]: { launch: boolean; postLaunch: boolean };
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function Particles() {
  return (
    <div className="particles">
      {Array.from({ length: 15 }).map((_, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${seededRandom(i * 3 + 1) * 100}%`,
            animationDuration: `${10 + seededRandom(i * 3 + 2) * 14}s`,
            animationDelay: `${seededRandom(i * 3 + 3) * 10}s`,
            width: `${2 + seededRandom(i * 5 + 1) * 2}px`,
            height: `${2 + seededRandom(i * 5 + 2) * 2}px`,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [submitterName, setSubmitterName] = useState("");
  const [selections, setSelections] = useState<Selections>({});
  const [launchSuggestions, setLaunchSuggestions] = useState("");
  const [postLaunchSuggestions, setPostLaunchSuggestions] = useState("");
  const [otherNotes, setOtherNotes] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(servicesData.map((s) => s.id))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(servicesData[0].id);

  const toggle = useCallback((id: string, type: SelectionType) => {
    setSelections((prev) => ({
      ...prev,
      [id]: {
        launch: prev[id]?.launch || false,
        postLaunch: prev[id]?.postLaunch || false,
        [type]: !prev[id]?.[type],
      },
    }));
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    let l = 0, p = 0;
    Object.values(selections).forEach((s) => { if (s.launch) l++; if (s.postLaunch) p++; });
    return { l, p, t: l + p };
  }, [selections]);

  const total = useMemo(
    () => servicesData.reduce((a, s) => a + s.subsections.reduce((b, sub) => b + sub.services.length, 0), 0),
    []
  );

  const handleSubmit = async () => {
    if (!submitterName.trim()) return alert("الرجاء إدخال الاسم");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitterName, selections, launchSuggestions, postLaunchSuggestions, otherNotes }),
      });
      const data = await res.json();
      if (data.success) setSubmitted(true);
      else alert("حدث خطأ أثناء الحفظ.");
    } catch { alert("حدث خطأ في الاتصال."); }
    finally { setIsSubmitting(false); }
  };

  const selectAll = useCallback((sectionId: string, type: SelectionType) => {
    const sec = servicesData.find((s) => s.id === sectionId);
    if (!sec) return;
    setSelections((prev) => {
      const n = { ...prev };
      sec.subsections.forEach((sub) =>
        sub.services.forEach((svc) => {
          n[svc.id] = { launch: n[svc.id]?.launch || false, postLaunch: n[svc.id]?.postLaunch || false, [type]: true };
        })
      );
      return n;
    });
  }, []);

  const clearAll = useCallback((sectionId: string) => {
    const sec = servicesData.find((s) => s.id === sectionId);
    if (!sec) return;
    setSelections((prev) => {
      const n = { ...prev };
      sec.subsections.forEach((sub) => sub.services.forEach((svc) => delete n[svc.id]));
      return n;
    });
  }, []);

  // ===== SUCCESS =====
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="hero" style={{ position: "absolute", inset: 0 }} />
        <Particles />
        <div className="relative z-10 text-center px-4 anim-pop w-full" style={{ maxWidth: 560 }}>
          <div className="card" style={{ padding: "4rem 3rem" }}>
            <Image src="/logo.png" alt="Property ME" width={220} height={160} className="mx-auto h-20 w-auto object-contain mb-10" />
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #d4a843, #e8c468)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0c1a3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">تم الإرسال بنجاح</h2>
            <p className="text-lg text-slate-400 mb-10">شكراً لك <span className="text-gold-400 font-bold">{submitterName}</span></p>
            <div className="flex gap-4 justify-center mb-10">
              <div className="stat-box"><div className="stat-num text-brand-400">{stats.l}</div><div className="stat-label">مع الانطلاق</div></div>
              <div className="stat-box"><div className="stat-num text-post-launch">{stats.p}</div><div className="stat-label">بعد الانطلاق</div></div>
            </div>
            <button onClick={() => { setSubmitted(false); setSelections({}); setSubmitterName(""); setLaunchSuggestions(""); setPostLaunchSuggestions(""); setOtherNotes(""); }} className="btn">إرسال جديد</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN =====
  return (
    <div className="min-h-screen">

      {/* HERO */}
      <section className="hero">
        <Particles />
        <div className="anim-pop mb-10">
          <Image src="/logo.png" alt="Property ME" width={560} height={400} className="h-36 md:h-48 w-auto object-contain" style={{ filter: "drop-shadow(0 8px 32px rgba(212,168,67,0.15))" }} priority />
        </div>
        <div className="line mb-10 anim" style={{ animationDelay: "0.15s" }} />
        <h1 className="text-3xl md:text-5xl font-black text-white mb-5 anim" style={{ animationDelay: "0.25s" }}>
          اختيار <span className="text-gold-400">الخدمات</span>
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-lg leading-relaxed anim" style={{ animationDelay: "0.35s" }}>
          حدّد الخدمات التي تحتاجها{" "}
          <span className="text-brand-400 font-semibold">مع الانطلاق</span> أو{" "}
          <span className="text-post-launch font-semibold">بعد الانطلاق</span>
        </p>
      </section>

      {/* MAIN CONTENT */}
      <div className="page-container relative z-10" style={{ marginTop: "-2rem" }}>

        {/* NAME & STATS */}
        <div className="card anim" style={{ padding: "2.5rem", animationDelay: "0.4s" }}>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-gold-400 mb-3">الاسم</label>
              <input type="text" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="أدخل اسمك الكامل..." className="field" />
            </div>
            <div className="flex gap-4 shrink-0 flex-wrap justify-center">
              <div className="stat-box"><div className="stat-num text-brand-400">{stats.l}</div><div className="stat-label">مع الانطلاق</div></div>
              <div className="stat-box"><div className="stat-num text-post-launch">{stats.p}</div><div className="stat-label">بعد الانطلاق</div></div>
              <div className="stat-box" style={{ background: "rgba(212,168,67,0.04)" }}><div className="stat-num text-gold-400">{stats.t}</div><div className="stat-label">الإجمالي</div></div>
            </div>
          </div>
          <div className="mt-8">
            <div className="flex justify-between text-xs text-slate-600 mb-2">
              <span>{stats.t} خدمة محددة</span>
              <span>من أصل {total}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: `${Math.min((stats.t / total) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs mt-12 mb-10">
          {servicesData.map((sec) => (
            <button
              key={sec.id}
              onClick={() => { setActiveTab(sec.id); document.getElementById(`s-${sec.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className={`tab ${activeTab === sec.id ? "on" : ""}`}
            >
              <span className="ml-1.5">{sec.icon}</span> {sec.title}
            </button>
          ))}
        </div>

        {/* SECTIONS */}
        <div className="space-y-12">
          {servicesData.map((sec, idx) => (
            <div key={sec.id} id={`s-${sec.id}`} className="anim" style={{ animationDelay: `${0.05 * idx}s` }}>
              <div className="section-block">
                {/* Header */}
                <div className="section-top" onClick={() => toggleSection(sec.id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sec.color} flex items-center justify-center text-xl`} style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
                      {sec.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">{sec.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">{sec.subsections.reduce((a, s) => a + s.services.length, 0)} خدمة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); selectAll(sec.id, "launch"); }} className="act-btn bg-brand-500/10 text-brand-400 hover:bg-brand-500/20">الكل (انطلاق)</button>
                    <button onClick={(e) => { e.stopPropagation(); selectAll(sec.id, "postLaunch"); }} className="act-btn bg-post-launch/10 text-post-launch hover:bg-post-launch/20">الكل (بعد)</button>
                    <button onClick={(e) => { e.stopPropagation(); clearAll(sec.id); }} className="act-btn bg-red-500/8 text-red-400/80 hover:bg-red-500/15">مسح</button>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 text-lg font-light mr-1">
                      {expandedSections.has(sec.id) ? "−" : "+"}
                    </div>
                  </div>
                </div>

                {/* Body */}
                {expandedSections.has(sec.id) && (
                  <div className="section-body">
                    {sec.subsections.map((sub) => (
                      <div key={sub.id} className="subsection">
                        <div className="subsection-title">
                          <span className={`dot bg-gradient-to-br ${sec.color}`} />
                          {sub.title}
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
                          {sub.services.map((svc) => {
                            const sel = selections[svc.id];
                            const on = sel?.launch || sel?.postLaunch;
                            return (
                              <div key={svc.id} className={`svc ${on ? "on" : ""}`}>
                                <span className="svc-name">{svc.name}</span>
                                <div className="svc-checks">
                                  <label className="svc-check-group">
                                    <input type="checkbox" checked={sel?.launch || false} onChange={() => toggle(svc.id, "launch")} className="chk chk-blue" />
                                    <span className="chk-label chk-label-blue">انطلاق</span>
                                  </label>
                                  <label className="svc-check-group">
                                    <input type="checkbox" checked={sel?.postLaunch || false} onChange={() => toggle(svc.id, "postLaunch")} className="chk chk-green" />
                                    <span className="chk-label chk-label-green">بعد</span>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* SUGGESTIONS */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Launch */}
          <div className="suggest-card anim" style={{ animationDelay: "0.1s" }}>
            <div className="suggest-header">
              <div className="suggest-icon" style={{ background: "rgba(59,130,246,0.1)" }}>🚀</div>
              <div>
                <h3>مقترحات مع الانطلاق</h3>
                <p>خدمات إضافية تقترحها عند الإطلاق</p>
              </div>
            </div>
            <div className="suggest-body">
              <textarea value={launchSuggestions} onChange={(e) => setLaunchSuggestions(e.target.value)} placeholder="اكتب مقترحاتك هنا..." className="tarea" />
            </div>
          </div>

          {/* Post-launch */}
          <div className="suggest-card anim" style={{ animationDelay: "0.15s" }}>
            <div className="suggest-header">
              <div className="suggest-icon" style={{ background: "rgba(16,185,129,0.1)" }}>📋</div>
              <div>
                <h3>مقترحات بعد الانطلاق</h3>
                <p>خدمات تفضّل إضافتها لاحقاً</p>
              </div>
            </div>
            <div className="suggest-body">
              <textarea value={postLaunchSuggestions} onChange={(e) => setPostLaunchSuggestions(e.target.value)} placeholder="اكتب مقترحاتك هنا..." className="tarea" />
            </div>
          </div>
        </div>

        {/* Other notes */}
        <div className="suggest-card mt-10 anim" style={{ animationDelay: "0.2s" }}>
          <div className="suggest-header">
            <div className="suggest-icon" style={{ background: "rgba(212,168,67,0.08)" }}>📝</div>
            <div>
              <h3>ملاحظات أخرى</h3>
              <p>أي تعليقات أو ملاحظات إضافية</p>
            </div>
          </div>
          <div className="suggest-body">
            <textarea value={otherNotes} onChange={(e) => setOtherNotes(e.target.value)} placeholder="اكتب ملاحظاتك هنا..." className="tarea" />
          </div>
        </div>

        {/* SUBMIT */}
        <div className="text-center py-16">
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn">
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                جاري الإرسال...
              </>
            ) : "إرسال الاختيارات"}
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center py-10 mt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        <Image src="/logo.png" alt="Property ME" width={120} height={86} className="h-8 w-auto object-contain mx-auto mb-3 opacity-30" />
        <p className="text-xs text-slate-700">&copy; {new Date().getFullYear()} Property ME</p>
      </footer>
    </div>
  );
}
