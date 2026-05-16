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
        }
    }
}