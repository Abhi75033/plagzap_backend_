const axios = require('axios');

/**
 * CITATION GENERATOR SERVICE
 * 
 * Generates citations in APA, MLA, and Chicago formats
 * Can extract metadata from URLs or use manual input
 */

/**
 * Extract metadata from a URL
 */
const extractMetadataFromUrl = async (url) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PlagZap/1.0)'
            },
            timeout: 10000
        });

        const html = response.data;

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

        // Extract author from meta tags
        const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i) ||
            html.match(/<meta\s+property=["']article:author["']\s+content=["']([^"']+)["']/i);
        const author = authorMatch ? authorMatch[1].trim() : '';

        // Extract publication date
        const dateMatch = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i) ||
            html.match(/<meta\s+name=["']date["']\s+content=["']([^"']+)["']/i);
        const dateStr = dateMatch ? dateMatch[1] : '';
        const date = dateStr ? new Date(dateStr) : new Date();

        // Extract site name
        const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
        const siteName = siteMatch ? siteMatch[1].trim() : new URL(url).hostname;

        return {
            title,
            author,
            date,
            siteName,
            url,
            accessDate: new Date()
        };
    } catch (error) {
        console.error('Error extracting metadata:', error.message);
        return {
            title: 'Unknown Title',
            author: '',
            date: new Date(),
            siteName: new URL(url).hostname,
            url,
            accessDate: new Date()
        };
    }
};

/**
 * Format date for citations
 */
const formatDate = (date, format) => {
    const d = new Date(date);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsShort = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June',
        'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

    switch (format) {
        case 'APA': // (Year, Month Day)
            return `${d.getFullYear()}, ${months[d.getMonth()]} ${d.getDate()}`;
        case 'MLA': // Day Month Year
            return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
        case 'Chicago': // Month Day, Year
            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        default:
            return d.toLocaleDateString();
    }
};

/**
 * Format author name
 */
const formatAuthor = (author, format) => {
    if (!author) return '';

    const parts = author.trim().split(' ');
    if (parts.length === 1) return author;

    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');

    switch (format) {
        case 'APA': // Last, F. M.
            return `${lastName}, ${firstName.split(' ').map(n => n[0] + '.').join(' ')}`;
        case 'MLA': // Last, First
            return `${lastName}, ${firstName}`;
        case 'Chicago': // First Last
            return `${firstName} ${lastName}`;
        default:
            return author;
    }
};

/**
 * Generate APA citation
 * Format: Author, A. A. (Year, Month Day). Title. Site Name. URL
 */
const formatAPA = (data) => {
    const author = data.author ? formatAuthor(data.author, 'APA') : data.siteName;
    const date = formatDate(data.date, 'APA');

    return `${author} (${date}). ${data.title}. ${data.siteName}. ${data.url}`;
};

/**
 * Generate MLA citation
 * Format: Author. "Title." Site Name, Day Month Year, URL. Accessed Day Month Year.
 */
const formatMLA = (data) => {
    const author = data.author ? formatAuthor(data.author, 'MLA') : data.siteName;
    const pubDate = formatDate(data.date, 'MLA');
    const accessDate = formatDate(data.accessDate, 'MLA');

    return `${author}. "${data.title}." ${data.siteName}, ${pubDate}, ${data.url}. Accessed ${accessDate}.`;
};

/**
 * Generate Chicago citation
 * Format: Author. "Title." Site Name. Month Day, Year. URL.
 */
const formatChicago = (data) => {
    const author = data.author ? formatAuthor(data.author, 'Chicago') : data.siteName;
    const date = formatDate(data.date, 'Chicago');

    return `${author}. "${data.title}." ${data.siteName}. ${date}. ${data.url}.`;
};

/**
 * Generate citation in specified format
 */
const generateCitation = async (input, format = 'APA') => {
    let data;

    // If input is a URL, extract metadata
    if (typeof input === 'string' && input.startsWith('http')) {
        data = await extractMetadataFromUrl(input);
    } else {
        // Use manual input data
        data = {
            title: input.title || 'Untitled',
            author: input.author || '',
            date: input.date ? new Date(input.date) : new Date(),
            siteName: input.siteName || input.publisher || 'Unknown Publisher',
            url: input.url || '',
            accessDate: new Date()
        };
    }

    let citation;
    switch (format.toUpperCase()) {
        case 'APA':
            citation = formatAPA(data);
            break;
        case 'MLA':
            citation = formatMLA(data);
            break;
        case 'CHICAGO':
            citation = formatChicago(data);
            break;
        default:
            citation = formatAPA(data);
    }

    return {
        citation,
        format: format.toUpperCase(),
        metadata: data
    };
};

module.exports = {
    generateCitation,
    extractMetadataFromUrl,
    formatAPA,
    formatMLA,
    formatChicago
};
