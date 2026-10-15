using System.Linq.Expressions;
using KhashayarGym.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.DataAccess.Repositories;

/// <summary>ریپازیتوری عمومی. همهٔ کوئری‌ها از طریق LINQ/EF پارامتری اجرا می‌شوند (بدون SQL خام).</summary>
public class Repository<T>(GymDbContext db) : IRepository<T> where T : BaseEntity
{
    private readonly DbSet<T> _set = db.Set<T>();

    public async Task<List<T>> ListAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default)
    {
        IQueryable<T> q = _set.AsNoTracking();
        if (filter is not null) q = q.Where(filter);
        if (orderBy is not null) q = orderBy(q);
        return await q.ToListAsync(ct);
    }

    public Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> filter, CancellationToken ct = default) =>
        _set.AsNoTracking().FirstOrDefaultAsync(filter, ct);

    public Task<bool> AnyAsync(Expression<Func<T, bool>> filter, CancellationToken ct = default) =>
        _set.AnyAsync(filter, ct);

    public async Task AddAsync(T entity, CancellationToken ct = default) => await _set.AddAsync(entity, ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}
