"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Layers2,
  MessageSquareText,
  Rocket,
  Search,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { servicesData, type ServiceSection } from "@/lib/services-data";

type SelectionType = "launch" | "postLaunch";
type VisibilityFilter = "all" | "selected" | "launch" | "postLaunch";

interface Selections {
  [serviceId: string]: {
    launch: boolean;
    postLaunch: boolean;
  };
}

const initialExpandedSections = servicesData.slice(0, 2).map((section) => section.id);

const filterOptions = [
  { id: "all", label: "الكل" },
  { id: "selected", label: "المحدد فقط" },
  { id: "launch", label: "مع الانطلاق" },
  { id: "postLaunch", label: "بعد الإطلاق" },
] satisfies ReadonlyArray<{ id: VisibilityFilter; label: string }>;

const sectionAccents = [
  "#005f73", // deep teal
  "#c99956", // warm gold
  "#e07858", // soft coral
  "#0a9396", // medium teal
  "#7c5cbf", // purple
  "#2d8a6e", // forest green
] as const;

function countServices(section: Pick<ServiceSection, "subsections">) {
  return section.subsections.reduce(
    (total, subsection) => total + subsection.services.length,
    0
  );
}

function matchesSelectionFilter(
  selection: Selections[string] | undefined,
  filter: VisibilityFilter
) {
  switch (filter) {
    case "selected":
      return Boolean(selection?.launch || selection?.postLaunch);
    case "launch":
      return Boolean(selection?.launch);
    case "postLaunch":
      return Boolean(selection?.postLaunch);
    default:
      return true;
  }
}

function selectionCaption(selection?: { launch: boolean; postLaunch: boolean }) {
  if (selection?.launch && selection?.postLaunch) {
    return "مهم للإطلاق الآن وللتوسع بعده";
  }

  if (selection?.launch) {
    return "أولوية واضحة لمرحلة الإطلاق";
  }

  if (selection?.postLaunch) {
    return "مؤجل عمدًا إلى ما بعد الإطلاق";
  }

  return "لم تُحدد مرحلته بعد";
}

