const axios = require('axios');
const { humanizeContent } = require('../services/ai/rewriteService');

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

        const prompt = `You are a Senior Research Analyst. Build a rigorous research framework for:
Topic: "${topic}"

Your Goal: Provide a structued, factually consistent foundation for a high-quality academic paper.

REQUIREMENTS:
1.  **Research Gap**: Identify what is MISSING in current literature. Do not just state basics. Find the nuance.
2.  **Problem Statement**: Write a concise, impactful paragraph defining the specific issue this research addresses.
3.  **Objectives**: 3-5 specific, measurable goals using Bloom's Taxonomy verbs (Analyze, Evaluate, Synthesize).
4.  **Methodology**: Suggest the MOST appropriate method (e.g., Mixed-Methods, Longitudinal Study) with specific tools/datasets that actually exist.

CRITICAL CHECK:
- Review your own output. Is the "Research Gap" distinct? Are the objectives achievable?
- If the topic is vague, define a specific scope.

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

        console.log('🔧 Refinement request:', { action, mode, contentLength: content?.length });

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // SPECIAL HANDLING: Use shared "Anti-AI" logic for AI reduction
        if (action === 'reduceAI' || action === 'improveTone') {
            console.log('✨ Using Advanced Humanization Engine for:', action);
            try {
                // Call the shared service that has the Anti-AI Dictionary & Burstiness rules
                const humanized = await humanizeContent(content);
                return res.json({ refinedContent: humanized });
            } catch (serviceError) {
                console.error('Humanization service failed, falling back to basic:', serviceError.message);
                // Fallthrough to basic method if service fails
            }
        }

        const actionPrompts = {
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

Return ONLY valid JSON in this exact format:
{
  "refinedContent": "your refined text here"
}`;

        console.log('📤 Calling Gemini API for refinement (Basic Mode)...');

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json",
                    maxOutputTokens: 2048
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const rawText = response.data.candidates[0].content.parts[0].text;
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (parseError) {
            result = { refinedContent: rawText.replace(/```json|```/g, '').trim() };
        }

        if (!result.refinedContent) {
            return res.status(500).json({ error: 'Invalid AI response', refinedContent: content });
        }

        res.json(result);

    } catch (error) {
        console.error('❌ Content refinement error:', error.message);
        res.status(500).json({ error: 'Failed to refine content' });
    }
};

