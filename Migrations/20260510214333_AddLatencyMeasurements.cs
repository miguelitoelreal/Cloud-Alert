using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CloudAlertApp.Migrations
{
    /// <inheritdoc />
    public partial class AddLatencyMeasurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LatencyMeasurements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServiceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EndpointUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Protocol = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ProbeCount = table.Column<int>(type: "integer", nullable: false),
                    SuccessCount = table.Column<int>(type: "integer", nullable: false),
                    MinMs = table.Column<double>(type: "double precision", nullable: false),
                    AvgMs = table.Column<double>(type: "double precision", nullable: false),
                    MaxMs = table.Column<double>(type: "double precision", nullable: false),
                    DnsMs = table.Column<double>(type: "double precision", nullable: false),
                    ConnectMs = table.Column<double>(type: "double precision", nullable: false),
                    TlsMs = table.Column<double>(type: "double precision", nullable: false),
                    ResponseMs = table.Column<double>(type: "double precision", nullable: false),
                    TotalMs = table.Column<double>(type: "double precision", nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    IsContentValid = table.Column<bool>(type: "boolean", nullable: false),
                    IsStable = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    MeasuredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LatencyMeasurements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LatencyMeasurements_ServiceName_MeasuredAtUtc",
                table: "LatencyMeasurements",
                columns: new[] { "ServiceName", "MeasuredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LatencyMeasurements");
        }
    }
}
