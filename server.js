
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(fileUpload());

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf-8'));

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/api/analyze', async (req, res) => {
  if (!req.files || !req.files.image) return res.status(400).send({ error: 'No image uploaded' });

  const image = req.files.image;
  const base64Image = image.data.toString('base64');
  const imageUrl = `data:${image.mimetype};base64,${base64Image}`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What product is shown in this image? Respond with only the product name." },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 100
    });

    const detected = completion.data.choices[0].message.content.trim().toLowerCase();

    const match = catalog.find(item => item['PRODUCT NAME'].toLowerCase().includes(detected));

    let reply = "";
    if (match) {
      reply = `**Product Detected:** ${match['PRODUCT NAME']}\n**Code:** ${match['PRODUCT CODE']}\n**Category:** ${match['CATEGORY']}\n**Price:** ₹${match['RATE']}\n**Stock:** ${match['STOCK']}`;
    } else {
      reply = `Could not match this product to our catalog. AI saw: "${detected}"`;
    }

    res.send({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Image analysis failed." });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
