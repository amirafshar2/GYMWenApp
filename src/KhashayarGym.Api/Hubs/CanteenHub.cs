using KhashayarGym.Api.Auth;
using KhashayarGym.Business.Common;
using KhashayarGym.Business.Dtos;
using KhashayarGym.DataAccess;
using KhashayarGym.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KhashayarGym.Api.Hubs;

/// <summary>پیام‌های سرور به مرورگر (Hub تایپ‌شده)</summary>
public interface ICanteenClient
{
    Task OrderChanged(CanteenOrderDto order);
}

/// <summary>
/// بوفهٔ لحظه‌ای: کارکنان بوفه به گروه شعبه می‌پیوندند و سفارش‌های تازه را فوراً می‌بینند؛
/// عضو فقط به گروه سفارش خودش می‌پیوندد تا «آماده است» را بگیرد.
/// </summary>
[Authorize]
public sealed class CanteenHub(GymDbContext db) : Hub<ICanteenClient>
{
    public const string Path = "/hubs/canteen";
    public static string BranchGroup(int branchId) => $"canteen-branch:{branchId}";
    public static string OrderGroup(int orderId) => $"canteen-order:{orderId}";

    public async Task WatchBranch(string branchSlug)
    {
        var u = Context.User!;
        if (!(u.IsInRole(Roles.CanteenStaff) || u.IsInRole(Roles.BranchManager) || u.IsInRole(Roles.SuperAdmin)))
            throw new HubException("دسترسی ندارید.");
        var id = await db.Branches.Where(b => b.Slug == branchSlug).Select(b => (int?)b.Id).FirstOrDefaultAsync();
        if (id is null) throw new HubException("شعبه پیدا نشد.");
        await Groups.AddToGroupAsync(Context.ConnectionId, BranchGroup(id.Value));
    }

    public async Task WatchOrder(int orderId)
    {
        var userId = Context.User!.UserId();
        if (!await db.CanteenOrders.AnyAsync(o => o.Id == orderId && o.UserId == userId)) throw new HubException("سفارش پیدا نشد.");
        await Groups.AddToGroupAsync(Context.ConnectionId, OrderGroup(orderId));
    }
}

public sealed class SignalRCanteenNotifier(IHubContext<CanteenHub, ICanteenClient> hub, GymDbContext db) : ICanteenNotifier
{
    public async Task OrderChangedAsync(CanteenOrderDto order, CancellationToken ct)
    {
        await hub.Clients.Group(CanteenHub.BranchGroup(order.BranchId)).OrderChanged(order);
        // به خود عضو نام مشتری نمی‌رود (لازم نیست)
        await hub.Clients.Group(CanteenHub.OrderGroup(order.Id)).OrderChanged(order with { CustomerName = null });
    }
}
