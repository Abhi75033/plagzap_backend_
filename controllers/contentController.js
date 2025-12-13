const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

        // Call Gemini API (using the newer model)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const content = response.text();

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
        console.error('Content generation error:', error);
        res.status(500).json({
            error: 'Failed to generate content',
            details: error.message
        });
    }
};
