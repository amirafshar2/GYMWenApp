using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GymPlatform.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class SiteTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsKhashayarBrand",
                table: "Products",
                newName: "IsHouseBrand");

            migrationBuilder.CreateTable(
                name: "SiteContents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Json = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteContents", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SiteContents");

            migrationBuilder.RenameColumn(
                name: "IsHouseBrand",
                table: "Products",
                newName: "IsKhashayarBrand");
        }
    }
}
