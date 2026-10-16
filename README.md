# پلتفرم آنلاین مجموعه باشگاه‌های خشایار شیراز

- **فاز ۱:** سایت عمومی با هیروی اسکرولی، نقشهٔ «نزدیک‌ترین شعبه»، پکیج‌ها با تخفیف جشنواره و فرم مشاوره.
- **فاز ۴:** پنل کارکنان — داشبورد مدیر (درآمد ۱۲ شعبه به تفکیک منبع، نرخ تمدید، در آستانهٔ پایان، اثر جشنواره، اکسل)، پذیرش با اسکنر/دوربین/دستبند، پنل مربی (برنامهٔ تمرین و تغذیه، وزن)، مدیریت قیمت، جشنواره، کد تخفیف، قرارداد، انبار، منوی بوفه و کارکنان، پیامک خودکار، حالت پرزنت.
- **فاز ۳:** شاپ خشایار (مکمل، پوشاک و لوازم، موجودی هر شعبه)، منوی بوفه با QR و تابلوی لحظه‌ای (SignalR)، کیف پول، صفحهٔ جشنواره، اتصال به گیت/دستبند.
- **فاز ۲:** ورود با موبایل و کد پیامکی، ثبت‌نام آنلاین چندمرحله‌ای، قرارداد دیجیتال + فرم سلامت با امضای پیامکی، پرداخت (درگاه آزمایشی)، فاکتور PDF، کارت عضویت QR و پروفایل.

## ساختار (سه‌لایه، .NET 10)

```
KhashayarGym.slnx
src/
  KhashayarGym.Domain       موجودیت‌ها و Enumها
  KhashayarGym.DataAccess   EF Core، DbContext، Repository، Migration، دادهٔ نمونه (Seed/*.json)
  KhashayarGym.Business     سرویس‌ها، DTOها، اعتبارسنجی FluentValidation، قیمت‌گذاری
  KhashayarGym.Api          Web API، امنیت، کش، سرو کردن فرانت از wwwroot
  KhashayarGym.Web          React + Vite + TypeScript + Tailwind v4 (بیلد → Api/wwwroot)
tests/KhashayarGym.Tests    تست‌های xUnit (Business) و یکپارچه (WebApplicationFactory)
src/KhashayarGym.Web/e2e    تست‌های Playwright
scripts/                    ساخت فریم ویدیوی هیرو، خروجی پرتفولیو
```

## پیش‌نیازها
- .NET SDK 10
- Node.js 22 یا جدیدتر
- SQL Server LocalDB (همراه Visual Studio) — یا بدون آن با SQLite (پایین‌تر)
- ffmpeg (فقط برای ساخت فریم‌های ویدیوی هیرو)

## اجرا در Visual Studio (یک کلیک)
1. `KhashayarGym.slnx` را در Visual Studio باز کنید.
2. پروژهٔ آغازین (Startup) را `KhashayarGym.Api` بگذارید.
3. در نوار بالا، پروفایل **Demo (SQLite)** را انتخاب کنید و دکمهٔ ▶ را بزنید.
مرورگر روی http://localhost:5180 باز می‌شود؛ دیتابیس دمو (فایل `khashayar-demo.db`) خودکار ساخته می‌شود و نیازی به SQL Server نیست.

## اجرا (سریع‌ترین راه برای دمو — SQLite)
در PowerShell از ریشهٔ پروژه:

```powershell
cd src\KhashayarGym.Web
npm install
npm run build            # خروجی داخل src\KhashayarGym.Api\wwwroot

cd ..\KhashayarGym.Api
$env:Database__Provider = "Sqlite"
$env:ConnectionStrings__Default = "Data Source=khashayar-demo.db"
dotnet dev-certs https --trust     # فقط بار اول
dotnet run --launch-profile https
```
سپس https://localhost:7180 را باز کنید. دیتابیس و دادهٔ نمونه خودکار ساخته می‌شود.

## اجرا با SQL Server (LocalDB)
```powershell
cd src\KhashayarGym.Api
dotnet run --launch-profile https   # Migrationها خودکار اعمال می‌شوند
```
رشتهٔ اتصال دیگر را با User Secrets بدهید (نه در appsettings):
```powershell
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Default" "Server=...;Database=KhashayarGym;..."
```

## توسعهٔ فرانت با Hot Reload
دو ترمینال:
```powershell
# ترمینال ۱
cd src\KhashayarGym.Api; dotnet run --launch-profile https
# ترمینال ۲
cd src\KhashayarGym.Web; npm run dev     # http://localhost:5173 ، /api به https://localhost:7180 پراکسی می‌شود
```

