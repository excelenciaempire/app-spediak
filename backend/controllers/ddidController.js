const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Controller for INITIAL analysis (No Direct section, No Save)
const analyzeDefectController = async (req, res) => {
  const { imageBase64, description, userState } = req.body;

  if (!imageBase64 || !description || !userState) {
    return res.status(400).json({ message: 'Missing required fields for analysis.' });
  }

  // Simplified prompt focusing on analysis, not the final "Direct" statement
  const analysisPrompt = `
You are an AI assistant analyzing a potential defect based on inspector notes and an image.
Focus on describing the observation, determining the specific issue, and explaining potential implications neutrally.

Format:
Describe: [Directly state the observation.]
Determine: [Identify the specific issue.]
Implication: [Explain the potential consequences neutrally and informatively, without causing undue alarm.]

Instructions:
- Combine the visual information and text description for the "Describe" section.
- Ensure the tone is precise, objective, and informative.
- **Do not** include a "Direct:" section or any recommendations for action.
- **Do not** reference building codes, safety standards, regulations, or citations.
- **Do not** use any Markdown formatting.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate the analysis (Describe, Determine, Implication only).
`;

  console.log('[analyzeDefectController] Requesting analysis from OpenAI...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Or your preferred model
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
      max_tokens: 400, // Adjust token limit as needed for analysis
    });

    const analysisResult = response.choices[0].message.content;
    console.log('[analyzeDefectController] Analysis received from OpenAI.');
    // Return only the analysis string
    return res.json({ analysis: analysisResult });

  } catch (error) {
    console.error('[analyzeDefectController] OpenAI Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate analysis.' });
  }
};

// Controller for FINAL DDID generation AND saving (Modified to accept imageUrl)
const generateDdidController = async (req, res) => {
    const { imageBase64, description, userState, imageUrl, analysisText } = req.body;
    const userId = req.auth.userId;

    // Check required fields
    if (!description || !userState || !userId || !imageUrl || !analysisText) {
        return res.status(400).json({ message: 'Missing required fields (desc, state, user, image url, analysis).' });
    }
    if (!imageBase64) {
         return res.status(400).json({ message: 'Missing image data for final analysis.' });
    }

    // Updated prompt to use provided analysis and only generate the Direct section
    const finalPrompt = `
You are an AI assistant generating the final "Direct:" recommendation for a DDID statement.
You will be given the preliminary analysis (Describe, Determine, Implication) and context (inspector notes, image, state).
Your task is ONLY to generate the "Direct:" line based on the provided analysis and the Recommendation Guidelines.

**Provided Analysis:**
${analysisText}

**Recommendation Guidelines:**
1.  **Structural Defects:** If the provided analysis mentions structural components (foundations, load-bearing walls, beams, columns, framing, roof structure/trusses), recommend: "Recommend engaging a licensed structural engineer to evaluate this condition and provide repair recommendations."
2.  **New Builds/Construction:** If the original inspector notes mentioned "new build", "new construction", etc., recommend: "Recommend that the builder further evaluate this condition."
3.  **Multiple Related Defects:** If the provided analysis describes multiple distinct defects of the same trade (e.g., multiple electrical issues, multiple plumbing leaks), recommend: "Recommend engaging a licensed [Trade Professional, e.g., Electrician, Plumber] to evaluate and repair these conditions."
4.  **Default Recommendation:** For all other defects based on the provided analysis, recommend: "Recommend engaging a qualified licensed contractor to repair this condition."

**Original Inspector Notes (for context only, especially for New Builds):**
${description}

**State (for context only):** ${userState}

**Instructions:**
- Based *only* on the **Provided Analysis** and the **Recommendation Guidelines**, determine the single correct recommendation.
- Output *only* the full "Direct:" line, starting with "Direct: Recommend engaging...".
- Do NOT include the Describe, Determine, or Implication sections again.
- Do NOT use Markdown formatting.

Generate the "Direct:" line now.
`;

    console.log('[generateDdidController] Requesting Direct recommendation from OpenAI...');
    let directRecommendation = null;
    let finalDdidStatement = null;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Or a faster/cheaper model if only generating the direct line?
            messages: [
                 {
                     role: 'user',
                     // Only send the prompt now, image context was used for analysis
                     content: finalPrompt
                 },
             ],
            max_tokens: 150, // Reduced tokens needed for just the Direct line
        });
        directRecommendation = response.choices[0].message.content;
        console.log('[generateDdidController] Direct recommendation received:', directRecommendation);

        // Combine the provided analysis with the generated recommendation
        // Ensure directRecommendation starts with "Direct: " or add it
        const formattedDirect = directRecommendation.trim().startsWith('Direct:') ? directRecommendation.trim() : `Direct: ${directRecommendation.trim()}`;
        finalDdidStatement = `${analysisText.trim()}\n${formattedDirect}`;
        console.log('[generateDdidController] Combined final DDID:', finalDdidStatement);

        // --- Save Inspection to Database --- 
        console.log('[generateDdidController] Saving inspection to database...');
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const insertQuery = 'INSERT INTO inspections (user_id, description, ddid, image_url, state) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const values = [userId, description, finalDdidStatement, imageUrl, userState];
        const result = await pool.query(insertQuery, values);
        const newInspectionId = result.rows[0].id;
        console.log('[generateDdidController] Inspection saved successfully:', newInspectionId);
        // ----------------------------------

        // Return the final DDID and the new inspection ID
        return res.json({ ddid: finalDdidStatement, inspectionId: newInspectionId });

    } catch (error) {
        console.error('[generateDdidController] Error:', error);
        const message = error.response?.data?.message || error.message || 'Failed to generate final DDID or save inspection.';
        // Check if it was an OpenAI error or DB error
        if (!directRecommendation && error.response) {
            // Likely OpenAI API error
            return res.status(502).json({ message: `OpenAI Error: ${message}` });
        } else if (directRecommendation && !error.response) {
            // Likely DB Save Error (after getting OpenAI response)
            return res.status(500).json({ message: `Database Save Error: ${message}`, ddid: finalDdidStatement, inspectionId: null });
        } else {
             // Other errors
             return res.status(500).json({ message });
        }
    }
};

module.exports = {
    analyzeDefectController,
    generateDdidController
};
