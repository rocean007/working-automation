import dbConnect from '../../lib/mongodb';
import { Job, Analytics } from '../../lib/models';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total, analytics] = await Promise.all([
      Job.find({}).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip),
      Job.countDocuments({}),
      Analytics.find({}).sort({ date: -1 }).limit(7),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayAnalytics = analytics.find(a => a.date === today) || {
      videosGenerated: 0,
      videosUploaded: 0,
      failures: 0,
    };

    // Calculate success rate
    const totalCompleted = await Job.countDocuments({ status: 'completed' });
    const totalJobs = await Job.countDocuments({});
    const successRate = totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0;

    return res.status(200).json({
      jobs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      todayStats: todayAnalytics,
      successRate,
      analytics,
    });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (id) {
      await Job.deleteOne({ id });
    } else {
      await Job.deleteMany({});
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
