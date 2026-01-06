import User from "../../models/usersModel.js"
import FarmField from "../../models/fieldModel.js"
import { startOfDay, endOfDay, subDays, subWeeks, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const getDashboardAnalytics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    let start, end = new Date();

    // Handle periods
    switch (period) {
      case 'daily':
      case 'today':
        start = startOfDay(end);
        break;
      case 'weekly':
        start = startOfWeek(end);
        end = endOfWeek(end);
        break;
      case 'monthly':
        start = startOfMonth(end);
        end = endOfMonth(end);
        break;
      case 'yearly':
        start = startOfYear(end);
        end = endOfYear(end);
        break;
      default: // Custom or default today
        start = startDate ? new Date(startDate) : startOfDay(end);
        end = endDate ? new Date(endDate) : endOfDay(end);
    }

    if (start > end) throw new Error('Invalid range');

    // User Metrics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: start, $lte: end } });
    const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: start, $lte: end } }); // Used app in period
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } },
    ]);

    // FarmField Metrics
    const totalFields = await FarmField.countDocuments();
    const newFields = await FarmField.countDocuments({ createdAt: { $gte: start, $lte: end } }); // Farms drawn
    const fieldsByCrop = await FarmField.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$cropName', count: { $sum: 1 } } },
      { $project: { crop: '$_id', count: 1, _id: 0 } },
    ]);
    const fieldsByFarmingType = await FarmField.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$typeOfFarming', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);
    const fieldsByIrrigation = await FarmField.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$typeOfIrrigation', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]);

    // Optional: Trends (e.g., daily new users over period - for charts)
    const userGrowthTrend = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const fieldGrowthTrend = await FarmField.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      period,
      range: { start: start.toISOString(), end: end.toISOString() },
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        byRole: usersByRole,
        growthTrend: userGrowthTrend,
      },
      fields: {
        total: totalFields,
        new: newFields,
        byCrop: fieldsByCrop,
        byFarmingType: fieldsByFarmingType,
        byIrrigation: fieldsByIrrigation,
        growthTrend: fieldGrowthTrend,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};