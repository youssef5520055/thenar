# الفصل 04: خادم البوابة المركزي (Gateway Service)
## Chapter 04: The Express & TypeScript Gateway Architecture

في الإصدار السابق من المشروع (Demo)، كان المتصفح يقوم بكل شيء بمفرده عبر محاكي داخلي. لكن في الأنظمة الهندسية الحقيقية لإنترنت الأشياء (IoT)، المقبض يحتاج إلى جهة مركزية تسجل المحاولات، وتبث الإشارات الحية، وتخزن الإعدادات، وتتولى تدريب النماذج الرياضية أوفلاين. هذه هي وظيفة **خادم البوابة (Thenar Gateway)** الموجود في `apps/gateway`.

---

### 1. ما هو الـ Gateway ولماذا نحتاجه؟
الـ Gateway هو خادم وسيط مبني بـ **Node.js + Express + TypeScript**، ويعمل على المنفذ `3000`.
- **لماذا ليس مجرد سيرفر عادي؟**
  لأنه يجمع بين نمطين من الاتصال:
  1. **REST API (HTTP):** لجلب سجل المحاولات السابقة، والإعدادات، وتصدير التقارير (CSV / JSON).
  2. **WebSocket (WS):** لبث الإشارات الحركية الحية بتردد 100 هرتز من المقبض إلى المتصفح بدون أي تأخير زمني (Real-Time Low Latency Streaming).

> **مبدأ الأمان الأهم (Safety Rule #1):**
> الـ Gateway **لا يتخذ أبداً** قرار فتح الخزنة! قرار فتح الخزنة يتخذه معالج المقبض (ESP32) محلياً فقط (On-Device Dual-Gate Decision). الـ Gateway يقتصر دوره على التوثيق، والتخزين، والبث للمالك. حتى لو انهار الـ Gateway أو انقطع كابل الشبكة، الخزنة تظل تعمل بكفاءة وتبقى مقفولة بأمان!

---

### 2. دورة حياة الطلب خطوة بخطوة (Request Lifecycle)
عندما يرسل جهاز الـ ESP32 أو المتصفح طلباً للـ Gateway (مثلاً: `POST /api/v1/attempts`):

```
الطلب (Request)
      │
      ▼
┌────────────────────────────────────────┐
│ 1. طبقة الأمان (Helmet & CORS)         │ ──[فشل]──► رفض الطلب (Blocked)
└────────────────────────────────────────┘
      │ [نجاح]
      ▼
┌────────────────────────────────────────┐
│ 2. الـ Middleware: التحقق من التوكن    │ ──[توكن خاطئ]──► خطأ 401 Unauthorized
│    (Timing-Safe Token Comparison)      │
└────────────────────────────────────────┘
      │ [مصرح به]
      ▼
┌────────────────────────────────────────┐
│ 3. التحقق من العقد (Zod Validation)    │ ──[بيانات ناقصة]──► خطأ 400 Bad Request
│    (AttemptSchema.safeParse)           │
└────────────────────────────────────────┘
      │ [سليم]
      ▼
┌────────────────────────────────────────┐
│ 4. المعالج (Route Handler)             │
│    • كتابة المحاولة في قاعدة SQLite   │
│    • توليد إشعار فوري (Notification)  │
│    • بث القرار لـ /ws/live للواجهة     │
└────────────────────────────────────────┘
      │
      ▼
الرد بنجاح (201 Created JSON)
```

---

### 3. جولة داخل مجلدات الـ Gateway (`apps/gateway/src`)

- `config.ts`: قراءة متغيرات البيئة (`PORT`, `DEVICE_TOKEN`, `DB_PATH`) مع قيم افتراضية آمنة.
- `logger.ts`: تسجيل أحداث النظام عبر مكتبة **Pino** المتطورة بتنسيق ملون وسريع.
- `db.ts`: الاتصال بقاعدة بيانات SQLite عبر `better-sqlite3` وتفعيل وضع **WAL (Write-Ahead Logging)** لمنع تعارض القراءة والكتابة.
- `seed.ts`: بذر 42 محاولة واقعية موزعة على جلسات S1–S4 عند تشغيل النظام لأول مرة.
- `ws.ts`: خادم الـ WebSocket المسؤول عن إدارات الاتصالات الحية (`/ws/live` للمتصفح و `/ws/device` للمقبض).
- `middleware/auth.ts`: دالة وسيطة تتحقق من هيدر `x-device-token` بمقارنة آمنة زمنياً (`crypto.timingSafeEqual`) لمنع هجمات التخمين الجانبية (Timing Attacks).
- `routes/`: المسارات البرمجية التسعة (Status, Attempts, Settings, Profile, Notifications, Export, Demo, Analytics).

---

### 4. أمثلة عملية لنقاط الاتصال (Endpoints with Real JSON)

#### 1. جلب حالة النظام (`GET /api/v1/status`)
**الرد (Response 200 OK):**
```json
{
  "device": {
    "deviceId": "thenar_esp32_dev_01",
    "firmwareVersion": "v1.0.0-esp32",
    "wifiSsid": "Thenar-Safe-Net",
    "rssi": -58,
    "ip": "192.168.4.1",
    "uptimeSec": 7200,
    "online": true
  },
  "lock": {
    "door": "closed",
    "bolt": "extended",
    "solenoid": "off",
    "state": "idle",
    "failureCount": 0,
    "lockoutUntil": null
  }
}
```

#### 2. تسجيل محاولة جديدة من المقبض (`POST /api/v1/attempts`)
**الترويسة (Headers):** `x-device-token: thenar-device-secret-2026`  
**البيانات (Request Body):**
```json
{
  "id": "att_manual_01",
  "sessionId": "sess_lab_01",
  "ts": 1730840000000,
  "fingerprint": { "result": "accept", "templateId": 1 },
  "score": -2.35,
  "tau": -3.85,
  "decision": "accept",
  "failureCounterAfter": 0,
  "durations": {
    "touchMs": 380,
    "timeToPeakForceMs": 840,
    "rotationMs": 620,
    "totalMs": 2150
  },
  "featureDeviations": [],
  "flags": ["normal_unlock"],
  "role": "genuine"
}
```
**الرد (Response 201 Created):**
```json
{
  "success": true,
  "id": "att_manual_01"
}
```
مجرد استلام هذه المحاولة، يقوم الـ Gateway فوراً بتخزينها، وتحديث عداد الفشل، وإرسال إشعار فوري لجميع شاشات المتصفح المفتوحة عبر WebSocket!
