# syntax=docker/dockerfile:1.7
# ساخت چندمرحله‌ای: فرانت (Node) ← بک‌اند (.NET SDK) ← اجرای سبک با کاربر غیر root

# ---- ۱. فرانت React → wwwroot ----
FROM node:22-alpine AS web
WORKDIR /src/src/KhashayarGym.Web
COPY src/KhashayarGym.Web/package*.json ./
RUN npm install --no-audit --no-fund
COPY src/KhashayarGym.Web/ ./
RUN npm run build

# ---- ۲. بک‌اند ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY KhashayarGym.slnx ./
COPY src/KhashayarGym.Domain/*.csproj src/KhashayarGym.Domain/
COPY src/KhashayarGym.DataAccess/*.csproj src/KhashayarGym.DataAccess/
COPY src/KhashayarGym.Business/*.csproj src/KhashayarGym.Business/
COPY src/KhashayarGym.Api/*.csproj src/KhashayarGym.Api/
RUN dotnet restore src/KhashayarGym.Api/KhashayarGym.Api.csproj
COPY src/ src/
COPY --from=web /src/src/KhashayarGym.Api/wwwroot src/KhashayarGym.Api/wwwroot
RUN dotnet publish src/KhashayarGym.Api/KhashayarGym.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# ---- ۳. اجرا ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    Storage__PrivateRoot=/data/private \
    DataProtection__KeysPath=/data/private/keys
COPY --from=build /app ./
# فایل‌های خصوصی (PDF قراردادها) در volume جدا، با مالکیت کاربر غیر root ایمیج (app، UID 1654)
RUN mkdir -p /data/private /data/uploads && chown -R $APP_UID /data
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "KhashayarGym.Api.dll"]
