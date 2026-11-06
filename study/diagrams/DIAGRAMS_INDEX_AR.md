# دليل ومفهرس المخططات الهندسية الشاملة لمشروع Thenar
# Engineering Diagrams Index & Defense Reading Guide (34 Authoritative Diagrams)

أهلاً بك في مكتبة المخططات الهندسية الشاملة لمشروع **Thenar**. تم تصميم هذه المخططات الـ 34 بدقة هندسية فائقة لتغطي كل ركن في المشروع: الواجهة الأمامية، مخزن الحالة، خادم البوابة وقواعد البيانات، خوارزميات الذكاء الاصطناعي، محاكي العتاد، والهندسة المدمجة لشريحة ESP32.

تتوفر جميع المخططات بثلاث صيغ متوافقة داخل مجلد `study/diagrams/`:
1. `diagrams/mermaid/`: الكود المصدري الأصلي بصيغة Mermaid (`.mmd`).
2. `diagrams/svg/`: رسومات متجهة فائقة الدقة (`.svg`) قابلة للتكبير اللانهائي دون أي فقدان للجودة.
3. `diagrams/png/`: صور نقطية عالية الدقة 2x جاهزة للعرض في شرائح PowerPoint والمستندات.

---

### جدول فهرس المخططات الهندسية الكامل (34 مخططاً موثقاً)

