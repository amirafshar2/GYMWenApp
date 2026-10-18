# اتصال سیستم گیت / دستبند به سایت باشگاه (API نسخهٔ ۱)

این سند برای **شرکت پشتیبان سیستم گیت/ترنستایل باشگاه** است. سایت مستقل از برند گیت طراحی شده و سه روش اتصال دارد؛ شرکت گیت هر کدام را که سیستمش پشتیبانی می‌کند انتخاب کند.

| روش | کی مناسب است | مسیر |
|---|---|---|
| ۱. پرسش آنلاین | گیت هنگام زدن دستبند از سرور می‌پرسد | `POST /api/v1/access/check` |
| ۲. فهرست سفید | گیت آفلاین تصمیم می‌گیرد و هر چند دقیقه فهرست را می‌گیرد | `GET /api/v1/access/whitelist` |
| ۳. رویدادهای آفلاین | گیت در قطعی اینترنت ورودها را نگه می‌دارد و بعداً می‌فرستد | `POST /api/v1/access/events` |
| ۴. وب‌هوک (برعکس) | نرم‌افزار گیت می‌خواهد از تغییر عضویت‌ها باخبر شود | سایت به آدرس شما POST می‌کند |

## احراز هویت دستگاه
هر گیت یک کلید جدا دارد که مدیر سایت می‌سازد (فقط هش آن در سرور ذخیره می‌شود). در همهٔ درخواست‌ها:
```
X-Device-Key: <کلید گیت>
```
کلید اشتباه ← `401`. هر کلید به یک **شعبه** و یک **سالن** (آقایان، بانوان یا مشترک) وصل است. سقف: ۶۰۰ درخواست در دقیقه برای هر گیت. فقط HTTPS.

## ۱) پرسش آنلاین
```http
POST /api/v1/access/check
Content-Type: application/json
X-Device-Key: ...

{ "credential": "04A1B2C3", "eventId": "gate1-000123", "occurredAtUtc": "2026-10-16T08:30:00Z" }
```
- `credential`: UID دستبند/کارت (با یا بدون `:` و فاصله، حروف کوچک یا بزرگ) **یا** متن QR کارت دیجیتال عضو که با `KG1:` شروع می‌شود.
- `eventId` (اختیاری ولی توصیه‌شده): شناسهٔ یکتای همین زدن کارت. اگر همان رویداد دوباره ارسال شود، دوبار ثبت و جلسه دوبار کم نمی‌شود.
- `occurredAtUtc` (اختیاری): برای رویداد آفلاین؛ خالی یعنی همین حالا.

پاسخ:
```json
{ "allowed": true, "reason": "ok", "message": "خوش آمدی کاوه", "memberFirstName": "کاوه",
  "daysLeft": 63, "sessionsLeft": null, "sessionCounted": false }
```
`reason` یکی از: `ok`، `unknown_credential`، `credential_revoked`، `no_active_membership`، `wrong_branch`، `wrong_section`، `no_sessions_left`. متن `message` فارسی و آمادهٔ نمایش روی صفحهٔ گیت است.

قوانین تصمیم: عضویت فعال در **همان شعبه** (قابل تغییر با `Access:AllowAllBranches`) و **همان سالن**. در پکیج‌های جلسه‌ای، اولین ورود هر روز (به وقت تهران) یک جلسه کم می‌کند؛ ورود دوباره در همان روز رایگان است.

## ۲) فهرست سفید
```http
GET /api/v1/access/whitelist
```
```json
{ "generatedAtUtc": "...", "branch": "ghoddousi-gharbi", "section": "both",
  "entries": [ { "credential": "KG1:4D9F...", "type": "qr", "memberId": 15, "validUntilUtc": "...", "sessionsLeft": null },
               { "credential": "04A1B2C3", "type": "wristband", "memberId": 15, "validUntilUtc": "...", "sessionsLeft": null } ] }
```
هر ۵ دقیقه یک‌بار دریافت شود. هرچه در فهرست نیست مجاز نیست.

## ۳) رویدادهای آفلاین
`POST /api/v1/access/events` با آرایه‌ای از همان بدنهٔ `check` (حداکثر ۵۰۰ مورد). همهٔ ورودها در گزارش حضور و غیاب ثبت می‌شوند.

## ۴) وب‌هوک (سایت ← نرم‌افزار گیت)
اگر `Integrations:Webhook:Url` و `Secret` تنظیم شود، سایت این رویدادها را می‌فرستد:

| رویداد | زمان |
|---|---|
| `membership.activated` | پرداخت موفق (شامل `memberId`، `branchId`، `section`، `startsAtUtc`، `endsAtUtc`، `qr`) |
| `credential.assigned` / `credential.revoked` | پذیرش دستبند داد/پس گرفت (شامل `credential` و `externalRef`) |

هدرها: `X-KG-Event`، `X-KG-Delivery` (شناسهٔ یکتا؛ برای جلوگیری از پردازش دوباره)، `X-KG-Timestamp`، `X-KG-Signature: sha256=<hex>`.
امضا = `HMAC-SHA256(secret, timestamp + "." + body)`؛ گیرنده باید امضا را بررسی کند و رویدادهای قدیمی‌تر از ۵ دقیقه را رد کند.
پاسخ غیر 2xx = تلاش دوباره با فاصلهٔ افزایشی (تا ۲۰ بار).

## پذیرش: دادن دستبند به عضو
(نیازمند نقش پذیرش یا مدیر؛ رابط کاربری در پنل پذیرش)
```
GET    /api/v1/staff/members/{userId}/credentials
POST   /api/v1/staff/members/{userId}/credentials   { "type": "wristband|card|external", "value": "04A1B2C3", "label": "...", "externalRef": "شناسهٔ عضو در نرم‌افزار گیت" }
DELETE /api/v1/staff/members/{userId}/credentials/{id}
```

## تست سریع در نسخهٔ نمایشی
در حالت Development یک گیت نمایشی برای شعبهٔ اول با کلید `demo-gate-key-0001` ساخته می‌شود:
```bash
curl -X POST http://localhost:5180/api/v1/access/check \
  -H "X-Device-Key: demo-gate-key-0001" -H "Content-Type: application/json" \
  -d '{"credential":"KG1:<توکن کارت از پروفایل>"}'
```

## اگر سیستم گیت هیچ‌کدام از این‌ها را پشتیبانی نکند
یک «آداپتور» کوچک (`IIntegrationSink` در `src/GymPlatform.Api/Integrations`) برای API همان سیستم نوشته می‌شود؛ بقیهٔ سایت تغییری نمی‌کند. برای این کار از شرکت گیت لازم است: مستند API یا SDK، روش احراز هویت، و یک دستگاه یا محیط تست.
