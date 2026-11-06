# الفصل الخامس: إدارة الحالة وتدفق البيانات (State & Data Flow)
## Chapter 05: Zustand State Management, Real-time Gateway Sync, and Fallback Mock

إدارة الحالة (State Management) هي الجهاز العصبي لتطبيق Thenar. كل حركة فيزيائية على المقبض، كل عينة إشارة تلتقطها الحساسات (Sensors)، وكل قرار أمني يتخذه السيستم، يتم توزيعه وتحديثه لحظياً في واجهة المستخدم عبر مخزن مركزي مبني باستخدام مكتبة **Zustand** في ملف `src/store/useThenarStore.ts`.

مع إضافة طبقة الـ Backend الحقيقية، أصبح المخزن يدعم نمطين متكاملين للعمل:
1. **النمط المتصل (Gateway Online Mode):** الاتصال بخادم الـ Gateway عبر REST API وبروتوكول WebSocket لتلقي البيانات الحقيقية من جهاز الخزنة.
2. **النمط الاحتياطي المستقل (Graceful Mock Fallback):** إذا كان الخادم مغلقاً أو حدث انقطاع في الشبكة، يتحول المتجر تلقائياً ودون أي انهيار إلى المحاكي الداخلي (In-Browser Mock Engine).

---

### 1. أقسام الحالة المركزية (State Slices)
تم تقسيم الحالة منطقياً في `useThenarStore.ts` إلى 7 أقسام متكاملة:

```
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Global Store                     │
├──────────────────────────────┬──────────────────────────────┤
│ 1. Lock & Mechanism Slice    │ 4. Security & Lockout Slice  │
│    (lockState, solenoid,     │    (failureCounter,          │
│     bolt, doorReedOpen)      │     lockoutEndTime, penalty) │
├──────────────────────────────┼──────────────────────────────┤
│ 2. Telemetry & Live Slice    │ 5. Calibration Profile Slice │
│    (currentFrames, phase,    │    (enrolledProfile,         │
│     isSimulating)            │     enrollmentStep)          │
├──────────────────────────────┼──────────────────────────────┤
│ 3. History & Audit Slice     │ 6. Settings & UI Slice       │
│    (attempts[], lastAttempt) │    (tau, theme, lang, sound) │
├──────────────────────────────┴──────────────────────────────┤
│ 7. Backend & Gateway Sync Slice                             │
│    (isGatewayOnline, gatewayMode, syncFromGateway,          │
│     initApiAndWs, simulateScenarioReal)                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. التدفق الحقيقي للبيانات (Real Backend Data Pipeline)
عند تشغيل النظام المتكامل، تسير البيانات في مسار دائري دقيق ومحكم:

```
[ Physical Sensors / ESP32 Device ]
               │  (100 Hz Frames + Attempt Metrics)
               ▼
      [ POST /api/v1/attempts ] OR [ WS /ws/device ]
               │
               ▼
     [ Express Gateway Server ]
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
  [ SQLite WAL DB ] [ Audit Log ] [ WS /ws/live ]
                                       │ (Broadcast)
                                       ▼
                         [ Frontend ws.ts Client ]
                                       │
                                       ▼
                         [ Zustand Store Dispatch ]
                                       │
                                       ▼
                         [ React UI Components ]
