using FluentValidation;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services;
using KhashayarGym.Business.Validation;
using KhashayarGym.Business.Pdf;
using KhashayarGym.Business.Services.Members;
using Microsoft.Extensions.DependencyInjection;

namespace KhashayarGym.Business;

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
        services.AddValidatorsFromAssemblyContaining<CreateConsultationValidator>(ServiceLifetime.Singleton);
        return services;
    }
}
