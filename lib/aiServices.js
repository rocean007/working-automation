// Free AI Services Handler
// Uses: HuggingFace (images), ElevenLabs (voice), OpenRouter (text)

export async function generateImage(prompt) {
  const models = [
    'stabilityai/stable-diffusion-xl-base-1.0',
    'runwayml/stable-diffusion-v1-5',
    'CompVis/stable-diffusion-v1-4',
  ];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: 1080,
              height: 1920,
              num_inference_steps: 20,
            },
          }),
        }
      );

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
      }

      // If model is loading, wait and retry
      if (response.status === 503) {
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
    } catch (err) {
      console.error(`HuggingFace model ${model} failed:`, err.message);
    }
  }

  throw new Error('All image generation models failed');
}

export async function generateVoice(text, voiceId = 'Rachel') {
  // ElevenLabs free tier: 10k chars/month
  try {
    const voices = {
      Rachel: '21m00Tcm4TlvDq8ikWAM',
      Domi: 'AZnzlk1XvdvUeBnXmlld',
      Bella: 'EXAVITQu4vr4xnSDxMaL',
      Antoni: 'ErXwobaYiN019PkySvjV',
      Elli: 'MF3mGyEYCl7XYWbV9V6O',
    };

    const selectedVoice = voices[voiceId] || voices.Rachel;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.substring(0, 2500), // Stay within free tier
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (err) {
    console.error('ElevenLabs failed, using fallback TTS:', err.message);
    return await generateVoiceFallback(text);
  }
}

// Free fallback: StreamElements TTS (completely free, no key needed)
async function generateVoiceFallback(text) {
  const encoded = encodeURIComponent(text.substring(0, 500));
  const voice = 'Brian'; // or: Amy, Emma, Brian, Russell, Nicole
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encoded}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('StreamElements TTS failed');

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

export async function generateScript(contentType, character, topic) {
  // Uses OpenRouter free tier (mistral-7b is free)
  const prompts = {
    storytelling: `Write a 150-word exciting story about ${character} from brainrot memes. Make it dramatic and funny. Include: a problem, adventure, and resolution. No hashtags.`,
    dance: `Write a 100-word energetic description of ${character} doing an epic dance battle. Include wild dance moves and brainrot energy. Make it hype and funny.`,
    top5: `Write a TOP 5 list about "${topic}" featuring brainrot characters like ${character}. Format: "Number 5: [item]" etc. Keep each item 1-2 sentences. Total 150 words.`,
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://brainrot-automation.vercel.app',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [{ role: 'user', content: prompts[contentType] || prompts.storytelling }],
        max_tokens: 300,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (err) {
    console.error('OpenRouter failed:', err.message);
  }

  // Fallback: hardcoded scripts if AI fails
  return getFallbackScript(contentType, character);
}

function getFallbackScript(type, character) {
  const scripts = {
    storytelling: `${character} was chilling in Ohio when suddenly everything went CRAZY! The skibidi toilet appeared and chaos erupted. ${character} had to use their ultimate brainrot powers to save the day. After an EPIC battle, ${character} emerged victorious! The whole sigma squad celebrated. This was truly the most Ohio moment ever recorded in human history. GG no re!`,
    dance: `${character} enters the dance floor and the crowd goes WILD! They bust out the griddy, then switch to the rizz dance. The skibidi moves are UNMATCHED. ${character} hits the woah and everyone loses their mind. Pure sigma energy radiating from every move. This is the most fire dance battle in brainrot history!`,
    top5: `Number 5: ${character} eating gyatt for breakfast. Number 4: ${character} going full sigma in Ohio. Number 3: ${character} defeating the skibidi toilet army. Number 2: ${character} achieving maximum rizz levels. Number 1: ${character} becoming the ultimate brainrot champion of the universe!`,
  };
  return scripts[type] || scripts.storytelling;
}
