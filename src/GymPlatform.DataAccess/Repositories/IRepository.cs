using System.Linq.Expressions;
using GymPlatform.Domain.Entities;

namespace GymPlatform.DataAccess.Repositories;

public interface IRepository<T> where T : BaseEntity
{
    Task<List<T>> ListAsync(
        Expression<Func<T, bool>>? filter = null,
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null,
        CancellationToken ct = default);

    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> filter, CancellationToken ct = default);
    Task<bool> AnyAsync(Expression<Func<T, bool>> filter, CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
