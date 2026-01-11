module.exports = {
    presets: [
        {
            id: 'literature-review',
            name: 'Literature Review',
            description: 'Comprehensive review of existing research',
            icon: '📚',
            structure: 'Introduction → Thematic Analysis → Critical Evaluation → Research Gap',
            prompt: `Write a comprehensive literature review on: {topic}

Structure:
1. Brief introduction to the research area
2. Thematic organization of existing literature
3. Critical evaluation of key studies
4. Identification of research gaps

Requirements:
- Academic tone
- Clear organization
- Critical analysis (not just summary)
- Transitions between themes
- Highlight contradictions or debates
- 500-800 words

Write in a scholarly, analytical style appropriate for academic papers.`
        },
        {
            id: 'methodology',
            name: 'Methodology',
            description: 'Research design and methods',
            icon: '🔬',
            structure: 'Design → Data Collection → Analysis → Validity',
            prompt: `Write a methodology section for research on: {topic}

Structure:
1. Research design and approach
2. Data collection methods
3. Analysis procedures
4. Validity and reliability considerations

Requirements:
- Clear justification of methods
- Specific and detailed
- Past tense
- Replicable descriptions
- Address limitations
- 400-600 words

Write in clear, precise academic language.`
        },
        {
            id: 'results',
            name: 'Results/Findings',
            description: 'Present research findings',
            icon: '📊',
            structure: 'Overview → Key Findings → Supporting Data → Patterns',
            prompt: `Write a results section for research on: {topic}

Structure:
1. Overview of main findings
2. Detailed presentation of results
3. Tables/figures descriptions (use placeholders like [Table 1])
4. Patterns and trends observed

Requirements:
- Objective tone
- Past tense
- No interpretation (just facts)
- Clear organization
- Reference visual aids
- 400-600 words

Present findings factually without discussion.`
        },
        {
            id: 'discussion',
            name: 'Discussion',
            description: 'Interpret and explain findings',
            icon: '💡',
            structure: 'Interpretation → Implications → Limitations → Future',
            prompt: `Write a discussion section for research on: {topic}

Structure:
1. Interpretation of findings
2. Implications for theory/practice
3. Limitations of the study
4. Future research directions

Requirements:
- Connect to literature
- Explain significance
- Be honest about limitations
- Suggest practical applications
- Propose future studies
- 500-700 words

Write analytically, connecting findings to broader context.`
        },
        {
            id: 'introduction',
            name: 'Introduction',
            description: 'Set context and objectives',
            icon: '🎯',
            structure: 'Context → Problem → Objectives → Structure',
            prompt: `Write an introduction for academic work on: {topic}

Structure:
1. Background and context
2. Problem statement or research question
3. Research objectives
4. Paper structure overview

Requirements:
- Start broad, narrow to specific
- Clear research question
- Justify importance
- Preview paper organization
- Engaging opening
- 400-600 words

Create an inviting yet scholarly introduction.`
        },
        {
            id: 'conclusion',
            name: 'Conclusion',
            description: 'Summarize and synthesize',
            icon: '✅',
            structure: 'Summary → Contributions → Implications → Closing',
            prompt: `Write a conclusion for academic work on: {topic}

Structure:
1. Summary of main points
2. Key contributions
3. Practical implications
4. Final thoughts

Requirements:
- Synthesize, don't just repeat
- Highlight contributions
- Avoid new information
- End with impact statement
- Memorable closing
- 300-500 words

Provide a satisfying, forward-looking conclusion.`
        }
    ]
};
