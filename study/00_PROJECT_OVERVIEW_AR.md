# الدليل المرجعي الشامل لمشروع Thenar
# Project Thenar: Authoritative Architecture & Engineering Overview

---

## 1. الملخص التنفيذي والمشكلة الهندسية (Executive Summary & Problem Solved)

مشروع **Thenar** هو نظام أمني متقدم لمقبض خزنة ذكية (Smart-Safe Handle)، مصمم لحل الثغرة الأزلية في أقفال البصمة التقليدية: **"البصمة البيومترية الثابتة يمكن سرقتها وتزييفها بسهولة، ولا تثبت هوية الشخص الحية لحظة الفتح"**.

تعتمد الأقفال التجارية اليوم على حساس بصمة صلب يفتح الخزنة بمجرد تطابق الخطوط الحلمية (Minutiae Matching). هذا التصميم ينهار تماماً أمام:
1. **القوالب الجيلاتينية والسيليكونية (Spoofed Latent Prints):** رفع البصمة الكامنة عن الأسطح الزجاجية وصنع قوالب تحاكي بصمة المالك.
2. **الفتح تحت الإكراه والتهديد (Coerced Unlocking):** إجبار صاحب الخزنة على وضع إصبعه قسراً دون إرادته الحرة.
3. **الاستغلال أثناء النوم أو فقدان الوعي (Unconscious Access).**

يقدم مشروع Thenar حلاً قائماً على **التحقق ثنائي البوابات (Dual-Gate Verification)**:
- **البوابة الأولى (Gate 1):** مطابقة بصمة الإصبع الثابتة عبر حساس بصري متقدم (R503).
- **البوابة الثانية (Gate 2):** مطابقة **البصمة الحركية السلوكية (Behavioral Biometrics)** للمالك أثناء مسك ولف المقبض، عبر قياس قوة القبضة (Grip Force) بواسطة خلية وزن (Load Cell مع شريحة HX711) والسرعة الزاوية وعزم اللف بواسطة وحدة قياس القصور الذاتي (MPU-6050 6-DoF IMU).

الخزنة تفتح **فقط** إذا نجحت البوابة الأولى (مطابقة البصمة) **و** حققت البوابة الثانية سكور سلوكي أعلى من أو يساوي عتبة الأمان ($s(x) \ge \tau$). إذا سرق المهاجم البصمة وطبقها بقالب سيليكون، فإن اختلاف قوة قبضته وزاوية تسارع يده سيؤدي إلى رفض المحاولة فوراً واحتجاز لسان القفل في وضعه الآمن!

---

## 2. الحدود بين الحقيقي والمحاكى (Physical vs. Simulated Boundaries)

بكل أمانة علمية ووضوح هندسي، يوضح الجدول التالي بدقة ما تم بناؤه كبرمجيات حقيقية وما تم تشغيله عبر المحاكاة في المنظومة:

| العنصر (Subsystem) | الحالة في المشروع (Status) | التوضيح التقني (Technical Note) |
| :--- | :--- | :--- |
| **الواجهة الأمامية (Web Frontend)** | **حقيقي ويعمل 100% (Production-Ready)** | مبني بـ React 18 + TypeScript + Tailwind + Framer Motion. تدعم نمط الاتصال بالـ Gateway ونمط الـ Fallback المحلي. |
| **خادم البوابة (Gateway API & WS)** | **حقيقي ويعمل 100% (Production-Ready)** | مبني بـ Node.js + Express + TypeScript + SQLite WAL DB + WebSocket Server. |
| **خدمة التدريب البيومتري (Enrollment)** | **حقيقية وتعمل 100% (Production-Ready)** | خدمة Python FastAPI متكاملة مع Scikit-learn وخوارزمية Ledoit-Wolf وتصدير كود C. |
| **حزمة العقود الموحدة (Contracts)** | **حقيقية وتعمل 100% (Single Source of Truth)** | مخططات Zod للتحقق الصارم وأنواع TypeScript ومواصفات OpenAPI 3.0 ومولد كود C. |
| **محرك الحسابات الحركية (Engine)** | **حقيقي ويعمل 100% (Golden-Vector Tested)** | استخراج 16 ميزة حركية ومسافة ماهالانوبيس وتقييم البوابتين واختبار المتجهات الذهبية. |
| **محاكي عتاد الخزنة (Device Sim)** | **محاكاة عتادية كاملة (Hardware Simulation)** | تطبيق Node.js يحاكي شريحة ESP32 والحساسات الفيزيائية ويرسل الإطارات والمحاولات الحقيقية عبر الشبكة. |
| **المقبض الفيزيائي والحساسات** | **خريطة تصميم هندسية (Hardware Blueprint)** | حساسات HX711 + MPU-6050 + ماسح بصمة R503 + سولينويد ومفتاح ممغنط. |

---

## 3. المعمارية الهندسية الشاملة للنظام (Full Monorepo Architecture)

