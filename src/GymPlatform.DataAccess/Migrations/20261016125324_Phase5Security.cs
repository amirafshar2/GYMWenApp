using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymPlatform.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class Phase5Security : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_WalletTransactions_UserId_Reference_Type",
                table: "WalletTransactions",
                columns: new[] { "UserId", "Reference", "Type" },
                unique: true,
                filter: "[Reference] IS NOT NULL");

            // حافظهٔ پایدار وضعیت درگاه (Parbad) با IDistributedCache روی SQL Server — ساختار استاندارد SqlServerCache
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.ParbadCache', N'U') IS NULL
CREATE TABLE dbo.ParbadCache (
    Id nvarchar(449) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL PRIMARY KEY,
    Value varbinary(max) NOT NULL,
    ExpiresAtTime datetimeoffset NOT NULL,
    SlidingExpirationInSeconds bigint NULL,
    AbsoluteExpiration datetimeoffset NULL);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'Index_ExpiresAtTime')
CREATE NONCLUSTERED INDEX Index_ExpiresAtTime ON dbo.ParbadCache(ExpiresAtTime);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WalletTransactions_UserId_Reference_Type",
                table: "WalletTransactions");
            migrationBuilder.Sql("IF OBJECT_ID(N'dbo.ParbadCache', N'U') IS NOT NULL DROP TABLE dbo.ParbadCache;");
        }
    }
}