```

1. **الالتقاط والقرار على الجهاز (Edge Decision):** متحكم ESP32 أو محاكي العتاد `apps/device-sim` يلتقط إشارات الحساسات، يستخرج السمات الحركية (16 Features)، ويحسب درجة المطابقة السلوكية $s(x)$. القرار الأمني (فتح أو إبقاء الإغلاق) يتخذه الجهاز بنفسه.
2. **إرسال النتائج إلى الخادم (Ingestion):** يرسل الجهاز حمولة `Attempt` إلى Gateway عبر نقطة نهاية `POST /api/v1/attempts`. إذا كانت ميزة `experimentMode` مفعلة، يرسل الجهاز أيضاً إطارات الإشارة الخام (Raw Frames).
3. **الحفظ في قاعدة البيانات (Persistence):** يقوم الخادم بتخزين المحاولة في جدول `attempts` في قاعدة بيانات SQLite مع تحديث حالة القفل في جدول `lock_status` وتسجيل الحدث في `audit_log`.
4. **البث اللحظي عبر WebSocket (Real-time Broadcast):** خادم WebSocket يقوم فوراً بإرسال رسالة من نوع `attempt` أو `status` أو `live_frame` إلى جميع متصفحات الويب المتصلة على قناة `/ws/live`.
5. **تحديث المتجر والواجهة (Reactive UI Update):** يستقبل عميل `ws.ts` في الواجهة الرسالة، فيحدث Zustand State، فتقوم مكونات React (مثل شاشة المراقبة `LiveMonitor` وسجل المحاولات `AttemptLog` والقفل المتحرك `LockCanvas`) بإعادة الرسم فوراً وبسلاسة تامة.

---

### 3. آلية التبديل المرن والاحتياطي (Graceful Mock Fallback)
حرصنا في التصميم على ألا تتوقف واجهة المستخدم إطلاقاً إذا تعطل الخادم أو لم يتم تشغيله. تم تطبيق منطق Fallback ذكي داخل `useThenarStore.ts`:

```typescript
// src/store/useThenarStore.ts (Logic Flow)
async simulateScenario(scenario: string) {
  const { isGatewayOnline } = get();
  
  if (isGatewayOnline) {
    try {
      // 1. محاولة الإرسال للـ Gateway الحقيقي
      const res = await api.demo.simulate(scenario);
      if (res && res.attempt) {
        get().recordAttempt(res.attempt);
        return;
      }
    } catch (err) {
      console.warn('Gateway demo simulation failed, falling back to mock engine', err);
    }
  }

  // 2. Fallback فوري ومحكم: استخدام المحاكي المحلي بدون انقطاع
  runInBrowserMockSimulation(scenario);
}
```

#### كيف يكتشف المتصفح حالة الـ Gateway؟
- عند بدء تشغيل التطبيق في `App.tsx`، يتم استدعاء دالة `initApiAndWs()`.
- تحاول الدالة استدعاء `api.status.get()` والاتصال بـ `ws://localhost:3000/ws/live`.
- إذا رد الخادم، تتحول الشارة العلوية (Header Status Chip) إلى اللون الأخضر الزمرّدي: `Gateway: Online`.
- إذا لم يستجب الخادم (Connection Refused)، يظل التطبيق شغالاً 100% وتتحول الشارة إلى اللون الكهرماني: `Offline Demo Mode`.

---

### 4. آلية الإغلاق الأمني المتصاعد (Escalating Penalty Lockout)
لحماية الخزنة من هجمات التخمين المستمر (Brute-Force Attacks)، يحتوي المتجر ومحاكي العتاد على خوارزمية عقوبة أمنية تتضاعف أسياً:

```typescript
// Verified Lockout Logic Snippet
const newFailures = state.failureCounter + 1;
if (newFailures >= state.maxFailuresBeforeLockout) {
  const penaltyDuration = state.lockoutDurationSeconds * Math.pow(2, state.lockoutRepeatCount);
  const lockoutEndTime = Date.now() + penaltyDuration * 1000;
  return {
    lockState: 'LOCKOUT',
    failureCounter: newFailures,
    lockoutEndTime,
    lockoutRepeatCount: state.lockoutRepeatCount + 1,
  };
}
```

#### شرح الخوارزمية الرياضية:
- في المرة الأولى التي يصل فيها عداد الفشل إلى 5 محاولات خاطئة متتالية، يتم تجميد النظام لمدة 30 ثانية ($30 \times 2^0$).
- إذا عاد المهاجم وكرر 5 محاولات فاشلة أخرى، تتضاعف المدة إلى 60 ثانية ($30 \times 2^1$).
- في المرة الثالثة تصبح 120 ثانية ($30 \times 2^2$)، وتصل إلى 240 ثانية ثم 480 ثانية، وهكذا دواليك.
- في محاكي العتاد `apps/device-sim`، يتم تخزين حالة القفل والعدادات في ملف قرص `.device-state.json` لمحاكاة الذاكرة غير المتطايرة (Non-Volatile Flash) في الـ ESP32؛ فلا يمكن للمهاجم تفادي العقوبة بإعادة تشغيل الجهاز (Power Cycle)!

---

### 5. الحفظ الآمن في الذاكرة المحلية (Debounced LocalStorage Persistence)
لضمان عدم فقدان الإعدادات الشخصية وسجل المحاولات عند تصفح التطبيق في وضع عدم الاتصال، تم دمج آلية حفظ محكمة:

```typescript
// src/store/useThenarStore.ts (Verified Persistence Snippet)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
export function persistStoreState(state: Partial<ThenarState>) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('THENAR_STATE_V1', JSON.stringify(state));
    } catch (err) {
      console.warn('LocalStorage quota exceeded or disabled', err);
    }
  }, 300);
}
```

#### لماذا Debounce و Try/Catch؟
- **الـ Debounce (تأخير 300 مللي ثانية):** أثناء تدفق الإشارات الحركية بمعدل 100 عينة في الثانية، الكتابة المباشرة في القرص مع كل إطار ستؤدي إلى استهلاك غير مبرر للمعالج وبطء المتصفح. لذا يجمع الـ Debounce التعديلات ويكتبها دفعة واحدة بعد استقرار الحالة.
- **الـ Try/Catch:** يحمي التطبيق من الانهيار إذا كان المستخدم يتصفح في وضع التصفح المتخفي (Incognito Mode) الذي يقيد الكتابة في التخزين المحلي، أو إذا امتلأت مساحة التخزين.
