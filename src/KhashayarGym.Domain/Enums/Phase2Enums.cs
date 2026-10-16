namespace KhashayarGym.Domain.Enums;

public enum MembershipStatus { PendingPayment = 0, Active = 1, Expired = 2, Cancelled = 3 }

public enum PaymentStatus { Pending = 0, Succeeded = 1, Failed = 2, Cancelled = 3 }

/// <summary>هدف کد یکبارمصرف؛ کد ورود برای امضای قرارداد پذیرفته نمی‌شود و برعکس.</summary>
public enum OtpPurpose { Login = 0, SignContract = 1 }

public enum Gender { Male = 1, Female = 2 }
