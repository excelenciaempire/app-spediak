const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Controller for INITIAL PRE-DESCRIPTION analysis
const analyzeDefectController = async (req, res) => {
  const { imageBase64, description, userState } = req.body;

  if (!imageBase64 || !description || !userState) {
    return res.status(400).json({ message: 'Missing required fields for analysis.' });
  }

  // Prompt to generate PRE-DESCRIPTION ONLY
  const preDescriptionPrompt = `
You are an AI assistant reviewing home inspection details (image + text notes).
Your task is to generate ONLY a brief, preliminary description of the main observable subject or issue, in natural language.
Combine visual observations from the image and written notes.
Focus on objectively describing what is present. Be concise.
Start directly with the observation (e.g., "Water intrusion is present under the kitchen sink..." or "The roof shingle shows signs of damage...").
Do NOT use introductory phrases like "The image shows..." or "Based on the image...".
Do NOT include Determine, Implication, or Direct sections.
Do NOT reference codes or standards.
Do NOT add extra explanations or formatting.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate ONLY the preliminary description.
`;

  console.log('[analyzeDefectController] Requesting PRE-DESCRIPTION from OpenAI...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Or a faster model if suitable for pre-description
      messages: [
         {
            role: 'user',
            content: [
                { type: 'text', text: preDescriptionPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
            ],
        },
      ],
      max_tokens: 150, // Reduced tokens for pre-description
    });

    const preDescriptionResult = response.choices[0].message.content?.trim() || 'Could not generate pre-description.';
    console.log('[analyzeDefectController] Pre-description received from OpenAI.');
    // Send back only the pre-description
    return res.json({ preDescription: preDescriptionResult });

  } catch (error) {
    console.error('[analyzeDefectController] OpenAI Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate pre-description.' });
  }
};

// Controller for FINAL DDID generation AND saving (using final description)
const generateDdidController = async (req, res) => {
    // Expect finalDescription instead of analysisText
    const { imageBase64, finalDescription, userState, imageUrl } = req.body; 
    const userId = req.auth.userId;

    // Check required fields (finalDescription is key)
    if (!finalDescription || !userState || !userId || !imageUrl || !imageBase64) {
        return res.status(400).json({ message: 'Missing required fields (finalDesc, state, user, img url, img b64).' });
    }

    // Prompt now asks for the FULL DDID based on the final description and image
    const finalDdidPrompt = `
You are an AI assistant trained to generate standardized DDID (Describe, Determine, Implication, Determine, Direct) statements based on home inspector notes (final version) and an accompanying image. Your goal is to clearly communicate potential defects without overstating severity or causing unnecessary concern. Your language must be strictly observational and factual, avoiding any mention of building codes, compliance, or safety standards.

Format:

Describe: Start directly with the main observation based on the provided final description and image (e.g., "Water intrusion is present..."). Do NOT use introductory phrases.

Determine: Identify the specific issue based on the description.

Implication: Explain potential consequences neutrally and non-alarmingly.

Determine: Restate the condition concisely.

Direct: Provide ONLY ONE recommendation based on the Recommendation Guidelines below.

Recommendation Guidelines (for Direct: section ONLY):
1. Structural Defects: If analysis mentions structural components, recommend: "Recommend engaging a licensed structural engineer..."
2. New Builds/Construction: If original inspector notes mentioned "new build", recommend: "Recommend that the builder further evaluate..."
3. Multiple Related Defects (Same Trade): Recommend: "Recommend engaging a licensed [Trade Professional]..."
4. Default: Recommend: "Recommend engaging a qualified licensed contractor..."

Instructions:
- Generate the complete DDID statement (Describe, Determine, Implication, Determine, Direct).
- Base the ENTIRE statement primarily on the **Final Inspector Description** and the **Image** provided below.
- Use professional, objective, precise, neutral, and non-alarmist language.
- Absolutely DO NOT reference building codes, regulations, compliance, or safety standards.
- Avoid exaggerations.

Inspector Data:
- Location (State): ${userState}
- Final Inspector Description: ${finalDescription}
- Image: <attached>

Generate the complete DDID statement now.
`;

    console.log('[generateDdidController] Requesting FINAL DDID from OpenAI...');
    let finalDdidStatement = null;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', 
            messages: [
                 {
                     role: 'user',
                     content: [
                         { type: 'text', text: finalDdidPrompt },
                         {
                           type: 'image_url',
                           image_url: {
                             url: `data:image/jpeg;base64,${imageBase64}`,
                           },
                         },
                     ],
                 },
             ],
            max_tokens: 700, // Increased tokens for full DDID + Direct
        });

        finalDdidStatement = response.choices[0].message.content?.trim();
        
        // Basic validation (check if response exists)
        if (!finalDdidStatement) {
             console.error('[generateDdidController] OpenAI did not return a valid DDID statement.');
             throw new Error('AI failed to generate a valid DDID statement.');
        }
        console.log('[generateDdidController] Final DDID statement received from OpenAI.');

        // --- Save Inspection to Database --- 
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const insertQuery = 'INSERT INTO inspections (user_id, description, ddid, image_url, state) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        // Save the FINAL description used to generate the DDID
        const values = [userId, finalDescription, finalDdidStatement, imageUrl, userState]; 
        const result = await pool.query(insertQuery, values);
        const newInspectionId = result.rows[0].id;
        console.log('[generateDdidController] Inspection saved successfully:', newInspectionId);

        // Return the final DDID and the new inspection ID
        return res.json({ ddid: finalDdidStatement, inspectionId: newInspectionId });

    } catch (error) {
        console.error('[generateDdidController] Error:', error);
        return res.status(500).json({ message: error.message || 'Failed to generate final DDID or save inspection.' });
    }
};

module.exports = {
    analyzeDefectController, // Export new pre-description controller
    generateDdidController
};
