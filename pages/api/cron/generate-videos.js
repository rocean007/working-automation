import dbConnect from '../../../lib/mongodb';
import { Job, Config, Analytics } from '../../../lib/models';
import { generateImage, generateVoice, generateScript } from '../../../lib/aiServices';
import { createVideo } from '../../../lib/videoCreator';
import { uploadToYouTube } from '../../../lib/youtubeUploader';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Brainrot characters dataset
const CHARACTERS = [
  { name: 'Skibidi Toilet', style: 'toilet head, waving, bathroom chaos' },
  { name: 'Sigma Cat', style: 'cool cat, sunglasses, sigma face, anime style' },
  { name: 'Baby Gronk', style: 'young football player, rizz pose, stadium' },
  { name: 'Fanum', style: 'streamer character, gaming setup, hoodie' },
  { name: 'Kai Cenat', style: 'energetic streamer, streaming chair, hype pose' },
  { name: 'Based Gigachad', style: 'ultra chad face, muscular, confident pose' },
  { name: 'NPC Girl', style: 'anime NPC character, pink hair, repetitive gestures' },
  { name: 'Rizz God', style: 'charismatic character, smooth pose, glowing aura' },
];

const TOP5_TOPICS = [
  'Most Brainrot Moments in History',
  'Sigma Moves That Hit Different',
  'Ohio Events That Should Not Exist',
  'Ultimate Rizz Techniques',
  'Peak Skibidi Moments',
  'Most Gyatt Moments Ever',
  'Bussin Brainrot Clips',
  'No Cap Best Memes of the Year',
];

