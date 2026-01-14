const axios = require('axios');
const cheerio = require('cheerio');

const scrapeUrl = async (url) => {
    try {
        // Validate URL
        if (!url || !url.startsWith('http')) {
            throw new Error('Invalid URL');
        }

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000 // 10s timeout
        });

        const $ = cheerio.load(data);

        // Remove unwanted elements
        $('script, style, nav, footer, header, aside, .advertisement, #comments').remove();

        // Extract main content
        // This is a heuristic: try to find common content containers, or fallback to body
        // Select 'p' tags and 'h1-h6' tags for content
        let content = '';
        $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 20) { // Filter out very short snippets
                content += text + '\n\n';
            }
        });

        // Fallback if structured extraction failed
        if (content.length < 100) {
            content = $('body').text().replace(/\s+/g, ' ').trim();
        }

        // Limit length to prevent overload (e.g. 50k chars)
        if (content.length > 50000) {
            content = content.substring(0, 50000);
        }

        return {
            url,
            title: $('title').text().trim(),
            text: content.trim()
        };
    } catch (error) {
        console.error(`Scraping error for ${url}:`, error.message);
        throw new Error('Failed to scrape URL: ' + error.message);
    }
};

module.exports = {
    scrapeUrl
};
