export interface Service {
  id: string;
  name: string;
}

export interface ServiceSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  subsections: {
    id: string;
    title: string;
    services: Service[];
  }[];
}

export const servicesData: ServiceSection[] = [
  {
    id: "frontend",
    title: "الواجهة العامة",
    icon: "🌐",
    color: "from-blue-500 to-cyan-500",
    subsections: [
      {
        id: "news-content",
        title: "الأخبار والمحتوى الأساسي",
        services: [
          { id: "s1", name: "الصفحة الرئيسية (عربي / إنجليزي)" },
          { id: "s2", name: "صفحة تفاصيل الخبر مع إحصائيات القراءة والتفاعل" },
          { id: "s3", name: "تصفح الأخبار حسب التصنيفات" },
          { id: "s4", name: "دليل التصنيفات الكامل مع إحصائيات كل تصنيف" },
          { id: "s5", name: "موجز الأخبار (News Feed)" },
          { id: "s6", name: "البحث بالكلمات المفتاحية والوسوم" },
          { id: "s7", name: "قسم الرأي والمقالات" },
          { id: "s8", name: "الأخبار القصيرة (Shorts)" },
          { id: "s9", name: "النسخة الخفيفة (Lite Mode)" },
          { id: "s10", name: "أرشيف المحتوى القديم" },
        ],
      },
      {
        id: "user-account",
        title: "حساب المستخدم والملف الشخصي",
        services: [
          { id: "s11", name: "تسجيل حساب جديد" },
          { id: "s12", name: "تسجيل الدخول (عادي + عبر Replit)" },
          { id: "s13", name: "استعادة كلمة المرور" },
          { id: "s14", name: "التحقق من البريد الإلكتروني" },
          { id: "s15", name: "الملف الشخصي (عرض وتعديل)" },
          { id: "s16", name: "الملفات الشخصية العامة للمراسلين والكُتّاب" },
          { id: "s17", name: "مركز التفضيلات (المظهر، اللغة، إعدادات المحتوى)" },
          { id: "s18", name: "إدارة الاهتمامات" },
          { id: "s19", name: "متابعة الكُتّاب والمراسلين" },
          { id: "s20", name: "حفظ الكلمات المفتاحية المفضلة" },
          { id: "s21", name: "تجربة الإعداد الأولي للمستخدمين الجدد (Onboarding)" },
        ],
      },
      {
        id: "interaction",
        title: "التفاعل والمشاركة",
        services: [
          { id: "s22", name: "نظام التعليقات على الأخبار" },
          { id: "s23", name: "نظام الإعجابات (Reactions)" },
          { id: "s24", name: "حفظ الأخبار في المفضلة (Bookmarks)" },
          { id: "s25", name: "مشاركة الأخبار على وسائل التواصل" },
          { id: "s26", name: "تسجيل تقدم القراءة (Reading Progress)" },
          { id: "s27", name: "سجل القراءة (Reading History)" },
        ],
      },
      {
        id: "smart-services",
        title: "خدمات ذكية وتفاعلية",
        services: [
          { id: "s32", name: "الموجز اليومي — ملخص يومي شامل" },
          { id: "s33", name: "التغطية اللحظية (لحظة بلحظة)" },
          { id: "s35", name: "متجر الوسائط" },
          { id: "s36", name: "المساعد الصوتي" },
          { id: "s37", name: "الروابط الذكية" },
        ],
      },
      {
        id: "info-pages",
        title: "صفحات المعلومات",
        services: [
          { id: "s42", name: "من نحن" },
          { id: "s43", name: "اتصل بنا" },
          { id: "s44", name: "سياسة الخصوصية" },
          { id: "s45", name: "شروط الاستخدام" },
          { id: "s46", name: "بيان إمكانية الوصول" },
          { id: "s47", name: "صفحة المطورين" },
          { id: "s48", name: "سياسة الذكاء الاصطناعي" },
          { id: "s49", name: "خلاصات RSS" },
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "لوحة التحكم",
    icon: "⚙️",
    color: "from-purple-500 to-pink-500",
    subsections: [
      {
        id: "dashboard-home",
        title: "الصفحة الرئيسية للوحة التحكم",
        services: [
          { id: "s50", name: "نظرة عامة على حالة النظام" },
          { id: "s51", name: "إحصائيات سريعة (مقالات، مستخدمين، تفاعلات)" },
          { id: "s52", name: "إجراءات سريعة" },
        ],
      },
      {
        id: "content-management",
        title: "إدارة المحتوى",
        services: [
          { id: "s53", name: "إدارة الأخبار والمقالات (عرض، إضافة، تعديل، حذف)" },
          { id: "s54", name: "محرر المقالات المتقدم مع معاينة مباشرة" },
          { id: "s55", name: "إدارة التصنيفات (إنشاء، تعديل، ترتيب، حذف)" },
          { id: "s56", name: "إدارة الوسوم (Tags)" },
          { id: "s57", name: "إعادة ترتيب التصنيفات بالسحب والإفلات" },
          { id: "s58", name: "نظام حالات المقال (مسودة، قيد المراجعة، منشور، مؤرشف)" },
        ],
      },
      {
        id: "users-permissions",
        title: "إدارة المستخدمين والصلاحيات",
        services: [
          { id: "s59", name: "إدارة المستخدمين (عرض، تعديل، حظر)" },
          { id: "s60", name: "إدارة الأدوار والصلاحيات (أدوار مخصصة)" },
          { id: "s61", name: "إدارة فريق العمل (الموظفين)" },
          { id: "s62", name: "نظام صلاحيات دقيق" },
        ],
      },
      {
        id: "reporters-writers",
        title: "إدارة المراسلين والكُتّاب",
        services: [
          { id: "s63", name: "طلبات المراسلين — مراجعة وقبول/رفض" },
          { id: "s64", name: "طلبات كُتّاب الرأي — فحص واعتماد" },
          { id: "s65", name: "إدارة الناشرين الخارجيين" },
        ],
      },
      {
        id: "analytics",
        title: "التحليلات والإحصائيات",
        services: [
          { id: "s66", name: "لوحة التحليلات العامة" },
          { id: "s67", name: "تحليلات المقالات (أداء كل مقال)" },
          { id: "s68", name: "تحليلات سلوك المستخدمين" },
          { id: "s69", name: "تحليلات المشاعر (Sentiment Analytics)" },
          { id: "s70", name: "تحليلات التخصيص (Personalization Analytics)" },
          { id: "s71", name: "رؤى يومية ذكية بالذكاء الاصطناعي" },
        ],
      },
      {
        id: "communications",
        title: "الاتصالات والإشعارات",
        services: [
          { id: "s72", name: "مركز الاتصالات" },
          { id: "s73", name: "إدارة الإشعارات الفورية (Push Notifications)" },
          { id: "s74", name: "تكامل مع Twilio للرسائل النصية" },
        ],
      },
      {
        id: "mirqab-tools",
        title: "أدوات المِرقَب (للمحررين)",
        services: [
          { id: "s78", name: "مؤشر سبق الإخباري" },
          { id: "s79", name: "التنبؤ بالقصص القادمة (Next Stories)" },
          { id: "s80", name: "الرادار الإخباري" },
          { id: "s81", name: "إنشاء عناصر مِرقَب جديدة" },
        ],
      },
      {
        id: "accessibility",
        title: "رؤى إمكانية الوصول",
        services: [
          { id: "s82", name: "تقارير توافق المحتوى مع معايير الوصول" },
          { id: "s83", name: "اقتراحات تحسين" },
        ],
      },
      {
        id: "system-settings",
        title: "إعدادات النظام",
        services: [
          { id: "s84", name: "إعدادات عامة للمنصة" },
          { id: "s85", name: "إعدادات التخزين المؤقت (Cache)" },
          { id: "s86", name: "إعدادات الأمان (CSRF، حدود الاستخدام)" },
        ],
      },
    ],
  },
  {
    id: "ai-services",
    title: "خدمات الذكاء الاصطناعي الخلفية",
    icon: "🤖",
    color: "from-emerald-500 to-teal-500",
    subsections: [
      {
        id: "image-gen",
        title: "توليد وتحرير الصور",
        services: [
          { id: "s102", name: "استوديو الصور بالذكاء الاصطناعي (Image Studio)" },
          { id: "s103", name: "توليد صور إخبارية واقعية أو توضيحية" },
          { id: "s104", name: "التوليد التلقائي للصور عند نشر الأخبار" },
          { id: "s105", name: "صور مصغرة ذكية (Smart Thumbnails)" },
          { id: "s106", name: "بطاقات مشاركة اجتماعية (Social Cards)" },
          { id: "s107", name: "كشف النقطة البؤرية في الصور (Focal Point Detection)" },
          { id: "s108", name: "استوديو الإنفوجرافيك" },
        ],
      },
      {
        id: "classification",
        title: "التصنيف والتحليل الذكي",
        services: [
          { id: "s109", name: "تصنيف المقالات تلقائياً" },
          { id: "s110", name: "استخراج الكيانات (أشخاص، أماكن، مؤسسات)" },
          { id: "s111", name: "توليد روابط ذكية تلقائياً داخل المقالات" },
          { id: "s112", name: "تحليل المشاعر في التعليقات والمحتوى" },
        ],
      },
      {
        id: "translation",
        title: "الترجمة والتلخيص",
        services: [
          { id: "s113", name: "ترجمة احترافية صحفية (عربي، إنجليزي، أوردو)" },
          { id: "s114", name: "تلخيص المقالات بجودة عالية" },
          { id: "s115", name: "إعادة صياغة المحتوى وتحسينه" },
        ],
      },
      {
        id: "headlines",
        title: "توليد العناوين والمحتوى",
        services: [
          { id: "s116", name: "توليد 3 عناوين مختلفة لكل خبر" },
          { id: "s117", name: "تحليل وتوليد بيانات SEO تلقائياً" },
          { id: "s118", name: "توليد كلمات مفتاحية مقترحة" },
        ],
      },
      {
        id: "ai-chat",
        title: "المساعد الذكي والمحادثة",
        services: [
          { id: "s119", name: "مساعد محادثة ذكي (AI Chat)" },
          { id: "s120", name: "الإجابة على الأسئلة من آخر الأخبار المنشورة" },
        ],
      },
      {
        id: "verification",
        title: "التحقق والمصداقية",
        services: [
          { id: "s121", name: "تحليل مصداقية المقالات مع تقييم رقمي" },
          { id: "s122", name: "نظام تحقق متعدد النماذج (OpenAI + Claude + Gemini)" },
        ],
      },
      {
        id: "moderation",
        title: "مراقبة المحتوى",
        services: [
          { id: "s123", name: "فحص التعليقات لكشف المحتوى المسيء" },
          { id: "s124", name: "تصفية تلقائية مع مراجعة يدوية" },
        ],
      },
      {
        id: "trends",
        title: "تحليل الاتجاهات",
        services: [
          { id: "s125", name: "رصد المواضيع الرائجة" },
          { id: "s126", name: "تحليل المشاعر العامة تجاه المواضيع" },
        ],
      },
    ],
  },
  {
    id: "integrations",
    title: "التكاملات والخدمات الخارجية",
    icon: "🔗",
    color: "from-indigo-500 to-violet-500",
    subsections: [
      {
        id: "external-services",
        title: "الخدمات الخارجية",
        services: [
          { id: "s132", name: "OpenAI (GPT-5.1) — توليد النصوص والصور" },
          { id: "s133", name: "Anthropic (Claude 4.5) — الترجمة والتلخيص" },
          { id: "s134", name: "Google Gemini (2.5) — التحقق من المعلومات" },
          { id: "s135", name: "Twilio — الرسائل النصية والإشعارات" },
          { id: "s136", name: "Google Analytics — تتبع الزوار والسلوك" },
          { id: "s137", name: "Object Storage — تخزين الملفات سحابياً" },
          { id: "s138", name: "قاعدة بيانات PostgreSQL" },
          { id: "s139", name: "نظام المصادقة عبر Replit" },
          { id: "s140", name: "خلاصات RSS" },
        ],
      },
    ],
  },
  {
    id: "security-performance",
    title: "الأمان والأداء",
    icon: "🛡️",
    color: "from-rose-500 to-red-600",
    subsections: [
      {
        id: "security",
        title: "الأمان",
        services: [
          { id: "s141", name: "حماية CSRF مع نظام احتياطي" },
          { id: "s142", name: "نظام صلاحيات متعدد المستويات" },
          { id: "s143", name: "حماية البيانات — اختيار ضيّق للأعمدة" },
          { id: "s144", name: "تحديد معدل الطلبات (Rate Limiting)" },
        ],
      },
      {
        id: "performance",
        title: "الأداء",
        services: [
          { id: "s145", name: "تخزين مؤقت ذكي متعدد المستويات (SWR + Memory Cache)" },
          { id: "s146", name: "اختيار أعمدة مُحسَّن (Narrow Selects)" },
          { id: "s147", name: "تخزين سجلات السلوك مؤقتاً وكتابتها دفعة واحدة" },
          { id: "s148", name: "إلغاء تكرار سجل القراءة" },
          { id: "s149", name: "رؤوس تحكم في التخزين المؤقت (Cache-Control)" },
        ],
      },
    ],
  },
  {
    id: "languages",
    title: "دعم اللغات",
    icon: "🌍",
    color: "from-sky-500 to-blue-600",
    subsections: [
      {
        id: "language-support",
        title: "اللغات المدعومة",
        services: [
          { id: "s150", name: "العربية — واجهة كاملة + محتوى" },
          { id: "s151", name: "الإنجليزية — واجهة كاملة + محتوى" },
          { id: "s153", name: "اتجاه النص RTL/LTR تلقائي" },
        ],
      },
    ],
  },
];
