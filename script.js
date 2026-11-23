const topicItems = document.querySelectorAll('#topicList li');
const currentTopicTitle = document.getElementById('currentTopicTitle');
const aiOutput = document.getElementById('aiOutput');
const mediaContainer = document.getElementById('mediaContainer');
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

let currentExplanationText = "";
let activePrompt = "";

// Ensure browser voices are loaded properly
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

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

// Handle sidebar module clicks
topicItems.forEach(item => {
    item.addEventListener('click', () => {
        topicItems.forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        currentTopicTitle.textContent = item.textContent;
        activePrompt = item.getAttribute('data-topic');
        fetchAIExplanation(activePrompt);
    });
});

// Handle custom question submission
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

// Automatically regenerate content when language dropdown changes
langSelect.addEventListener('change', () => {
    if (activePrompt) {
        fetchAIExplanation(activePrompt);
    }
});

async function fetchAIExplanation(promptText) {
    const apiKey = getApiKey();
    if (!apiKey) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">⚠️ Please set your Gemini API key using the button at the top right.</p>`;
        return;
    }

    stopSpeech();
    speakBtn.disabled = true;
    aiOutput.innerHTML = `<p>⏳ AI Tutor is preparing the lesson in your selected language...</p>`;
    mediaContainer.classList.add('hidden');
    mediaContainer.innerHTML = '';

    const selectedLanguageName = langSelect.options[langSelect.selectedIndex].text;

    const fullPrompt = `You are a world-class, friendly computer teacher.
Explain the following topic: "${promptText}".
IMPORTANT: You must respond STRICTLY in this language: ${selectedLanguageName}. Do not mix languages or default to English unless English is selected.
Provide a clear, encouraging, step-by-step explanation suitable for beginners.
Do not use markdown asterisks or hashtags so the text can be read aloud smoothly.
Also, provide ONE relevant Wikimedia Commons or educational image URL illustrating this concept if available, or leave it blank.
Format your response EXACTLY like this:
TEXT: [Your full explanation strictly in ${selectedLanguageName}]
IMAGE_URL: [Direct HTTPS URL of a relevant image or NONE]`;

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

        const textResponse = data.candidates[0].content.parts[0].text;
        parseAndDisplayResponse(textResponse);
        speakBtn.disabled = false;
    } catch (e) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">Network error. Please check your connection.</p>`;
    }
}

function parseAndDisplayResponse(responseText) {
    const textMatch = responseText.match(/TEXT:([\s\S]*?)IMAGE_URL:/);
    const imageUrlMatch = responseText.match(/IMAGE_URL:\s*(https[^\s]+)/);

    const explanation = textMatch ? textMatch[1].trim() : responseText;
    currentExplanationText = explanation.replace(/[*#]/g, '');
    aiOutput.textContent = currentExplanationText;

    if (imageUrlMatch && imageUrlMatch[1] !== 'NONE') {
        const imageUrl = imageUrlMatch[1].trim();
        mediaContainer.classList.remove('hidden');
        mediaContainer.innerHTML = `<img src="${imageUrl}" alt="Computer lesson visual" onerror="this.parentElement.classList.add('hidden')">`;
    }
}

// Text-to-Speech handler
speakBtn.addEventListener('click', () => {
    if (!currentExplanationText) return;
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(currentExplanationText);
    utterance.lang = langSelect.value;
    utterance.rate = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const targetLangCode = langSelect.value.toLowerCase();
    const shortLangCode = targetLangCode.slice(0, 2);

    // Match exact locale first, then fallback to language prefix
    const selectedVoice = voices.find(v => v.lang.toLowerCase() === targetLangCode) ||
                          voices.find(v => v.lang.toLowerCase().startsWith(shortLangCode));

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
        speakBtn.classList.add('hidden');
        stopSpeakBtn.classList.remove('hidden');
    };

    utterance.onend = stopSpeech;
    window.speechSynthesis.speak(utterance);
});

stopSpeakBtn.addEventListener('click', stopSpeech);

function stopSpeech() {
    window.speechSynthesis.cancel();
    speakBtn.classList.remove('hidden');
    stopSpeakBtn.classList.add('hidden');
}
