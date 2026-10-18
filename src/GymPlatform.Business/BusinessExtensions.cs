using FluentValidation;
using GymPlatform.Business.Common;
using GymPlatform.Business.Services;
using GymPlatform.Business.Validation;
using GymPlatform.Business.Pdf;
using GymPlatform.Business.Services.Members;
using Microsoft.Extensions.DependencyInjection;

namespace GymPlatform.Business;

public static class BusinessExtensions
{
    public static IServiceCollection AddBusiness(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPricingService, PricingService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<IConsultationService, ConsultationService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICheckoutService, CheckoutService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IMemberService, MemberService>();
        services.AddScoped<IContractService, ContractService>();
        services.AddSingleton<IPdfService, PdfService>();
        services.AddScoped<Services.Access.IAccessControlService, Services.Access.AccessControlService>();
        services.AddScoped<Services.Commerce.IWalletService, Services.Commerce.WalletService>();
        services.AddScoped<Services.Commerce.IShopService, Services.Commerce.ShopService>();
        services.AddScoped<Services.Commerce.ICanteenService, Services.Commerce.CanteenService>();
        services.AddScoped<Services.Panel.IStaffScopeService, Services.Panel.StaffScopeService>();
        services.AddScoped<Services.Panel.IDashboardService, Services.Panel.DashboardService>();
        services.AddScoped<Services.Panel.IReceptionService, Services.Panel.ReceptionService>();
        services.AddScoped<Services.Panel.ICoachService, Services.Panel.CoachService>();
        services.AddScoped<Services.Panel.IAdminService, Services.Panel.AdminService>();
        services.AddScoped<Services.Panel.ISmsService, Services.Panel.SmsService>();
        services.AddScoped<Services.Panel.IReportService, Services.Panel.ReportService>();
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddSingleton<Services.Site.SiteConfigCache>();
        services.AddScoped<Services.Site.ISiteService, Services.Site.SiteService>();
        services.AddScoped<Services.Site.SiteInstaller>();
        services.AddValidatorsFromAssemblyContaining<CreateConsultationValidator>(ServiceLifetime.Singleton);
        return services;
    }
}
