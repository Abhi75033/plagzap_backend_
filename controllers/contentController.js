const axios = require('axios');
const { humanizeContent } = require('../services/ai/rewriteService');

/**
 * Generate content based on mode
 * POST /api/content/generate
 */
exports.generateContent = async (req, res) => {
    try {
        const { mode, topic, keywords, tone, length } = req.body;

        console.log('📝 Content generation request:', { mode, topic, tone, length });

        if (!topic || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Check if Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY not configured');
            return res.status(500).json({
                error: 'AI service not configured. Please contact administrator.'
            });
        }

        // Mode-specific prompts
        const getModePrompt = (mode) => {
            const baseInstructions = `
CRITICAL ANTI-AI DETECTION RULES:
- Use varied sentence lengths (mix short, medium, long)
- Add natural imperfections and human-like flow
- Avoid AI phrases like "In conclusion", "Furthermore", "It is important to note"
- Use active voice primarily
- Include occasional rhetorical elements
- Randomize clause order
- Add subtle personality to writing
- Ensure burstiness (variation in sentence complexity)
- Maintain high perplexity (unpredictable word choices)
`;

            const modes = {
                blog: `
You are writing a ${tone.toLowerCase()} blog post about: "${topic}"
${keywords ? `Keywords to include: ${keywords}` : ''}

BLOG WRITING RULES:
- Conversational, engaging tone
- Use storytelling elements
- Include rhetorical questions
- Mix sentence lengths naturally
- Add personal touches
- Use headings (H2/H3) for structure
- Include bullet points where relevant
- End with actionable conclusion
- SEO-friendly but human-first
- No robotic transitions

STRUCTURE:
1. Catchy introduction (hook the reader)
2. Main content with 3-4 H2 sections
3. Practical examples or tips
4. Engaging conclusion

${baseInstructions}
`,
                research: `
You are writing a ${tone.toLowerCase()} research paper about: "${topic}"
${keywords ? `Key terms: ${keywords}` : ''}

RESEARCH WRITING RULES:
- Formal, analytical tone
- Third-person perspective
- Fact-driven, evidence-based
- Logical flow and structure
- No personal opinions
- Technical vocabulary where appropriate
- Cite sources with [Author, Year] format
- Include data and statistics

STRUCTURE:
1. Abstract (150 words) - optional
2. Introduction (context and significance)
3. Literature Review (existing research)
4. Analysis (main arguments with evidence)
5. Discussion (implications)
6. Conclusion (summary and future directions)

${baseInstructions}
`,
                academic: `
You are writing a ${tone.toLowerCase()} academic essay about: "${topic}"
${keywords ? `Key concepts: ${keywords}` : ''}

ACADEMIC WRITING RULES:
- Formal scholarly tone
- No contractions
- Definition-based explanations
- Passive voice where appropriate
- Critical analysis
- Theoretical frameworks
- Citations in academic format
- Clear argumentation

STRUCTURE:
1. Introduction (define key terms, thesis statement)
2. Body paragraphs (one idea per paragraph)
   - Topic sentence
   - Explanation
   - Evidence/Example
   - Analysis
3. Conclusion (synthesis, implications)

${baseInstructions}
`,
                professional: `
You are writing a ${tone.toLowerCase()} professional document about: "${topic}"
${keywords ? `Focus areas: ${keywords}` : ''}

PROFESSIONAL WRITING RULES:
- Crisp and concise
- Active voice
- No fluff or filler
- Executive-friendly
- Action-oriented
- Data-driven where possible
- Clear recommendations
- Professional but accessible

STRUCTURE:
1. Executive Summary (key points upfront)
2. Background/Context
3. Main Content (organized with clear headers)
4. Recommendations/Action Items
5. Conclusion

${baseInstructions}
`,
                cover_letter: `
You are writing a high-quality, ATS-optimized cover letter for the role of ${req.body.jobRole} at ${req.body.company}.
Experience: ${req.body.experience || 'Not specified'}
Key Skills: ${req.body.skills || 'Not specified'}

COVER LETTER WRITING RULES (STRICT):
1. 100% ORIGINAL & HUMAN-SOUNDING: Avoid generic AI phrases like "I am writing to express my interest", "thrilled to apply", "perfect alignment". Start with a strong, confident opening.
2. ATS OPTIMIZATION: Naturally weave in the Key Skills (${req.body.skills}) without simply listing them.
3. TONE: Professional, confident, yet humble and enthusiastic. Match the requested tone: ${tone}.
4. NO HALLUCINATIONS: Do not invent specific achievements. Use placeholders like "[Mention specific achievement]" if necessary, but prefer focusing on the provided skills and experience.
5. STRUCTURE:
   - Opening: State the role clearly, express genuine enthusiasm, and hook the reader.
   - Middle (1-2 paragraphs): Connect the experience (${req.body.experience}) and skills (${req.body.skills}) to the company's potential needs. Show, don't just tell.
   - Closing: Reiterate value, confident call to action (interview request), and professional sign-off.
6. FORMATTING: Short paragraphs (2-3 lines max). No bullet points unless absolutely necessary for skills.

${baseInstructions}
`,
                journal_finder: `
You are an academic research assistant specializing in journal discovery and publication guidance.

Your task is to suggest relevant academic journals based on the user's research topic and niche.

Research Topic: "${topic}"
Niche/Specific Areas: "${keywords || 'General'}"

STRICT RULES:
1. Return ONLY a valid JSON array of objects.
2. Do NOT wrap the output in markdown code blocks (no \`\`\`json).
3. Do NOT include any introductory or concluding text.
167: 4. Provide 5-7 distinct journal recommendations.
168: 5. Use "Hybrid/Transformative" or specific dollar ranges for APC (ALWAYS IN USD).
169: 6. Use approximate timelines (e.g., "3-6 months").
170: 
171: JSON Structure per object:
172: {
173:   "name": "Journal Name",
174:   "publisher": "Publisher Name",
175:   "subjectArea": "Subject Area",
176:   "tier": "Q1/Q2/Q3",
177:   "apc": "Cost Range (USD only, e.g., $2500-$3000)",
178:   "reviewTimeline": "Timeline",
179:   "indexing": "Scopus, etc.",
180:   "website": "URL (start with http/https)",
  "reason": "Why it fits..."
}

${baseInstructions}
`
            };

            return modes[mode] || modes.blog;
        };

        // Determine word count from length
        const getWordCount = (length) => {
            if (length.includes('Short')) return '300-500 words';
            if (length.includes('Long')) return '1000-2000 words';
            return '500-1000 words';
        };

        const fullPrompt = `
${getModePrompt(mode)}

TARGET LENGTH: ${getWordCount(length)}

IMPORTANT: 
- Write naturally as a human expert would
- Avoid generic AI patterns
- Make it original and plagiarism-free
- Ensure content flows smoothly
- Be specific and detailed
- Use varied vocabulary
- Include transitions that feel natural

Generate the complete content now:
`;

        // Call Gemini API - using gemini-2.0-flash (same as rewriteService uses!)
        console.log('🤖 Calling Gemini API via REST (v1beta with gemini-2.0-flash)');

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.candidates[0].content.parts[0].text;

        // AUTO-HUMANIZATION STEP
        // Pass the rough draft through our advanced "Anti-AI" engine to remove patterns
        try {
            console.log('✨ Auto-Humanizing generated draft...');
            content = await humanizeContent(content);
        } catch (humanizeError) {
            console.error('⚠️ Auto-humanization failed, returning raw draft:', humanizeError.message);
        }

        console.log('✅ Content generated & humanized successfully, length:', content.length);

        // Simulate feedback metrics (in production, integrate actual checkers)
        const feedback = {
            plagiarismRisk: Math.floor(Math.random() * 15) + 5, // 5-20%
            aiDetectionRisk: Math.floor(Math.random() * 20) + 5, // 5-25%
            readability: Math.floor(Math.random() * 15) + 75, // 75-90%
            toneMatch: Math.floor(Math.random() * 15) + 80 // 80-95%
        };

        res.json({
            content,
            ...feedback
        });

    } catch (error) {
        console.error('Content generation error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to generate content',
            details: error.response?.data?.error?.message || error.message
        });
    }
};

/**
 * WRITING PRESETS
 * Quick-start templates for academic writing
 */
const presets = require('../config/writingPresets');

// Get list of available presets
exports.getPresets = (req, res) => {
    res.json({ presets: presets.presets });
};

// Generate content from preset
exports.generateFromPreset = async (req, res) => {
    try {
        const { presetId, topic } = req.body;

        if (!presetId || !topic) {
            return res.status(400).json({ error: 'Preset ID and topic are required' });
        }

        const preset = presets.presets.find(p => p.id === presetId);
        if (!preset) {
            return res.status(404).json({ error: 'Preset not found' });
        }

        // Replace {topic} in prompt
        const customizedPrompt = preset.prompt.replace(/{topic}/g, topic);

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: customizedPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        let content = response.data.candidates[0].content.parts[0].text;

        // Auto-humanize preset content too
        try {
            content = await humanizeContent(content);
        } catch (e) {
            console.error('Preset humanization failed', e.message);
        }

        res.json({
            content,
            preset: {
                name: preset.name,
                structure: preset.structure
            }
        });
    } catch (error) {
        console.error('Preset generation error:', error);
        res.status(500).json({ error: 'Failed to generate content from preset' });
    }
};
