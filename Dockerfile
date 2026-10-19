# ساخت چندمرحله‌ای: فرانت (Node) ← بک‌اند (.NET SDK) ← اجرای سبک با کاربر غیر root

# ---- ۱. فرانت React → wwwroot ----
FROM node:22-alpine AS web
WORKDIR /src/src/GymPlatform.Web
COPY src/GymPlatform.Web/package*.json ./
RUN npm install --no-audit --no-fund
COPY src/GymPlatform.Web/ ./
RUN npm run build

# ---- ۲. بک‌اند ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY GymPlatform.slnx ./
COPY src/GymPlatform.Domain/*.csproj src/GymPlatform.Domain/
COPY src/GymPlatform.DataAccess/*.csproj src/GymPlatform.DataAccess/
COPY src/GymPlatform.Business/*.csproj src/GymPlatform.Business/
COPY src/GymPlatform.Api/*.csproj src/GymPlatform.Api/
RUN dotnet restore src/GymPlatform.Api/GymPlatform.Api.csproj
COPY src/ src/
COPY --from=web /src/src/GymPlatform.Api/wwwroot src/GymPlatform.Api/wwwroot
RUN dotnet publish src/GymPlatform.Api/GymPlatform.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- ۳. اجرا ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    Storage__PrivateRoot=/data/private \
    Storage__PublicUploads=/data/uploads \
    DataProtection__KeysPath=/data/private/keys \
    Storage__Videos=/data/videos \
    DOTNET_gcServer=0 \
    DOTNET_GCConserveMemory=7 \
    DOTNET_GCHeapHardLimit=0x8000000
# ffmpeg برای بهینه‌سازی خودکار ویدیوهای آپلودی (بدون آن برنامه کار می‌کند، فقط ویدیو بهینه نمی‌شود)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=build /app ./
# فایل‌های خصوصی (PDF قراردادها) در volume جدا، با مالکیت کاربر غیر root ایمیج (app، UID 1654)
RUN mkdir -p /data/private /data/uploads /data/videos && chown -R $APP_UID /data
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "GymPlatform.Api.dll"]
