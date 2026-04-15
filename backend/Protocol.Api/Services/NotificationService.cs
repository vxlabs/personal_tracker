using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using WebPush;
using PushSub = Protocol.Api.Models.PushSubscription;

namespace Protocol.Api.Services;

public record NotificationPreferenceDto(
    bool BlockTransition,
    bool HabitReminder,
    bool SleepWarning,
    bool DailyReview
);

public record PushSubscriptionDto(
    string Endpoint,
    string P256dh,
    string Auth
);

public class NotificationService(ProtocolDbContext db, IConfiguration config, ILogger<NotificationService> logger)
{
    public async Task SubscribeAsync(PushSubscriptionDto dto)
    {
        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == dto.Endpoint);

        if (existing != null)
        {
            existing.P256dh = dto.P256dh;
            existing.Auth = dto.Auth;
        }
        else
        {
            db.PushSubscriptions.Add(new PushSub
            {
                Endpoint = dto.Endpoint,
                P256dh = dto.P256dh,
                Auth = dto.Auth,
            });
        }

        await db.SaveChangesAsync();
    }

    public async Task UnsubscribeAsync(string endpoint)
    {
        var sub = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == endpoint);

        if (sub != null)
        {
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync();
        }
    }

    public async Task<NotificationPreferenceDto> GetPreferencesAsync()
    {
        var pref = await db.NotificationPreferences.FirstOrDefaultAsync();
        if (pref == null)
            return new NotificationPreferenceDto(true, true, true, true);

        return new NotificationPreferenceDto(
            pref.BlockTransition,
            pref.HabitReminder,
            pref.SleepWarning,
            pref.DailyReview
        );
    }

    public async Task<NotificationPreferenceDto> UpdatePreferencesAsync(NotificationPreferenceDto dto)
    {
        var pref = await db.NotificationPreferences.FirstOrDefaultAsync();
        if (pref == null)
        {
            pref = new Models.NotificationPreference();
            db.NotificationPreferences.Add(pref);
        }

        pref.BlockTransition = dto.BlockTransition;
        pref.HabitReminder = dto.HabitReminder;
        pref.SleepWarning = dto.SleepWarning;
        pref.DailyReview = dto.DailyReview;

        await db.SaveChangesAsync();

        return new NotificationPreferenceDto(
            pref.BlockTransition,
            pref.HabitReminder,
            pref.SleepWarning,
            pref.DailyReview
        );
    }

    public string GetVapidPublicKey() =>
        config["Vapid:PublicKey"] ?? string.Empty;

    public async Task SendToAllAsync(string title, string body, string? tag = null)
    {
        var vapidSubject = config["Vapid:Subject"]!;
        var vapidPublicKey = config["Vapid:PublicKey"]!;
        var vapidPrivateKey = config["Vapid:PrivateKey"]!;

        if (string.IsNullOrEmpty(vapidPublicKey) || string.IsNullOrEmpty(vapidPrivateKey))
        {
            logger.LogWarning("VAPID keys not configured — skipping push");
            return;
        }

        var client = new WebPushClient();
        client.SetVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        var payload = System.Text.Json.JsonSerializer.Serialize(new { title, body, tag });
        var subscriptions = await db.PushSubscriptions.ToListAsync();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await client.SendNotificationAsync(pushSub, payload);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                logger.LogInformation("Subscription expired, removing: {Endpoint}", sub.Endpoint);
                db.PushSubscriptions.Remove(sub);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send push to {Endpoint}", sub.Endpoint);
            }
        }

        await db.SaveChangesAsync();
    }
}
