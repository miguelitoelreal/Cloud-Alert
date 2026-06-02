using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CloudAlertApp.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NombreEmpresa = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ServicioPrincipal = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Servicios = table.Column<List<string>>(type: "text[]", nullable: false),
                    CorreoAdministrador = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Priorizado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                });

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

            migrationBuilder.CreateTable(
                name: "Proveedores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proveedores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Incidentes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Severidad = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    Servicio = table.Column<string>(type: "text", nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UrlDetalle = table.Column<string>(type: "text", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    ProveedorId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incidentes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Incidentes_Proveedores_ProveedorId",
                        column: x => x.ProveedorId,
                        principalTable: "Proveedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_CorreoAdministrador",
                table: "Clientes",
                column: "CorreoAdministrador",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Incidentes_ProveedorId",
                table: "Incidentes",
                column: "ProveedorId");

            migrationBuilder.CreateIndex(
                name: "IX_LatencyMeasurements_ServiceName_MeasuredAtUtc",
                table: "LatencyMeasurements",
                columns: new[] { "ServiceName", "MeasuredAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Clientes");

            migrationBuilder.DropTable(
                name: "Incidentes");

            migrationBuilder.DropTable(
                name: "LatencyMeasurements");

            migrationBuilder.DropTable(
                name: "Proveedores");
        }
    }
}
