import cron from 'node-cron';
import Subscription from '../models/subscription.js';
import { sendExpiryMessage, sendReminderMessage } from '../services/whatsappService.js';

cron.schedule("0 23 0 * * *", async () => {
  try {
    const now = new Date();

    // 1️⃣ Find already expired subscriptions
    const expiredSubs = await Subscription.find({
      end_date: { $lte: now },
      status: "Active",
      messageSent: false
    }).populate("user");

    for (const sub of expiredSubs) {
      try {
        // Edit the whatsapp service function to a normal function rather than a controller ------------>
        await sendExpiryMessage(sub.user, sub.plan, sub.extra_days, sub.end_date, sub.gym_id);
        sub.status = "Expired";
        sub.messageSent = true;
        await sub.save();
      } catch (err) {
        console.error(`❌ Error processing expired sub for user ${sub.user?._id || sub.user}:`, err);
      }
    }

    console.log(`✅ Processed ${expiredSubs.length} expired subscriptions`);

    // 2️⃣ Find subscriptions expiring in exactly 2 days
    const twoDaysLaterStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      0, 0, 0
    );

    const twoDaysLaterEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      23, 59, 59
    );

    const reminderSubs = await Subscription.find({
      end_date: { $gte: twoDaysLaterStart, $lte: twoDaysLaterEnd },
      status: "Active",
      reminderSent: false
    }).populate("user");

    for (const sub of reminderSubs) {
      try {
        await sendReminderMessage(sub.user, sub.plan, sub.extra_days, sub.end_date, sub.gym_id); // 👈 custom reminder sender
        sub.reminderSent = true; // avoid duplicate reminders
        await sub.save();
      } catch (err) {
        console.error(`❌ Error sending reminder for user ${sub.user?._id || sub.user}:`, err);
      }
    }

    console.log(`📩 Sent reminders for ${reminderSubs.length} subscriptions expiring in 2 days`);
  } catch (err) {
    console.error("❌ Cron job error:", err);
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
  }
});



