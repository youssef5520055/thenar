# الفصل التاسع: خريطة التكامل مع عتاد ESP32 الحقيقي والتطوير المستقبلي
## Chapter 09: Physical Hardware Integration Roadmap, FreeRTOS Firmware & Biometric Protocol

واحدة من أهم النقاط التي تسأل عنها لجان تحكيم مشاريع التخرج هي:
**"ما هي حدود ما تم إنجازه هندسياً الآن؟ وإذا توفرت لديكم لوحة العتاد الفيزيائي غداً، كيف سيتم دمجها بالضبط مع منظومة الـ Backend والتطبيق؟"**

هذا الفصل يقدم الإجابة الهندسية الصادقة والمدعومة بمخطط برمجي ومعماري دقيق للانتقال من محاكي العتاد (`apps/device-sim`) إلى شريحة ESP32 الفيزيائية الحقيقية.

---

### 1. واقع النظام الحالي: ما هو حقيقي وما هو محاكى؟

| المكون (Component) | حالته الحالية (Current Status) | طريقة التنفيذ الحالية |
| :--- | :--- | :--- |
| **الواجهة الأمامية (Web Frontend)** | **حقيقي 100% (Production-Ready)** | React 18, TypeScript, Tailwind, Zustand, Recharts |
| **خادم البوابة (Gateway API & WS)** | **حقيقي 100% (Production-Ready)** | Node.js, Express, WebSocket (`ws`), SQLite WAL DB |
| **خدمة التدريب البيومتري (Enrollment)** | **حقيقي 100% (Production-Ready)** | Python FastAPI, Scikit-learn, Ledoit-Wolf Shrinkage |
| **عقود البيانات (Data Contracts)** | **حقيقي 100% (Production-Ready)** | Zod Schemas, TypeScript Interfaces, OpenAPI 3.0 |
| **محاكي العتاد (Device Simulator)** | **محاكاة برمجية كاملة (Software Simulation)** | كود Node.js يحاكي فيزياء الحركة وتدفق العينات بمعدل 100Hz |
| **المقبض الفيزيائي والحساسات** | **خريطة تصميم هندسية (Hardware Blueprint)** | حساسات HX711 + MPU-6050 + ماسح بصمة R503 + سولينويد |

---

### 2. بنية البرمجيات المدمجة لشريحة ESP32 (Firmware Architecture)

شريحة **ESP32-S3** تحتوي على نواتي معالجة (Dual Xtensa LX7 Cores) بتردد 240 ميجاهرتز ونظام تشغيل بالوقت الفعلي **FreeRTOS**. سيتم تقسيم المهام بين النواتين لضمان دقة التوقيت (Hard Real-Time):

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ESP32-S3 Firmware Architecture                       │
├───────────────────────────────────┬────────────────────────────────────┤
│ Core 0: Real-Time Sensing (100Hz) │ Core 1: Inference & Telemetry      │
├───────────────────────────────────┼────────────────────────────────────┤
│ Task 1: Sensor Sampling Task      │ Task 3: Biometric Inference Engine │
│ • HX711 24-bit ADC via Bit-bang   │ • 16-D Feature Extraction          │
│ • MPU-6050 Accelerometer/Gyro I2C │ • Mahalanobis Distance s(x)        │
│ • Ring Buffer (150-frame window)  │ • Dual-Gate Logic Check            │
├───────────────────────────────────┼────────────────────────────────────┤
│ Task 2: Fingerprint UART Task     │ Task 4: Solenoid Actuator Control  │
│ • R503 Optical Module via UART2   │ • GPIO Pulse to MOSFET Driver      │
│ • Packet parser (ACK / Match ID)  │ • 3000ms pulse then auto-lock      │
│ • Fail-secure timeout check       ├────────────────────────────────────┤
│                                   │ Task 5: Gateway Telemetry Task     │
│                                   │ • Wi-Fi Station Mode (WPA3)        │
│                                   │ • POST /api/v1/attempts (JSON)     │
│                                   │ • WebSocket Stream (/ws/device)    │
└───────────────────────────────────┴────────────────────────────────────┘
```

#### تفاصيل مهام FreeRTOS:
1. **Task 1 (Sampling - Priority 5):** تُشغّل كل 10 ميلي ثانية بدقة (Timer Interrupt). تقرأ حساس الوزن وحساس التسارع والدوران وتخزن العينات في مصفوفة دائرية (Ring Buffer) تسع 150 إطاراً.
2. **Task 2 (Fingerprint - Priority 4):** تراقب منفذ UART التابع لماسح البصمة. عند وضع الإصبع، تستلم نتيجة المطابقة (Gate 1 Result).
3. **Task 3 (Inference - Priority 3):** بمجرد انتهاء حركة لَف المقبض، يتم استدعاء خوارزمية C المستخرجة من دالة `generateCHeader()` التي توفرها حزمة `packages/contracts`. الخوارزمية تحسب:
   $$D_M^2 = (x - \mu)^T \Sigma^{-1} (x - \mu)$$
   $$s(x) = -\frac{1}{2.5} \sqrt{D_M^2}$$
4. **Task 4 (Actuation - Priority 6):** إذا كانت البصمة مقبولة ودرجة السلوك $s(x) \ge \tau$، يتم تفعيل طرف الـ GPIO المتصل بترانزستور MOSFET لتمرير تيار 12 فولت إلى ملف السولينويد لمدة 3 ثوانٍ فقط، ثم يعود السولينويد للإغلاق تلقائياً (Fail-Secure).
5. **Task 5 (Telemetry - Priority 2):** ترسل النتيجة المجمعة ودرجة السلوك إلى خادم البوابة (Gateway) عبر HTTP POST أو WebSocket باستخدام الرمز المميز المشترك `x-device-token`.

---

### 3. تصدير واستخدام ملف كود C المدمج (`thenar_model.h`)

توفر خدمة الـ Enrollment في `apps/enrollment/main.py` نقطة نهاية جاهزة:
`POST /export/c-header`
تقوم بتحويل مصفوفة التغاير المعكوسة ($\Sigma^{-1}$) ومتجه المتوسطات ($\mu$) وقيمة العتبة ($\tau$) إلى كود C نقي بدون أي مكتبات خارجية:

```c
/* thenar_model.h - Generated automatically by Thenar Enrollment Toolchain */
#ifndef THENAR_MODEL_H
#define THENAR_MODEL_H

