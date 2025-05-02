const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Controller for INITIAL analysis (Generic Description)
const analyzeDefectController = async (req, res) => {
  const { imageBase64, description, userState } = req.body;

  if (!imageBase64 || !description || !userState) {
    return res.status(400).json({ message: 'Missing required fields for analysis.' });
  }

  // New prompt for generic analysis
  const analysisPrompt = `
You are an AI assistant analyzing a potential defect based on inspector notes and an image.
Describe what you see in the image and how it relates to the inspector's notes in a concise paragraph.
Focus on the visual evidence and the described problem.
Do NOT use DDID format. Do NOT include implications or recommendations.
Do NOT use Markdown formatting.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate a brief, generic analysis paragraph.
`;

  console.log('[analyzeDefectController] Requesting generic analysis from OpenAI...');
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
      max_tokens: 250, // Adjust token limit for a paragraph
    });

    const analysisResult = response.choices[0].message.content;
    console.log('[analyzeDefectController] Generic analysis received from OpenAI.');
    return res.json({ analysis: analysisResult });

  } catch (error) {
    console.error('[analyzeDefectController] OpenAI Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate analysis.' });
  }
};

// Controller for FINAL DDID generation AND saving
const generateDdidController = async (req, res) => {
    const { imageBase64, description, userState, imageUrl, analysisText } = req.body; // analysisText is now generic description
    const userId = req.auth.userId;

    // Check required fields
    if (!description || !userState || !userId || !imageUrl || !analysisText) {
        return res.status(400).json({ message: 'Missing required fields (desc, state, user, image url, analysis text).' });
    }
    // imageBase64 might still be useful for context if needed, but maybe not strictly required by the prompt now
    // if (!imageBase64) {
    //      return res.status(400).json({ message: 'Missing image data for context.' });
    // }

    // New prompt: Format generic analysis into DDI, then add Direct recommendation
    const finalPrompt = `
You are an AI assistant generating a full DDID statement.
You will be given a generic analysis paragraph, the original inspector notes, and context (image, state).

**Your Tasks:**
1.  Structure the **Provided Generic Analysis** into the standard DDID format:
    - Describe: [State the observation based on the analysis.]
    - Determine: [Identify the specific issue based on the analysis.]
    - Implication: [Explain potential consequences based on the analysis.]
2.  Generate the **Direct:** recommendation line based *only* on the structured Describe/Determine/Implication and the **Recommendation Guidelines** below.

**Provided Generic Analysis:**
${analysisText}

**Recommendation Guidelines (for Direct: section ONLY):**
1.  **Structural Defects:** If the structured DDI involves structural components (foundations, load-bearing walls, beams, columns, framing, roof structure/trusses), recommend: "Recommend engaging a licensed structural engineer to evaluate this condition and provide repair recommendations."
2.  **New Builds/Construction:** If the original inspector notes mentioned "new build", "new construction", etc., recommend: "Recommend that the builder further evaluate this condition."
3.  **Multiple Related Defects:** If the structured DDI describes multiple distinct defects of the same trade (e.g., multiple electrical issues, multiple plumbing leaks), recommend: "Recommend engaging a licensed [Trade Professional, e.g., Electrician, Plumber] to evaluate and repair these conditions."
4.  **Default Recommendation:** For all other defects based on the structured DDI, recommend: "Recommend engaging a qualified licensed contractor to repair this condition."

**Original Inspector Notes (for context only, mainly for New Builds guideline):**
${description}

**State (for context only):** ${userState}

**Final Output Instructions:**
- Combine the structured Describe, Determine, Implication, and the generated Direct line into a single block of text, with each section clearly labeled on its own line.
- Ensure the tone is precise, objective, and informative, avoiding alarming language.
- **Do not** reference building codes, safety standards, regulations, or citations.
- **Do not** use any Markdown formatting.

Generate the complete DDID statement now.
`;

    console.log('[generateDdidController] Requesting final DDID formatting and recommendation from OpenAI...');
    let finalDdidStatement = null;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                 {
                     role: 'user',
                     // Send full prompt with generic analysis and original notes
                     content: [
                         { type: 'text', text: finalPrompt },
                         // Optionally include image again if needed for better DDI formatting?
                          {
                              type: 'image_url',
                              image_url: {
                                  url: `data:image/jpeg;base64,${imageBase64}`,
                              },
                          },
                     ]
                 },
             ],
            max_tokens: 600, // May need more tokens for formatting + recommendation
        });
        finalDdidStatement = response.choices[0].message.content;
        console.log('[generateDdidController] Final DDID statement generated:', finalDdidStatement);

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
        if (!finalDdidStatement && error.response) {
            // Likely OpenAI API error
            return res.status(502).json({ message: `OpenAI Error: ${message}` });
        } else if (finalDdidStatement && !error.response) {
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
