using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhashayarGym.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class Phase5Scale : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShopOrders_BranchId",
                table: "ShopOrders");

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrders_BranchId_PaidAtUtc",
                table: "ShopOrders",
                columns: new[] { "BranchId", "PaidAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CampaignId",
                table: "Payments",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Purpose_Status_PaidAtUtc",
                table: "Payments",
                columns: new[] { "Purpose", "Status", "PaidAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_BranchId_EndsAtUtc",
                table: "Memberships",
                columns: new[] { "BranchId", "EndsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_Memberships_Status_EndsAtUtc",
                table: "Memberships",
                columns: new[] { "Status", "EndsAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CheckIns_UserId_OccurredAtUtc",
                table: "CheckIns",
                columns: new[] { "UserId", "OccurredAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CanteenOrders_BranchId_PaidAtUtc",
                table: "CanteenOrders",
                columns: new[] { "BranchId", "PaidAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAtUtc",
                table: "AuditLogs",
                column: "CreatedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShopOrders_BranchId_PaidAtUtc",
                table: "ShopOrders");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CampaignId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_Purpose_Status_PaidAtUtc",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Memberships_BranchId_EndsAtUtc",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_Memberships_Status_EndsAtUtc",
                table: "Memberships");

            migrationBuilder.DropIndex(
                name: "IX_CheckIns_UserId_OccurredAtUtc",
                table: "CheckIns");

            migrationBuilder.DropIndex(
                name: "IX_CanteenOrders_BranchId_PaidAtUtc",
                table: "CanteenOrders");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_CreatedAtUtc",
                table: "AuditLogs");

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrders_BranchId",
                table: "ShopOrders",
                column: "BranchId");
        }
    }
}
