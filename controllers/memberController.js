const User = require('../models/user');
const Admin = require('../models/admin');
const Subscription = require('../models/subscription');
const Finance = require('../models/finance');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PLAN_DURATIONS = {
  '1 Month': 30,
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
  'Custom': 0
};

function calculateDaysLeft(subscription_plan, extra_days, start_date = null) {
  const planDays = subscription_plan.toLowerCase() === 'custom' ? 0 : getPlanDays(subscription_plan);
  const extra = Number(extra_days) || 0;

  if (!start_date) {
    return null;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(start_date);
  start.setHours(0,0,0,0);

  if (start > today) {
    return null;
  }

  // Subscription has started
  let daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  let totalDays = planDays + extra;
  let daysLeft = totalDays - daysPassed;

  // For custom plan, only use extra_days
  if (subscription_plan.toLowerCase() === 'custom') {
    daysLeft = extra - daysPassed;
  }

  return daysLeft >= 0 ? daysLeft : 0;
}

function getPlanDays(plan) {

  if (plan.toLowerCase() === '1 month') {
    return 30;
  } else if (plan.toLowerCase() === '3 months') {
    return 90;
  } else if (plan.toLowerCase() === '6 months') {
    return 180;
  } else if (plan.toLowerCase() === '1 year') {
    return 365;
  }

  return 0;
}

function getPlanDuration(plan, extra_days) {
  return (PLAN_DURATIONS[plan] || 0) + (Number(extra_days) || 0);
}

// Shared helper function to calculate days left using Math.ceil
function getDaysLeft(sub) {
  if (!sub?.end_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(sub.end_date);
  end.setHours(0, 0, 0, 0);
  // Use Math.ceil for rounding up
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

// Helper to determine subscription status
function getSubscriptionStatus(start_date, end_date) {
  const today = new Date();
  if (start_date > today) return 'Upcoming';
  if (end_date < today) return 'Expired';
  return 'Active';
}

exports.addMember = async (req, res) => {
  try {
    const { roll_no, name, phone_number, height, weight, age, gender, address } = req.body;
    const adminId = req.user.id;

    if (!roll_no || !name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check for duplicate roll_no
    const existing = await User.findOne({ roll_no, gym_id: adminId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Member with this roll number already exists in this gym' });
    }

    // Upload image to Cloudinary (if provided)
    let imageUrl = '';
    if (req.file) {
      // Save buffer to a temporary file
      const tempPath = path.join(os.tmpdir(), `${Date.now()}-${req.file.originalname}`);
      fs.writeFileSync(tempPath, req.file.buffer);

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(tempPath, {
        folder: 'gym-members',
      });
      imageUrl = result.secure_url;

      // Remove temp file
      fs.unlinkSync(tempPath);
    }

    const member = new User({
      roll_no,
      name,
      phone_number,
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      age: age ? Number(age) : undefined,
      gender,
      address,
      image: imageUrl,
      gym_id: adminId,
      subscriptions: [],
    });

    await member.save();
    await member.populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });

    return res.status(201).json({ success: true, member });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.gym_id && err.keyPattern?.roll_no) {
      return res.status(400).json({ success: false, message: 'Member with this roll number already exists in this gym' });
    }
    console.error('Add member error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMembers = async (req, res) => {
  try {
    const { filter = 'all' } = req.query; // Add filter parameter
    const gymId = req.user.gym_id; // Use authenticated user's gym_id

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(gymId)) {
      return res.status(400).json({ success: false, message: 'Invalid gym_id' });
    }

    // Get all members first, sorted by updatedAt in descending order (most recently updated first)
    let members = await User.find({ gym_id: gymId })
      .sort({ updatedAt: -1 })
      .populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });

    // Update subscription statuses before filtering
    for (const member of members) {
      if (member.subscriptions && member.subscriptions.length > 0) {
        for (const sub of member.subscriptions) {
          if (!sub.start_date || !sub.end_date) continue;
          const today = new Date();
          today.setHours(0,0,0,0);
          const start = new Date(sub.start_date);
          start.setHours(0,0,0,0);
          const end = new Date(sub.end_date);
          end.setHours(0,0,0,0);
          if (sub.status === 'Upcoming' && start <= today) {
            sub.status = 'Active';
            await sub.save();
          } else if (sub.status === 'Active' && end < today) {
            sub.status = 'Expired';
            await sub.save();
          }
        }
      }
    }

    // Filter members based on subscription status
    let filteredMembers = members;
    if (filter === 'active') {
      filteredMembers = members.filter(member => {
        if (!member.subscriptions || member.subscriptions.length === 0) return false;
        return member.subscriptions.some(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Active' || status === 'Upcoming';
        });
      });
    } else if (filter === 'inactive') {
      filteredMembers = members.filter(member => {
        if (!member.subscriptions || member.subscriptions.length === 0) return true; // No subscription = inactive
        // Check if all subscriptions are expired
        return member.subscriptions.every(sub => {
          if (!sub.start_date || !sub.end_date) return true; // Invalid subscription = inactive
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Expired';
        });
      });
    }
    // For 'all' filter, use all members (no additional filtering)

    // Apply pagination to filtered results
    const totalMembers = filteredMembers.length;
    const paginatedMembers = filteredMembers.slice(skip, skip + limit);

    // Attach active subscription info, plan name, and days left to each member
    const mapped = paginatedMembers.map(member => {
      let activeSubscription = null;
      let planName = null;
      let daysLeft = null;
      let daysLeftDisplay = null;
      let hasUpcoming = false;

      if (member.subscriptions && member.subscriptions.length > 0) {
        activeSubscription = member.subscriptions.find(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Active';
        }) || null;

        // Check for upcoming subscription
        hasUpcoming = member.subscriptions.some(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Upcoming';
        });

        if (activeSubscription) {
          planName = activeSubscription.plan || null;
          daysLeft = getDaysLeft(activeSubscription); // Use shared helper
          if (daysLeft === null) {
            if (activeSubscription.start_date && new Date(activeSubscription.start_date) > new Date()) {
              daysLeftDisplay = 'Yet to start';
            } else if (!activeSubscription.start_date) {
              daysLeftDisplay = 'Pending start';
            } else {
              daysLeftDisplay = null;
            }
          } else {
            daysLeftDisplay = daysLeft;
          }
        }
      }

      // If no active subscription or daysLeftDisplay is still null, set a fallback string
      if (!activeSubscription || daysLeftDisplay === null) {
        if (hasUpcoming) {
          daysLeftDisplay = 'Yet to start';
        } else {
          daysLeftDisplay = 'No active subscription';
        }
      }

      return {
        ...member.toObject(),
        active_subscription: activeSubscription,
        subscription_plan: planName,
        days_left: daysLeftDisplay
      };
    });

    res.status(200).json({
      success: true,
      members: mapped,
      totalMembers,
      currentPage: page,
      totalPages: Math.ceil(totalMembers / limit),
      filter: filter
    });

  } catch (err) {
    console.error('Get members error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.expiredSubscriptions = async (req, res) => {
  try {
    // Use authenticated user's gym_id (works for both admin and manager)
    const gymId = req.user.gym_id;
    
    // Find all users for this gym
    const members = await User.find({ gym_id: gymId }).populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });
    // Filter those whose latest subscription is expired
    const expired = members.filter(member => {
      const latestSub = member.subscriptions && member.subscriptions.length > 0 ? member.subscriptions[0] : null;
      return latestSub && latestSub.end_date && new Date(latestSub.end_date) < new Date();
    });
    
    // Sort expired subscriptions by end_date in descending order (newly expired first)
    const sortedExpired = expired.sort((a, b) => {
      const aEndDate = a.subscriptions[0]?.end_date;
      const bEndDate = b.subscriptions[0]?.end_date;
      return new Date(bEndDate) - new Date(aEndDate);
    });
    
    return res.status(200).json({ success: true, expiredSubscriptions: sortedExpired });
  } catch (err) {
    console.error('Get expired subscriptions error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.expiringSoon = async (req, res) => {
  try {
    // Use authenticated user's gym_id (works for both admin and manager)
    const gymId = req.user.gym_id;
    
    const members = await User.find({ gym_id: gymId }).populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });

    // Calculate days_left for each member and then filter
    const expiringSoon = members.map(member => {
      const latestSub = member.subscriptions?.[0];
      const daysLeft = getDaysLeft(latestSub); // Use shared helper
      if (daysLeft === null) {
        return null;
      }
      return {
        ...member.toObject(),
        days_left: daysLeft,
        subscription_plan: latestSub.plan
      };
    })
    .filter(member => member && member.days_left >= 0 && member.days_left <= 10)
    .sort((a, b) => a.days_left - b.days_left);

    return res.status(200).json({ success: true, expiringSoon });

  } catch (err) {
    console.error('Get expiring soon error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid member ID' });
    }
    const member = await User.findById(req.params.id).populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });
    return res.status(200).json({ success: true, member, image: member.image });
  } catch (err) {
    console.error('Get member by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.subscriptions;

    // 1. Fetch the existing member
    const member = await User.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // 2. Check for duplicate roll_no if being updated
    if (updateData.roll_no) {
      const duplicate = await User.findOne({
        _id: { $ne: req.params.id },
        gym_id: member.gym_id,
        roll_no: updateData.roll_no
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another member with this roll number already exists in this gym' });
      }
    }

    // 3. Upload new image if present
    if (req.file && req.file.buffer) {
      const uploadResult = await cloudinary.uploader.upload_stream(
        { folder: 'member_images' },
        (error, result) => {
          if (error) throw error;
          updateData.image = result.secure_url;
        }
      );

      // Pipe the buffer to cloudinary stream
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'member_images' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ success: false, message: 'Image upload failed' });
          }
          updateData.image = result.secure_url;

          // Proceed with update after upload
          proceedWithUpdate();
        }
      );
      stream.end(req.file.buffer);
      return;

      async function proceedWithUpdate() {
        const updatedMember = await User.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true }
        ).populate({
          path: 'subscriptions',
          options: { sort: { start_date: -1 } }
        });

        return res.status(200).json({ success: true, member: updatedMember });
      }
    } else {
      // 4. If no image, proceed with update directly
      const updatedMember = await User.findByIdAndUpdate( 
        req.params.id,
        updateData,
        { new: true }
      ).populate({
        path: 'subscriptions',
        options: { sort: { start_date: -1 } }
      });

      return res.status(200).json({ success: true, member: updatedMember });
    }
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.gym_id && err.keyPattern?.roll_no) {
      return res.status(400).json({ success: false, message: 'Another member with this roll number already exists in this gym' });
    }
    console.error('Update member error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.searchMembers = async (req, res) => {
  try {
    const { q, filter = 'all' } = req.query;
    console.log('Search query:', q, 'Filter:', filter);
    
    const gymId = req.user.gym_id;
    
    // Build the base query
    let query = { gym_id: gymId };
    
    // Add search conditions if query exists
    if (q && q.trim()) {
      const regex = new RegExp(q, 'i');
      query.$or = [
        { name: regex },
        { roll_no: regex },
        { phone_number: regex },
        { gender: regex },
        { address: regex }
      ];
    }
    
    // Get members with search and populate subscriptions
    let members = await User.find(query).populate({ path: 'subscriptions', options: { sort: { start_date: -1 } } });
    
    // Update subscription statuses before filtering
    for (const member of members) {
      if (member.subscriptions && member.subscriptions.length > 0) {
        for (const sub of member.subscriptions) {
          if (!sub.start_date || !sub.end_date) continue;
          const today = new Date();
          today.setHours(0,0,0,0);
          const start = new Date(sub.start_date);
          start.setHours(0,0,0,0);
          const end = new Date(sub.end_date);
          end.setHours(0,0,0,0);
          if (sub.status === 'Upcoming' && start <= today) {
            sub.status = 'Active';
            await sub.save();
          } else if (sub.status === 'Active' && end < today) {
            sub.status = 'Expired';
            await sub.save();
          }
        }
      }
    }
    
    // Apply status filter
    let filteredMembers = members;
    if (filter === 'active') {
      filteredMembers = members.filter(member => {
        if (!member.subscriptions || member.subscriptions.length === 0) return false;
        return member.subscriptions.some(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Active' || status === 'Upcoming';
        });
      });
    } else if (filter === 'inactive') {
      filteredMembers = members.filter(member => {
        if (!member.subscriptions || member.subscriptions.length === 0) return true; // No subscription = inactive
        // Check if all subscriptions are expired
        return member.subscriptions.every(sub => {
          if (!sub.start_date || !sub.end_date) return true; // Invalid subscription = inactive
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Expired';
        });
      });
    }
    // For 'all' filter, use all members (no additional filtering)
    
    // Attach active subscription info, plan name, and days left to each member
    const mapped = filteredMembers.map(member => {
      let activeSubscription = null;
      let planName = null;
      let daysLeft = null;
      let daysLeftDisplay = null;
      let hasUpcoming = false;

      if (member.subscriptions && member.subscriptions.length > 0) {
        activeSubscription = member.subscriptions.find(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Active';
        }) || null;

        // Check for upcoming subscriptions
        hasUpcoming = member.subscriptions.some(sub => {
          if (!sub.start_date || !sub.end_date) return false;
          const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
          return status === 'Upcoming';
        });

        if (activeSubscription) {
          planName = activeSubscription.plan;
          daysLeft = getDaysLeft(activeSubscription);
          daysLeftDisplay = daysLeft !== null ? `${daysLeft} ${daysLeft === 1 ? "Day" : "Days"} left` : 'N/A';
        } else if (hasUpcoming) {
          const upcomingSub = member.subscriptions.find(sub => {
            if (!sub.start_date || !sub.end_date) return false;
            const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
            return status === 'Upcoming';
          });
          planName = upcomingSub.plan;
          daysLeft = getDaysLeft(upcomingSub);
          daysLeftDisplay = daysLeft !== null ? `Starts in ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "Day" : "Days"}` : 'N/A';
        } else {
          // All subscriptions are expired
          const lastSub = member.subscriptions[0];
          planName = lastSub.plan;
          daysLeft = getDaysLeft(lastSub);
          daysLeftDisplay = daysLeft !== null && daysLeft < 0 ? 'Expired' : 'N/A';
        }
      }

      return {
        ...member.toObject(),
        planName,
        days_left: daysLeft,
        days_left_display: daysLeftDisplay,
        activeSubscription,
        hasUpcoming
      };
    });
    
    return res.status(200).json({ 
      success: true,
      members: mapped,
      totalMembers: mapped.length
    });
  } catch (err) {
    console.error('Search members error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add a new subscription for a user
exports.addSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    let { plan, amount, extra_days, start_date, end_date, status } = req.body;
    console.log('Add subscription request:', { userId, plan, amount, extra_days, start_date, end_date, status });

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate required fields
    if (!plan || !start_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields: plan and start_date are required.' });
    }
    // Sanitize and validate types
    amount = Number(amount) || 0;
    extra_days = Number(extra_days) || 0;
    if (isNaN(amount) || isNaN(extra_days)) {
      return res.status(400).json({ success: false, message: 'Amount and extra_days must be numbers.' });
    }
    if (isNaN(Date.parse(start_date))) {
      return res.status(400).json({ success: false, message: 'Invalid start_date.' });
    }
    if (end_date && isNaN(Date.parse(end_date))) {
      return res.status(400).json({ success: false, message: 'Invalid end_date.' });
    }
    // For Custom plan, extra_days is required and must be > 0
    if (plan && plan.toLowerCase() === 'custom') {
      if (!extra_days || extra_days <= 0) {
        return res.status(400).json({ success: false, message: 'For Custom plan, extra_days must be a positive number.' });
      }
    }
    // Calculate end_date if not provided
    if (!end_date) {
      const start = new Date(start_date);
      let duration;
      if (plan && plan.toLowerCase() === 'custom') {
        duration = extra_days;
      } else {
        duration = getPlanDuration(plan, extra_days);
      }
      end_date = new Date(start);
      end_date.setDate(end_date.getDate() + duration - 1);
    }
    if (!status) {
      status = getSubscriptionStatus(new Date(start_date), new Date(end_date));
    }
    // Prevent duplicate active subscriptions for the same period
    const overlap = await Subscription.findOne({
      user: userId,
      $or: [
        { start_date: { $lte: end_date }, end_date: { $gte: start_date } },
        { start_date: { $lte: start_date }, end_date: { $gte: start_date } }
      ],
      status: { $in: ['Active', 'Upcoming'] }
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: 'Overlapping active/upcoming subscription exists.' });
    }

    // Calculate days left
    const daysLeft = calculateDaysLeft(plan, extra_days, start_date);

    const subscription = new Subscription({
      user: userId,
      plan,
      amount,
      extra_days,
      start_date,
      end_date,
      status,
      gym_id: user.gym_id,
      days_left: daysLeft
    });
    await subscription.save();
    await User.findByIdAndUpdate(userId, { $push: { subscriptions: subscription._id } });

    // Create finance record for the subscription
    if (amount > 0) {
      const financeRecord = new Finance({
        admin: user.gym_id,
        user: userId,
        type: 'income',
        amount: amount,
        description: `Subscription payment for ${plan} plan`,
        plan: plan,
        date: new Date(),
        category: 'subscription'
      });
      await financeRecord.save();
    }

    return res.status(201).json({ success: true, subscription });
  } catch (err) {
    console.error('Add subscription error:', err, err.stack);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get all subscriptions for a user, with filter
exports.getSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter } = req.query; // all, expired, current, upcoming
    let query = { user: userId };
    const today = new Date();
    if (filter === 'expired') {
      query.end_date = { $lt: today };
    } else if (filter === 'current') {
      query.start_date = { $lte: today };
      query.end_date = { $gte: today };
    } else if (filter === 'upcoming') {
      query.start_date = { $gt: today };
    }
    let subscriptions = await Subscription.find(query).sort({ start_date: -1 });
    // Always recalculate status before returning
    subscriptions = await Promise.all(subscriptions.map(async sub => {
      const status = getSubscriptionStatus(new Date(sub.start_date), new Date(sub.end_date));
      if (sub.status !== status) {
        sub.status = status;
        await sub.save();
      }
      return sub;
    }));
    return res.status(200).json({ success: true, subscriptions });
  } catch (err) {
    console.error('Get subscriptions error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a subscription
exports.updateSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    let { plan, amount, extra_days, start_date } = req.body;

    // Validate subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Validate required fields
    if (!plan || !start_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields: plan and start_date are required.' });
    }

    // Sanitize and validate types
    amount = Number(amount) || 0;
    extra_days = Number(extra_days) || 0;
    if (isNaN(amount) || isNaN(extra_days)) {
      return res.status(400).json({ success: false, message: 'Amount and extra_days must be numbers.' });
    }
    if (isNaN(Date.parse(start_date))) {
      return res.status(400).json({ success: false, message: 'Invalid start_date.' });
    }

    // For Custom plan, extra_days is required and must be > 0
    if (plan && plan.toLowerCase() === 'custom') {
      if (!extra_days || extra_days <= 0) {
        return res.status(400).json({ success: false, message: 'For Custom plan, extra_days must be a positive number.' });
      }
    }

    // Calculate new end_date
    const start = new Date(start_date);
    let duration;
    if (plan && plan.toLowerCase() === 'custom') {
      duration = extra_days;
    } else {
      duration = getPlanDuration(plan, extra_days);
    }
    const end_date = new Date(start);
    end_date.setDate(end_date.getDate() + duration - 1);

    // Calculate new status
    const status = getSubscriptionStatus(start, end_date);

    // Calculate new days left
    const daysLeft = calculateDaysLeft(plan, extra_days, start_date);

    // Store old amount for finance update
    const oldAmount = subscription.amount;

    // Update subscription
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        plan,
        amount,
        extra_days,
        start_date,
        end_date,
        status,
        days_left: daysLeft
      },
      { new: true, runValidators: true }
    );

    // Update finance record if amount changed
    if (oldAmount !== amount) {
      // Find and update the corresponding finance record
      const financeRecord = await Finance.findOne({
        user: subscription.user,
        plan: subscription.plan,
        amount: oldAmount,
        category: 'subscription'
      });

      if (financeRecord) {
        financeRecord.amount = amount;
        financeRecord.plan = plan;
        financeRecord.description = `Subscription payment for ${plan} plan`;
        await financeRecord.save();
      } else {
        // If no exact match found, try to find by user and plan only
        const alternativeRecord = await Finance.findOne({
          user: subscription.user,
          plan: subscription.plan,
          category: 'subscription'
        });

        if (alternativeRecord) {
          alternativeRecord.amount = amount;
          alternativeRecord.description = `Subscription payment for ${plan} plan`;
          await alternativeRecord.save();
        }
      }
    } else if (subscription.plan !== plan) {
      // If only plan changed, update the finance record
      const financeRecord = await Finance.findOne({
        user: subscription.user,
        plan: subscription.plan,
        category: 'subscription'
      });

      if (financeRecord) {
        financeRecord.plan = plan;
        financeRecord.description = `Subscription payment for ${plan} plan`;
        await financeRecord.save();
      }
    }

    return res.status(200).json({ success: true, subscription: updatedSubscription });

  } catch (err) {
    console.error('Update subscription error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Validate subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Remove subscription from user's subscriptions array
    await User.findByIdAndUpdate(
      subscription.user,
      { $pull: { subscriptions: subscriptionId } }
    );

    // Delete the subscription
    await Subscription.findByIdAndDelete(subscriptionId);

    // Remove corresponding finance record
    await Finance.findOneAndDelete({
      user: subscription.user,
      plan: subscription.plan,
      amount: subscription.amount,
      category: 'subscription'
    });

    return res.status(200).json({ success: true, message: 'Subscription deleted successfully' });

  } catch (err) {
    console.error('Delete subscription error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};