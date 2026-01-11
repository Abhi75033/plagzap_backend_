const axios = require('axios');

/**
 * PLAGIARISM DETECTION SERVICE
 * Uses Wikipedia API + Google Custom Search (if available)
 * NO web scraping - relies only on proper APIs
 */

/**
 * Search Wikipedia for similar content
 */
async function searchWikipedia(text) {
    try {
        // Extract key terms from the text
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3);

        // Use the first few meaningful words as search query
        const query = words.slice(0, 5).join(' ');

        console.log(`  → Searching Wikipedia for: "${query}"`);

        const response = await axios.get('https://en.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                list: 'search',
                srsearch: query,
                format: 'json',
                srlimit: 3,
                origin: '*'
            },
            headers: {
                'User-Agent': 'PlagZap/1.0 (Educational Project)'
            },
            timeout: 5000,
        });

        const searchResults = response.data.query?.search || [];

        // For each result, get the full page content
        const results = [];
        for (const item of searchResults.slice(0, 2)) {
            try {
                const pageResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
                    params: {
                        action: 'query',
                        prop: 'extracts',
                        exintro: true,
                        explaintext: true,
                        titles: item.title,
                        format: 'json',
                        origin: '*'
                    },
                    headers: {
                        'User-Agent': 'PlagZap/1.0 (Educational Project)'
                    },
                    timeout: 5000,
                });

                const pages = pageResponse.data.query?.pages || {};
                const page = Object.values(pages)[0];

                if (page && page.extract) {
                    results.push({
                        title: page.title + ' - Wikipedia',
                        link: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
                        snippet: page.extract
                    });
                }
            } catch (error) {
                console.log(`    Warning: Could not fetch page for "${item.title}"`);
            }
        }

        console.log(`  ✅ Wikipedia returned ${results.length} articles`);
        return results;

    } catch (error) {
        console.log(`  ⚠️  Wikipedia search failed: ${error.message}`);
        return [];
    }
}

/**
 * Try Google Custom Search if API keys are available
 */
async function searchGoogle(text) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;

    // Validate API keys
    if (!apiKey || !cx ||
        apiKey === 'your-google-search-api-key' ||
        cx === 'your-custom-search-engine-id') {
        return [];
    }

    try {
        const cleanQuery = text
            .substring(0, 150)
            .replace(/\[[\w]+\]/g, '')  // Remove citations
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`  → Searching Google for: "${cleanQuery.substring(0, 50)}..."`);

        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: apiKey,
                cx: cx,
                q: `"${cleanQuery}"`,
                num: 5
            },
            timeout: 8000
        });

        const results = (response.data.items || []).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }));

        console.log(`  ✅ Google returned ${results.length} results`);
        return results;

    } catch (error) {
        console.log(`  ⚠️  Google search failed: ${error.message.substring(0, 60)}`);
        return [];
    }
}

/**
 * Search for plagiarism using available methods
 */
async function searchForPlagiarism(text) {
    const allResults = [];

    // 1. Try Google first (if configured)
    const googleResults = await searchGoogle(text);
    allResults.push(...googleResults);

    // 2. Always search Wikipedia (free and reliable)
    const wikiResults = await searchWikipedia(text);
    allResults.push(...wikiResults);

    console.log(`  📊 Total sources found: ${allResults.length}`);
    return allResults;
}

module.exports = { searchForPlagiarism };