| # | اسم المخطط (File Name) | ماذا يوضح؟ (Description) | الملفات المرتبطة بالكود (Code Mapping) | كيف تقرأ المخطط في المناقشة؟ (Reading Guide) |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `01_system_context.svg` | سياق النظام العام والفرق بين الهاردوير الحقيقي ومحاكي المتصفح. | `src/App.tsx`<br/>`src/mock/engine.ts` | ابدأ من المستخدم ووضح كيف يعمل التطبيق بنمطين: متصل بالخادم أو محاكي محلي. |
| **02** | `02_hardware_software_mapping.svg` | الربط بين قطع العتاد الحقيقية والوحدات البرمجية المقابلة لها في الكود. | `packages/engine/src/index.ts`<br/>`src/store/useThenarStore.ts` | اشرح لكل قطعة عتاد (Load Cell, IMU, R503, Solenoid, Reed) المتغير والمصفوفة التي تمثلها. |
| **03** | `03_frontend_architecture.svg` | معمارية الواجهة الأمامية كطبقات متسلسلة (Pages → Components → Store → API). | `src/pages/*`<br/>`src/components/*`<br/>`src/store/*` | اقرأ من أعلى لأسفل: الصفحات تطلب المكونات، والكل يشترك في مخزن Zustand المركزي. |
| **04** | `04_folder_structure.svg` | شجرة المجلدات الحقيقية للمشروع ووظيفة كل حزمة ومجلد. | هيكل المستودع الموحد (Monorepo) | بين للجنة نظافة تنظيم الكود المعياري وفق معمارية Monorepo Workspaces. |
| **05** | `05_route_map.svg` | خريطة المسارات السبعة (Routes) في الـ HashRouter والمكونات المسؤولة عنها. | `src/App.tsx`<br/>`src/pages/*.tsx` | وضح سبب اختيار HashRouter لضمان عمل التطبيق بدون أخطاء 404 على أي استضافة. |
| **06** | `06_component_tree.svg` | شجرة المكونات وتدفق الـ Props والـ Callbacks بين عناصر الواجهة. | `src/components/*` | يوضح احتواء App.tsx للهيكل العام وتفرع الصفحات والكروت والرسوم البيانية. |
| **07** | `07_state_management.svg` | إدارة الحالة بـ Zustand، تقسيم الـ State Slices، والتخزين المؤجل في الذاكرة. | `src/store/useThenarStore.ts` | اشرح آلية Debounced Persistence لمنع تجمد المتصفح أثناء تدفق البيانات السريع. |
| **08** | `08_end_to_end_data_flow.svg` | تدفق البيانات الشامل من بدء لمس المقبض حتى اتخاذ القرار وتحديث القفل. | `packages/engine/src/index.ts`<br/>`src/store/useThenarStore.ts` | المخطط المفضل للجنة: تتبع الإشارة الخام ← استخراج الميزات ← حساب المسافة ← قرار الفتح. |
| **09** | `09_mock_engine_internals.svg` | المحرك الحسابي الداخلي (Mulberry32 PRNG، مراحل الحركة S1-S4، والمعادلات). | `packages/engine/src/index.ts` | يثبت أن المحاكاة مبنية على معادلات فيزيائية حقيقية وأخذ عينات بـ 100 هرتز. |
| **10** | `10_seq_successful_unlock.svg` | مخطط تسلسلي لمحاولة فتح ناجحة للمالك الأصلي (Dual-Gate ACCEPT). | `packages/engine/src/index.ts`<br/>`src/store/useThenarStore.ts` | تتبع التتابع الزمني: البصمة صح ← السلوك الحركي مقبول ← السولينويد ينشط لـ 3 ثوانٍ. |
| **11** | `11_seq_failed_and_lockout.svg` | مخطط تسلسلي لمحاولة فاشلة ودخول النظام في وضع الإغلاق الأمني المتصاعد. | `src/store/useThenarStore.ts`<br/>`apps/device-sim/src/state.ts` | اشرح تضاعف فترة العقوبة أسياً ($30 \times 2^n$) لمنع هجمات التخمين المستمر. |
| **12** | `12_seq_sensor_fault.svg` | مخطط تسلسلي لحالة عطل أو فصل الحساسات وكيفية تطبيق مبدأ Fail-Secure. | `packages/engine/src/index.ts`<br/>`src/components/LockMechanismSVG.tsx` | وضح مبدأ الأمان في وضع الإغلاق: إذا فصل حساس يرفض الجهاز الفتح فوراً. |
| **13** | `13_lock_state_machine.svg` | آلة الحالة المنتهية للقفل الإلكتروني (LOCKED, UNLOCKED, LOCKOUT, FAULT). | `packages/contracts/src/index.ts`<br/>`apps/device-sim/src/state.ts` | اشرح الحالات الست للقفل والانتقالات والشروط المنطقية المسببة لكل انتقال. |
| **14** | `14_enrollment_flow.svg` | مسار معايرة وتسجيل بصمة المالك الحركية عبر خطوات المعايرة. | `src/pages/EnrollmentProfile.tsx` | وضح كيف يتم تدريب النموذج بحساب المتوسطات ومصفوفة التباين للخصائص الـ 16. |
| **15** | `15_attack_simulator_flow.svg` | مسار محاكي الهجمات وكيف يصد الحارس الثاني محاولات الاختراق. | `src/pages/AttackSimulator.tsx` | اشرح صد هجمات قوالب السيليكون عبر مقارنة منحنى المهاجم بنطاق ثقة المالك. |
| **16** | `16_attempt_log_replay_flow.svg` | مسار سجل المحاولات وميزة إعادة تشغيل الإشارة الحركية إطاراً بإطار. | `src/pages/AttemptLog.tsx`<br/>`src/components/LiveChart.tsx` | بين إمكانية إعادة تشغيل الإشارة بـ 150 إطاراً كاملاً وتتبع القوة والعزم لحظياً. |
| **17** | `17_notification_system.svg` | بنية نظام الإشعارات الفورية والتنبيهات الملونة حسب درجة الخطورة. | `src/components/Header.tsx`<br/>`src/store/useThenarStore.ts` | يوضح تدفق الإشعارات مع أصوات مميزة وتلوين بصري طبقا للحالة. |
| **18** | `18_i18n_rtl_architecture.svg` | بنية دعم اللغتين (العربية والإنجليزية) وانعكاس الواجهة التلقائي RTL. | `src/i18n/*`<br/>`src/components/Header.tsx` | اشرح دعم الاتجاهين مع الاحتفاظ بالأرقام الغربية ومحاور الرسوم البيانية سليمة. |
| **19** | `19_theme_orb_animation_pipeline.svg` | خط أنابيب المؤثرات البصرية، ألوان Lagoon، وفيزياء كرة الـ Stipple Orb. | `src/components/StippleOrb.tsx`<br/>`src/index.css` | اشرح معادلات توزيع 450 نقطة كروية بـ Fibonacci وحسابات القصور الذاتي. |
| **20** | `20_analytics_placeholders_map.svg` | خريطة التحليلات البيانية والمؤشرات الإحصائية ومعدل الخطأ المتساوي EER. | `src/pages/Analytics.tsx` | اشرح أمانة التوثيق وعرض شرطات حيادية للبيانات التي تنتظر القياس الميداني. |
| **21** | `21_build_and_run_pipeline.svg` | خط أنابيب البناء والتشغيل من الكود المصدري حتى الحزمة المجمعة للإنتاج. | `package.json`<br/>`vite.config.ts` | وضح دور TypeScript و Vite و Rollup في فحص الأنواع وضغط الملفات إلى dist/. |
| **22** | `22_future_integration_architecture.svg` | الرؤية المعمارية للربط المستقبلي مع العتاد الفيزيائي عبر بروتوكولات الشبكة. | `docs/ARCHITECTURE.md` | يوضح كيف يحل خادم الـ ESP32 محل محاكي العتاد دون تعديل في كود الواجهة. |
| **23** | `23_big_picture_poster.svg` | بوستر الماستر الهندسي الشامل الذي يجمع كافة مفاهيم المنظومة. | يجمع كل ملفات ومفاهيم المشروع | المرجع البانورامي الشامل لافتتاح المناقشة وشرح الفكرة في لوحة واحدة. |
| **24** | `24_backend_architecture.svg` | المعمارية الشاملة للـ Backend والخدمات المصغرة وقواعد البيانات. | `apps/gateway/*`<br/>`apps/enrollment/*`<br/>`apps/device-sim/*` | اشرح تكامل خادم Express وقاعدة SQLite وخدمة Python FastAPI ومحاكي العتاد. |
| **25** | `25_database_er.svg` | مخطط العلاقات الكينونية (ER Diagram) لجداول قاعدة بيانات SQLite الثمانية. | `apps/gateway/src/db.ts` | وضح العلاقات بين الجداول: الأجهزة، حالة القفل، المحاولات، الإطارات، وسجل التدقيق. |
| **26** | `26_request_lifecycle_attempts.svg` | مخطط تسلسلي لدورة حياة طلب تسجيل محاولة جديدة `POST /api/v1/attempts`. | `apps/gateway/src/routes/attempts.ts` | تتبع فحص الرمز المميز ← تدقيق Zod ← المعاملة الذرية في SQLite ← بث الـ WebSocket. |
| **27** | `27_live_streaming_ws.svg` | مخطط تسلسلي لبث الإطارات بـ 100Hz عبر قناة الـ WebSocket المزدوجة. | `apps/gateway/src/ws.ts`<br/>`src/api/ws.ts` | بين كيف يتم تمرير الإطارات في الذاكرة دون إرهاق القرص الصلب نهائياً. |
| **28** | `28_enrollment_pipeline_python.svg` | خط أنابيب تدريب النموذج البيومتري وانكماش التغاير بليدوا-وولف وتصدير كود C. | `apps/enrollment/*`<br/>`packages/contracts/src/index.ts` | اشرح استقرار المصفوفات بـ Ledoit-Wolf ومعايرة العتبة التلقائية بـ LOO. |
| **29** | `29_device_state_machine_lockout.svg` | آلة الحالة الدقيقة لمحاكي العتاد والذاكرة غير المتطايرة والعقوبة المتصاعدة. | `apps/device-sim/src/state.ts`<br/>`apps/device-sim/src/simulator.ts` | اشرح حفظ حالة القفل في ملف القرص لمنع تفادي العقوبة بإعادة التشغيل. |
| **30** | `30_data_contract_classes.svg` | مخطط الفئات والواجهات البرمجية المشتركة في حزمة العقود الموحدة. | `packages/contracts/src/index.ts` | بين كائنات Device, LockStatus, Attempt, Frame, Settings ودورها كمصدر موحد للحقيقة. |
| **31** | `31_fallback_logic_resilience.svg` | خريطة تدفق القرار للتبديل الاحتياطي المرن بين خادم الـ Gateway ومحاكي المتصفح. | `src/store/useThenarStore.ts`<br/>`src/api/client.ts` | اشرح كيف يكتشف المتصفح حالة الخادم ويتحول تلقائياً للوضع الاحتياطي دون أي انهيار. |
| **32** | `32_deployment_topology_ports.svg` | خريطة المنافذ والشبكة ونشر المنظومة عبر حاويات Docker Compose. | `docker-compose.yml`<br/>`.env.example` | وضح توزيع المنافذ: 5173 للواجهة، 3000 للبوابة، و 8000 لخدمة التعلم الآلي. |
| **33** | `33_test_strategy_pyramid.svg` | هرم استراتيجية الاختبار: اختبارات الوحدة، المتجهات الذهبية، والتكامل الشامل. | `packages/engine/src/engine.test.ts`<br/>`apps/gateway/src/gateway.test.ts` | وضح فحص المتجهات الذهبية لتطابق حسابات TypeScript مع Python حتى 6 خانات عشرية. |
| **34** | `34_future_esp32_firmware_integration.svg` | المعمارية البرمجية للبرنامج المدمج لشريحة ESP32-S3 ومهام FreeRTOS الخمس. | `docs/ARCHITECTURE.md`<br/>الفصل 09 | بين تقسيم نواتي المعالجة: نواة متفرغة للحساسات ونواة لحساب المسافة والشبكة والسولينويد. |

---

### نصائح عرض المخططات أمام لجنة التحكيم (Defense Strategy)

1. **افتتاح العرض:** اعرض **المخطط 23 (The Big Picture)** أو **المخطط 24 (Backend Architecture)** لتقديم نظرة بانورامية على تكامل المنظومة.
2. **عند السؤال عن أمان البصمة:** افتح **المخطط 08 و المخطط 15** واشرح كيف ترفض البوابة الثانية قوالب السيليكون بفضل مسافة ماهالانوبيس.
3. **عند السؤال عن استقلالية الجهاز (Edge Decision):** افتح **المخطط 26 و المخطط 34** وأكد أن العتاد يتخذ القرار محلياً قبل مراسلة الخادم.
4. **عند السؤال عن صمود النظام أمام انقطاع السيرفر:** افتح **المخطط 31** واشرح التبديل الاحتياطي المرن (Graceful Fallback).
5. **عند السؤال عن دقة وتطابق الحسابات الرياضية:** افتح **المخطط 33** واشرح اختبار المتجهات الذهبية (Golden Vector Test).
