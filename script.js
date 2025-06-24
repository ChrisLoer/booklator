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
                const file = e.target.files[0];
                if (file.name.endsWith('.json')) {
                    this.loadStateFromFile(file);
                } else {
                    this.handleFileUpload(file);
                }
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
                } else if (file.name.endsWith('.json')) {
                    this.loadStateFromFile(file);
                } else {
                    this.showStatus('Please upload a .docx file or .json state file', 'error');
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

        // Load saved state
        this.loadState();
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

    // Save current state to localStorage
    saveState() {
        const state = {
            paragraphs: this.paragraphs,
            translatedParagraphs: this.translatedParagraphs,
            documentSummary: this.documentSummary,
            customPrompt: this.customPrompt,
            timestamp: Date.now()
        };
        localStorage.setItem('booklator_state', JSON.stringify(state));
        console.log('State saved:', state);
    }

    // Load state from localStorage
    loadState() {
        const savedState = localStorage.getItem('booklator_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.paragraphs = state.paragraphs || [];
                this.translatedParagraphs = state.translatedParagraphs || [];
                this.documentSummary = state.documentSummary || '';
                this.customPrompt = state.customPrompt || '';
                
                // Ensure translatedParagraphs array is the same length as paragraphs
                if (this.paragraphs.length > 0) {
                    // Extend the array to match the number of paragraphs
                    while (this.translatedParagraphs.length < this.paragraphs.length) {
                        this.translatedParagraphs.push(null);
                    }
                    
                    this.showStatus('Previous session found. Click "Resume Translation" to continue.', 'info');
                    this.showResumeButton();
                }
                return true;
            } catch (error) {
                console.error('Failed to load state:', error);
                return false;
            }
        }
        return false;
    }

    // Show resume button
    showResumeButton() {
        // Remove existing resume button if it exists
        const existingBtn = document.getElementById('resume-translation');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        const resumeBtn = document.createElement('button');
        resumeBtn.id = 'resume-translation';
        resumeBtn.className = 'btn btn-primary';
        resumeBtn.textContent = 'Resume Translation';
        resumeBtn.onclick = () => this.resumeTranslation();
        
        const uploadSection = document.getElementById('upload-section');
        uploadSection.appendChild(resumeBtn);
    }

    // Resume translation from saved state
    async resumeTranslation() {
        if (this.paragraphs.length === 0) {
            this.showStatus('No saved state to resume from', 'error');
            return;
        }

        // Validate API key before resuming
        if (!this.apiKey.trim()) {
            this.showStatus('Please enter your OpenAI API key before resuming', 'error');
            return;
        }

        this.showStatus('Resuming translation from saved state...', 'info');
        this.showProgressSection();
        this.showLiveDisplay();
        
        // Display existing summary
        if (this.documentSummary) {
            this.elements.liveSummary.innerHTML = marked.parse(this.documentSummary);
        }
        
        // Show existing translations
        this.updateLiveTranslationDisplay();
        
        // Find the first untranslated paragraph
        const firstUntranslatedIndex = this.translatedParagraphs.findIndex(translation => 
            !translation || translation === null || translation === undefined || translation === ''
        );
        console.log('First untranslated index:', firstUntranslatedIndex);
        console.log('Translated paragraphs:', this.translatedParagraphs.filter(t => t && t !== null && t !== undefined && t !== '').length);
        console.log('Total paragraphs:', this.paragraphs.length);
        console.log('translatedParagraphs array sample:', this.translatedParagraphs.slice(320, 330));
        
        if (firstUntranslatedIndex === -1) {
            this.showStatus('All paragraphs are already translated!', 'success');
            this.showResults();
            return;
        }
        
        this.showStatus(`Resuming from paragraph ${firstUntranslatedIndex + 1} (${this.translatedParagraphs.filter(t => t && t !== null && t !== undefined && t !== '').length} already translated)`, 'info');
        
        // Continue translation from where we left off
        await this.translateDocumentFromIndex(firstUntranslatedIndex);
    }

    // Translate document starting from a specific index
    async translateDocumentFromIndex(startIndex) {
        const chunkSize = 8; // Increased from 3 to 8 paragraphs per chunk
        const contextSize = 2; // Increased from 1 to 2 paragraphs for context
        const remainingParagraphs = this.paragraphs.length - startIndex;
        const totalChunks = Math.ceil(remainingParagraphs / chunkSize);
        
        console.log('Starting translation from index:', startIndex);
        console.log('Remaining paragraphs:', remainingParagraphs);
        console.log('Total chunks needed:', totalChunks);
        
        this.showStatus(`Continuing translation from paragraph ${startIndex + 1} - ${remainingParagraphs} paragraphs remaining in ${totalChunks} chunks...`, 'info');
        
        for (let i = 0; i < totalChunks; i++) {
            const chunkStartIndex = startIndex + (i * chunkSize);
            const chunkEndIndex = Math.min(chunkStartIndex + chunkSize, this.paragraphs.length);
            const chunk = this.paragraphs.slice(chunkStartIndex, chunkEndIndex);
            
            console.log(`Processing chunk ${i + 1}/${totalChunks}: paragraphs ${chunkStartIndex + 1}-${chunkEndIndex}`);
            
            // Get context paragraphs
            const contextBefore = this.paragraphs.slice(Math.max(0, chunkStartIndex - contextSize), chunkStartIndex);
            const contextAfter = this.paragraphs.slice(chunkEndIndex, Math.min(this.paragraphs.length, chunkEndIndex + contextSize));
            
            try {
                await this.translateChunk(chunk, contextBefore, contextAfter, i + 1, totalChunks);
                this.updateProgress(10 + ((i + 1) / totalChunks) * 80);
                
                // Save state after each chunk
                this.saveState();
                
                // Add delay between chunks to respect rate limits
                if (i < totalChunks - 1) {
                    this.showStatus('Waiting for rate limit...', 'info');
                    await this.delay(3000); // Reduced delay to 3 seconds
                }
            } catch (error) {
                this.showStatus(`Error translating chunk ${i + 1}: ${error.message}`, 'error');
                this.showRetryButton(i, chunk, contextBefore, contextAfter, totalChunks, startIndex);
                throw error;
            }
        }
        
        this.showStatus('Translation completed successfully!', 'success');
        this.updateProgress(100);
        this.showResults();
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
            this.elements.liveSummary.innerHTML = marked.parse(this.documentSummary);
            
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
        const chunkSize = 8; // Increased from 3 to 8 paragraphs per chunk
        const contextSize = 2; // Increased from 1 to 2 paragraphs for context
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
                
                // Save state after each chunk
                this.saveState();
                
                // Add delay between chunks to respect rate limits
                if (i < totalChunks - 1) {
                    this.showStatus('Waiting for rate limit...', 'info');
                    await this.delay(3000); // Reduced delay to 3 seconds
                }
            } catch (error) {
                this.showStatus(`Error translating chunk ${i + 1}: ${error.message}`, 'error');
                this.showRetryButton(i, chunk, contextBefore, contextAfter, totalChunks);
                throw error;
            }
        }
        
        this.showStatus('Translation completed successfully!', 'success');
        this.updateProgress(100);
        this.showResults();
    }

    showRetryButton(chunkIndex, chunk, contextBefore, contextAfter, totalChunks, startIndex = 0) {
        const retryBtn = document.createElement('button');
        retryBtn.id = 'retry-chunk';
        retryBtn.className = 'btn btn-secondary';
        retryBtn.textContent = `Retry Chunk ${chunkIndex + 1}`;
        retryBtn.onclick = async () => {
            retryBtn.disabled = true;
            retryBtn.textContent = 'Retrying...';
            
            try {
                await this.translateChunk(chunk, contextBefore, contextAfter, chunkIndex + 1, totalChunks);
                this.showStatus(`Chunk ${chunkIndex + 1} retried successfully`, 'success');
                retryBtn.remove();
                
                // Continue with next chunk
                this.updateProgress(10 + ((chunkIndex + 1) / totalChunks) * 80);
                this.saveState();
                
                // Continue translation from the current position
                const nextChunkStartIndex = startIndex + ((chunkIndex + 1) * 8); // 8 is chunkSize
                if (nextChunkStartIndex < this.paragraphs.length) {
                    await this.translateDocumentFromIndex(nextChunkStartIndex);
                } else {
                    this.showStatus('Translation completed successfully!', 'success');
                    this.updateProgress(100);
                    this.showResults();
                }
            } catch (error) {
                this.showStatus(`Retry failed: ${error.message}`, 'error');
                retryBtn.disabled = false;
                retryBtn.textContent = `Retry Chunk ${chunkIndex + 1}`;
            }
        };
        
        const statusMessages = document.getElementById('status-messages');
        statusMessages.appendChild(retryBtn);
    }

    async translateChunk(chunk, contextBefore, contextAfter, chunkNumber, totalChunks) {
        console.log(`translateChunk called for chunk ${chunkNumber}/${totalChunks} with ${chunk.length} paragraphs`);
        
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
        this.showStatus(`Chunk ${chunkNumber} - Processing ${chunk.length} paragraphs`, 'info');
        
        console.log(`Making OpenAI API call for chunk ${chunkNumber} with ${estimatedTokens} estimated tokens`);
        
        // If estimated tokens are too high, reduce the chunk further
        if (estimatedTokens > 12000) {
            this.showStatus(`Chunk ${chunkNumber} too large (${estimatedTokens} tokens), reducing...`, 'info');
            // Process each paragraph individually
            for (let i = 0; i < chunk.length; i++) {
                const singleParagraph = chunk[i];
                const singlePrompt = `Translate paragraph ${singleParagraph.number} to English: "${singleParagraph.text}"

Respond with JSON: {"number": ${singleParagraph.number}, "text": "translation"}`;
                
                console.log(`Making individual API call for paragraph ${singleParagraph.number}`);
                const response = await this.callOpenAI(singlePrompt, null, 'gpt-4o'); // Removed maxTokens limit
                const translated = this.extractJSONFromResponse(response);
                this.translatedParagraphs[translated.number - 1] = translated.text;
                
                this.showStatus(`Paragraph ${singleParagraph.number} translated`, 'success');
                await this.delay(2000); // 2 second delay between paragraphs
            }
        } else {
            console.log(`Making chunk API call for ${chunk.length} paragraphs`);
            const response = await this.callOpenAI(promptText, null, 'gpt-4o'); // Removed maxTokens limit
            
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
            const requestBody = {
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
                temperature: 0.3
            };

            // Only add max_tokens if specified (not null)
            if (maxTokens !== null) {
                requestBody.max_tokens = maxTokens;
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
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
        
        // Try to fix common JSON issues
        jsonText = this.fixJSONIssues(jsonText);
        
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            console.error('JSON Parse Error:', error);
            console.error('Attempted to parse:', jsonText);
            
            // Try to extract JSON array from the response
            const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                try {
                    return JSON.parse(arrayMatch[0]);
                } catch (secondError) {
                    console.error('Second JSON parse attempt failed:', secondError);
                }
            }
            
            throw new Error('Failed to parse JSON response');
        }
    }

    // Fix common JSON issues
    fixJSONIssues(jsonText) {
        // Fix unterminated strings by finding the last complete object
        let fixedText = jsonText;
        
        // If it ends with a comma, remove it
        fixedText = fixedText.replace(/,\s*$/, '');
        
        // If it ends with an incomplete object, try to find the last complete one
        if (fixedText.includes('"text": "') && !fixedText.endsWith('"}')) {
            // Find the last complete object
            const lastCompleteMatch = fixedText.match(/.*\{"number":\s*\d+,\s*"text":\s*"[^"]*"\}/);
            if (lastCompleteMatch) {
                fixedText = lastCompleteMatch[0];
                // Add closing bracket if missing
                if (!fixedText.endsWith(']')) {
                    fixedText += ']';
                }
            }
        }
        
        // Ensure it starts and ends with brackets
        if (!fixedText.startsWith('[')) {
            fixedText = '[' + fixedText;
        }
        if (!fixedText.endsWith(']')) {
            fixedText = fixedText + ']';
        }
        
        return fixedText;
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
            this.elements.documentSummary.innerHTML = marked.parse(this.documentSummary);
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

    async loadStateFromFile(file) {
        try {
            const text = await file.text();
            const state = JSON.parse(text);
            
            this.paragraphs = state.paragraphs || [];
            this.translatedParagraphs = state.translatedParagraphs || [];
            this.documentSummary = state.documentSummary || '';
            this.customPrompt = state.customPrompt || '';
            
            // Ensure translatedParagraphs array is the same length as paragraphs
            if (this.paragraphs.length > 0) {
                // Extend the array to match the number of paragraphs
                while (this.translatedParagraphs.length < this.paragraphs.length) {
                    this.translatedParagraphs.push(null);
                }
                
                this.showStatus(`Loaded state from ${file.name} with ${this.paragraphs.length} paragraphs`, 'success');
                this.showStatus(`Already translated: ${this.translatedParagraphs.filter(t => t && t !== null && t !== undefined && t !== '').length} paragraphs`, 'info');
                this.showResumeButton();
            } else {
                this.showStatus('Invalid state file - no paragraphs found', 'error');
            }
        } catch (error) {
            this.showStatus(`Error loading state file: ${error.message}`, 'error');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new Booklator();
}); 
