require('dotenv').config();
const { rewriteText } = require('../services/ai/rewriteService');

const sampleTexts = [
    "the internet's always been a thing.",
    "the sheer amount of junk we do online these days and don't even bat an eye.",
    "news traveled faster than my car in rush hour.",
    "is the internet a gift from the heavens or the devil incarnate?",
    "my phone’s basically become like an extra limb...",
    "forgotten the ancient art of actually talking face-to-face.",
    "unstoppable… like a massive boulder gaining speed downhill."
];

async function test() {
    for (let i = 0; i < sampleTexts.length; i++) {
        console.log(`--- Test ${i + 1} ---`);
        console.log('Original:', sampleTexts[i]);
        try {
            const result = await rewriteText(sampleTexts[i]);
            console.log('Rewritten:', result);
        } catch (e) { console.error(e); }
        console.log('\n');
    }
}

test();