## دموی فاز ۲ (ثبت‌نام و پرداخت)
با پروفایل **Demo (SQLite)**:
1. در بخش پکیج‌ها «انتخاب این پکیج» یا دکمهٔ «ثبت‌نام آنلاین» در هدر را بزنید.
2. سالن و شعبه (دکمهٔ «نزدیک‌ترین شعبه به من»)، پکیج و کد تخفیف (`KHASHAYAR10` یا `WELCOME5`).
3. ورود با هر شمارهٔ موبایل؛ در حالت دمو پیامک واقعی نمی‌رود و **کد روی صفحه** نمایش داده می‌شود.
4. قرارداد و فرم سلامت، امضا با کد دوم.
5. «پرداخت» درگاه آزمایشی Parbad را باز می‌کند: **Pay** = موفق، **Cancel** = انصراف. پولی جابه‌جا نمی‌شود.
6. صفحهٔ نتیجه: فاکتور PDF و کارت QR؛ در `/profile`: روزهای باقی‌مانده، تمدید یک‌کلیکی، فاکتورها، PDF قرارداد، برنامهٔ تمرینی نمونه و نمودار وزن.

## دموی فاز ۳ (شاپ، بوفه، کیف پول)
- **شاپ:** `/shop` — تب «مکمل‌ها» و «پوشاک و لوازم خشایار»، انتخاب شعبه برای دیدن موجودی، رنگ و سایز، سبد خرید، تحویل حضوری یا ارسال. کد `MEMBER15` فقط برای اعضای دارای عضویت فعال.
- **کیف پول:** `/wallet` — شارژ با درگاه آزمایشی، خرج در شاپ و بوفه.
- **بوفه (مشتری):** `/canteen/ghoddousi-gharbi?table=میز 4` (همان آدرسی که QR میز باز می‌کند).
- **بوفه (کارمند):** با شمارهٔ کارمند نمایشی **۰۹۱۰۰۰۰۰۰۰۰** وارد شوید و `/panel/canteen?branch=ghoddousi-gharbi` را باز کنید؛ سفارش‌ها لحظه‌ای می‌آیند و با «آماده شد» گوشی مشتری بوق می‌زند. برگهٔ چاپی QR میزها: `/panel/canteen/qr`.
- **جشنواره:** `/festival`.
- تصویر کالاها و آیتم‌های بوفه برداری و ساختهٔ همین پروژه است (`scripts/make-shop-images.mjs`)؛ نام برند مکمل‌ها ساختگی است.

## دموی فاز ۴ (پنل کارکنان)
- **ورود:** شمارهٔ **۰۹۱۰۰۰۰۰۰۰۰** (مدیر کل با همهٔ نقش‌ها و مربیِ اول) یا **۰۹۱۰۰۰۰۰۰۰۱** (مدیر فقط شعبهٔ قدوسی غربی) ← دکمهٔ «پنل» در هدر یا `/panel`.
- **دادهٔ نمایشی:** در Development (`Demo:SeedMembers=true`) ۲۰۰ عضو ساختگی با ۶ ماه سابقه ساخته می‌شود (شماره‌های `09391000000` به بعد). در production هرگز ساخته نمی‌شود.
- **حالت پرزنت:** در پنل «حالت پرزنت» را بزنید (یا `?present=1`)؛ نوار پایین صفحه بین نمای مشتری، پذیرش، بوفه، مربی و مدیر جابه‌جا می‌کند.
- **دسترسی:** نقش و شعبهٔ کارمند هر درخواست از دیتابیس خوانده می‌شود؛ گرفتن دسترسی در «کارکنان و دسترسی» همان لحظه اعمال می‌شود. مدیر شعبه/پذیرش/بوفه/فروشگاه فقط شعبه‌های خودشان را می‌بینند (داشبورد، اکسل، انبار، سفارش‌ها، تابلوی بوفه و SignalR).
- **پیامک خودکار:** خوش‌آمد/تأیید تمدید (فوری)، یادآوری ۷ و ۱ روز مانده، تولد (روز و ماه شمسی، با کد تخفیف یک‌بارمصرف شاپ) و جشنواره (فقط اعضای منقضی‌شده‌ای که در پروفایل پیامک تبلیغاتی را قبول کرده‌اند). یادآوری/تبلیغ فقط ۹ صبح تا ۹ شب؛ هر پیامک با کلید یکتا فقط یک بار. الگوهای کاوه‌نگار: `khashayar-welcome`، `khashayar-renew`، `khashayar-birthday`، `khashayar-campaign` (هر کدام ۳ توکن). آدرس سایت در متن پیامک: `Sms:SiteUrl`.

