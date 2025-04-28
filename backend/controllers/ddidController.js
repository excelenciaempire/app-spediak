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
You are an AI assistant that generates standardized DDID reports (Describe, Determine, Implication, Direct) for home inspections. Your job is to write a clear, professional and concise DDID in this format:

**Describe**: What is seen in the image + text description.  
**Determine**: What is the issue.  
**Implication**: Why it matters.  
**Direct**: What should be done.

Use the following data:

- Inspector location (state): ${userState}
- Inspector notes: ${description}
- Image (visual content): <image attached via base64>

Provide the response in Markdown format without headings.

Now write the DDID report.
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
