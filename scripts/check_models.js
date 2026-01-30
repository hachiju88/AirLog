const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

try {
    const envConfig = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Could not read .env.local");
}

async function listModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    console.log("Checking available models via REST API...");
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log("Successfully retrieved models:");
            if (data.models) {
                data.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name}`);
                    }
                });
            } else {
                console.log("No models found in response.");
            }
        } else {
            console.error("Failed to list models via REST:");
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Network error listing models:", error);
    }
}

listModels();