## اتصال به گیت و دستبند
سند فنی برای شرکت گیت: [`docs/access-control-api.md`](docs/access-control-api.md). در حالت Development یک گیت نمایشی با کلید `demo-gate-key-khashayar-0001` ساخته می‌شود.

## راهنمای راه‌اندازی برای مشتری
`docs/راهنمای-راه‌اندازی-سایت-خشایار.docx` — کارهای باشگاه و تیم فنی قدم‌به‌قدم (دامنه، اینماد، مالیات، درگاه، پیامک، سرور، گیت). با `node scripts/make-launch-guide.js <خروجی>` دوباره ساخته می‌شود.

برای سرور واقعی: `Otp:ExposeCodeInResponse=false`، `Sms:Provider=Kavenegar` با کلید در User Secrets، و `Payment:UseVirtualGateway=false` بعد از گرفتن درگاه به نام باشگاه (Parbad زرین‌پال، IDPay، سامان، ملت و… را پشتیبانی می‌کند).

## Docker
```bash
cp .env.example .env      # DB_PASSWORD، JWT_SIGNING_KEY و OTP_PEPPER را با مقادیر تصادفی پر کنید
docker compose up --build # http://localhost:8080
```
ایمیج چندمرحله‌ای است (Node → .NET SDK → aspnet)، با کاربر غیر root و فایل‌سیستم فقط‌خواندنی اجرا می‌شود؛ PDF قراردادها و کلیدهای Data Protection در volume `private` می‌مانند. جلوی آن reverse proxy با TLS بگذارید (کوکی‌ها `Secure` هستند).

## تست‌ها
```powershell
dotnet test                                   # xUnit + تست‌های یکپارچهٔ API (ورود، چرخش توکن، پرداخت، idempotency)
cd src\KhashayarGym.Web
npx playwright install chromium               # یک‌بار
$env:BASE_URL = "http://localhost:5180"; npx playwright test   # شامل سناریوی کامل ثبت‌نام و پرداخت
```
برای اجرای همهٔ تست‌های Playwright پشت سر هم، سقف rate limit را در توسعه بالا ببرید (همهٔ درخواست‌ها از یک IP است):
```powershell
$env:RateLimiting__PermitMultiplier = "20"   # فقط Development/Testing؛ در production نادیده گرفته می‌شود
```

## ویرایش داده‌ها
- **شعبه‌ها:** `src/KhashayarGym.DataAccess/Seed/branches.json` — شعبه‌هایی که `addressConfirmed: false` دارند مختصات تقریبی دارند. آدرس و مختصات دقیق را از هایلایت «شعب» اینستاگرام بردارید.
- پکیج‌ها، مربی‌ها و سؤالات: فایل‌های دیگر همان پوشه.
- Seed فقط روی دیتابیس خالی اجرا می‌شود؛ بعد از تغییر JSON فایل دیتابیس دمو را پاک کنید (`khashayar-demo.db`) یا دیتابیس LocalDB را drop کنید.
- **لوگو:** `src/KhashayarGym.Web/public/brand/logo.svg` را با فایل اصلی جایگزین کنید.
- **رنگ‌ها:** فقط در بلوک `@theme` فایل `src/KhashayarGym.Web/src/index.css`.

## فرانت‌اند
چیدمان و سبک صفحه از روی صفحهٔ مرجعی که کارفرما انتخاب کرد (قالب «GYM Store — Sports Complex») بازسازی شده؛ کد، متن و تصویرهای آن قالب کپی نشده و همه‌چیز از نو با React/Tailwind ساخته شده است. توکن‌ها و قواعد: `design-system/khashayar-gym/MASTER.md`.

