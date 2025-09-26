// /api/cron/subscriptions.js

import connectDB from "../../config/db.js"; // or your DB connect util
import Subscription from "../../models/subscription.js"; // adjust path as needed
import { sendExpiryMessage, sendReminderMessage } from "../../services/whatsappService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectDB();
  const now = new Date();

  try {
    // 1️⃣ Handle expired subscriptions
    const expiredSubs = await Subscription.find({
      end_date: { $lte: now },
      status: "Active",
      messageSent: false,
    }).populate("user");

    for (const sub of expiredSubs) {
      try {
        await sendExpiryMessage(sub.user, sub.plan, sub.extra_days, sub.end_date, sub.gym_id);
        sub.status = "Expired";
        sub.messageSent = true;
        await sub.save();
      } catch (err) {
        console.error(`❌ Error processing expired sub for user ${sub.user?._id || sub.user}:`, err);
      }
    }

    console.log(`✅ Processed ${expiredSubs.length} expired subscriptions`);

    // 2️⃣ Handle reminders for subs expiring in 2 days
    const twoDaysLaterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
    const twoDaysLaterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 59);

    const reminderSubs = await Subscription.find({
      end_date: { $gte: twoDaysLaterStart, $lte: twoDaysLaterEnd },
      status: "Active",
      reminderSent: false,
    }).populate("user");

    for (const sub of reminderSubs) {
      try {
        await sendReminderMessage(sub.user, sub.plan, sub.extra_days, sub.end_date, sub.gym_id);
        sub.reminderSent = true;
        await sub.save();
      } catch (err) {
        console.error(`❌ Error sending reminder for user ${sub.user?._id || sub.user}:`, err);
      }
    }

    console.log(`📩 Sent reminders for ${reminderSubs.length} subscriptions expiring in 2 days`);

    return res.status(200).json({
      success: true,
      expiredProcessed: expiredSubs.length,
      remindersSent: reminderSubs.length,
    });
  } catch (err) {
    console.error("❌ Cron job error:", err);
    return res.status(500).json({ error: "Cron job failed", details: err.message });
  }
}