export default function HomePage() {
  const [submitterName, setSubmitterName] = useState("");
  const [selections, setSelections] = useState<Selections>({});
  const [launchSuggestions, setLaunchSuggestions] = useState("");
  const [postLaunchSuggestions, setPostLaunchSuggestions] = useState("");
  const [otherNotes, setOtherNotes] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialExpandedSections)
  );
  const [activeSection, setActiveSection] = useState(servicesData[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<VisibilityFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "error";
    text: string;
  } | null>(null);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const deferredQuery = useDeferredValue(query);

  // Floating bar scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      setShowFloatingBar(heroBottom < -100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalServices = useMemo(
    () =>
      servicesData.reduce((total, section) => total + countServices(section), 0),
    []
  );

  const stats = useMemo(() => {
    let launch = 0;
    let postLaunch = 0;
    let uniqueSelected = 0;

    Object.values(selections).forEach((selection) => {
      if (selection.launch || selection.postLaunch) {
        uniqueSelected += 1;
      }

      if (selection.launch) {
        launch += 1;
      }

      if (selection.postLaunch) {
        postLaunch += 1;
      }
    });

    return {
      launch,
      postLaunch,
      uniqueSelected,
      totalChoices: launch + postLaunch,
    };
  }, [selections]);

  const sectionSummaries = useMemo(() => {
    return servicesData.reduce<
      Record<
        string,
        { total: number; launch: number; postLaunch: number; unique: number }
      >
    >((accumulator, section) => {
      const summary = {
        total: 0,
        launch: 0,
        postLaunch: 0,
        unique: 0,
      };

      section.subsections.forEach((subsection) => {
        subsection.services.forEach((service) => {
          const selection = selections[service.id];
          summary.total += 1;

          if (selection?.launch || selection?.postLaunch) {
            summary.unique += 1;
          }

          if (selection?.launch) {
            summary.launch += 1;
          }

          if (selection?.postLaunch) {
            summary.postLaunch += 1;
          }
        });
      });

      accumulator[section.id] = summary;
      return accumulator;
    }, {});
  }, [selections]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    return servicesData
      .map((section) => {
        const subsections = section.subsections
          .map((subsection) => {
            const services = subsection.services.filter((service) => {
              const selection = selections[service.id];
              const matchesQuery =
                !normalizedQuery ||
                service.name.toLowerCase().includes(normalizedQuery) ||
                subsection.title.toLowerCase().includes(normalizedQuery) ||
                section.title.toLowerCase().includes(normalizedQuery);

              return matchesQuery && matchesSelectionFilter(selection, activeFilter);
            });

            return {
              ...subsection,
              services,
            };
          })
          .filter((subsection) => subsection.services.length > 0);

        if (!subsections.length) {
          return null;
        }

        return {
          ...section,
          subsections,
        };
      })
      .filter((section): section is ServiceSection => Boolean(section));
  }, [activeFilter, normalizedQuery, selections]);

  const visibleServicesCount = useMemo(
    () =>
      visibleSections.reduce(
        (total, section) => total + countServices(section),
        0
      ),
    [visibleSections]
  );

  const selectedServices = useMemo(() => {
    return servicesData.flatMap((section) =>
      section.subsections.flatMap((subsection) =>
        subsection.services.flatMap((service) => {
          const selection = selections[service.id];

          if (!selection?.launch && !selection?.postLaunch) {
            return [];
          }

          return [
            {
              id: service.id,
              name: service.name,
              sectionTitle: section.title,
              launch: selection.launch,
              postLaunch: selection.postLaunch,
            },
          ];
        })
      )
    );
  }, [selections]);

  const progressPercent = Math.min(
    Math.round((stats.uniqueSelected / totalServices) * 100),
    100
  );

  const hasActiveFilters = Boolean(normalizedQuery) || activeFilter !== "all";

  const currentSectionId = visibleSections.some(
    (section) => section.id === activeSection
  )
    ? activeSection
    : visibleSections[0]?.id ?? "";

  const clearFeedback = () => {
    if (feedback) {
      setFeedback(null);
    }
  };

  const toggleSelection = (serviceId: string, type: SelectionType) => {
    clearFeedback();
    setSelections((previous) => {
      const current = previous[serviceId] ?? {
        launch: false,
        postLaunch: false,
      };
      const next = { ...current, [type]: !current[type] };

      if (!next.launch && !next.postLaunch) {
        const rest = { ...previous };
        delete rest[serviceId];
        return rest;
      }

      return {
        ...previous,
        [serviceId]: next,
      };
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((previous) => {
      const next = new Set(previous);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  };

  const selectAll = (
    section: Pick<ServiceSection, "subsections">,
    type: SelectionType
  ) => {
    clearFeedback();
    setSelections((previous) => {
      const next = { ...previous };

      section.subsections.forEach((subsection) => {
        subsection.services.forEach((service) => {
          const current = next[service.id] ?? {
            launch: false,
            postLaunch: false,
          };

          next[service.id] = {
            ...current,
            [type]: true,
          };
        });
      });

      return next;
    });
  };

  const clearSectionSelections = (section: Pick<ServiceSection, "subsections">) => {
    clearFeedback();
    setSelections((previous) => {
      const next = { ...previous };

      section.subsections.forEach((subsection) => {
        subsection.services.forEach((service) => {
          delete next[service.id];
        });
      });

      return next;
    });
  };

  const expandVisibleSections = () => {
    setExpandedSections((previous) => {
      const next = new Set(previous);
      visibleSections.forEach((section) => next.add(section.id));
      return next;
    });
  };

  const collapseVisibleSections = () => {
    setExpandedSections((previous) => {
      const next = new Set(previous);
      visibleSections.forEach((section) => next.delete(section.id));
      return next;
    });
  };

  const clearAllSelections = () => {
    clearFeedback();
    setSelections({});
  };

  const clearFilters = () => {
    setQuery("");
    setActiveFilter("all");
    setActiveSection(servicesData[0]?.id ?? "");
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document
      .getElementById(`section-${sectionId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetForm = () => {
    setSubmitterName("");
    setSelections({});
    setLaunchSuggestions("");
    setPostLaunchSuggestions("");
    setOtherNotes("");
    setExpandedSections(new Set(initialExpandedSections));
    setActiveSection(servicesData[0]?.id ?? "");
    setQuery("");
    setActiveFilter("all");
    setSubmitted(false);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!submitterName.trim()) {
      setFeedback({
        tone: "error",
        text: "أضف اسم صاحب القرار قبل إرسال خارطة الخدمات.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submitterName,
          selections,
          launchSuggestions,
          postLaunchSuggestions,
          otherNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "حدث خلل أثناء حفظ البيانات.");
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFeedback({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "تعذر إرسال الاختيارات في الوقت الحالي.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="decision-shell">
        <section className="success-screen">
          <div className="success-card stagger-card">
            <div className="success-mark">
              <CheckCircle2 size={34} />
            </div>

            <span className="hero-badge success-badge">
              <Sparkles size={16} />
              Property Middle East
            </span>

            <h1 className="display-font success-title">وصلت الصورة بوضوح.</h1>
            <p className="success-copy">
              شكرًا لك {submitterName}، تم حفظ التحديدات والملاحظات كما هي لتُستخدم
              في مرحلة ترتيب التنفيذ القادمة.
            </p>

            <div className="success-metrics">
              <div className="success-metric">
                <strong>{stats.uniqueSelected}</strong>
                <span>خدمة محددة</span>
              </div>
              <div className="success-metric">
                <strong>{stats.launch}</strong>
                <span>ضمن الإطلاق</span>
              </div>
              <div className="success-metric">
                <strong>{stats.postLaunch}</strong>
                <span>بعد الإطلاق</span>
              </div>
            </div>

            {selectedServices.length > 0 ? (
              <div className="success-list">
                <div className="summary-block-head">
                  <Layers2 size={16} />
                  لمحة من الخدمات التي تم تحديدها
                </div>
                <div className="selection-list">
                  {selectedServices.slice(0, 6).map((service) => (
                    <div key={service.id} className="selection-chip">
                      <div>
                        <strong>{service.name}</strong>
                        <span>{service.sectionTitle}</span>
                      </div>
                      <div className="mini-phase-list">
                        {service.launch ? (
                          <span className="mini-phase launch">انطلاق</span>
                        ) : null}
                        {service.postLaunch ? (
                          <span className="mini-phase post">بعد</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="success-actions">
              <button type="button" className="primary-button" onClick={resetForm}>
                إرسال نسخة جديدة
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-shell">
      <section className="hero-panel" ref={heroRef}>
        <div className="hero-copy stagger-card">
          <span className="hero-badge">
            <Sparkles size={16} />
            Property Middle East
          </span>

          <h1 className="display-font hero-title">
            خارطة ترتيب الخدمات
          </h1>

          <p className="hero-subtitle">
            حدد أولويات الخدمات بين مرحلة الإطلاق وما بعدها
          </p>

          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{servicesData.length}</strong>
              <span>مسارات رئيسية</span>
            </div>
            <div className="hero-stat">
              <strong>{totalServices}</strong>
              <span>خدمة قابلة للترتيب</span>
            </div>
            <div className="hero-stat">
              <strong>{stats.uniqueSelected}</strong>
              <span>تم تحديدها حتى الآن</span>
            </div>
          </div>
        </div>

        <div
          className="hero-logo-area stagger-card"
          style={{ "--reveal-delay": "120ms" } as CSSProperties}
        >
          <Image
            src="/logo.png"
            alt="Property Middle East"
            width={120}
            height={86}
            className="hero-logo"
            priority
          />
        </div>
      </section>

      <section className="workspace-grid">
        <div className="content-stack">
          <div className="toolbar-card stagger-card" style={{ "--reveal-delay": "180ms" } as CSSProperties}>
            <div>
              <p className="section-eyebrow ink">مسار الاختيار</p>
              <h2 className="display-font toolbar-title">
                ابدأ بالقسم الأكثر حساسية للإطلاق ثم مرّ على التفاصيل بهدوء.
              </h2>
            </div>

            <div className="section-tabs">
              {visibleSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`section-tab ${
                    currentSectionId === section.id ? "is-active" : ""
                  }`}
                  onClick={() => scrollToSection(section.id)}
                >
                  <span aria-hidden="true">{section.icon}</span>
                  {section.title}
                </button>
              ))}
            </div>
          </div>

          <div className="workspace-note stagger-card" style={{ "--reveal-delay": "220ms" } as CSSProperties}>
            <div className="workspace-note-icon">
              <Filter size={18} />
            </div>
            <div className="workspace-note-copy">
              <strong>
                {hasActiveFilters
                  ? `تظهر الآن ${visibleServicesCount} خدمة مطابقة للبحث والفلترة الحالية.`
                  : "يعرض لك المسار الكامل لكل الخدمات مع تلخيص حي على اليمين."}
              </strong>
              <span>
                {hasActiveFilters
                  ? "يمكنك توسيع القسم الظاهر فقط أو إعادة الضبط لاسترجاع الخريطة الكاملة."
                  : "كل تحديد تقوم به ينعكس مباشرة في المؤشرات، التقدم العام، وقائمة الخدمات المختارة."}
              </span>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                className="secondary-button subtle"
                onClick={clearFilters}
              >
                مسح البحث والفلترة
              </button>
            ) : null}
          </div>

          {visibleSections.length > 0 ? (
            visibleSections.map((section, index) => {
              const summary = sectionSummaries[section.id];
              const isExpanded = expandedSections.has(section.id);
              const progress = Math.round((summary.unique / summary.total) * 100);
              const accent = sectionAccents[index % sectionAccents.length];

              return (
                <article
                  key={section.id}
                  id={`section-${section.id}`}
                  className="service-section stagger-card"
                  style={
                    {
                      "--section-accent": accent,
                      "--reveal-delay": `${260 + index * 70}ms`,
                    } as CSSProperties
                  }
                >
                  <div className="section-header">
                    <div className="section-heading">
                      <span className="section-icon" aria-hidden="true">
                        {section.icon}
                      </span>
                      <div>
                        <p className="section-kicker">
                          {summary.unique} من {summary.total} خدمات محددة
                        </p>
                        <h3 className="display-font section-title">{section.title}</h3>
                      </div>
                    </div>

                    <div className="section-header-actions">
                      <button
                        type="button"
                        className="ghost-btn launch"
                        onClick={() => selectAll(section, "launch")}
                      >
                        الكل للإطلاق
                      </button>
                      <button
                        type="button"
                        className="ghost-btn post"
                        onClick={() => selectAll(section, "postLaunch")}
                      >
                        الكل لما بعده
                      </button>
                      <button
                        type="button"
                        className="ghost-btn danger"
                        onClick={() => clearSectionSelections(section)}
                      >
                        تفريغ القسم
                      </button>
                      <button
                        type="button"
                        className={`icon-btn ${isExpanded ? "is-open" : ""}`}
                        aria-expanded={isExpanded}
                        aria-controls={`section-body-${section.id}`}
                        onClick={() => toggleSection(section.id)}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="section-progress">
                    <div className="section-progress-bar">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="section-progress-meta">
                      <span>{summary.launch} مع الانطلاق</span>
                      <span>{summary.postLaunch} بعد الإطلاق</span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div id={`section-body-${section.id}`} className="section-body">
                      {section.subsections.map((subsection) => (
                        <div key={subsection.id} className="subsection-shell">
                          <div className="subsection-head">
                            <div>
                              <p className="subsection-kicker">مجموعة خدمات</p>
                              <h4>{subsection.title}</h4>
                            </div>
                            <span>{subsection.services.length} خدمة ظاهرة</span>
                          </div>

                          <div className="service-grid">
                            {subsection.services.map((service) => {
                              const selection = selections[service.id];
                              const isActive =
                                Boolean(selection?.launch) ||
                                Boolean(selection?.postLaunch);

                              return (
                                <div
                                  key={service.id}
                                  className={`service-card ${isActive ? "is-active" : ""}`}
                                >
                                  <div className="service-copy">
                                    <h5 className="service-title">{service.name}</h5>
                                    <p className="service-caption">
                                      {selectionCaption(selection)}
                                    </p>
                                  </div>

                                  <div className="service-phase-group">
                                    <button
                                      type="button"
                                      className={`phase-toggle launch ${
                                        selection?.launch ? "is-on" : ""
                                      }`}
                                      onClick={() =>
                                        toggleSelection(service.id, "launch")
                                      }
                                    >
                                      <Rocket size={14} />
                                      مع الانطلاق
                                    </button>
                                    <button
                                      type="button"
                                      className={`phase-toggle post ${
                                        selection?.postLaunch ? "is-on" : ""
                                      }`}
                                      onClick={() =>
                                        toggleSelection(service.id, "postLaunch")
                                      }
                                    >
                                      <Clock3 size={14} />
                                      بعد الإطلاق
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="empty-state stagger-card" style={{ "--reveal-delay": "260ms" } as CSSProperties}>
              <div className="empty-icon">
                <XCircle size={24} />
              </div>
              <h3 className="display-font">لا توجد خدمات مطابقة لهذا المسار.</h3>
              <p>
                جرّب كلمة بحث أوسع أو أعد الفلترة إلى “الكل” لتستعيد الخريطة
                الكاملة.
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={clearFilters}
              >
                إعادة الضبط
              </button>
            </div>
          )}

          <section className="notes-grid">
            <div
              className="note-card launch stagger-card"
              style={{ "--reveal-delay": "320ms" } as CSSProperties}
            >
              <div className="note-head">
                <div className="note-icon launch">
                  <Rocket size={18} />
                </div>
                <div>
                  <h3 className="display-font">مقترحات مرحلة الإطلاق</h3>
                  <p>أي خدمات إضافية يجب أن تكون ضمن النسخة الأولى؟</p>
                </div>
              </div>

              <textarea
                value={launchSuggestions}
                onChange={(event) => {
                  clearFeedback();
                  setLaunchSuggestions(event.target.value);
                }}
                className="control-textarea"
                placeholder="اكتب هنا ما يجب أن يحضر مع النسخة الأولى، أو ما يحتاج قرارًا سريعًا."
              />
            </div>

            <div
              className="note-card post stagger-card"
              style={{ "--reveal-delay": "360ms" } as CSSProperties}
            >
              <div className="note-head">
                <div className="note-icon post">
                  <Clock3 size={18} />
                </div>
                <div>
                  <h3 className="display-font">مقترحات ما بعد الإطلاق</h3>
                  <p>ما الذي يستحق مرحلة ثانية أو توسعًا لاحقًا؟</p>
                </div>
              </div>

              <textarea
                value={postLaunchSuggestions}
                onChange={(event) => {
                  clearFeedback();
                  setPostLaunchSuggestions(event.target.value);
                }}
                className="control-textarea"
                placeholder="سجل الخدمات أو التحسينات التي يمكن تأجيلها دون الإضرار بجودة الإطلاق."
              />
            </div>

            <div
              className="note-card notes full stagger-card"
              style={{ "--reveal-delay": "400ms" } as CSSProperties}
            >
              <div className="note-head">
                <div className="note-icon notes">
                  <MessageSquareText size={18} />
                </div>
                <div>
                  <h3 className="display-font">ملاحظات إضافية</h3>
                  <p>أي تفسير، تحفظ، أو تنبيه يساعد على فهم القرار النهائي.</p>
                </div>
              </div>

              <textarea
                value={otherNotes}
                onChange={(event) => {
                  clearFeedback();
                  setOtherNotes(event.target.value);
                }}
                className="control-textarea"
                placeholder="اكتب أي ملاحظات مرتبطة بالأولويات، الاعتماديات، أو المتطلبات الخاصة."
              />
            </div>
          </section>

          {feedback ? (
            <div className={`feedback-banner ${feedback.tone}`} role="alert">
              {feedback.text}
            </div>
          ) : null}

          <section
            className="submit-panel stagger-card"
            style={{ "--reveal-delay": "440ms" } as CSSProperties}
          >
            <div className="submit-copy">
              <p className="section-eyebrow">الخطوة الأخيرة</p>
              <h2 className="display-font">أرسل خارطة الأولويات الحالية كما هي.</h2>
              <p>
                سيتم حفظ اسم صاحب القرار، جميع التحديدات، والملاحظات المصاحبة
                لتُستخدم مباشرة في نقاشات التنفيذ.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  جاري الإرسال
                </>
              ) : (
                <>
                  إرسال الاختيارات
                  <Send size={18} />
                </>
              )}
            </button>
          </section>
        </div>

        <aside
          className="summary-panel stagger-card"
          style={{ "--reveal-delay": "180ms" } as CSSProperties}
        >
          <div className="summary-top">
            <p className="section-eyebrow">لوحة القرار</p>
            <h2 className="display-font">ملخص مباشر وسريع</h2>
            <p>
              كل ما تحتاجه لإدارة الأولويات بدون أن تضيع داخل القائمة الطويلة.
            </p>
          </div>

          <div className="summary-section">
            <label className="control-label" htmlFor="submitter-name">
              اسم صاحب القرار
            </label>
            <input
              id="submitter-name"
              type="text"
              className="control-input"
              value={submitterName}
              onChange={(event) => {
                clearFeedback();
                setSubmitterName(event.target.value);
              }}
              placeholder="اكتب الاسم الكامل هنا"
            />
          </div>

          <div className="summary-metrics">
            <div className="metric-card">
              <strong>{stats.uniqueSelected}</strong>
              <span>خدمة محددة</span>
            </div>
            <div className="metric-card">
              <strong>{stats.launch}</strong>
              <span>مع الانطلاق</span>
            </div>
            <div className="metric-card">
              <strong>{stats.postLaunch}</strong>
              <span>بعد الإطلاق</span>
            </div>
            <div className="metric-card">
              <strong>{visibleServicesCount}</strong>
              <span>خدمة ظاهرة</span>
            </div>
          </div>

          <div className="meter-card">
            <div className="meter-head">
              <span>نسبة الترتيب الحالية</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="meter-track">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p>
              {stats.uniqueSelected} من أصل {totalServices} خدمة تم وضعها على
              الخريطة حتى الآن.
            </p>
          </div>

          <div className="summary-section">
            <label className="control-label" htmlFor="service-search">
              ابحث داخل الخدمات
            </label>
            <div className="search-shell">
              <Search size={16} />
              <input
                id="service-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="search-input"
                placeholder="اكتب اسم خدمة أو قسم"
              />
            </div>

            <div className="filter-row">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`filter-chip ${
                    activeFilter === option.id ? "is-active" : ""
                  }`}
                  onClick={() => setActiveFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="summary-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={expandVisibleSections}
              disabled={!visibleSections.length}
            >
              فتح الظاهر
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={collapseVisibleSections}
              disabled={!visibleSections.length}
            >
              طي الظاهر
            </button>
            <button
              type="button"
              className="secondary-button danger"
              onClick={clearAllSelections}
              disabled={!selectedServices.length}
            >
              تفريغ الاختيارات
            </button>
          </div>

          <div className="summary-section">
            <div className="summary-block-head">
              <Layers2 size={16} />
              الخدمات المختارة الآن
            </div>

            {selectedServices.length > 0 ? (
              <div className="selection-list">
                {selectedServices.slice(0, 6).map((service) => (
                  <div key={service.id} className="selection-chip">
                    <div>
                      <strong>{service.name}</strong>
                      <span>{service.sectionTitle}</span>
                    </div>
                    <div className="mini-phase-list">
                      {service.launch ? (
                        <span className="mini-phase launch">انطلاق</span>
                      ) : null}
                      {service.postLaunch ? (
                        <span className="mini-phase post">بعد</span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {selectedServices.length > 6 ? (
                  <div className="selection-more">
                    +{selectedServices.length - 6} خدمات أخرى
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="empty-mini">
                لم تحدد أي خدمة بعد. ابدأ من أحد الأقسام وستتكوّن الصورة هنا
                تلقائيًا.
              </div>
            )}
          </div>

          <div className="summary-section tone-soft">
            <div className="summary-block-head">
              <Sparkles size={16} />
              تذكير توجيهي
            </div>
            <p className="aside-note">
              ابدأ بما يلامس تجربة المستخدم الأساسية وثقة المنصة يوم الإطلاق، ثم
              انقل التحليلات والتوسع والذكاء الإضافي إلى المرحلة التالية عند
              الحاجة.
            </p>
          </div>
        </aside>
      </section>

      {/* Floating Submit Bar */}
      <div className={`floating-submit ${showFloatingBar && stats.uniqueSelected > 0 ? 'is-visible' : ''}`}>
        <div className="floating-submit-info">
          <Sparkles size={18} />
          <strong>{stats.uniqueSelected} خدمة محددة</strong>
          <span>({stats.launch} إطلاق · {stats.postLaunch} بعد)</span>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              جاري الإرسال
            </>
          ) : (
            <>
              إرسال الاختيارات
              <Send size={18} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}
