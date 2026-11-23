const topicItems = document.querySelectorAll('#topicList li');
const currentTopicTitle = document.getElementById('currentTopicTitle');
const aiOutput = document.getElementById('aiOutput');
const customQuestionInput = document.getElementById('customQuestion');
const askBtn = document.getElementById('askBtn');
const langSelect = document.getElementById('langSelect');
const speakBtn = document.getElementById('speakBtn');
const stopSpeakBtn = document.getElementById('stopSpeakBtn');

// Modal elements
const apiKeyBtn = document.getElementById('apiKeyBtn');
const apiModal = document.getElementById('apiModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

let currentExplanationText = "";

// Load saved API key
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

// Handle Sidebar Topic Clicks
topicItems.forEach(item => {
    item.addEventListener('click', () => {
        topicItems.forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        
        const title = item.textContent;
        const prompt = item.getAttribute('data-topic');
        currentTopicTitle.textContent = title;
        fetchAIExplanation(prompt);
    });
});

// Handle Custom Question
askBtn.addEventListener('click', () => {
    const question = customQuestionInput.value.trim();
    if (!question) return;
    
    topicItems.forEach(li => li.classList.remove('active'));
    currentTopicTitle.textContent = "Q: " + question;
    fetchAIExplanation(question);
    customQuestionInput.value = '';
});

customQuestionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') askBtn.click();
});

// Fetch Explanation from Gemini API
async function fetchAIExplanation(topicPrompt) {
    const apiKey = getApiKey();
    if (!apiKey) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">⚠️ Please click <b>"Set Gemini API Key"</b> at the top right and enter your free Google AI Studio API key first.</p>`;
        return;
    }

    stopSpeech();
    speakBtn.disabled = true;
    aiOutput.innerHTML = `<p>⏳ AI Tutor is preparing your lesson...</p>`;

    const selectedLang = langSelect.options[langSelect.selectedIndex].text;
    const fullPrompt = `You are a friendly, patient computer teacher teaching a complete beginner or child. 
Explain the following topic clearly with real-life examples and easy step-by-step points. 
Language to respond in: ${selectedLang}. 
Do not use complex markdown symbols like asterisks excessively; keep it clean so it can be read aloud easily.
Topic: ${topicPrompt}`;

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

        const reply = data.candidates[0].content.parts[0].text;
        currentExplanationText = reply.replace(/[*#]/g, ''); // Clean symbols for better voice reading
        aiOutput.textContent = currentExplanationText;
        speakBtn.disabled = false;

    } catch (error) {
        aiOutput.innerHTML = `<p style="color: #dc2626;">Network error. Please check your internet connection and API key.</p>`;
    }
}

// Text-to-Speech (Voice Assistant)
speakBtn.addEventListener('click', () => {
    if (!currentExplanationText) return;
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(currentExplanationText);
    utterance.lang = langSelect.value;
    utterance.rate = 0.95;

    utterance.onstart = () => {
        speakBtn.classList.add('hidden');
        stopSpeakBtn.classList.remove('hidden');
    };

    utterance.onend = () => {
        stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
});

stopSpeakBtn.addEventListener('click', stopSpeech);

function stopSpeech() {
    window.speechSynthesis.cancel();
    speakBtn.classList.remove('hidden');
    stopSpeakBtn.classList.add('hidden');
}