ينقسم النظام إلى حزم ومشاريع متكاملة ضمن هيكل Monorepo موحد:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THENAR SYSTEM MONOREPO                          │
├──────────────────────────┬─────────────────────────────────────────────┤
│ packages/contracts       │ Zod Schemas + TS Interfaces + OpenAPI 3.0   │
│ packages/engine          │ 16-D Features + Mahalanobis + Golden Vector │
├──────────────────────────┼─────────────────────────────────────────────┤
│ apps/web                 │ React 18 + Vite + Zustand + Recharts + Orb  │
│ apps/gateway             │ Node.js/Express + SQLite WAL + WebSocket WS │
│ apps/enrollment          │ Python FastAPI + Scikit-learn + Ledoit-Wolf │
│ apps/device-sim          │ ESP32 Hardware Emulator + Persistent State  │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### تسلسل تدفق البيانات بين الطبقات:
```
[ apps/device-sim / ESP32 ]
            │ (100Hz Frames + Attempt Metric)
            ▼
   [ apps/gateway:3000 ]
     ├── Stores into SQLite (thenar.db)
     ├── Broadcasts live events to [ /ws/live ]
     └── Forwards training requests to [ apps/enrollment:8000 ]
            │
            ▼
      [ apps/web:5173 ]
     ├── Receives via WebSocket (ws.ts)
     ├── Dispatches into Zustand Store
     └── Graceful Fallback to In-Browser Mock if Gateway is offline
```

---

## 4. تفصيل الشاشات السبعة ووظائفها (Screen-by-Screen Breakdown)

1. **الرئيسية (`/` - Dashboard):**
   - العرض البصري: مجسم تفاعلي دقيق لآلية القفل الميكانيكي (Solenoid, Bolt, Strike, Reed Switch) مع شارة حالة الاتصال بالـ Gateway.
   - البيانات: حالة الباب، تفعيل السولينويد، وضع اللسان، قوة إشارة Wi-Fi، عداد الفشل.
   - التفاعل: زر محاكاة محاولة فورية للمالك، زر محاكاة شخص غريب، وأزرار تحريك الباب يدوياً.
2. **الإشارة الحية (`/live` - LiveSession):**
   - العرض البصري: راسم إشارة ثلاثي القنوات بـ 100 هرتز لقوة القبضة، والسرعة الزاوية، والتسارع.
   - البيانات: تدفق عينات الإشارة الحية عبر WebSocket، الطور الحركي الحالي (S1 إلى S4).
3. **سجل المحاولات (`/log` - AttemptLog):**
   - العرض البصري: جدول تدقيق زمني قابل للفلترة (الكل، مقبول، مرفوض، عطل حساسات)، متصل بجدول `attempts` في قاعدة بيانات SQLite.
   - التفاعل: النقر على أي محاولة يفتح نافذة إعادة تشغيل الإشارة (Signal Replay) إطاراً بإطار.
4. **ملف المعايرة (`/profile` - EnrollmentProfile):**
   - العرض البصري: معالج معايرة من 5 خطوات لحفظ بصمة المالك الحركية، ومخطط رادار لخصائصه، متصل بنقطة نهاية `/fit` في خدمة الـ Python.
   - البيانات: المتوسط الحسابي ومصفوفة التشتت للـ 16 خاصية الحركية.
5. **التحليلات والمقاييس (`/analytics` - Analytics):**
   - العرض البصري: مصفوفة الارتباك، ومنحنيات ROC و DET، ومعدل الخطأ المتساوي (EER).
   - التفاعل: شريط ضبط العتبة $\tau$ ومشاهدة تأثيرها على توازن الأمان وسهولة الاستخدام.
6. **محاكي الهجمات (`/attack` - AttackSimulator):**
   - العرض البصري: محاكاة 4 هجمات واقعية (بصمة جيلاتين، قوة مفرطة، تردد، لفة سريعة).
   - التفاعل: عرض منحنى المهاجم متراكباً مع نطاق ثقة المالك المعتمد بنسبة 95%.
7. **الإعدادات (`/settings` - Settings):**
   - البيانات: ضبط عتبة القرار، زمن نشاط السولينويد، عداد الإغلاق، تصدير واستيراد الإعدادات بملف JSON ومزامنتها مع الخادم.

---

## 5. جدول الدوال والملفات البرمجية الموثقة (Verified Code Reference)

