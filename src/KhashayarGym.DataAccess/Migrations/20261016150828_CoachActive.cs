using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhashayarGym.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class CoachActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Coaches",
                type: "bit",
                nullable: false,
                defaultValue: true); // مربی‌های موجود نمایش داده شوند
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Coaches");
        }
    }
}
