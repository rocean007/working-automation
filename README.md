# 🧠 Brainrot Content Automation

### 1. Get Free API Keys (5 min)
- **MongoDB**: [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) → Create free M0 cluster
- **YouTube API**: [console.cloud.google.com](https://console.cloud.google.com) → Enable YouTube Data API v3
- **HuggingFace**: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → Create token
- **ElevenLabs**: [elevenlabs.io](https://elevenlabs.io) → Create account
- **OpenRouter**: [openrouter.ai](https://openrouter.ai) → Free Mistral-7B access
- **Cron Secret**: Run `openssl rand -hex 32`

### 2. Get YouTube Refresh Token
1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground)
2. Select YouTube Data API v3 scopes
3. Exchange for refresh token
4. Add to YOUTUBE_REFRESH_TOKEN env var

## 🕐 Optimal Upload Times
Configured in `vercel.json` to run at:
- 9:00 AM UTC (Asian audience)
- 11:00 AM UTC (Morning peak)
- 2:00 PM UTC (Afternoon peak)
- **7:00 PM UTC ⭐ (Best time = 2 PM EST)**
- 10:00 PM UTC (Night audience)

## 💰 Cost Breakdown
| Service | Cost |
|---------|------|
| Vercel | $0 |
| MongoDB M0 | $0 |
| HuggingFace | $0 |
| OpenRouter (Mistral) | $0 |
| ElevenLabs | $0 (10k chars/mo) |
| YouTube API | $0 |
| **Total** | **$0/month** |

## 🤖 Free AI Services Used
- **HuggingFace** - Stable Diffusion (image generation)
- **OpenRouter** - Mistral-7B (script writing)
- **ElevenLabs** - TTS voices
- **StreamElements** - Fallback TTS (no key needed!)
- **FFmpeg** - Video creation


```
