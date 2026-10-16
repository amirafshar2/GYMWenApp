namespace KhashayarGym.Domain.Enums;

public enum MembershipStatus { PendingPayment = 0, Active = 1, Expired = 2, Cancelled = 3 }

public enum PaymentStatus { Pending = 0, Succeeded = 1, Failed = 2, Cancelled = 3 }

/// <summary>هدف کد یکبارمصرف؛ کد ورود برای امضای قرارداد پذیرفته نمی‌شود و برعکس.</summary>
public enum OtpPurpose { Login = 0, SignContract = 1 }

public enum Gender { Male = 1, Female = 2 }

public enum CredentialType { QrCard = 0, RfidWristband = 1, RfidCard = 2, External = 3 }

public enum AccessDecision { Allowed = 1, Denied = 2 }

public enum AccessDenyReason
{
    None = 0,
    UnknownCredential = 1,
    CredentialRevoked = 2,
    NoActiveMembership = 3,
    WrongBranch = 4,
    WrongSection = 5,
    NoSessionsLeft = 6,
}

// ---- فاز ۳ ----
public enum PaymentPurpose { Membership = 0, ShopOrder = 1, CanteenOrder = 2, WalletTopUp = 3 }

public enum PayMethod { Gateway = 0, Wallet = 1 }

public enum ProductKind { Supplement = 0, Apparel = 1, Gear = 2 }

public enum OrderStatus { PendingPayment = 0, Paid = 1, ReadyForPickup = 2, Shipped = 3, Completed = 4, Cancelled = 5 }

public enum Fulfillment { Pickup = 0, Delivery = 1 }

public enum CanteenCategory { Coffee = 0, Shake = 1, Drink = 2, Snack = 3, Meal = 4 }

public enum CanteenOrderStatus { PendingPayment = 0, Queued = 1, Preparing = 2, Ready = 3, Collected = 4, Cancelled = 5 }

public enum WalletTxType { TopUp = 0, ShopPurchase = 1, CanteenPurchase = 2, Refund = 3, Adjustment = 4 }

/// <summary>کد تخفیف برای کدام خرید معتبر است.</summary>
public enum DiscountScope { Membership = 0, Shop = 1, Any = 2 }
