using FluentValidation;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Services;
using KhashayarGym.Business.Validation;
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
        services.AddValidatorsFromAssemblyContaining<CreateConsultationValidator>(ServiceLifetime.Singleton);
        return services;
    }
}
