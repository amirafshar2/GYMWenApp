# پلتفرم آنلاین مجموعه باشگاه‌های خشایار شیراز

دموی فاز ۱: سایت عمومی با هیروی اسکرولی، نقشهٔ «نزدیک‌ترین شعبه»، پکیج‌ها با تخفیف جشنواره و فرم مشاوره.

## ساختار (سه‌لایه، .NET 10)

```
KhashayarGym.slnx
src/
  KhashayarGym.Domain       موجودیت‌ها و Enumها
  KhashayarGym.DataAccess   EF Core، DbContext، Repository، Migration، دادهٔ نمونه (Seed/*.json)
  KhashayarGym.Business     سرویس‌ها، DTOها، اعتبارسنجی FluentValidation، قیمت‌گذاری
  KhashayarGym.Api          Web API، امنیت، کش، سرو کردن فرانت از wwwroot
  KhashayarGym.Web          React + Vite + TypeScript + Tailwind v4 (بیلد → Api/wwwroot)
tests/KhashayarGym.Tests    تست‌های xUnit لایهٔ Business
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

## تست‌ها
```powershell
dotnet test                                   # xUnit
cd src\KhashayarGym.Web
npx playwright install chromium               # یک‌بار
$env:BASE_URL = "https://localhost:7180"; npx playwright test
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
| پکیج‌ها | `site/SitePricing.tsx` | Pricing Section (21st.dev) |
| جشنواره (دو تصویر پارالاکس) | `site/SiteEvents.tsx` | چیدمان صفحهٔ مرجع |
| مربیان | `site/SiteCoaches.tsx` | Glow Cards (21st.dev) |
| سؤالات / فرم مشاوره | `site/SiteFaq.tsx`، `site/SiteContact.tsx` | FAQ Accordion و Contact Form (21st.dev) |
| نوار جشنواره | `site/SiteBanner.tsx` | Promo Banner (21st.dev) |
| فوتر تیرهٔ چهارستونه + خبرنامه | `site/SiteFooter.tsx` | چیدمان صفحهٔ مرجع |

### ویدیوی بخش وسط
صفحهٔ اصلی مستقیم `src/KhashayarGym.Web/public/media/video/gym.mp4` را پخش می‌کند (الان: ادغام سکانس ۱ و ۲).
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

## امنیت پیاده‌شده در فاز ۱
- هدرهای CSP، HSTS (production)، X-Content-Type-Options، X-Frame-Options، Referrer-Policy، Permissions-Policy (geolocation فقط self)
- Rate limiting: فرم‌ها ۵ درخواست در دقیقه به ازای IP، سراسری ۳۰۰ در دقیقه
- CSRF با کوکی + هدر `X-XSRF-TOKEN` (`GET /api/security/csrf`)
- اعتبارسنجی همهٔ ورودی‌ها در لایهٔ Business، نرمال‌سازی ارقام فارسی و شمارهٔ موبایل
- EF Core پارامتری، بدون SQL خام؛ محدودیت حجم درخواست
- موقعیت کاربر فقط در مرورگر استفاده می‌شود و به سرور ارسال نمی‌شود

## API (فاز ۱)
| مسیر | توضیح |
|---|---|
| `GET /api/branches?section=men\|women` | شعبه‌ها |
| `GET /api/branches/{slug}` | یک شعبه |
| `GET /api/packages` | پکیج‌ها با قیمت پس از تخفیف کمپین |
| `GET /api/coaches` | مربی‌ها |
| `GET /api/campaigns/active` | جشنوارهٔ فعال (204 اگر نباشد) |
| `GET /api/faq` ، `GET /api/stats` | سؤالات و آمار |
| `POST /api/consultations` | فرم مشاوره (CSRF + rate limit) |
