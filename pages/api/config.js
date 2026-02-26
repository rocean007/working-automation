import dbConnect from '../../lib/mongodb';
import { Config } from '../../lib/models';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const configs = await Config.find({});
    const result = {};
    configs.forEach(c => { result[c.key] = c.value; });
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Config.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date() },
        { upsert: true }
      );
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