| بخش | فایل | منبع |
|---|---|---|
| هدر سفید چسبان + پنل کناری | `site/SiteHeader.tsx` | چیدمان صفحهٔ مرجع |
| هیرو: دمبل ذره‌ای که با ماوس مایع می‌شود | `site/SiteHero.tsx` | Liquid Sculpture Hero (21st.dev، guglielmogiannattasio)؛ تصویر دمبل ساخت Canva AI |
| چه می‌کنیم (۴ کارت تصویری) | `site/SiteWhatWeDo.tsx` | تصویرها فریم‌های ویدیوی خود باشگاه |
| چرا خشایار + اعداد | `site/SiteWhy.tsx` | Count Up (21st.dev) |
| ویدیوی اسکرولی وسط صفحه | `site/SiteVideo.tsx` | Sunset Skyline Hero (21st.dev) — ویدیو: `public/media/video/gym.mp4` |
| آنچه ارائه می‌دهیم (کاروسل آیکون) | `site/SiteOffer.tsx` | چیدمان صفحهٔ مرجع |
| شعبه‌ها و نقشه | `site/SiteBranches.tsx`، `components/ui/shiraz-branch-picker.tsx` | ساختار Nepal Address Picker (21st.dev) با رنگ‌های تم؛ نقشهٔ شماتیک شیراز + حوزهٔ هر شعبه |
| پکیج‌ها | `site/SitePricing.tsx` | Pricing Section (21st.dev، نسخهٔ سوییچ متحرک) با رنگ‌های تم |
| جشنواره (دو تصویر پارالاکس) | `site/SiteEvents.tsx` | چیدمان صفحهٔ مرجع |
| مربیان | `site/SiteCoaches.tsx` | Container Scroll Animation (21st.dev)؛ عکس‌ها و نام‌ها موقت‌اند |
| سؤالات | `site/SiteFaq.tsx` | FAQ Accordion (21st.dev) |
| فرم مشاوره | `site/SiteContact.tsx` | طراحی اختصاصی هم‌سبک سایت (تیره + فرم سفید، انتخاب هدف، پکیج انتخابی) |
| نوار جشنواره | `site/SiteBanner.tsx` | Promo Banner (21st.dev) |
| گالری | `site/SiteGallery.tsx` | Shared Element Gallery (21st.dev)؛ عکس‌ها فعلاً فریم ویدیوها |
| فوتر تیرهٔ چهارستونه + خبرنامه | `site/SiteFooter.tsx` | چیدمان صفحهٔ مرجع |

### ویدیوی بخش وسط
صفحهٔ اصلی مستقیم `src/KhashayarGym.Web/public/media/video/gym.mp4` را پخش می‌کند (الان: ویدیوی مدیر باشگاه، نوارهای سیاه کناری بریده شده).
برای ویدیوی تازه، فایل خام را با اسم `gym-source.mp4` همان‌جا بگذارید و اجرا کنید:
```powershell
.\scripts\make-scrub-video.ps1
cd src\KhashayarGym.Web; npm run build
```
اسکریپت هر فریم را keyframe می‌کند تا جلو/عقب رفتن با اسکرول روان باشد.

تغییرات روی کد اصلی فقط این‌هاست: متن ثابت انگلیسی به props فارسی تبدیل شده، و چند سازگاری RTL (حذف letter-spacing روی فارسی، جهت فلش‌ها). هر فایل بالایش نوشته چه چیزی عوض شده.
لایسنس این کامپوننت‌ها روی 21st.dev «unknown» است؛ پیش از تحویل تجاری بررسی شود.

برای دیدن دموی اصلی هر کامپوننت در حالت توسعه: `npm run dev` و بعد `http://localhost:5173/lab`.

## برند دمو برای پرتفولیو
با افزودن `?brand=demo` به آدرس، نام، لوگو، شعار و اطلاعات تماس با یک برند ساختگی عوض می‌شود (برای اسکرین‌شات‌های پرتفولیو). `?brand=khashayar` برمی‌گرداند.

## امنیت
**فاز ۱**
- هدرهای CSP، HSTS (production)، X-Content-Type-Options، X-Frame-Options، Referrer-Policy، Permissions-Policy (geolocation فقط self)
- Rate limiting: فرم‌ها ۵ در دقیقه، OTP ۵ در دقیقه، ورود ۱۵ در دقیقه، پرداخت ۱۰ در دقیقه به ازای IP؛ سراسری ۳۰۰
- CSRF با کوکی + هدر `X-XSRF-TOKEN` (`GET /api/v1/security/csrf`) برای درخواست‌های مهمان
- اعتبارسنجی همهٔ ورودی‌ها در لایهٔ Business، نرمال‌سازی ارقام فارسی و شمارهٔ موبایل
- EF Core پارامتری، بدون SQL خام؛ محدودیت حجم درخواست
- موقعیت کاربر فقط در مرورگر استفاده می‌شود و به سرور ارسال نمی‌شود

