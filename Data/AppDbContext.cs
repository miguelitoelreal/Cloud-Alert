using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CloudAlertApp.Models;

namespace CloudAlertApp.Data
{
    public class AppDbContext : DbContext
    {
      public DbSet<Cliente> Clientes { get; set; }

      public DbSet<Proveedor> Proveedores { get; set; }
      public DbSet<Incidente> Incidentes { get; set; }
      public DbSet<LatencyMeasurement> LatencyMeasurements { get; set; }

      public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
      {
      }

      protected override void OnModelCreating(ModelBuilder modelBuilder)
      {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Cliente>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.NombreEmpresa)
                      .IsRequired()
                      .HasMaxLength(150);

                entity.Property(e => e.ServicioPrincipal)
                      .IsRequired()
                      .HasMaxLength(100);

                entity.Property(e => e.CorreoAdministrador)
                      .IsRequired()
                      .HasMaxLength(150);

                entity.Property(e => e.FechaRegistro)
                      .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(e => e.Activo)
                      .HasDefaultValue(true);

                // Índice útil
                entity.HasIndex(e => e.CorreoAdministrador)
                      .IsUnique();
            });

            modelBuilder.Entity<Proveedor>(entity =>
            {
                  entity.HasKey(p => p.Id);

                  entity.Property(p => p.Nombre)
                        .IsRequired()
                        .HasMaxLength(100);
            });

            modelBuilder.Entity<Incidente>(entity =>
            {
                  entity.HasKey(i => i.Id);

                  entity.Property(i => i.Titulo).IsRequired();
                  entity.Property(i => i.Descripcion).IsRequired();

                  entity.HasOne(i => i.Proveedor)
                        .WithMany(p => p.Incidentes)
                        .HasForeignKey(i => i.ProveedorId);
            });

            modelBuilder.Entity<LatencyMeasurement>(entity =>
            {
                  entity.HasKey(e => e.Id);

                  entity.Property(e => e.ServiceName)
                        .IsRequired()
                        .HasMaxLength(150);

                  entity.Property(e => e.EndpointUrl)
                        .IsRequired()
                        .HasMaxLength(500);

                  entity.Property(e => e.Protocol)
                        .IsRequired()
                        .HasMaxLength(20);

                  entity.Property(e => e.IsContentValid)
                        .IsRequired();

                  entity.Property(e => e.Status)
                        .IsRequired()
                        .HasMaxLength(50);

                  entity.Property(e => e.MeasuredAtUtc)
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                  entity.HasIndex(e => new { e.ServiceName, e.MeasuredAtUtc });
            });
        }
    }
}