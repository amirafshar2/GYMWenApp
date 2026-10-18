IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [Branches] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(80) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [District] nvarchar(120) NOT NULL,
        [Address] nvarchar(400) NOT NULL,
        [Phone] nvarchar(20) NULL,
        [Latitude] float NOT NULL,
        [Longitude] float NOT NULL,
        [Sections] int NOT NULL,
        [AddressConfirmed] bit NOT NULL,
        [MenHours] nvarchar(200) NULL,
        [WomenHours] nvarchar(200) NULL,
        [Disciplines] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Branches] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [Campaigns] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(500) NULL,
        [StartsAtUtc] datetime2 NOT NULL,
        [EndsAtUtc] datetime2 NOT NULL,
        [DiscountPercent] int NOT NULL,
        [EligiblePackageSlugs] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Campaigns] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [FaqItems] (
        [Id] int NOT NULL IDENTITY,
        [Question] nvarchar(300) NOT NULL,
        [Answer] nvarchar(2000) NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_FaqItems] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [Packages] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(80) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [Tagline] nvarchar(200) NULL,
        [Category] int NOT NULL,
        [DurationMonths] int NOT NULL,
        [Sessions] int NULL,
        [PriceToman] bigint NOT NULL,
        [IncludesPersonalCoach] bit NOT NULL,
        [IncludesNutritionPlan] bit NOT NULL,
        [IsFeatured] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [Features] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Packages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [Coaches] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(80) NOT NULL,
        [FullName] nvarchar(120) NOT NULL,
        [Specialty] nvarchar(120) NOT NULL,
        [Bio] nvarchar(1000) NULL,
        [YearsOfExperience] int NOT NULL,
        [Section] int NOT NULL,
        [PhotoUrl] nvarchar(max) NULL,
        [Achievements] nvarchar(max) NOT NULL,
        [SortOrder] int NOT NULL,
        [BranchId] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Coaches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Coaches_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE TABLE [ConsultationRequests] (
        [Id] int NOT NULL IDENTITY,
        [FullName] nvarchar(100) NOT NULL,
        [Mobile] nvarchar(11) NOT NULL,
        [Goal] nvarchar(60) NULL,
        [Message] nvarchar(1000) NULL,
        [BranchId] int NULL,
        [IsHandled] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ConsultationRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ConsultationRequests_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Branches_Slug] ON [Branches] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Coaches_BranchId] ON [Coaches] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Coaches_Slug] ON [Coaches] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ConsultationRequests_BranchId] ON [ConsultationRequests] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Packages_Slug] ON [Packages] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015110134_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015110134_InitialCreate', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] int NOT NULL IDENTITY,
        [FullName] nvarchar(100) NULL,
        [Gender] int NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [LastLoginAtUtc] datetime2 NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(11) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] int NOT NULL IDENTITY,
        [Action] nvarchar(60) NOT NULL,
        [EntityType] nvarchar(60) NOT NULL,
        [EntityId] nvarchar(60) NULL,
        [UserId] int NULL,
        [Data] nvarchar(2000) NULL,
        [Ip] nvarchar(45) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [ContractTemplates] (
        [Id] int NOT NULL IDENTITY,
        [Version] int NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Clauses] nvarchar(max) NOT NULL,
        [HealthQuestions] nvarchar(max) NOT NULL,
        [IsActive] bit NOT NULL,
        [PublishedAtUtc] datetime2 NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ContractTemplates] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [DiscountCodes] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(30) NOT NULL,
        [Percent] int NOT NULL,
        [MaxUses] int NULL,
        [UsedCount] int NOT NULL,
        [ExpiresAtUtc] datetime2 NULL,
        [IsActive] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_DiscountCodes] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [OtpCodes] (
        [Id] int NOT NULL IDENTITY,
        [PhoneNumber] nvarchar(11) NOT NULL,
        [Purpose] int NOT NULL,
        [CodeHash] nvarchar(64) NOT NULL,
        [ExpiresAtUtc] datetime2 NOT NULL,
        [Attempts] int NOT NULL,
        [ConsumedAtUtc] datetime2 NULL,
        [RequestIp] nvarchar(45) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_OtpCodes] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] int NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] int NOT NULL,
        [RoleId] int NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] int NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [Memberships] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [BranchId] int NOT NULL,
        [PackageId] int NOT NULL,
        [Section] int NOT NULL,
        [Status] int NOT NULL,
        [StartsAtUtc] datetime2 NULL,
        [EndsAtUtc] datetime2 NULL,
        [SessionsTotal] int NULL,
        [SessionsUsed] int NOT NULL,
        [CardToken] nvarchar(64) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Memberships] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Memberships_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Memberships_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Memberships_Packages_PackageId] FOREIGN KEY ([PackageId]) REFERENCES [Packages] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [RefreshTokens] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [TokenHash] nvarchar(64) NOT NULL,
        [ExpiresAtUtc] datetime2 NOT NULL,
        [RevokedAtUtc] datetime2 NULL,
        [ReplacedByHash] nvarchar(64) NULL,
        [CreatedIp] nvarchar(45) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RefreshTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [SignedContracts] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [TemplateId] int NOT NULL,
        [Version] int NOT NULL,
        [SignerName] nvarchar(100) NOT NULL,
        [SignerPhone] nvarchar(11) NOT NULL,
        [SignedAtUtc] datetime2 NOT NULL,
        [IpAddress] nvarchar(45) NULL,
        [UserAgent] nvarchar(300) NULL,
        [HealthAnswers] nvarchar(max) NOT NULL,
        [HealthNotes] nvarchar(1000) NULL,
        [ContentHash] nvarchar(64) NOT NULL,
        [PdfPath] nvarchar(260) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_SignedContracts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SignedContracts_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SignedContracts_ContractTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [ContractTemplates] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE TABLE [Payments] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [MembershipId] int NOT NULL,
        [BaseAmountToman] bigint NOT NULL,
        [CampaignDiscountToman] bigint NOT NULL,
        [CodeDiscountToman] bigint NOT NULL,
        [AmountToman] bigint NOT NULL,
        [CampaignId] int NULL,
        [DiscountCode] nvarchar(30) NULL,
        [Status] int NOT NULL,
        [TrackingNumber] bigint NOT NULL,
        [Gateway] nvarchar(40) NOT NULL,
        [TransactionCode] nvarchar(100) NULL,
        [GatewayMessage] nvarchar(300) NULL,
        [IdempotencyKey] nvarchar(64) NOT NULL,
        [PaidAtUtc] datetime2 NULL,
        [InvoiceNumber] nvarchar(30) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Payments_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Payments_Memberships_MembershipId] FOREIGN KEY ([MembershipId]) REFERENCES [Memberships] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_ConsultationRequests_Mobile_CreatedAtUtc] ON [ConsultationRequests] ([Mobile], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AspNetUsers_PhoneNumber] ON [AspNetUsers] ([PhoneNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_EntityType_EntityId] ON [AuditLogs] ([EntityType], [EntityId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ContractTemplates_Version] ON [ContractTemplates] ([Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DiscountCodes_Code] ON [DiscountCodes] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_Memberships_BranchId] ON [Memberships] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Memberships_CardToken] ON [Memberships] ([CardToken]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_Memberships_PackageId] ON [Memberships] ([PackageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_Memberships_UserId_Status] ON [Memberships] ([UserId], [Status]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_OtpCodes_PhoneNumber_Purpose_CreatedAtUtc] ON [OtpCodes] ([PhoneNumber], [Purpose], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_Payments_MembershipId] ON [Payments] ([MembershipId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Payments_TrackingNumber] ON [Payments] ([TrackingNumber]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Payments_UserId_IdempotencyKey] ON [Payments] ([UserId], [IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RefreshTokens_TokenHash] ON [RefreshTokens] ([TokenHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_UserId] ON [RefreshTokens] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_SignedContracts_TemplateId] ON [SignedContracts] ([TemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    CREATE INDEX [IX_SignedContracts_UserId_Version] ON [SignedContracts] ([UserId], [Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016092208_Phase2Members'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016092208_Phase2Members', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE TABLE [AccessCredentials] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [Type] int NOT NULL,
        [Value] nvarchar(64) NOT NULL,
        [Label] nvarchar(60) NULL,
        [ExternalRef] nvarchar(64) NULL,
        [RevokedAtUtc] datetime2 NULL,
        [IssuedByUserId] int NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_AccessCredentials] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AccessCredentials_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE TABLE [AccessDevices] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(60) NOT NULL,
        [BranchId] int NOT NULL,
        [Section] int NOT NULL,
        [KeyHash] nvarchar(64) NOT NULL,
        [Vendor] nvarchar(60) NULL,
        [IsActive] bit NOT NULL,
        [LastSeenAtUtc] datetime2 NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_AccessDevices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AccessDevices_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE TABLE [IntegrationEvents] (
        [Id] int NOT NULL IDENTITY,
        [Type] nvarchar(64) NOT NULL,
        [Payload] nvarchar(max) NOT NULL,
        [ProcessedAtUtc] datetime2 NULL,
        [Attempts] int NOT NULL,
        [NextAttemptAtUtc] datetime2 NOT NULL,
        [LastError] nvarchar(500) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_IntegrationEvents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE TABLE [CheckIns] (
        [Id] int NOT NULL IDENTITY,
        [DeviceId] int NOT NULL,
        [BranchId] int NOT NULL,
        [UserId] int NULL,
        [MembershipId] int NULL,
        [CredentialType] int NOT NULL,
        [CredentialHint] nvarchar(8) NULL,
        [Decision] int NOT NULL,
        [Reason] int NOT NULL,
        [SessionCounted] bit NOT NULL,
        [OccurredAtUtc] datetime2 NOT NULL,
        [ExternalEventId] nvarchar(64) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_CheckIns] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CheckIns_AccessDevices_DeviceId] FOREIGN KEY ([DeviceId]) REFERENCES [AccessDevices] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_AccessCredentials_Type_Value] ON [AccessCredentials] ([Type], [Value]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_AccessCredentials_UserId] ON [AccessCredentials] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_AccessDevices_BranchId] ON [AccessDevices] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AccessDevices_KeyHash] ON [AccessDevices] ([KeyHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_CheckIns_BranchId_OccurredAtUtc] ON [CheckIns] ([BranchId], [OccurredAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_CheckIns_DeviceId_ExternalEventId] ON [CheckIns] ([DeviceId], [ExternalEventId]) WHERE [ExternalEventId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_CheckIns_MembershipId_OccurredAtUtc] ON [CheckIns] ([MembershipId], [OccurredAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    CREATE INDEX [IX_IntegrationEvents_ProcessedAtUtc_NextAttemptAtUtc] ON [IntegrationEvents] ([ProcessedAtUtc], [NextAttemptAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016101045_AccessControl'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016101045_AccessControl', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Payments]') AND [c].[name] = N'MembershipId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Payments] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Payments] ALTER COLUMN [MembershipId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD [CanteenOrderId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD [Description] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD [Purpose] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD [ShopOrderId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [DiscountCodes] ADD [MembersOnly] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [DiscountCodes] ADD [Scope] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Campaigns] ADD [DiscountAmountToman] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Campaigns] ADD [EligibleBranchSlugs] nvarchar(max) NOT NULL DEFAULT N'[]';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Campaigns] ADD [MaxRedemptions] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Campaigns] ADD [RedemptionCount] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [CanteenItems] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(60) NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [Description] nvarchar(200) NULL,
        [Category] int NOT NULL,
        [PriceToman] bigint NOT NULL,
        [Kcal] int NULL,
        [ProteinG] int NULL,
        [ImagePath] nvarchar(200) NOT NULL,
        [IsAvailable] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_CanteenItems] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [CanteenOrders] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [BranchId] int NOT NULL,
        [TableCode] nvarchar(30) NULL,
        [DailyNumber] int NOT NULL,
        [Status] int NOT NULL,
        [TotalToman] bigint NOT NULL,
        [PayMethod] int NOT NULL,
        [Note] nvarchar(200) NULL,
        [IdempotencyKey] nvarchar(64) NOT NULL,
        [PaidAtUtc] datetime2 NULL,
        [ReadyAtUtc] datetime2 NULL,
        [CollectedAtUtc] datetime2 NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_CanteenOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CanteenOrders_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CanteenOrders_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [Products] (
        [Id] int NOT NULL IDENTITY,
        [Slug] nvarchar(80) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [BrandName] nvarchar(60) NOT NULL,
        [Kind] int NOT NULL,
        [Category] nvarchar(40) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [ImagePath] nvarchar(200) NOT NULL,
        [PriceToman] bigint NOT NULL,
        [IsKhashayarBrand] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [SortOrder] int NOT NULL,
        [Highlights] nvarchar(max) NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Products] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [ShopOrders] (
        [Id] int NOT NULL IDENTITY,
        [Number] nvarchar(30) NULL,
        [UserId] int NOT NULL,
        [Status] int NOT NULL,
        [Fulfillment] int NOT NULL,
        [BranchId] int NOT NULL,
        [RecipientName] nvarchar(100) NULL,
        [RecipientPhone] nvarchar(11) NULL,
        [Address] nvarchar(400) NULL,
        [PostalCode] nvarchar(10) NULL,
        [SubtotalToman] bigint NOT NULL,
        [DiscountToman] bigint NOT NULL,
        [ShippingToman] bigint NOT NULL,
        [TotalToman] bigint NOT NULL,
        [DiscountCode] nvarchar(30) NULL,
        [PayMethod] int NOT NULL,
        [IdempotencyKey] nvarchar(64) NOT NULL,
        [PaidAtUtc] datetime2 NULL,
        [StockReserved] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ShopOrders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShopOrders_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ShopOrders_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [Wallets] (
        [UserId] int NOT NULL,
        [BalanceToman] bigint NOT NULL,
        [UpdatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_Wallets] PRIMARY KEY ([UserId]),
        CONSTRAINT [CK_Wallet_Balance] CHECK ([BalanceToman] >= 0),
        CONSTRAINT [FK_Wallets_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [WalletTransactions] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [AmountToman] bigint NOT NULL,
        [BalanceAfterToman] bigint NOT NULL,
        [Type] int NOT NULL,
        [Description] nvarchar(150) NOT NULL,
        [Reference] nvarchar(40) NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_WalletTransactions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [CanteenOrderItem] (
        [Id] int NOT NULL IDENTITY,
        [OrderId] int NOT NULL,
        [ItemId] int NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [UnitPriceToman] bigint NOT NULL,
        [Quantity] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_CanteenOrderItem] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CanteenOrderItem_CanteenOrders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [CanteenOrders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [ProductVariants] (
        [Id] int NOT NULL IDENTITY,
        [ProductId] int NOT NULL,
        [Sku] nvarchar(40) NOT NULL,
        [Size] nvarchar(10) NULL,
        [Color] nvarchar(30) NULL,
        [ColorHex] nvarchar(7) NULL,
        [Flavor] nvarchar(30) NULL,
        [PriceToman] bigint NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ProductVariants] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductVariants_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [Products] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [ShopOrderItem] (
        [Id] int NOT NULL IDENTITY,
        [OrderId] int NOT NULL,
        [VariantId] int NOT NULL,
        [ProductName] nvarchar(120) NOT NULL,
        [VariantLabel] nvarchar(80) NULL,
        [ImagePath] nvarchar(200) NOT NULL,
        [UnitPriceToman] bigint NOT NULL,
        [Quantity] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_ShopOrderItem] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ShopOrderItem_ShopOrders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [ShopOrders] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE TABLE [BranchStocks] (
        [Id] int NOT NULL IDENTITY,
        [VariantId] int NOT NULL,
        [BranchId] int NOT NULL,
        [Quantity] int NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_BranchStocks] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_BranchStock_Quantity] CHECK ([Quantity] >= 0),
        CONSTRAINT [FK_BranchStocks_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_BranchStocks_ProductVariants_VariantId] FOREIGN KEY ([VariantId]) REFERENCES [ProductVariants] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_Payments_CanteenOrderId] ON [Payments] ([CanteenOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_Payments_ShopOrderId] ON [Payments] ([ShopOrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_BranchStocks_BranchId] ON [BranchStocks] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_BranchStocks_VariantId_BranchId] ON [BranchStocks] ([VariantId], [BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CanteenItems_Slug] ON [CanteenItems] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_CanteenOrderItem_OrderId] ON [CanteenOrderItem] ([OrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_CanteenOrders_BranchId_Status_CreatedAtUtc] ON [CanteenOrders] ([BranchId], [Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CanteenOrders_UserId_IdempotencyKey] ON [CanteenOrders] ([UserId], [IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_Products_Kind_IsActive_SortOrder] ON [Products] ([Kind], [IsActive], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Products_Slug] ON [Products] ([Slug]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_ProductVariants_ProductId] ON [ProductVariants] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductVariants_Sku] ON [ProductVariants] ([Sku]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_ShopOrderItem_OrderId] ON [ShopOrderItem] ([OrderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_ShopOrders_BranchId] ON [ShopOrders] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_ShopOrders_Status_CreatedAtUtc] ON [ShopOrders] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ShopOrders_UserId_IdempotencyKey] ON [ShopOrders] ([UserId], [IdempotencyKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    CREATE INDEX [IX_WalletTransactions_UserId_CreatedAtUtc] ON [WalletTransactions] ([UserId], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD CONSTRAINT [FK_Payments_CanteenOrders_CanteenOrderId] FOREIGN KEY ([CanteenOrderId]) REFERENCES [CanteenOrders] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    ALTER TABLE [Payments] ADD CONSTRAINT [FK_Payments_ShopOrders_ShopOrderId] FOREIGN KEY ([ShopOrderId]) REFERENCES [ShopOrders] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016103201_Phase3Commerce'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016103201_Phase3Commerce', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    ALTER TABLE [Coaches] ADD [UserId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [BirthDate] date NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    ALTER TABLE [AspNetUsers] ADD [MarketingSmsOptIn] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE TABLE [BodyMetrics] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [MeasuredOn] date NOT NULL,
        [WeightKg] decimal(5,1) NOT NULL,
        [BodyFatPercent] decimal(4,1) NULL,
        [WaistCm] decimal(5,1) NULL,
        [RecordedByUserId] int NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_BodyMetrics] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE TABLE [CoachAssignments] (
        [Id] int NOT NULL IDENTITY,
        [CoachId] int NOT NULL,
        [MemberUserId] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_CoachAssignments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CoachAssignments_AspNetUsers_MemberUserId] FOREIGN KEY ([MemberUserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_CoachAssignments_Coaches_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [Coaches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE TABLE [SmsMessages] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NULL,
        [Phone] nvarchar(11) NOT NULL,
        [Kind] int NOT NULL,
        [Template] nvarchar(60) NOT NULL,
        [TokensJson] nvarchar(500) NOT NULL,
        [Preview] nvarchar(500) NOT NULL,
        [Status] int NOT NULL,
        [Attempts] int NOT NULL,
        [SentAtUtc] datetime2 NULL,
        [Error] nvarchar(300) NULL,
        [DedupeKey] nvarchar(80) NOT NULL,
        [CampaignId] int NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_SmsMessages] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE TABLE [StaffBranches] (
        [UserId] int NOT NULL,
        [BranchId] int NOT NULL,
        CONSTRAINT [PK_StaffBranches] PRIMARY KEY ([UserId], [BranchId]),
        CONSTRAINT [FK_StaffBranches_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_StaffBranches_Branches_BranchId] FOREIGN KEY ([BranchId]) REFERENCES [Branches] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE TABLE [TrainingPlans] (
        [Id] int NOT NULL IDENTITY,
        [MemberUserId] int NOT NULL,
        [CoachId] int NOT NULL,
        [Title] nvarchar(100) NOT NULL,
        [DaysJson] nvarchar(max) NOT NULL,
        [Nutrition] nvarchar(3000) NULL,
        [IsActive] bit NOT NULL,
        [UpdatedAtUtc] datetime2 NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_TrainingPlans] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TrainingPlans_Coaches_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [Coaches] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_Coaches_UserId] ON [Coaches] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_BodyMetrics_UserId_MeasuredOn] ON [BodyMetrics] ([UserId], [MeasuredOn]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CoachAssignments_CoachId_MemberUserId] ON [CoachAssignments] ([CoachId], [MemberUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_CoachAssignments_MemberUserId] ON [CoachAssignments] ([MemberUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SmsMessages_DedupeKey] ON [SmsMessages] ([DedupeKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_SmsMessages_Status_CreatedAtUtc] ON [SmsMessages] ([Status], [CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_StaffBranches_BranchId] ON [StaffBranches] ([BranchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_TrainingPlans_CoachId] ON [TrainingPlans] ([CoachId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    CREATE INDEX [IX_TrainingPlans_MemberUserId_IsActive] ON [TrainingPlans] ([MemberUserId], [IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    ALTER TABLE [Coaches] ADD CONSTRAINT [FK_Coaches_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE SET NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016114925_Phase4Panels'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016114925_Phase4Panels', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016125324_Phase5Security'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_WalletTransactions_UserId_Reference_Type] ON [WalletTransactions] ([UserId], [Reference], [Type]) WHERE [Reference] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016125324_Phase5Security'
)
BEGIN

    IF OBJECT_ID(N'dbo.ParbadCache', N'U') IS NULL
    CREATE TABLE dbo.ParbadCache (
        Id nvarchar(449) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL PRIMARY KEY,
        Value varbinary(max) NOT NULL,
        ExpiresAtTime datetimeoffset NOT NULL,
        SlidingExpirationInSeconds bigint NULL,
        AbsoluteExpiration datetimeoffset NULL);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'Index_ExpiresAtTime')
    CREATE NONCLUSTERED INDEX Index_ExpiresAtTime ON dbo.ParbadCache(ExpiresAtTime);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016125324_Phase5Security'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016125324_Phase5Security', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    DROP INDEX [IX_ShopOrders_BranchId] ON [ShopOrders];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_ShopOrders_BranchId_PaidAtUtc] ON [ShopOrders] ([BranchId], [PaidAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_Payments_CampaignId] ON [Payments] ([CampaignId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_Payments_Purpose_Status_PaidAtUtc] ON [Payments] ([Purpose], [Status], [PaidAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_Memberships_BranchId_EndsAtUtc] ON [Memberships] ([BranchId], [EndsAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_Memberships_Status_EndsAtUtc] ON [Memberships] ([Status], [EndsAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_CheckIns_UserId_OccurredAtUtc] ON [CheckIns] ([UserId], [OccurredAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_CanteenOrders_BranchId_PaidAtUtc] ON [CanteenOrders] ([BranchId], [PaidAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_CreatedAtUtc] ON [AuditLogs] ([CreatedAtUtc]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016143419_Phase5Scale'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016143419_Phase5Scale', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016150828_CoachActive'
)
BEGIN
    ALTER TABLE [Coaches] ADD [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016150828_CoachActive'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016150828_CoachActive', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018154236_SiteTemplate'
)
BEGIN
    EXEC sp_rename N'[Products].[IsKhashayarBrand]', N'IsHouseBrand', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018154236_SiteTemplate'
)
BEGIN
    CREATE TABLE [SiteContents] (
        [Id] int NOT NULL IDENTITY,
        [Json] nvarchar(max) NOT NULL,
        [UpdatedAtUtc] datetime2 NOT NULL,
        [UpdatedByUserId] int NULL,
        CONSTRAINT [PK_SiteContents] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018154236_SiteTemplate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261018154236_SiteTemplate', N'10.0.13');
END;

COMMIT;
GO