export default async function handler(req, res) {
  // Security: verify this is called by Vercel cron or authenticated user
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow Vercel's internal cron calls (they don't send auth header the same way)
    const isCronCall = req.headers['x-vercel-cron'] === '1';
    if (!isCronCall) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Get config
    const configDocs = await Config.find({});
    const config = {};
    configDocs.forEach(doc => { config[doc.key] = doc.value; });

    const videosPerDay = config.videosPerDay || 5;
    const contentTypes = config.contentTypes || ['storytelling', 'dance', 'top5'];
    const uploadEnabled = config.uploadEnabled !== false;

    // Check how many videos were already generated today
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today);
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const todayJobs = await Job.countDocuments({
      status: 'completed',
      completedAt: { $gte: todayStart, $lt: todayEnd },
    });

    if (todayJobs >= videosPerDay) {
      return res.status(200).json({
        message: `Daily limit reached: ${todayJobs}/${videosPerDay} videos already generated today`,
        todayCount: todayJobs,
      });
    }

    // Pick random character and content type
    const character = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const topic = TOP5_TOPICS[Math.floor(Math.random() * TOP5_TOPICS.length)];

    // Create job record
    const jobId = uuidv4();
    const job = new Job({
      id: jobId,
      type: contentType,
      status: 'processing',
      character: character.name,
      createdAt: new Date(),
    });
    await job.save();

    console.log(`[CRON] Starting job ${jobId}: ${contentType} with ${character.name}`);

    try {
      // STEP 1: Generate script
      console.log('[CRON] Step 1: Generating script...');
      const script = await generateScript(contentType, character.name, topic);

      // STEP 2: Generate images
      console.log('[CRON] Step 2: Generating images...');
      const imagePrompts = generateImagePrompts(contentType, character, script);
      const imageBuffers = [];

      for (const prompt of imagePrompts) {
        try {
          const img = await generateImage(prompt);
          imageBuffers.push(img);
          await new Promise(r => setTimeout(r, 2000)); // Rate limit
        } catch (err) {
          console.error('Image generation error:', err.message);
          // Continue with fewer images if some fail
        }
      }

      if (imageBuffers.length === 0) {
        throw new Error('No images could be generated');
      }

      // STEP 3: Generate voice
      console.log('[CRON] Step 3: Generating voice...');
      const audioBuffer = await generateVoice(script);

      // STEP 4: Create video
      console.log('[CRON] Step 4: Creating video...');
      const videoPath = path.join(os.tmpdir(), `${jobId}.mp4`);
      await createVideo(imageBuffers, audioBuffer, videoPath);

      // STEP 5: Generate title & description
      const title = generateTitle(contentType, character.name, topic);
      const description = generateDescription(contentType, character.name, script);
      const tags = generateTags(contentType, character.name);

      // STEP 6: Upload to YouTube
      let youtubeId = '';
      let youtubeUrl = '';

      if (uploadEnabled) {
        console.log('[CRON] Step 5: Uploading to YouTube...');
        const uploadResult = await uploadToYouTube(videoPath, title, description, tags);
        youtubeId = uploadResult.id;
        youtubeUrl = uploadResult.url;
        console.log(`[CRON] Uploaded: ${youtubeUrl}`);
      }

      // Cleanup video file
      try { fs.unlinkSync(videoPath); } catch (e) {}

      // Update job as completed
      await Job.updateOne(
        { id: jobId },
        {
          status: 'completed',
          title,
          description,
          youtubeId,
          youtubeUrl,
          completedAt: new Date(),
        }
      );

      // Update analytics
      await Analytics.findOneAndUpdate(
        { date: today },
        {
          $inc: {
            videosGenerated: 1,
            videosUploaded: uploadEnabled ? 1 : 0,
          },
        },
        { upsert: true }
      );

      console.log(`[CRON] Job ${jobId} completed successfully!`);

      return res.status(200).json({
        success: true,
        jobId,
        title,
        youtubeUrl,
        character: character.name,
        type: contentType,
      });

    } catch (err) {
      console.error(`[CRON] Job ${jobId} failed:`, err.message);

      await Job.updateOne(
        { id: jobId },
        {
          status: 'failed',
          error: err.message,
          completedAt: new Date(),
        }
      );

      // Update failure analytics
      await Analytics.findOneAndUpdate(
        { date: today },
        { $inc: { failures: 1 } },
        { upsert: true }
      );

      throw err;
    }

  } catch (err) {
    console.error('[CRON] Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function generateImagePrompts(contentType, character, script) {
  const base = `${character.name}, ${character.style}, vibrant colors, digital art, cartoon style, high quality`;

  const prompts = {
    storytelling: [
      `${base}, beginning of story, establishing shot`,
      `${base}, exciting action scene, dynamic pose`,
      `${base}, climax moment, dramatic lighting`,
      `${base}, victory celebration, confetti`,
      `${base}, conclusion scene, happy ending`,
    ],
    dance: [
      `${base}, dance battle arena, crowd watching`,
      `${base}, epic dance move, motion blur`,
      `${base}, neon lights, dance floor`,
      `${base}, victory dance pose, spotlight`,
    ],
    top5: [
      `${base}, number 5 ranking, scoreboard`,
      `${base}, number 3 highlight, action`,
      `${base}, number 1 champion, trophy, celebration`,
    ],
  };

  return prompts[contentType] || prompts.storytelling;
}

function generateTitle(contentType, characterName, topic) {
  const titles = {
    storytelling: [
      `${characterName}'s INSANE Adventure Goes WRONG 😱 #shorts`,
      `${characterName} VS The World (BRAINROT STORY) 💀`,
      `${characterName} Has The Most OHIO Moment Ever 🤣 #brainrot`,
    ],
    dance: [
      `${characterName} Dance Battle Goes CRAZY 🔥 #shorts`,
      `${characterName} Has ULTIMATE Rizz On The Dance Floor 💃`,
      `${characterName} Sigma Dance That BROKE The Internet 😤`,
    ],
    top5: [
      `Top 5 ${topic} ft. ${characterName} 🔥 #brainrot`,
      `TOP 5 MOST OHIO ${topic} RANKED 💀 #shorts`,
      `Ranking The MOST GYATT ${topic} (No Cap) 🗣️`,
    ],
  };

  const options = titles[contentType] || titles.storytelling;
  return options[Math.floor(Math.random() * options.length)];
}

function generateDescription(contentType, characterName, script) {
  return `${script}\n\nFeaturing: ${characterName} in the most brainrot content on the internet!\n\nWatch daily brainrot videos - Subscribe NOW! 🔔\n\n#brainrot #${characterName.replace(/\s/g, '')} #shorts #viral #sigma #ohio #skibidi #rizz #gyatt #meme`;
}

function generateTags(contentType, characterName) {
  return [
    characterName.toLowerCase().replace(/\s/g, ''),
    contentType,
    'brainrot',
    'skibidi',
    'ohio',
    'sigma',
    'rizz',
    'gyatt',
    'shorts',
    'viral',
    'meme',
    'funny',
    'animated',
  ];
}
