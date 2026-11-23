const topicItems = document.querySelectorAll('#topicList li');
const currentTopicTitle = document.getElementById('currentTopicTitle');
const aiOutput = document.getElementById('aiOutput');
const customQuestionInput = document.getElementById('customQuestion');
const askBtn = document.getElementById('askBtn');
const langSelect = document.getElementById('langSelect');
const speakBtn = document.getElementById('speakBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');

const apiKeyBtn = document.getElementById('apiKeyBtn');
const apiModal = document.getElementById('apiModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

let currentPlainTextForSpeech = "";
let activePrompt = "";
let availableVoices = [];

// Load browser voices reliably
function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}
loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getApiKey() {
    return localStorage.getItem('gemini_api_key') || '';
}

apiKeyBtn.addEventListener('click', () => {
    apiKeyInput.value = getApiKey();
    apiModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    apiModal.style.display = 'none';
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        alert('API Key saved successfully!');
        apiModal.style.display = 'none';
    }
});

// Sidebar Module Click
topicItems.forEach(item => {
    item.addEventListener('click', () => {
        topicItems.forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentTopicTitle.textContent = item.textContent;
        activePrompt = item.getAttribute('data-topic');
        fetchAIExplanation(activePrompt);
    });
});

// Custom Question
askBtn.addEventListener('click', () => {
    const q = customQuestionInput.value.trim();
    if (q) {
        topicItems.forEach(li => li.classList.remove('active'));
        currentTopicTitle.textContent = "Q: " + q;
        activePrompt = q;
        fetchAIExplanation(activePrompt);
        customQuestionInput.value = '';
    }
});

customQuestionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askBtn.click();
});

// Automatically regenerate lesson when language changes
langSelect.addEventListener('change', () => {
    if (activePrompt) {
        fetchAIExplanation(activePrompt);
    }
});

async function fetchAIExplanation(promptText) {
    const apiKey = getApiKey();
    if (!apiKey) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">⚠️ Please click <b>"Set Gemini API Key"</b> at the top right and enter your free Google AI Studio API key first.</p>`;
        return;
    }

    stopSpeech();
    speakBtn.disabled = true;
    aiOutput.innerHTML = `<p>⏳ AI Tutor is preparing your visual & voice lesson...</p>`;

    const selectedLanguageName = langSelect.options[langSelect.selectedIndex].text;

    const fullPrompt = `You are a friendly, patient computer teacher teaching a complete beginner.
Explain the following topic clearly with practical step-by-step instructions (where to click, how it works): "${promptText}".

CRITICAL RULES:
1. Write the ENTIRE explanation strictly in this language: ${selectedLanguageName}. Do not mix English unless technical terms require it.
2. Do NOT use markdown symbols like **, ##, or * anywhere in the text.
3. Between the explanation steps, insert 2 visual diagram tags using this EXACT format on their own separate lines:
[IMAGE: short clear English description of the computer diagram or action, e.g., diagram showing computer keyboard mouse monitor and CPU connected]
4. Keep the explanation warm, encouraging, and easy to read aloud.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            aiOutput.innerHTML = `<p style="color: #dc2626;">API Error: ${data.error.message}</p>`;
            return;
        }

        const rawReply = data.candidates[0].content.parts[0].text;
        renderLessonWithInlineImages(rawReply);
        speakBtn.disabled = false;

    } catch (error) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">Network error. Please check your internet connection and API key.</p>`;
    }
}

// Render paragraphs and inline images smoothly
function renderLessonWithInlineImages(rawText) {
    aiOutput.innerHTML = '';
    let speechLines = [];

    // Clean any stray markdown symbols
    const cleanedText = rawText.replace(/[*#]/g, '');
    const lines = cleanedText.split('\n');

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Check if line is an inline image tag
        const imageMatch = trimmed.match(/^\[IMAGE:\s*(.+?)\]$/i);

        if (imageMatch) {
            const imageDescription = imageMatch[1].trim();
            const encodedPrompt = encodeURIComponent(`clean educational computer diagram illustration, ${imageDescription}, white background, clear labels`);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=640&height=360&nologo=true`;

            const card = document.createElement('div');
            card.className = 'inline-visual-card';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${imageDescription}" loading="lazy" onerror="this.parentElement.style.display='none'">
                <div class="inline-visual-caption">📌 Visual Guide: ${imageDescription}</div>
            `;
            aiOutput.appendChild(card);
        } else {
            const p = document.createElement('p');
            p.textContent = trimmed;
            aiOutput.appendChild(p);
            speechLines.push(trimmed);
        }
    });

    currentPlainTextForSpeech = speechLines.join(' ');
}

// Reliable Multi-Language Text-to-Speech (Chunked to prevent browser cutoff)
speakBtn.addEventListener('click', () => {
    if (!currentPlainTextForSpeech) return;
    stopSpeech();
    loadVoices();

    const targetLocale = langSelect.value; // e.g., 'bn-IN', 'hi-IN', 'en-IN'
    const shortLang = targetLocale.split('-')[0].toLowerCase();

    // Find best matching voice installed in the browser/OS
    let matchedVoice = availableVoices.find(v => v.lang.toLowerCase() === targetLocale.toLowerCase()) ||
                       availableVoices.find(v => v.lang.toLowerCase().startsWith(shortLang));

    // Split text into smaller sentences so speech engine never hangs or stays silent
    const sentences = currentPlainTextForSpeech.match(/[^।.!?]+[।.!?]*/g) || [currentPlainTextForSpeech];

    speakBtn.classList.add('hidden');
    stopSpeakBtn.classList.remove('hidden');

    let index = 0;

    function speakNextSentence() {
        if (index >= sentences.length) {
            stopSpeech();
            return;
        }

        const sentenceText = sentences[index].trim();
        if (!sentenceText) {
            index++;
            speakNextSentence();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = targetLocale;
        utterance.rate = 0.92;

        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }

        utterance.onend = () => {
            index++;
            speakNextSentence();
        };

        utterance.onerror = () => {
            index++;
            speakNextSentence();
        };

        window.speechSynthesis.speak(utterance);
    }

    speakNextSentence();
});

stopSpeakBtn.addEventListener('click', stopSpeech);

function stopSpeech() {
    window.speechSynthesis.cancel();
    speakBtn.classList.remove('hidden');
    stopSpeakBtn.classList.add('hidden');
}
