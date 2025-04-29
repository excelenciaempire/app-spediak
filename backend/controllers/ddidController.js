const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateDdidController = async (req, res) => {
  const { imageBase64, description, userState } = req.body;

  if (!imageBase64 || !description || !userState) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const prompt = `
You are an AI assistant creating inspection report statements based on the Describe, Determine, Implication, Direct (DDID) model.

Format:
Describe: [Directly state the observation, e.g., "Water intrusion observed..."]
Determine: [Identify the specific issue.]
Implication: [Explain the potential consequences neutrally and informatively, without causing undue alarm.]
Direct: [Recommend the next step, e.g., "Further evaluation by a qualified professional..." or "Monitor the area..."]

Instructions:
- Analyze the inspector's notes and the provided image.
- Combine the visual information and text description for the "Describe" section.
- Ensure the tone is precise, objective, and informative, avoiding alarming language.
- **Do not** reference building codes, safety standards, regulations, or citations.
- **Do not** use any Markdown formatting (like ** for bold). Write the entire response in plain text.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate the DDID statement now.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 600,
    });

    const ddid = response.choices[0].message.content;
    return res.json({ ddid });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate DDID.' });
  }
};

module.exports = { generateDdidController };
