# الفصل الرابع: محرك المحاكاة الحسابي الداخلي (Mock Engine)
## Chapter 04: The Mock Engine as the Virtual ESP32 & Kinematic Synthesis

في غياب التوصيل الفيزيائي المباشر بالأسلاك داخل قاعة العرض، كان لزاماً علينا بناء **محرك محاكاة داخلي (In-Browser Mock Engine)** يعمل في ملف `src/mock/engine.ts`. هذا المحرك لا يولد أرقاماً عشوائية بسيطة، بل يعمل بمثابة نظام تشغيل مدمج (Virtual Firmware) يماثل بدقة متناهية سلوك شريحة ESP32 وقوانين الفيزياء الميكانيكية لليد البشرية.

---

### 1. مولد الأرقام شبه العشوائية الحتمي (Mulberry32 PRNG)
لتفادي تذبذب النتائج غير المبرر أثناء العرض التقديمي، يعتمد المحرك على خوارزمية **Mulberry32**:

```typescript
// src/mock/engine.ts (Verified Code Snippet)
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

#### لماذا Mulberry32؟
- خوارزمية فائقة السرعة من 32 بت.
- تتيح إمكانية تكرار نفس سيناريو المحاولة بالضبط عبر تمرير نفس الـ Seed، وهو أمر بالغ الأهمية عند فحص سيناريوهات الهجمات في شاشة `AttackSimulator`.

---

### 2. المراحل الأربعة للحركة الميكانيكية (The 4 Kinematic Phases)
كل محاولة فتح للمقبض تستغرق 2.5 ثانية وتنقسم إلى 4 مراحل زمنية متتالية تأخذ عينات بمعدل 100 هرتز (إجمالي 250 إطاراً لكل محاولة):

1. **المرحلة الأولى S1 (الاقتراب وملامسة الصباع - 0 إلى 0.4 ثانية):**
   - اليد تقترب من المقبض وتلمس وسادة البصمة R503.
   - قوة القبضة تكون عند أدنى مستوياتها (0 إلى 2 نيوتن).
2. **المرحلة الثانية S2 (بناء قوة القبضة - 0.4 إلى 1.0 ثانية):**
   - عضلات راحة اليد (Thenar Muscles) تضغط على المقبض.
   - ترتفع القوة وفق دالة سيجمويد (Sigmoid Ramp-Up) لتصل إلى ذروتها.
3. **المرحلة الثالثة S3 (الدوران الزاوي وعزم اللف - 1.0 إلى 1.8 ثانية):**
   - المعصم يلف المقبض لفتح الخزنة.
   - ترتفع السرعة الزاوية لحساس الجيروسكوب ($\omega_z$) وفق منحنى جاوسي (Gaussian Velocity Profile) مع ظهور تسارع خطي ($a_x, a_y$).
4. **المرحلة الرابعة S4 (الإفلات ورجوع المقبض بالسوستة - 1.8 إلى 2.5 ثانية):**
   - اليد ترخي قبضتها ويعود المقبض لوضعه الأصلي بفعل النابض الميكانيكي الداخلي (Spring-Back).

---

### 3. مصفوفة الميزات الـ 16 بعداً (16-D Feature Vector)
يقوم المحرك باستخراج 16 ميزة رقمية مميزة لسلوك المستخدم:

```typescript
// src/mock/engine.ts (Verified Feature Extraction Snippet)
export function extractFeatures(frames: TelemetryFrame[]): FeatureVector {
  const forces = frames.map(f => f.force);
  const gyros = frames.map(f => Math.abs(f.gyroZ));
  const peakForce = Math.max(...forces);
  const maxAngularVelocity = Math.max(...gyros);
  const timeToPeakForce = frames.find(f => f.force === peakForce)?.timestamp ?? 0;
  // ... حساب باقي الـ 16 خاصية إحصائية وحركية
  return { peakForce, timeToPeakForce, maxAngularVelocity, /* ... */ };
}
```

#### تصنيف الخصائص الـ 16:
- **خصائص قوة القبضة (Grip Force Features):** ذروة القوة (Peak Force)، زمن الوصول للذروة، معدل صعود القوة (Rise Slope)، المساحة تحت المنحنى (AUC)، ومعدل هبوط القوة عند الإفلات.
- **خصائص الدوران والحركة (IMU Features):** أقصى سرعة زاوية (Max Gyro Yaw)، زاوية الدوران الإجمالية، التسارع الزاوي، والرجفان الميكانيكي (Jerk / Jitter).
- **الخصائص الترابطية (Cross-Correlation Features):** الفارق الزمني بين ذروة الضغط وبدء اللف (Lead-Lag Time)، ومعامل الارتباط بين القوة والسرعة الزاوية.

---

### 4. حساب سكور السلوك الحركي بمسافة ماهالانوبيس (Mahalanobis Distance)
لحساب درجة الشبه بين محاولة المستخدم وبصمة المالك المرجعية، لا نستخدم المسافة الإقليدية البسيطة لأن الخصائص الحركية مترابطة ولها مقاييس مختلفة. بدلاً من ذلك، نستخدم **مسافة ماهالانوبيس (Mahalanobis Distance)**:

$$D_M(x) = \sqrt{(x - \mu)^T \Sigma^{-1} (x - \mu)}$$

حيث:
- $x$ هو متجه الخصائص للمحاولة الحالية.
- $\mu$ هو متوسط خصائص المالك الحقيقي المسجلة أثناء المعايرة (Enrollment).
- $\Sigma^{-1}$ هي مقلوب مصفوفة التباين المشترك (Covariance Matrix).

يتم تحويل المسافة $D_M$ إلى سكور نسبي بين 0 و 1 عبر دالة تحويل أسية:

$$s(x) = \exp\left(-\frac{D_M(x)^2}{2 \cdot \sigma_0^2}\right)$$

---

### 5. قاعدة القرار النهائي (Dual-Gate Final Decision)
```typescript
// Dual-Gate Decision Rule
const isAuthorized = gate1Result === true && score >= thresholdTau;
```
- إذا كانت البصمة سليمة و $s(x) \ge \tau$، تكون النتيجة **ACCEPT** ويصدر أمر تنشيط السولينويد.
- إذا فشل أي حارس منهما، تكون النتيجة **REJECT** ويزداد عداد الفشل تلقائياً.
