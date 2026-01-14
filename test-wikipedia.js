// Test new Wikipedia-based plagiarism detection
const { searchForPlagiarism } = require('./services/webSearchService');

async function testPlagiarismDetection() {
    console.log('🧪 Testing Plagiarism Detection with Wikipedia API\n');

    const testText = "Mohandas Karamchand Gandhi was an Indian lawyer, anti-colonial nationalist, and political ethicist who employed nonviolent resistance to lead the successful campaign for India's independence from British rule";

    console.log('Test Text:', testText);
    console.log('---\n');

    const results = await searchForPlagiarism(testText);

    console.log(`\n📊 Final Results: ${results.length} sources found\n`);

    if (results.length > 0) {
        console.log('Sample Results:');
        results.forEach((r, i) => {
            console.log(`\n${i + 1}. ${r.title}`);
            console.log(`   URL: ${r.link}`);
            console.log(`   Snippet: ${r.snippet.substring(0, 150)}...`);
        });

        console.log('\n✅ SUCCESS: Plagiarism detection is working!');
    } else {
        console.log('❌ FAILED: No results found');
    }
}

testPlagiarismDetection().catch(console.error);
