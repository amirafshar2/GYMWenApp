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

## اجرا (سریع‌ترین راه برای دمو — SQLite)
در PowerShell از ریشهٔ پروژه:

```powershell
cd src\KhashayarGym.Web
npm install
npm run build            # خروجی داخل src\KhashayarGym.Api\wwwroot

cd ..\KhashayarGym.Api
$env:Database__Provider = "Sqlite"
$env:ConnectionStrings__Default = "Data Source=khashayar-demo.db"
dotnet run
```
سپس https://localhost:7180 را باز کنید. دیتابیس و دادهٔ نمونه خودکار ساخته می‌شود.

## اجرا با SQL Server (LocalDB)
```powershell
cd src\KhashayarGym.Api
dotnet run               # Migrationها خودکار اعمال می‌شوند
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
cd src\KhashayarGym.Api; dotnet run
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

## ویدیوی هیرو (اختیاری)
هیرو بدون ویدیو هم کار می‌کند (هالتری روی canvas رسم می‌شود). برای ویدیوی واقعی:
```powershell
.\scripts\make-hero-frames.ps1 -Video C:\path\gym.mp4
```
فریم‌ها و `manifest.json` ساخته می‌شوند و هیرو خودکار به حالت ویدیو می‌رود.

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
