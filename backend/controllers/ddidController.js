const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Controller for INITIAL analysis (Outputs DDI - No Direct)
const analyzeDefectController = async (req, res) => {
  const { imageBase64, description, userState } = req.body;

  if (!imageBase64 || !description || !userState) {
    return res.status(400).json({ message: 'Missing required fields for analysis.' });
  }

  // Prompt to generate Describe, Determine, Implication ONLY
  const analysisPrompt = `
You are an AI assistant analyzing a potential defect based on inspector notes and an image.
Generate the Describe, Determine, and Implication sections based on the provided information.

Format:
Describe: [Directly state the observation.]
Determine: [Identify the specific issue.]
Implication: [Explain the potential consequences neutrally and informatively, without causing undue alarm.]

Instructions:
- Combine the visual information and text description for the "Describe" section.
- Ensure the tone is precise, objective, and informative.
- **Do NOT** include a "Direct:" section.
- **Do NOT** reference building codes, safety standards, regulations, or citations.
- **Do NOT** use any Markdown formatting.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate the analysis (Describe, Determine, Implication only).
`;

  console.log('[analyzeDefectController] Requesting DDI analysis from OpenAI...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
         {
            role: 'user',
            content: [
                { type: 'text', text: analysisPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
            ],
        },
      ],
      max_tokens: 400, // Adjust as needed for DDI
    });

    const analysisResult = response.choices[0].message.content;
    console.log('[analyzeDefectController] DDI analysis received from OpenAI.');
    return res.json({ analysis: analysisResult });

  } catch (error) {
    console.error('[analyzeDefectController] OpenAI Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate analysis.' });
  }
};

// Controller for FINAL DDID generation AND saving
const generateDdidController = async (req, res) => {
    const { imageBase64, description, userState, imageUrl, analysisText } = req.body; // analysisText is DDI (no Direct)
    const userId = req.auth.userId;

    // Check required fields
    if (!description || !userState || !userId || !imageUrl || !analysisText) {
        return res.status(400).json({ message: 'Missing required fields (desc, state, user, image url, analysis text).' });
    }

    // Prompt asks ONLY for the Direct: line
    const finalPrompt = `
You are an AI assistant generating ONLY the "Direct:" recommendation line for a DDID statement.
You will be given the Describe, Determine, and Implication sections and context (inspector notes, state).
Your task is ONLY to generate the "Direct:" line based on the provided analysis and the Recommendation Guidelines.

**Provided DDI Analysis (No Direct):**
${analysisText}

**Recommendation Guidelines (for Direct: section ONLY):**
1.  **Structural Defects:** If the provided DDI analysis mentions structural components..., recommend: "Recommend engaging a licensed structural engineer..."
2.  **New Builds/Construction:** If the original inspector notes mentioned "new build"..., recommend: "Recommend that the builder further evaluate..."
3.  **Multiple Related Defects:** If the provided DDI analysis describes multiple distinct defects of the same trade..., recommend: "Recommend engaging a licensed [Trade Professional]..."
4.  **Default Recommendation:** For all other defects..., recommend: "Recommend engaging a qualified licensed contractor..."

**Original Inspector Notes (for context only, mainly for New Builds guideline):**
${description}

**State (for context only):** ${userState}

**Instructions:**
- Based *only* on the **Provided DDI Analysis** and the **Recommendation Guidelines**, determine the single correct recommendation.
- Output *only* the full "Direct:" line, starting exactly with "Direct: Recommend...".
- Do NOT include Describe, Determine, or Implication.
- Do NOT add extra explanation or formatting.

Generate ONLY the "Direct:" line now.
`;

    console.log('[generateDdidController] Requesting Direct recommendation from OpenAI...');
    let directRecommendation = null;
    let finalDdidStatement = null;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Consider gpt-3.5-turbo or faster if sufficient
            messages: [
                 {
                     role: 'user',
                     content: finalPrompt // No image needed if DDI is good
                 },
             ],
            max_tokens: 150, // Reduced tokens needed for just the Direct line
        });

        directRecommendation = response.choices[0].message.content;
        // Basic validation/cleanup of the AI response
        if (!directRecommendation || !directRecommendation.trim().startsWith('Direct:')) {
             console.error('[generateDdidController] OpenAI did not return a valid Direct: line. Response:', directRecommendation);
             // Fallback or throw error?
             directRecommendation = "Direct: Recommend engaging a qualified licensed contractor to evaluate this condition further."; // Safer fallback
             // throw new Error('AI failed to generate a valid recommendation line.');
        }
        console.log('[generateDdidController] Direct recommendation received:', directRecommendation);

        // Combine the provided analysis (DDI) with the generated recommendation
        finalDdidStatement = `${analysisText.trim()}\n${directRecommendation.trim()}`;
        console.log('[generateDdidController] Combined final DDID statement ready for saving.');

        // --- Save Inspection to Database --- 
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const insertQuery = 'INSERT INTO inspections (user_id, description, ddid, image_url, state) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const values = [userId, description, finalDdidStatement, imageUrl, userState]; // Use final combined statement
        const result = await pool.query(insertQuery, values);
        const newInspectionId = result.rows[0].id;
        console.log('[generateDdidController] Inspection saved successfully:', newInspectionId);

        // Return the final DDID and the new inspection ID
        return res.json({ ddid: finalDdidStatement, inspectionId: newInspectionId });

    } catch (error) {
        // ... error handling (adjust messages if needed) ...
         if (!directRecommendation && error.response) {
            // OpenAI error generating Direct line
             return res.status(502).json({ message: `OpenAI Error generating recommendation: ${error.response?.data?.message || error.message || 'Unknown error'}` });
         } else if (directRecommendation && !error.response) {
             // DB Save Error after generating Direct line
            return res.status(500).json({ message: `Database Save Error: ${error.response?.data?.message || error.message || 'Unknown error'}`, ddid: finalDdidStatement, inspectionId: null });
         } else {
            return res.status(500).json({ message: error.message || 'Failed to generate final DDID or save inspection.' });
         }
    }
};

module.exports = {
    analyzeDefectController,
    generateDdidController
};
