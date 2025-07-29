// pages/api/chat.js

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { OpenAI } from 'openai';

export const config = {
  api: { bodyParser: true }
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const catalogPath = path.resolve('./public', 'PROD.csv');
const catalogData = parse(fs.readFileSync(catalogPath), {
  columns: true,
  skip_empty_lines: true
});

export default async function handler(req, res) {
  const { message, image } = req.body;

  try {
    const prompt = `You are a helpful assistant for RKM Loom Spares. Use the following catalog:\n` +
      catalogData.slice(0, 10).map(p =>
        `- ${p.Name || p.ProductName}: ${p.Description || ''} (Price: ₹${p.Price || 'N/A'})`
      ).join('\n') + `\n\nAnswer user queries based on this data.`;

    let response;

    if (image) {
      response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: message || 'What product is this?' },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 300
      });
    } else {
      response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300
      });
    }

    const reply = response.choices[0]?.message?.content || 'No response';
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    res.status(500).json({ reply: 'Server error' });
  }
}
