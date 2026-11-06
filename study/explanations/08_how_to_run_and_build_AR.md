# الفصل الثامن: كيفية تشغيل وبناء وتصدير المشروع المتكامل
## Chapter 08: Monorepo Developer Setup, Microservices, Testing & Docker

هذا الفصل يقدم الدليل الشامل والعملي لتشغيل مشروع Thenar بهندسته المعمارية المتكاملة (Monorepo): الواجهة الأمامية React، خادم الـ Gateway (Node.js/Express)، خدمة التدريب البيومتري Python Enrollment (FastAPI/Scikit-learn)، ومحاكي العتاد Device Simulator.

---

### 1. المتطلبات الأساسية (System Prerequisites)
1. **Node.js:** إصدار 18 أو أحدث (يوصى بـ LTS v20 أو v24).
2. **مدير الحزم:** `npm` (مدمج مع Node.js).
3. **Python:** إصدار 3.10 أو أحدث (مطلوب لخدمة `apps/enrollment`).
4. **Docker & Docker Compose (اختياري):** للتشغيل في بيئة حاويات معزولة.

---

### 2. تجهيز البيئة وملف المتغيرات (Environment Setup)
في المجلد الرئيسي للمشروع، ستجد ملف `.env.example`. قم بنسخه لإنشاء ملف `.env`:

```bash
# في بيئة Windows PowerShell:
Copy-Item .env.example .env

# في بيئة Linux / macOS:
cp .env.example .env
```

يحتوي ملف `.env` على الإعدادات الأساسية لجميع الخدمات:
```ini
PORT=3000
HOST=0.0.0.0
DB_PATH=./data/thenar.db
DEVICE_AUTH_TOKEN=thenar-super-secret-device-token-2026
ENROLLMENT_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

قم بتثبيت حزم الـ JavaScript لكافة مشاريع الـ Monorepo بأمر واحد من المجلد الرئيسي:
```bash
npm install
```

---

### 3. تشغيل جميع الخدمات بأمر واحد (All-in-One Command)
لتشغيل المنظومة بالكامل (Gateway + Enrollment Service + Web Frontend) بضغطة زر واحدة:

```bash
npm run dev:all
```

يقوم هذا الأمر بتشغيل سكربت `scripts/dev-all.ts` الذي يقوم بـ:
1. تشغيل خادم الـ Gateway على المنفذ `http://localhost:3000`.
2. تشغيل خدمة الـ Enrollment (FastAPI) على المنفذ `http://localhost:8000`.
3. تشغيل خادم الواجهة الأمامية Vite على المنفذ `http://localhost:5173`.
4. تلوين مخرجات كل خدمة (Logs) بلون مميز لسهولة التتبع والمراقبة.

---

### 4. تشغيل الخدمات بشكل منفصل (Independent Service Commands)
يمكنك أيضاً تشغيل أي خدمة بمفردها في نافذة Terminal مستقلة:

```bash
# 1. تشغيل خادم الـ Gateway فقط (Node.js + Express + WebSocket + SQLite):
npm run dev:gateway
# يفتح: http://localhost:3000
# التوثيق التفاعلي Swagger: http://localhost:3000/api/docs

# 2. تشغيل خدمة التدريب البيومتري فقط (Python FastAPI):
npm run dev:enrollment
# يفتح: http://localhost:8000
# التوثيق التفاعلي OpenAPI: http://localhost:8000/docs

# 3. تشغيل الواجهة الأمامية فقط (React + Vite):
npm run dev:web
# يفتح: http://localhost:5173
```

---

### 5. تشغيل محاكي عتاد الخزنة (Device Simulator CLI)
لمحاكاة قيام مستخدم بلمس المقبض وإجراء محاولة فتح حقيقية مع إرسال الإطارات الحركية لحظياً:

```bash
# تشغيل محاولة فتح صحيحة للمالك الأصلي (Owner Unlock):
npm run sim

# تشغيل سيناريو محدد (مثل هجوم بصمة مزورة مع سلوك دخيل):
npx tsx apps/device-sim/src/cli.ts --scenario fingerprint-accepted-impostor

# السيناريوهات المدعومة:
# owner-unlock                  -> بصمة صحيحة + سلوك مالك صحيح (فتح معتمد)
# impostor                      -> بصمة مرفوضة + سلوك عشوائي
# mimic-l1                      -> محاكاة تقليد حركة بسيطة (Level 1)
# mimic-l2                      -> محاكاة تقليد حركة متقدمة (Level 2)
# fingerprint-accepted-impostor -> بصمة مقبولة خادعة + سلوك دخيل (البوابة الثانية تكشفه وترفضه!)
# sensor-fault                  -> عطل في حساس الوزن (HX711 Disconnect)
# rapid-fire-brute-force        -> هجوم تخمين سريع يفعّل الإغلاق الأمني المتصاعد
```

---

### 6. تنفيذ الاختبارات الشاملة (Automated Test Suite)
للتأكد من سلامة النظام وتطابق المعايير الرياضية:

```bash
# 1. اختبار حزم الـ Monorepo بالكامل (Contracts, Engine, Gateway Integration):
npm run test:all

# 2. اختبار خدمة الـ Python والتحقق من المتجهات الذهبية (Golden Vectors):
pytest apps/enrollment/tests
```

جميع الاختبارات تفحص:
- **Golden Vector Test:** تطابق درجات Mahalanobis Distance بين محرك الـ TypeScript ومكتبة الـ Scikit-Learn حتى 6 خانات عشرية.
- **Contract Schema Validation:** مطابقة كل كائن مرسل عبر الشبكة لمخطط Zod بدقة.
- **Gateway Endpoints & DB Transactions:** التأكد من تخزين المحاولات وحساب العقوبات واسترجاع الإحصائيات.

---

### 7. التجميع الكامل للإنتاج والنشر عبر Docker
لبناء وتجميع جميع أجزاء المشروع:

```bash
# تجميع الحزم المشتركة والواجهة:
npm run build
```

لتشغيل المنظومة المتكاملة كحاويات Docker:
```bash
# بناء وتشغيل الحاويات في الخلفية:
docker compose up --build -d

# إيقاف الحاويات:
docker compose down
```

---

### 8. حل المشاكل الشائعة (Troubleshooting FAQ)
1. **المنفذ 3000 أو 5173 أو 8000 مشغول:**
   - تحقق من العمليات التي تحتل المنافذ: `netstat -ano | findstr :3000` ثم أوقفها عبر مدير المهام (Task Manager) أو غير المنفذ في ملف `.env`.
2. **خطأ في مكتبة SQLite على Windows (`better-sqlite3`):**
   - تم تثبيت الحزمة بنجاح عبر Prebuilt Binaries دون الحاجة لمترجم Visual Studio C++ Compiler. إذا واجهت خطأ، تأكد من إصدار Node.js وتوافق المعمارية (x64).
3. **عدم تفعيل البيئة الافتراضية للـ Python (`apps/enrollment/.venv`):**
   - لتفعيل البيئة يدوياً:
     - على Windows: `.\apps\enrollment\.venv\Scripts\activate`
     - على Linux/Mac: `source apps/enrollment/.venv/bin/activate`
   - تثبيت المتطلبات: `pip install -r apps/enrollment/requirements.txt`.
