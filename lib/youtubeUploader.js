import { google } from 'googleapis';
import fs from 'fs';

export async function uploadToYouTube(videoPath, title, description, tags) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const allTags = [
    ...tags,
    'brainrot', 'skibidi', 'sigma', 'ohio', 'rizz', 'gyatt',
    'viral', 'meme', 'funny', 'shorts', 'trending',
  ].slice(0, 30);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: `${description}\n\n#brainrot #shorts #viral #sigma #ohio #skibidi\n\nThis video was auto-generated. Subscribe for daily brainrot content!`,
        tags: allTags,
        categoryId: '23', // Comedy
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  });

  return {
    id: response.data.id,
    url: `https://www.youtube.com/watch?v=${response.data.id}`,
  };
}

// Get optimal upload time based on day of week
export function getOptimalUploadTime() {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 6=Saturday

  // Research-based optimal times (EST/UTC-5)
  // Best days: Thursday, Friday, Saturday, Sunday
  // Best times: 2-4 PM EST = 19:00-21:00 UTC
  const schedule = {
    0: ['14:00', '19:00'], // Sunday
    1: ['12:00', '17:00'], // Monday
    2: ['12:00', '17:00'], // Tuesday
    3: ['12:00', '17:00'], // Wednesday
    4: ['14:00', '19:00'], // Thursday (best day)
    5: ['14:00', '19:00'], // Friday (best day)
    6: ['11:00', '16:00'], // Saturday
  };

  return schedule[day];
}
