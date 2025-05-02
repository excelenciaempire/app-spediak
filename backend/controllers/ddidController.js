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
    const { imageBase64, description, userState, imageUrl } = req.body;
    const userId = req.auth.userId; // Get userId from auth middleware

    // Check required fields for final generation AND saving
    if (!description || !userState || !userId || !imageUrl) {
        return res.status(400).json({ message: 'Missing required fields for final statement generation or saving.' });
    }
    // imageBase64 is still needed for the OpenAI call
    if (!imageBase64) {
         return res.status(400).json({ message: 'Missing image data for final analysis.' });
    }

    // Full prompt including Direct guidelines
    const finalPrompt = `
You are an AI assistant creating statement statements based on the Describe, Determine, Implication, Direct (DDID) model.

Format:
Describe: [Directly state the observation, e.g., "Water intrusion observed..."]
Determine: [Identify the specific issue.]
Implication: [Explain the potential consequences neutrally and informatively, without causing undue alarm.]
Direct: [Provide ONE clear recommendation for the next step based *only* on the guidelines below.]

Recommendation Guidelines for the "Direct" section:
1.  **Structural Defects:** If the defect involves structural components (e.g., foundations, load-bearing walls, beams, columns, framing, roof structure/trusses), recommend: "Recommend engaging a licensed structural engineer to evaluate this condition and provide repair recommendations."
2.  **New Builds/Construction:** If the description mentions "new build", "new construction", or similar terms indicating a recently built property, recommend: "Recommend that the builder further evaluate this condition."
3.  **Multiple Related Defects:** If the description clearly lists *multiple distinct defects* that fall under the *same specific trade* (e.g., several electrical issues like faulty outlets and bad wiring in one area, multiple plumbing leaks), recommend engaging a licensed professional for that trade: "Recommend engaging a licensed [Trade Professional, e.g., Electrician, Plumber] to evaluate and repair these conditions."
4.  **Default Recommendation:** For all other defects not covered by the above, recommend: "Recommend engaging a qualified licensed contractor to repair this condition."
    - Example: If the description is "The trap under the sink is leaking.", the Direct section should be: "Recommend engaging a qualified licensed contractor to repair the leaking trap under the sink."

General Instructions:
- Analyze the inspector's notes and the provided image.
- Combine visual information and text description for the "Describe" section.
- Ensure the tone is precise, objective, and informative, avoiding alarming language.
- **Do not** reference building codes, safety standards, regulations, or citations.
- **Do not** use any Markdown formatting (like ** for bold). Write the entire response in plain text.
- Apply the Recommendation Guidelines strictly to generate the single statement for the "Direct:" section.

Inspector Data:
- Location (State): ${userState}
- Notes: ${description}
- Image: <attached>

Generate the DDID statement now.
`;

    console.log('[generateDdidController] Requesting final DDID from OpenAI...');
    let ddidStatement = null;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                 {
                     role: 'user',
                     content: [
                         { type: 'text', text: finalPrompt },
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
        ddidStatement = response.choices[0].message.content;
        console.log('[generateDdidController] Final DDID received from OpenAI.');

        // --- Save Inspection to Database --- 
        console.log('[generateDdidController] Saving inspection to database...');
        const { Pool } = require('pg'); // Ensure Pool is required
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const insertQuery = 'INSERT INTO inspections (user_id, description, ddid, image_url, state) VALUES ($1, $2, $3, $4, $5) RETURNING id'; // Return the ID
        const values = [userId, description, ddidStatement, imageUrl, userState];
        const result = await pool.query(insertQuery, values);
        const newInspectionId = result.rows[0].id;
        console.log('[generateDdidController] Inspection saved successfully:', newInspectionId);
        // ----------------------------------

        // Return the final DDID and the new inspection ID
        return res.json({ ddid: ddidStatement, inspectionId: newInspectionId });

    } catch (error) {
        console.error('[generateDdidController] Error:', error);
        const message = error.response?.data?.message || error.message || 'Failed to generate final DDID or save inspection.';
        // Check if it was an OpenAI error or DB error
        if (!ddidStatement && error.response) {
            // Likely OpenAI API error
            return res.status(502).json({ message: `OpenAI Error: ${message}` });
        } else if (ddidStatement && !error.response) {
            // Likely DB Save Error (after getting OpenAI response)
            return res.status(500).json({ message: `Database Save Error: ${message}`, ddid: ddidStatement, inspectionId: null });
        } else {
             // Other errors
             return res.status(500).json({ message });
        }
    }
};

module.exports = { analyzeDefectController, generateDdidController };