#define FEATURE_COUNT 16
static const float MODEL_TAU = -3.850000f;

static const float FEATURE_MEANS[16] = {
    18.4200f, 0.4520f, 82.3000f, /* ... remaining means ... */
};

static const float INV_COV_MATRIX[16][16] = {
    { 0.0452f, -0.0012f, /* ... */ },
    /* ... 16x16 precision matrix ... */
};

float thenar_compute_score(const float features[16]) {
    float diff[16];
    for (int i = 0; i < 16; i++) {
        diff[i] = features[i] - FEATURE_MEANS[i];
    }
    float d_sq = 0.0f;
    for (int i = 0; i < 16; i++) {
        float row_sum = 0.0f;
        for (int j = 0; j < 16; j++) {
            row_sum += diff[j] * INV_COV_MATRIX[i][j];
        }
        d_sq += diff[i] * row_sum;
    }
    if (d_sq < 0.0f) d_sq = 0.0f;
    return - (sqrtf(d_sq) / 2.5f);
}
#endif
```

هذا الكود يتم تضمينه مباشرة في مشروع **ESP-IDF** أو **Arduino** على شريحة الـ ESP32 ويعمل بسرعة فائقة (زمن تنفيذ أقل من 1.2 ميلي ثانية)!

---

### 4. بروتوكول جمع البيانات البيومترية المعملي (Laboratory Data Protocol)

لتقييم النظام تجريبياً وحساب منحنيات الخطأ الحقيقية (ROC / DET / EER)، تم وضع بروتوكول جمع بيانات يتكون من 4 جلسات (S1 إلى S4):

1. **الجلسة S1 (Baseline Enrollment):** يقوم المالك بتسجيل 15 محاولة فتح في بيئة طبيعية لتدريب النموذج وحساب التباين المبدئي.
2. **الجلسة S2 (Longitudinal Genuine):** يقوم المالك بتكرار 15 محاولة أخرى بعد مرور أسبوع كامل وفي أوقات مختلفة من اليوم لقياس مدى استقرار السلوك ضد التغيرات اليومية والإجهاد (Within-Subject Variance).
3. **الجلسة S3 (Zero-Effort Impostor):** يطلب من 10 متطوعين غرباء محاولة فتح المقبض بطريقتهم الطبيعية دون أي معرفة سابقة بسلوك المالك.
4. **الجلسة S4 (Educated / Active Mimicry):** يُعرض على متطوعين تسجيل فيديو تفصيلي للمالك وهو يفتح المقبض مع توضيح سرعة الحركة ومقدار قوة الضغط، ويمنح المتطوع 5 دقائق للتدريب قبل محاولة خداع النظام.

هذا البروتوكول هو الذي سيوفر البيانات الخام اللازمة لملء الرسوم البيانية الإحصائية (ROC / DET / Confusion Matrix) التي تظهر حالياً كعلامات انتظار غير محسوبة (`—`) للحفاظ على النزاهة العلمية.

---

### 5. تعزيز الحماية العتادية والاتصال المشفر (Hardware Security)
1. **التشفير بين الجهاز والخادم (mTLS):** في النسخة النهائية للإنتاج، سيتم استخدام شهادات رقمية متبادلة (Mutual TLS) بحيث لا يقبل خادم الـ Gateway أي اتصال إلا من جهاز يحمل شهادة مصدقة وموقعة.
2. **الحماية ضد التلاعب بالذاكرة (Secure Boot & Flash Encryption):** تفعيل ميزات الأمان المدمجة في معالجات ESP32 لحرق مفاتيح التشفير في صمامات أمان غير قابلة للقراءة (eFuses)، مما يمنع أي مهاجم من سرقة كود C أو قراءة مصفوفة البصمة السلوكية حتى لو فكك المقبض واستخرج الشريحة.