| المكون / الدالة البرمجية | الملف وموقعه (File & Path) | الوظيفة الهندسية الدقيقة (Verified Purpose) | المتصل بها (Callers) |
| :--- | :--- | :--- | :--- |
| `extractFeatures(frames)` | `packages/engine/src/index.ts` | استخراج المتجه البيومتري الـ 16 بعدياً بدقة عددية من الإطارات الحركية الخام. | محرك الحسابات، ومحاكي العتاد، واختبارات المتجهات. |
| `computeMahalanobisScore(f, m, c)` | `packages/engine/src/index.ts` | حساب مسافة ماهالانوبيس وتطبيق مقياس الموازنة $s(x) = -\frac{1}{2.5}\sqrt{D_M^2}$. | محاكي العتاد، وخدمة الـ Gateway. |
| `evaluateDualGate(fp, score, tau)` | `packages/engine/src/index.ts` | اتخاذ قرار الفتح النهائي: `fp.matched && score >= tau && !fault`. | محاكي العتاد، والـ Firmware المدمج. |
| `fit_model(attempts)` | `apps/enrollment/algorithms.py` | تدريب نموذج المالك باستخدام خوارزمية Ledoit-Wolf Shrinkage وحساب مصفوفة الدقة المعكوسة. | نقطة نهاية `POST /fit` في FastAPI. |
| `generateCHeader(meta)` | `packages/contracts/src/index.ts` | توليد ملف كود C نقي (`thenar_model.h`) جاهز للتحميل المباشر على معالج ESP32. | صفحة الملف الشخصي، ونقطة `/export/c-header`. |
| `getDb(customPath)` | `apps/gateway/src/db.ts` | إدارة اتصال SQLite بنمط WAL Mode وضمان العمل كـ Singleton للملفات والذاكرة. | جميع مسارات الـ Gateway (Routes). |
| `setupWebSocket(server)` | `apps/gateway/src/ws.ts` | إنشاء قنوات البث `/ws/live` للمتصفحات و `/ws/device` للمتحكم وتوجيه الرسائل. | خادم Express في `apps/gateway/src/index.ts`. |
| `initApiAndWs()` | `src/store/useThenarStore.ts` | فحص حالة خادم الـ Gateway ومزامنة المحاولات وفتح قناة WebSocket للواجهة. | استدعاء تلقائي في `App.tsx` عند بدء التشغيل. |
| `simulateScenarioReal(scenario)` | `src/store/useThenarStore.ts` | إرسال أمر المحاكاة للـ Gateway مع التراجع التلقائي المرن للمحاكي المحلي عند انقطاع الخادم. | أزرار التحكم في الشاشات المختلفة. |

---

## 6. المسار الحسابي لاتخاذ القرار الأمني (Decision Logic Walkthrough)

عندما يضع المستخدم إصبعه ويدير مقبض Thenar، تمر البيانات بالخطوات الرياضية والمنطقية التالية على الجهاز نفسه:

```
1. الإشارات الخام (Raw Telemetry Streams - 100 Hz):
   F(t) = Force(t),   ω(t) = Gyro_Yaw(t),   a(t) = Accel(t)   [150 Frames, 1.5s]
                           │
                           ▼
2. استخراج الميزات (16-D Feature Vector Extraction):
   x = [F_peak, t_peak, F_slope, F_auc, ω_max, θ_total, jerk, lead_lag, ...]
                           │
                           ▼
3. حساب مسافة ماهالانوبيس مع مصفوفة التغاير المنكمشة (Ledoit-Wolf Precision Matrix):
   D_M^2 = (x - μ_owner)^T · Σ_owner^(-1) · (x - μ_owner)
                           │
                           ▼
4. حساب درجة المطابقة السلوكية المقيسة (Calibrated Behavioral Score):
   s(x) = - (1 / 2.5) · sqrt( D_M^2 )  ──► القيمة عادة بين -1.0 و -12.0
                           │
                           ▼
5. تقييم الحارسين (Dual-Gate Logical Evaluation):
   Decision = (Gate1_Fingerprint == MATCH) AND (s(x) >= tau) AND (NOT SensorFault)
                           │
               ┌───────────┴───────────┐
            [TRUE]                   [FALSE]
               │                       │
               ▼                       ▼
   • النتيجة: ACCEPT            • النتيجة: REJECT
   • السولينويد ينشط (3s)       • السولينويد يظل طافياً (0V)
   • اللسان يتراجع فيزيائياً    • اللسان يظل ممتداً مقفولاً
   • تصفير عداد الفشل          • زيادة عداد الفشل (failureCounter++)
                               • تفعيل عقوبة الإغلاق إذا بلغ الحد الأقصى
```

---

## 7. القيود الهندسية والشفافية العلمية (Limitations & Honest Engineering)
1. **أجهزة الاستشعار في الهاردوير:**
   - شريحة HX711 تعمل بمعدل 80 عينة/ثانية (80 SPS) في وضعها السريع، بينما محاكي العتاد يولد 100 عينة/ثانية (100 Hz). عند الانتقال للهاردوير الفيزيائي، سيتم تعديل معدل الإطارات ليطابق سرعة المحول التناظري الرقمي للـ ADC بدقة.
2. **البيانات الإحصائية ومنحنيات الـ ROC:**
   - تم ترك القيم في شاشة التحليلات كعلامات انتظار (`—`) لعدم الادعاء بأننا قمنا بقياس معدلات الخطأ الحقيقية في المختبر قبل تنفيذ بروتوكول جمع البيانات الميداني (S1–S4).
3. **أمان الرمز المميز للجهاز:**
   - الاتصال بين محاكي الجهاز والـ Gateway يعتمد حالياً على رمز مميز مشترك `x-device-token`. في بيئة الإنتاج الحقيقية، سيتم ترقية هذا البروتوكول إلى Mutual TLS (mTLS) مع تشفير صلب مدعوم بشريحة أمان عتادية.
