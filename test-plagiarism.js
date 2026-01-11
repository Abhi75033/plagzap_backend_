// Test script to verify web search and similarity calculation
const axios = require('axios');
const cheerio = require('cheerio');

// Test web search
async function testWebSearch() {
    console.log('🧪 Testing Web Search...\n');

    const query = "Mohandas Karamchand Gandhi was an Indian lawyer";
    console.log('Query:', query);
    console.log('---');

    try {
        // Test Bing search
        const url = `https://www.bing.com/search?q=${encodeURIComponent('"' + query + '"')}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
        });

        const $ = cheerio.load(response.data);
        const results = [];

        $('#b_results > li.b_algo').each((index, element) => {
            if (index >= 5) return false;

            const $result = $(element);
            const title = $result.find('h2 a').text().trim();
            const link = $result.find('h2 a').attr('href');
            const snippet = $result.find('.b_caption p').text().trim() ||
                $result.find('.b_snippet').text().trim();

            if (title && snippet) {
                results.push({ title, link, snippet: snippet.substring(0, 100) });
            }
        });

        console.log(`✅ Found ${results.length} results from Bing\n`);
        results.forEach((r, i) => {
            console.log(`Result ${i + 1}:`);
            console.log(`  Title: ${r.title}`);
            console.log(`  Snippet: ${r.snippet}...`);
            console.log('');
        });

        return results;

    } catch (error) {
        console.error('❌ Search failed:', error.message);
        return [];
    }
}

// Test similarity calculation
function testSimilarity() {
    console.log('\n🧪 Testing Similarity Calculation...\n');

    const text1 = "Mohandas Karamchand Gandhi was an Indian lawyer";
    const text2 = "Mohandas Karamchand Gandhi (2 October 1869 – 30 January 1948) was an Indian lawyer";

    // Simple word overlap test
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const overlapScore = intersection.size / Math.min(set1.size, set2.size);

    console.log('Text 1:', text1);
    console.log('Text 2:', text2);
    console.log('---');
    console.log('Words in Text 1:', words1.length);
    console.log('Words in Text 2:', words2.length);
    console.log('Common words:', intersection.size);
    console.log('Overlap Score:', (overlapScore * 100).toFixed(1) + '%');
    console.log('');

    if (overlapScore > 0.7) {
        console.log('✅ HIGH similarity detected (should trigger plagiarism)');
    } else {
        console.log('⚠️  LOW similarity - may not trigger plagiarism detection');
    }
}

// Run tests
async function runTests() {
    await testWebSearch();
    testSimilarity();
}

runTests().catch(console.error);
