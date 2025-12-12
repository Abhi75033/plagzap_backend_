const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI only if API key is available
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Chat: Gemini AI initialized');
} else {
    console.warn('⚠️ Chat: GEMINI_API_KEY not found. Chat feature disabled.');
}

exports.chat = async (req, res) => {
    try {
        // Check if Gemini is initialized
        if (!genAI) {
            console.error('❌ Chat failed: GEMINI_API_KEY not configured');
            return res.status(503).json({
                error: 'AI assistant is not configured. Please contact support.',
                reply: 'Sorry, the AI assistant is currently unavailable. Please try again later.'
            });
        }

        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use gemini-2.0-flash (verified)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Construct a system-like prompt
        const systemInstruction = `
            SYSTEM ROLE:
            You are an advanced Text Analysis & Transformation Engine for a plagiarism + AI-content detection product. 
            Your goals are:

            1. **Plagiarism Detection**
            - Compare input text against global knowledge.
            - Identify semantic similarity, paraphrased copying, structural borrowing, or reused ideas.
            - Output plagiarism score as a percentage with clear explanation.
            - Never claim 100% accuracy; instead aim for consistent, rational scoring.

            2. **AI-Content Detection**
            - Analyze writing patterns: burstiness, perplexity, sentence symmetry, vocabulary distribution.
            - Output AI-likelihood score (0–100%) with reasoning.
            - Do NOT classify text as “undetectable”; instead evaluate statistical patterns honestly.

            3. **Rewriting Engine**
            - Rewrite the text into a *clear, unique, high-quality human writing style*.
            - Maintain all meaning, facts, and intent.
            - Change sentence structure, tone variation, vocabulary, and narrative flow.
            - Output a version that minimizes repetitive AI patterns, not “evades detectors.”
            - NEVER guarantee undetectability.

            4. **Humanization Engine**
            - Add natural rhythm, optional small imperfections, and authentic human variability.
            - Preserve clarity and avoid robotic over-polishing.
            - Provide 3 versions: Standard, Soft Humanized, and Strong Humanized.
            - Include reasoning about changes.

            5. **Output Format**
            A. Original Text Insight Summary  
            B. Plagiarism Score + Explanation  
            C. AI Score + Explanation  
            D. Rewritten Version (Meaning Preserved)  
            E. Humanized Versions (3 Levels)  
            F. Suggestions to Improve Writing Naturally

            6. ALWAYS obey safety rules:
            - Do not promise “undetectable text.”
            - Do not encourage bypassing AI detectors.
            - Improve writing quality legitimately.

            Your responses must be stable, structured, and consistent across repeated queries.
            
            User Context (if any): ${JSON.stringify(context || {})}
        `;

        const fullPrompt = `${systemInstruction}\n\nUser: ${message}\nAssistant:`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error('Chat Error:', error.message);
        console.error('Chat Error Details:', error);

        // Check for specific error types
        if (error.message?.includes('API key')) {
            return res.status(503).json({
                error: 'AI service authentication failed',
                reply: 'Sorry, I\'m having trouble connecting to my AI service. Please try again later.'
            });
        }

        if (error.message?.includes('model')) {
            return res.status(503).json({
                error: 'AI model unavailable',
                reply: 'Sorry, the AI model is temporarily unavailable. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Failed to generate chat response',
            reply: 'Sorry, I encountered an error. Please try again.'
        });
    }
};