**فاز ۲**
- کد پیامکی ۵ رقمی، فقط HMAC-SHA256 آن (با pepper) ذخیره می‌شود؛ ۲ دقیقه اعتبار، ۵ تلاش، فاصلهٔ ۶۰ ثانیه، حداکثر ۵ کد در ساعت برای هر شماره
- JWT کوتاه‌عمر فقط در حافظهٔ مرورگر؛ توکن تازه‌سازی چرخشی در کوکی `HttpOnly; Secure; SameSite=Strict` با مسیر محدود. فقط هش توکن در دیتابیس است. استفادهٔ دوباره از توکن قدیمی همهٔ نشست‌ها را باطل می‌کند (با مهلت ۳۰ ثانیه برای پاسخِ گم‌شده هنگام رفرش صفحه)
- refresh/logout فقط هم‌مبدأ (`Sec-Fetch-Site`، `Origin` و هدر `X-KG-Client`)
- مبلغ فقط سمت سرور محاسبه می‌شود؛ بعد از بازگشت از بانک، Fetch + تطبیق مبلغ + Verify سمت سرور و تکمیل idempotent داخل تراکنش. کلید idempotency برای جلوگیری از پرداخت دوباره با دوبار کلیک
- سالن انتخابی باید با جنسیت ثبت‌شده بخواند؛ هر کاربر فقط پرداخت‌ها و قراردادهای خودش را می‌بیند
- قرارداد امضاشده با هش SHA-256 محتوا، IP، مرورگر و زمان ثبت می‌شود؛ PDFها بیرون از wwwroot
- رمزها (کلید JWT، pepper، کلید پیامک) فقط در User Secrets / متغیر محیطی؛ نبودشان در production خطای شروع می‌دهد
- خطاها به شکل ProblemDetails با `traceId` و بدون جزئیات داخلی؛ لاگ ممیزی برای ساخت حساب، امضا و پرداخت

## API نسخهٔ ۱ (`/api/v1`)
مستندات OpenAPI در توسعه: `/openapi/v1.json` (با طرح امنیتی Bearer).

| مسیر | توضیح |
|---|---|
| `GET /branches?section=men\|women` ، `GET /branches/{slug}` | شعبه‌ها |
| `GET /packages` ، `GET /coaches` ، `GET /faq` ، `GET /stats` | داده‌های عمومی |
| `GET /campaigns/active` | جشنوارهٔ فعال (204 اگر نباشد) |
| `POST /consultations` | فرم مشاوره (CSRF + rate limit) |
| `POST /auth/otp` ، `POST /auth/verify` | ورود با کد پیامکی |
| `POST /auth/refresh` ، `POST /auth/logout` | نشست با کوکی HttpOnly |
| `GET/PUT /me` ، `GET /me/profile` | حساب و پروفایل |
| `GET /contracts/active` ، `POST /contracts/sign/otp` ، `POST /contracts/sign` | قرارداد و امضا |
| `POST /checkout/quote` ، `POST /checkout` | پیش‌فاکتور و شروع پرداخت |
| `GET\|POST /payments/callback` | بازگشت از درگاه |
| `GET /me/payments/{id}` ، `…/invoice.pdf` ، `GET /me/contracts/{id}/pdf` ، `GET /me/card.svg` | نتیجه، فاکتور، قرارداد، QR کارت |
| `GET /shop/products` ، `GET /shop/products/{slug}` ، `POST /shop/quote` ، `POST /shop/orders` | فروشگاه |
| `GET /canteen/{branch}/menu` ، `POST /canteen/orders` | بوفه (مشتری) |
| `GET /canteen/staff/{branch}/orders` ، `POST /canteen/staff/orders/{id}/status` ، Hub `/hubs/canteen` | بوفه (کارکنان، لحظه‌ای) |
| `GET /me/wallet` ، `POST /me/wallet/topups` ، `GET /me/orders` | کیف پول و سفارش‌ها |
| `POST /access/check` ، `GET /access/whitelist` ، `POST /access/events` | گیت/دستبند (کلید دستگاه) |
| `GET /panel/me` ، `GET /panel/dashboard` ، `GET /panel/dashboard/export` | پنل: کارمند فعلی، داشبورد، اکسل |
| `/panel/reception/*` ، `/staff/members/{id}/credentials` | پذیرش: جست‌وجو، پرونده، ثبت ورود، دستبند |
| `/panel/coach/*` ، `GET /me/plan` ، `GET/POST/DELETE /me/metrics` ، `GET/PUT /me/preferences` | مربی و سمت عضو |
| `/panel/admin/*` | پکیج، جشنواره و پیامکش، کد تخفیف، قرارداد، کالا و موجودی، سفارش شاپ، منوی بوفه، کارکنان، پیامک‌ها |
