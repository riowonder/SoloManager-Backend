const Finance = require('../models/finance');
const Admin = require('../models/admin');

// Helper function to get date range based on period
function getDateRange(period) {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case 'current_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last_6_months':
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last_year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// Get finance data with period filter
exports.getFinanceData = async (req, res) => {
  try {
    const { period = 'current_month' } = req.query;
    const gymId = req.user.gym_id; // Use authenticated user's gym_id

    const { startDate, endDate } = getDateRange(period);

    // Get all finance records for the period, sorted by date (most recent first)
    const financeRecords = await Finance.find({
      admin: gymId,
      date: { $gte: startDate, $lte: endDate },
      type: 'income'
    }).populate('user', 'name roll_no').sort({ date: -1 });

    // Aggregate data by plan
    const planAggregation = await Finance.aggregate([
      {
        $match: {
          admin: gymId,
          date: { $gte: startDate, $lte: endDate },
          type: 'income'
        }
      },
      {
        $group: {
          _id: '$plan',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Calculate total revenue
    const totalRevenue = financeRecords.reduce((sum, record) => sum + record.amount, 0);

    // Get highest revenue plan
    const highestRevenuePlan = planAggregation.length > 0 ? planAggregation[0] : null;

    // Format data for charts
    const chartData = planAggregation.map(item => ({
      plan: item._id || 'Unknown',
      revenue: item.totalAmount,
      count: item.count
    }));

    // Format table data (already sorted by date due to the query sort)
    const tableData = financeRecords.map(record => ({
      id: record._id,
      memberName: record.user?.name || 'Unknown',
      memberRollNo: record.user?.roll_no || 'N/A',
      plan: record.plan,
      amount: record.amount,
      date: record.date,
      description: record.description
    }));

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        totalRevenue,
        highestRevenuePlan: highestRevenuePlan ? {
          plan: highestRevenuePlan._id,
          revenue: highestRevenuePlan.totalAmount,
          count: highestRevenuePlan.count
        } : null,
        chartData,
        tableData,
        summary: {
          totalRecords: financeRecords.length,
          totalRevenue,
          averageRevenue: financeRecords.length > 0 ? totalRevenue / financeRecords.length : 0
        }
      }
    });

  } catch (error) {
    console.error('Get finance data error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all available periods summary
exports.getFinanceSummary = async (req, res) => {
  try {
    const gymId = req.user.gym_id; // Use authenticated user's gym_id

    const periods = ['current_month', 'last_month', 'last_6_months', 'last_year'];
    const summary = {};

    for (const period of periods) {
      const { startDate, endDate } = getDateRange(period);
      
      const totalRevenue = await Finance.aggregate([
        {
          $match: {
            admin: gymId,
            date: { $gte: startDate, $lte: endDate },
            type: 'income'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      summary[period] = {
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        totalRecords: totalRevenue.length > 0 ? totalRevenue[0].count : 0
      };
    }

    res.status(200).json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Get finance summary error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};  