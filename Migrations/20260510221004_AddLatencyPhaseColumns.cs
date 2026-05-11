using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudAlertApp.Migrations
{
    /// <inheritdoc />
    public partial class AddLatencyPhaseColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "ConnectMs",
                table: "LatencyMeasurements",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "DnsMs",
                table: "LatencyMeasurements",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<bool>(
                name: "IsContentValid",
                table: "LatencyMeasurements",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "ResponseMs",
                table: "LatencyMeasurements",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "StatusCode",
                table: "LatencyMeasurements",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "TlsMs",
                table: "LatencyMeasurements",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TotalMs",
                table: "LatencyMeasurements",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConnectMs",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "DnsMs",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "IsContentValid",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "ResponseMs",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "StatusCode",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "TlsMs",
                table: "LatencyMeasurements");

            migrationBuilder.DropColumn(
                name: "TotalMs",
                table: "LatencyMeasurements");
        }
    }
}
