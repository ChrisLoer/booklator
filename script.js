class Booklator {
    constructor() {
        this.apiKey = '';
        this.customPrompt = '';
        this.paragraphs = [];
        this.translatedParagraphs = [];
        this.documentSummary = '';
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadStoredData();
    }

    initializeElements() {
        this.elements = {
            apiKey: document.getElementById('api-key'),
            customPrompt: document.getElementById('custom-prompt'),
            uploadArea: document.getElementById('upload-area'),
            fileInput: document.getElementById('file-input'),
            browseBtn: document.getElementById('browse-btn'),
            googleDocUrl: document.getElementById('google-doc-url'),
            processGoogleDocBtn: document.getElementById('process-google-doc'),
            progressSection: document.getElementById('progress-section'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            progressPercentage: document.getElementById('progress-percentage'),
            statusMessages: document.getElementById('status-messages'),
            liveDisplaySection: document.getElementById('live-display-section'),
            liveSummary: document.getElementById('live-summary'),
            liveTranslationContent: document.getElementById('live-translation-content'),
            translatedCount: document.getElementById('translated-count'),
            totalParagraphs: document.getElementById('total-paragraphs'),
            resultsSection: document.getElementById('results-section'),
            documentSummary: document.getElementById('document-summary'),
            translationContent: document.getElementById('translation-content'),
            downloadOriginal: document.getElementById('download-original'),
            downloadTranslated: document.getElementById('download-translated')
        };
    }

    setupEventListeners() {
        // API Key and custom prompt storage
        this.elements.apiKey.addEventListener('input', () => {
            this.apiKey = this.elements.apiKey.value;
            localStorage.setItem('booklator_api_key', this.apiKey);
        });

        this.elements.customPrompt.addEventListener('input', () => {
            this.customPrompt = this.elements.customPrompt.value;
            localStorage.setItem('booklator_custom_prompt', this.customPrompt);
        });

        // File upload
        this.elements.browseBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.docx')) {
                    this.handleFileUpload(file);
                } else {
                    this.showStatus('Please upload a .docx file', 'error');
                }
            }
        });

        // Google Doc processing
        this.elements.processGoogleDocBtn.addEventListener('click', () => {
            this.handleGoogleDoc();
        });

        // Download buttons
        this.elements.downloadOriginal.addEventListener('click', () => {
            this.downloadDocument('original');
        });

        this.elements.downloadTranslated.addEventListener('click', () => {
            this.downloadDocument('translated');
        });
    }

    loadStoredData() {
        const storedApiKey = localStorage.getItem('booklator_api_key');
        const storedCustomPrompt = localStorage.getItem('booklator_custom_prompt');
        
        if (storedApiKey) {
            this.apiKey = storedApiKey;
            this.elements.apiKey.value = storedApiKey;
        }
        
        if (storedCustomPrompt) {
            this.customPrompt = storedCustomPrompt;
            this.elements.customPrompt.value = storedCustomPrompt;
        }
    }

    async handleFileUpload(file) {
        if (!(await this.validateSetup())) return;

        this.showStatus('Processing document...', 'info');
        this.showProgressSection();

        try {
            const text = await this.extractTextFromDocx(file);
            this.paragraphs = this.parseParagraphs(text);
            
            this.showStatus(`Document processed successfully. Found ${this.paragraphs.length} paragraphs.`, 'success');
            this.showStatus('Generating document summary...', 'info');
            
            await this.generateSummary();
            await this.translateDocument();
            
        } catch (error) {
            this.showStatus(`Error processing document: ${error.message}`, 'error');
        }
    }

    async handleGoogleDoc() {
        if (!(await this.validateSetup())) return;

        const url = this.elements.googleDocUrl.value.trim();
        if (!url) {
            this.showStatus('Please enter a Google Doc URL', 'error');
            return;
        }

        this.showStatus('Processing Google Doc...', 'info');
        this.showProgressSection();

        try {
            const text = await this.extractTextFromGoogleDoc(url);
            this.paragraphs = this.parseParagraphs(text);
            
            this.showStatus(`Google Doc processed successfully. Found ${this.paragraphs.length} paragraphs.`, 'success');
            this.showStatus('Generating document summary...', 'info');
            
            await this.generateSummary();
            await this.translateDocument();
            
        } catch (error) {
            this.showStatus(`Error processing Google Doc: ${error.message}`, 'error');
        }
    }

    async checkAccountStatus() {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Account Status: OK - Models available:', data.data.length);
                return true;
            } else {
                const error = await response.json();
                console.error('Account Status Error:', error);
                return false;
            }
        } catch (error) {
            console.error('Account Status Check Failed:', error);
            return false;
        }
    }

    async validateSetup() {
        if (!this.apiKey.trim()) {
            this.showStatus('Please enter your OpenAI API key', 'error');
            return false;
        }

        // Test the API key
        this.showStatus('Validating API key...', 'info');
        const isValid = await this.checkAccountStatus();
        
        if (!isValid) {
            this.showStatus('Invalid API key or account issues. Please check your OpenAI account.', 'error');
            return false;
        }

        this.showStatus('API key validated successfully', 'success');
        return true;
    }

    async extractTextFromDocx(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    reject(new Error('Failed to extract text from DOCX file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    async extractTextFromGoogleDoc(url) {
        // For Google Docs, we'll need to use a proxy service or CORS-enabled approach
        // For now, we'll show a message asking users to copy-paste or use DOCX
        // TODO: Implement Google Docs API integration or use a CORS proxy service
        throw new Error('Google Doc processing requires additional setup. Please use a DOCX file for now. To enable Google Docs support, you would need to: 1) Set up Google Docs API credentials, 2) Use a CORS proxy service, or 3) Implement server-side processing.');
    }

    parseParagraphs(text) {
        // Split text into paragraphs and number them
        const paragraphs = text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map((p, index) => ({
                number: index + 1,
                text: p
            }));
        
        return paragraphs;
    }

    // More conservative token estimation (1 token ≈ 3 characters for safety)
    estimateTokens(text) {
        return Math.ceil(text.length / 3);
    }

    // Split text into chunks that fit within token limits
    splitIntoTokenChunks(text, maxTokens = 15000) { // Reduced from 25000 to 15000
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const chunks = [];
        let currentChunk = [];
        let currentTokens = 0;
        
        for (const paragraph of paragraphs) {
            const paragraphTokens = this.estimateTokens(paragraph);
            
            // If adding this paragraph would exceed the limit, start a new chunk
            if (currentTokens + paragraphTokens > maxTokens && currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n\n'));
                currentChunk = [paragraph];
                currentTokens = paragraphTokens;
            } else {
                currentChunk.push(paragraph);
                currentTokens += paragraphTokens;
            }
        }
        
        // Add the last chunk if it has content
        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
        }
        
        return chunks;
    }

    // Add delay between API calls to respect rate limits
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateSummary() {
        try {
            const fullText = this.paragraphs.map(p => p.text).join('\n\n');
            const estimatedTokens = this.estimateTokens(fullText);
            
            this.showStatus(`Document has approximately ${estimatedTokens.toLocaleString()} tokens`, 'info');
            this.showStatus('Generating summary using GPT-4o-mini (200,000 TPM limit)...', 'info');
            
            // Use gpt-4o-mini for summary (200,000 TPM limit vs 30,000 for gpt-4o)
            const prompt = `Please provide a comprehensive summary of the following document in English. Focus on the main themes, key points, and overall structure:

${fullText}

Summary:`;

            const summaryResponse = await this.callOpenAI(prompt, 1000, 'gpt-4o-mini');
            this.documentSummary = summaryResponse.trim();
            
            console.log('Generated summary:', this.documentSummary);
            this.showStatus(`Summary generated: ${this.documentSummary.substring(0, 100)}...`, 'success');
            
            // Show summary immediately in live display
            this.showLiveDisplay();
            this.elements.liveSummary.innerHTML = `<p>${this.documentSummary}</p>`;
            
            this.updateProgress(10);
            
        } catch (error) {
            throw new Error(`Failed to generate summary: ${error.message}`);
        }
    }

    showLiveDisplay() {
        this.elements.liveDisplaySection.classList.remove('hidden');
        this.elements.liveDisplaySection.classList.add('fade-in');
        this.elements.totalParagraphs.textContent = this.paragraphs.length;
        this.elements.liveDisplaySection.scrollIntoView({ behavior: 'smooth' });
    }

    async translateDocument() {
        const chunkSize = 3; // Reduced from 5 to 3 paragraphs per chunk
        const contextSize = 1; // Reduced from 2 to 1 paragraph for context
        const totalChunks = Math.ceil(this.paragraphs.length / chunkSize);
        
        this.showStatus(`Starting translation using GPT-4o (30,000 TPM limit) - ${this.paragraphs.length} paragraphs in ${totalChunks} chunks...`, 'info');
        
        for (let i = 0; i < totalChunks; i++) {
            const startIndex = i * chunkSize;
            const endIndex = Math.min(startIndex + chunkSize, this.paragraphs.length);
            const chunk = this.paragraphs.slice(startIndex, endIndex);
            
            // Get context paragraphs
            const contextBefore = this.paragraphs.slice(Math.max(0, startIndex - contextSize), startIndex);
            const contextAfter = this.paragraphs.slice(endIndex, Math.min(this.paragraphs.length, endIndex + contextSize));
            
            try {
                await this.translateChunk(chunk, contextBefore, contextAfter, i + 1, totalChunks);
                this.updateProgress(10 + ((i + 1) / totalChunks) * 80);
                
                // Add delay between chunks to respect rate limits
                if (i < totalChunks - 1) {
                    this.showStatus('Waiting for rate limit...', 'info');
                    await this.delay(5000); // Increased delay to 5 seconds
                }
            } catch (error) {
                this.showStatus(`Error translating chunk ${i + 1}: ${error.message}`, 'error');
                throw error;
            }
        }
        
        this.showStatus('Translation completed successfully!', 'success');
        this.updateProgress(100);
        this.showResults();
    }

    async translateChunk(chunk, contextBefore, contextAfter, chunkNumber, totalChunks) {
        const contextBeforeText = contextBefore.map(p => `${p.number}. ${p.text}`).join('\n');
        const chunkText = chunk.map(p => `${p.number}. ${p.text}`).join('\n');
        const contextAfterText = contextAfter.map(p => `${p.number}. ${p.text}`).join('\n');
        
        // Estimate tokens for this request
        const promptText = `Translate these numbered paragraphs to English. Maintain numbering and structure.

${this.customPrompt ? `Instructions: ${this.customPrompt}\n\n` : ''}

Summary: ${this.documentSummary.substring(0, 500)}...

Previous: ${contextBeforeText || 'None'}

Translate: ${chunkText}

Next: ${contextAfterText || 'None'}

Respond with JSON array: [{"number": 1, "text": "translation"}, ...]`;

        const estimatedTokens = this.estimateTokens(promptText);
        this.showStatus(`Chunk ${chunkNumber}/${totalChunks} - Estimated tokens: ${estimatedTokens.toLocaleString()}`, 'info');
        
        // If estimated tokens are too high, reduce the chunk further
        if (estimatedTokens > 12000) {
            this.showStatus(`Chunk ${chunkNumber} too large (${estimatedTokens} tokens), reducing...`, 'info');
            // Process each paragraph individually
            for (let i = 0; i < chunk.length; i++) {
                const singleParagraph = chunk[i];
                const singlePrompt = `Translate paragraph ${singleParagraph.number} to English: "${singleParagraph.text}"

Respond with JSON: {"number": ${singleParagraph.number}, "text": "translation"}`;
                
                const response = await this.callOpenAI(singlePrompt, 200, 'gpt-4o');
                const translated = this.extractJSONFromResponse(response);
                this.translatedParagraphs[translated.number - 1] = translated.text;
                
                this.showStatus(`Paragraph ${singleParagraph.number} translated`, 'success');
                await this.delay(2000); // 2 second delay between paragraphs
            }
        } else {
            const response = await this.callOpenAI(promptText, 800, 'gpt-4o'); // Explicitly use gpt-4o for translation
            
            try {
                const translatedChunk = this.extractJSONFromResponse(response);
                translatedChunk.forEach(item => {
                    this.translatedParagraphs[item.number - 1] = item.text;
                });
                
                this.showStatus(`Chunk ${chunkNumber}/${totalChunks} translated successfully`, 'success');
                this.updateTranslationDisplay();
                
            } catch (error) {
                throw new Error('Failed to parse translation response');
            }
        }
    }

    async callOpenAI(prompt, maxTokens = 1000, model = 'gpt-4o') {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional translator. Provide accurate, context-aware translations while maintaining the original structure and formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('OpenAI API Error Details:', error);
                
                // Provide more specific error messages
                if (error.error?.code === 'insufficient_quota') {
                    throw new Error('Billing quota exceeded. Please check your OpenAI account billing and add payment method.');
                } else if (error.error?.code === 'rate_limit_exceeded') {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else if (error.error?.code === 'invalid_api_key') {
                    throw new Error('Invalid API key. Please check your OpenAI API key.');
                } else if (error.error?.code === 'billing_not_active') {
                    throw new Error('Billing not active. Please add a payment method to your OpenAI account.');
                } else {
                    throw new Error(error.error?.message || `OpenAI API request failed: ${response.status} ${response.statusText}`);
                }
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Call Error:', error);
            throw error;
        }
    }

    // Helper function to extract JSON from response (handles markdown code blocks)
    extractJSONFromResponse(response) {
        // Remove markdown code blocks if present
        let jsonText = response.trim();
        
        // Remove ```json and ``` markers
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.substring(0, jsonText.length - 3);
        }
        
        // Clean up any remaining whitespace
        jsonText = jsonText.trim();
        
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            console.error('JSON Parse Error:', error);
            console.error('Attempted to parse:', jsonText);
            throw new Error('Failed to parse JSON response');
        }
    }

    showProgressSection() {
        this.elements.progressSection.classList.remove('hidden');
        this.elements.progressSection.scrollIntoView({ behavior: 'smooth' });
    }

    updateProgress(percentage) {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressPercentage.textContent = `${Math.round(percentage)}%`;
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        
        this.elements.statusMessages.appendChild(statusDiv);
        this.elements.statusMessages.scrollTop = this.elements.statusMessages.scrollHeight;
    }

    showResults() {
        this.elements.resultsSection.classList.remove('hidden');
        this.elements.resultsSection.classList.add('fade-in');
        
        // Display summary
        if (this.documentSummary) {
            this.elements.documentSummary.innerHTML = `<p>${this.documentSummary}</p>`;
        } else {
            this.elements.documentSummary.innerHTML = '<p>No summary available</p>';
        }
        
        this.updateTranslationDisplay();
        
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    updateTranslationDisplay() {
        // Update the live display
        this.updateLiveTranslationDisplay();
        
        // Update the final results display
        const content = this.paragraphs.map((paragraph, index) => {
            const translatedText = this.translatedParagraphs[index] || 'Translation pending...';
            return `
                <div class="paragraph">
                    <span class="paragraph-number">§${paragraph.number}</span>
                    <strong>Original:</strong> ${paragraph.text}<br>
                    <strong>Translated:</strong> ${translatedText}
                </div>
            `;
        }).join('');
        
        this.elements.translationContent.innerHTML = content;
    }

    updateLiveTranslationDisplay() {
        // Create all paragraph placeholders first
        if (this.elements.liveTranslationContent.children.length === 0) {
            const placeholders = this.paragraphs.map((paragraph, index) => `
                <div class="paragraph pending" id="live-paragraph-${paragraph.number}">
                    <span class="paragraph-number">§${paragraph.number}</span>
                    <div class="paragraph-original">
                        <strong>Original:</strong> ${paragraph.text}
                    </div>
                    <div class="paragraph-translated">
                        <strong>Translated:</strong> <span class="translated-text">Translation pending...</span>
                    </div>
                </div>
            `).join('');
            
            this.elements.liveTranslationContent.innerHTML = placeholders;
        }
        
        // Update translated paragraphs
        let translatedCount = 0;
        this.paragraphs.forEach((paragraph, index) => {
            const translatedText = this.translatedParagraphs[index];
            if (translatedText) {
                const paragraphElement = document.getElementById(`live-paragraph-${paragraph.number}`);
                if (paragraphElement) {
                    paragraphElement.classList.remove('pending');
                    paragraphElement.querySelector('.translated-text').textContent = translatedText;
                    translatedCount++;
                }
            }
        });
        
        // Update counter
        this.elements.translatedCount.textContent = translatedCount;
        
        // Auto-scroll to the latest translated paragraph
        if (translatedCount > 0) {
            const lastTranslated = document.getElementById(`live-paragraph-${translatedCount}`);
            if (lastTranslated) {
                lastTranslated.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    async downloadDocument(type) {
        const zip = new JSZip();
        
        if (type === 'original') {
            const originalContent = this.paragraphs.map(p => `§${p.number} ${p.text}`).join('\n\n');
            zip.file('original_document.txt', originalContent);
        } else {
            const translatedContent = this.paragraphs.map((p, index) => {
                const translatedText = this.translatedParagraphs[index] || 'Translation pending...';
                return `§${p.number} ${translatedText}`;
            }).join('\n\n');
            zip.file('translated_document.txt', translatedContent);
        }
        
        const blob = await zip.generateAsync({ type: 'blob' });
        const filename = type === 'original' ? 'original_document.zip' : 'translated_document.zip';
        saveAs(blob, filename);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new Booklator();
}); 
