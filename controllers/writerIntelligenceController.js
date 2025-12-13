const axios = require('axios');

/**
 * TOPIC ANALYZER
 * Analyzes topic to provide domain, intent, complexity
 */
exports.analyzeTopic = async (req, res) => {
    try {
        const { topic, mode } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const prompt = `Analyze this topic briefly and objectively:
Topic: "${topic}"
Mode: ${mode}

Provide ONLY:
1. Domain (1-2 words: e.g., Technology, Healthcare, Business)
2. Intent (1 word: Informational, Persuasive, Analytical, Tutorial)
3. Complexity (1 word: Simple, Medium, Complex)
4. Recommended Mode (suggest if Blog/Research/Academic/Professional fits best)

Rules:
- Be honest, not speculative
- Short, scannable
- No fake confidence

Return JSON:
{
  "domain": "...",
  "intent": "...",
  "complexity": "...",
  "recommendedMode": "..."
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const analysis = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json(analysis);

    } catch (error) {
        console.error('Topic analysis error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to analyze topic' });
    }
};

/**
 * SUGGESTED TITLES GENERATOR
 * Generates 5-7 mode-aware titles
 */
exports.generateTitles = async (req, res) => {
    try {
        const { topic, mode } = req.body;

        const modeGuidelines = {
            blog: "engaging, SEO-friendly, conversational, clickable",
            research: "formal, academic, scholarly, hypothesis-focused",
            academic: "exam-ready, clear thesis, definition-based",
            professional: "crisp, executive, business-oriented, actionable"
        };

        const prompt = `Generate 5-7 unique titles for this topic:
Topic: "${topic}"
Mode: ${mode}

Style: ${modeGuidelines[mode] || modeGuidelines.blog}

Rules:
- Each title must be stylistically different
- No generic templates
- ${mode === 'blog' ? 'Use questions, numbers, or power words' : ''}
- ${mode === 'research' ? 'Include key research focus' : ''}
- ${mode === 'academic' ? 'Clear, thesis-driven' : ''}

Return JSON array:
{
  "titles": ["title1", "title2", ...]
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const result = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json(result);

    } catch (error) {
        console.error('Title generation error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate titles' });
    }
};

/**
 * CONTENT ANGLE SUGGESTIONS
 * Suggests best approach for the topic
 */
exports.suggestAngles = async (req, res) => {
    try {
        const { topic, mode } = req.body;

        const prompt = `Provide content direction for this topic:
Topic: "${topic}"
Mode: ${mode}

Suggest:
1. Best angle/approach (1 sentence)
2. What to focus on (1 sentence)
3. What to avoid (1 sentence)

Be specific and honest. Don't be generic.

Example:
"This topic works best as a comparative analysis rather than a tutorial."

Return JSON:
{
  "angle": "...",
  "focus": "...",
  "avoid": "..."
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const suggestions = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json(suggestions);

    } catch (error) {
        console.error('Angle suggestion error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to suggest angles' });
    }
};

/**
 * RESEARCH BUILDER (Research/Academic modes only)
 * Generates research gaps, problem statement, objectives, questions, methodology
 */
exports.buildResearchFramework = async (req, res) => {
    try {
        const { topic, mode } = req.body;

        if (mode !== 'research' && mode !== 'academic') {
            return res.status(400).json({ error: 'Research builder only available for Research/Academic modes' });
        }

        const prompt = `Build a research framework for this topic:
Topic: "${topic}"

Provide:

1. Research Gap:
   - What existing work focuses on
   - What is under-explored
   - Where this work fits
   (No fake citations, logical reasoning only)

2. Problem Statement:
   - One clear paragraph explaining the limitation, why it matters, what research aims to address

3. Objectives:
   - 3-5 measurable objectives aligned with topic

4. Research Questions:
   - 1 primary question
   - 2-4 sub-questions with clear scope

5. Methodology Predictor:
   - Research type (survey/experimental/comparative)
   - Possible datasets or tools
   - Evaluation metrics
   (Must NOT claim certainty - use "could", "might", "typically")

Be honest. Uncertainty is okay.

Return JSON:
{
  "researchGap": {
    "existingFocus": "...",
    "underExplored": "...",
    "yourFit": "..."
  },
  "problemStatement": "...",
  "objectives": ["obj1", "obj2", ...],
  "researchQuestions": {
    "primary": "...",
    "secondary": ["q1", "q2", ...]
  },
  "methodology": {
    "type": "...",
    "datasets": "...",
    "metrics": "..."
  }
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const framework = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json(framework);

    } catch (error) {
        console.error('Research framework error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to build research framework' });
    }
};

/**
 * REFINE CONTENT (Actionable fixes)
 * Applies specific refinements: reduce AI risk, improve tone, etc.
 */
exports.refineContent = async (req, res) => {
    try {
        const { content, action, mode } = req.body;

        const actionPrompts = {
            'reduceAI': 'Rewrite to reduce AI detection: vary sentence length, add natural imperfections, avoid AI phrases',
            'improveTone': `Improve tone to match ${mode} style better`,
            'improveReadability': 'Simplify language, shorter sentences, clearer structure',
            'makeAcademic': 'Make more formal and scholarly',
            'makeConversational': 'Make more casual and engaging'
        };

        const prompt = `${actionPrompts[action] || 'Improve this text'}:

"${content}"

Rules:
- Keep the core message
- Only change what's needed for the specified improvement
- Natural human writing

Return JSON:
{
  "refinedContent": "..."
}`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const result = JSON.parse(response.data.candidates[0].content.parts[0].text);
        res.json(result);

    } catch (error) {
        console.error('Content refinement error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refine content' });
    }
};
