using GymPlatform.Api.Auth;
using GymPlatform.Business.Common;
using GymPlatform.Business.Dtos;
using GymPlatform.DataAccess;
using GymPlatform.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GymPlatform.Api.Hubs;

/// <summary>Servernachrichten an den Browser (typisierter Hub)</summary>
public interface ICanteenClient
{
    Task OrderChanged(CanteenOrderDto order);
}

/// <summary>
/// Live-Bistro: Bistro-Mitarbeiter treten der Filialgruppe bei und sehen neue Bestellungen sofort;
/// das Mitglied tritt nur der Gruppe seiner Bestellung bei, um „Fertig“ zu erhalten.
/// </summary>
[Authorize]
public sealed class CanteenHub(GymDbContext db, GymPlatform.Business.Services.Panel.IStaffScopeService scopes) : Hub<ICanteenClient>
{
    public const string Path = "/hubs/canteen";
    public static string BranchGroup(int branchId) => $"canteen-branch:{branchId}";
    public static string OrderGroup(int orderId) => $"canteen-order:{orderId}";

    public async Task WatchBranch(string branchSlug)
    {
        // Rolle und Filiale aus der Datenbank: Bistro-Mitarbeiter von Filiale „A“ sehen keine Bestellungen von Filiale „B“
        var scope = await scopes.ResolveFromDbAsync(Context.User!.UserId(), Context.ConnectionAborted);
        if (!(scope.Has(Roles.CanteenStaff) || scope.Has(Roles.BranchManager))) throw new HubException("Kein Zugriff.");
        var id = await scopes.BranchIdAsync(branchSlug, Context.ConnectionAborted);
        if (id is null) throw new HubException("Filiale nicht gefunden.");
        if (!scope.Can(id.Value)) throw new HubException("Kein Zugriff auf das Bistro dieser Filiale.");
        await Groups.AddToGroupAsync(Context.ConnectionId, BranchGroup(id.Value));
    }

    public async Task WatchOrder(int orderId)
    {
        var userId = Context.User!.UserId();
        if (!await db.CanteenOrders.AnyAsync(o => o.Id == orderId && o.UserId == userId)) throw new HubException("Bestellung nicht gefunden.");
        await Groups.AddToGroupAsync(Context.ConnectionId, OrderGroup(orderId));
    }
}

public sealed class SignalRCanteenNotifier(IHubContext<CanteenHub, ICanteenClient> hub, GymDbContext db) : ICanteenNotifier
{
    public async Task OrderChangedAsync(CanteenOrderDto order, CancellationToken ct)
    {
        await hub.Clients.Group(CanteenHub.BranchGroup(order.BranchId)).OrderChanged(order);
        // Das Mitglied selbst bekommt keinen Kundennamen (nicht nötig)
        await hub.Clients.Group(CanteenHub.OrderGroup(order.Id)).OrderChanged(order with { CustomerName = null });
    }
}
