using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace GymPlatform.Api.Infrastructure;

/// <summary>طرح امنیتی Bearer (JWT) در سند OpenAPI.</summary>
public sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken ct)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "توکن دسترسی از POST /api/v1/auth/verify",
        };
        document.Info.Title = "Gym Platform API";
        document.Info.Version = "v1";
        return Task.CompletedTask;
    }
}
