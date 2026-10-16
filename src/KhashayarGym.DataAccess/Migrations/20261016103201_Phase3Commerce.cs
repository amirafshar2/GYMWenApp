using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhashayarGym.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class Phase3Commerce : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "MembershipId",
                table: "Payments",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "CanteenOrderId",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Payments",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Purpose",
                table: "Payments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ShopOrderId",
                table: "Payments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MembersOnly",
                table: "DiscountCodes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "DiscountCodes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "DiscountAmountToman",
                table: "Campaigns",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EligibleBranchSlugs",
                table: "Campaigns",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "MaxRedemptions",
                table: "Campaigns",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RedemptionCount",
                table: "Campaigns",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "CanteenItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Category = table.Column<int>(type: "int", nullable: false),
                    PriceToman = table.Column<long>(type: "bigint", nullable: false),
                    Kcal = table.Column<int>(type: "int", nullable: true),
                    ProteinG = table.Column<int>(type: "int", nullable: true),
                    ImagePath = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsAvailable = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CanteenItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CanteenOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    TableCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DailyNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TotalToman = table.Column<long>(type: "bigint", nullable: false),
                    PayMethod = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PaidAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReadyAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CollectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CanteenOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CanteenOrders_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CanteenOrders_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Kind = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ImagePath = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceToman = table.Column<long>(type: "bigint", nullable: false),
                    IsKhashayarBrand = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Highlights = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShopOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Number = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Fulfillment = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    RecipientName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RecipientPhone = table.Column<string>(type: "nvarchar(11)", maxLength: 11, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    PostalCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    SubtotalToman = table.Column<long>(type: "bigint", nullable: false),
                    DiscountToman = table.Column<long>(type: "bigint", nullable: false),
                    ShippingToman = table.Column<long>(type: "bigint", nullable: false),
                    TotalToman = table.Column<long>(type: "bigint", nullable: false),
                    DiscountCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PayMethod = table.Column<int>(type: "int", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PaidAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StockReserved = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopOrders_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShopOrders_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Wallets",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BalanceToman = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wallets", x => x.UserId);
                    table.CheckConstraint("CK_Wallet_Balance", "[BalanceToman] >= 0");
                    table.ForeignKey(
                        name: "FK_Wallets_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WalletTransactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AmountToman = table.Column<long>(type: "bigint", nullable: false),
                    BalanceAfterToman = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Reference = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WalletTransactions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CanteenOrderItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    UnitPriceToman = table.Column<long>(type: "bigint", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CanteenOrderItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CanteenOrderItem_CanteenOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "CanteenOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Sku = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Size = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ColorHex = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    Flavor = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PriceToman = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopOrderItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    VariantId = table.Column<int>(type: "int", nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    VariantLabel = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    ImagePath = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UnitPriceToman = table.Column<long>(type: "bigint", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopOrderItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShopOrderItem_ShopOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "ShopOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BranchStocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VariantId = table.Column<int>(type: "int", nullable: false),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BranchStocks", x => x.Id);
                    table.CheckConstraint("CK_BranchStock_Quantity", "[Quantity] >= 0");
                    table.ForeignKey(
                        name: "FK_BranchStocks_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BranchStocks_ProductVariants_VariantId",
                        column: x => x.VariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_CanteenOrderId",
                table: "Payments",
                column: "CanteenOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ShopOrderId",
                table: "Payments",
                column: "ShopOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_BranchStocks_BranchId",
                table: "BranchStocks",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_BranchStocks_VariantId_BranchId",
                table: "BranchStocks",
                columns: new[] { "VariantId", "BranchId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CanteenItems_Slug",
                table: "CanteenItems",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CanteenOrderItem_OrderId",
                table: "CanteenOrderItem",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_CanteenOrders_BranchId_Status_CreatedAtUtc",
                table: "CanteenOrders",
                columns: new[] { "BranchId", "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_CanteenOrders_UserId_IdempotencyKey",
                table: "CanteenOrders",
                columns: new[] { "UserId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_Kind_IsActive_SortOrder",
                table: "Products",
                columns: new[] { "Kind", "IsActive", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_Slug",
                table: "Products",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId",
                table: "ProductVariants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_Sku",
                table: "ProductVariants",
                column: "Sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrderItem_OrderId",
                table: "ShopOrderItem",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrders_BranchId",
                table: "ShopOrders",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrders_Status_CreatedAtUtc",
                table: "ShopOrders",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ShopOrders_UserId_IdempotencyKey",
                table: "ShopOrders",
                columns: new[] { "UserId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransactions_UserId_CreatedAtUtc",
                table: "WalletTransactions",
                columns: new[] { "UserId", "CreatedAtUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_CanteenOrders_CanteenOrderId",
                table: "Payments",
                column: "CanteenOrderId",
                principalTable: "CanteenOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_ShopOrders_ShopOrderId",
                table: "Payments",
                column: "ShopOrderId",
                principalTable: "ShopOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_CanteenOrders_CanteenOrderId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_ShopOrders_ShopOrderId",
                table: "Payments");

            migrationBuilder.DropTable(
                name: "BranchStocks");

            migrationBuilder.DropTable(
                name: "CanteenItems");

            migrationBuilder.DropTable(
                name: "CanteenOrderItem");

            migrationBuilder.DropTable(
                name: "ShopOrderItem");

            migrationBuilder.DropTable(
                name: "Wallets");

            migrationBuilder.DropTable(
                name: "WalletTransactions");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "CanteenOrders");

            migrationBuilder.DropTable(
                name: "ShopOrders");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Payments_CanteenOrderId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_ShopOrderId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "CanteenOrderId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Purpose",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ShopOrderId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "MembersOnly",
                table: "DiscountCodes");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "DiscountCodes");

            migrationBuilder.DropColumn(
                name: "DiscountAmountToman",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "EligibleBranchSlugs",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "MaxRedemptions",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "RedemptionCount",
                table: "Campaigns");

            migrationBuilder.AlterColumn<int>(
                name: "MembershipId",
                table: "Payments",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
