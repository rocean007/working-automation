import dbConnect from '../../lib/mongodb';
import { Job, Analytics } from '../../lib/models';

export default async function handler(req, res) {
  await dbConnect();

  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(today);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [todayCompleted, totalCompleted, totalJobs, recentJob] = await Promise.all([
    Job.countDocuments({ status: 'completed', completedAt: { $gte: todayStart, $lt: todayEnd } }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({}),
    Job.findOne({ status: 'completed' }).sort({ completedAt: -1 }),
  ]);

  const successRate = totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0;

  return res.status(200).json({
    todayVideos: todayCompleted,
    totalVideos: totalCompleted,
    successRate,
    lastUpload: recentJob?.completedAt || null,
    lastVideoUrl: recentJob?.youtubeUrl || null,
  });
}
