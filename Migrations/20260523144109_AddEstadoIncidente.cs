using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CloudAlertApp.Migrations
{
    /// <inheritdoc />
    public partial class AddEstadoIncidente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Estado",
                table: "Incidentes",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Estado",
                table: "Incidentes");
        }
    }
}
