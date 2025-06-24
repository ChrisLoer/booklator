# 📚 Booklator - AI-Powered Document Translation Tool

A modern web application that translates documents using OpenAI's GPT-4o model with context-aware processing. Booklator processes documents in chunks while maintaining context, ensuring high-quality translations.

## ✨ Features

- **Drag & Drop Upload**: Easy .docx file upload with drag-and-drop support
- **Context-Aware Translation**: Processes documents in chunks with surrounding context
- **Document Summary**: Generates comprehensive summaries for better translation context
- **Real-time Progress**: Live updates showing translation progress and status
- **Custom Prompts**: Add specific translation instructions
- **Download Results**: Download both original and translated documents
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Local Storage**: API key and custom prompts are saved locally

## 🚀 Quick Start

### Option 1: Deploy to GitHub Pages (Recommended)

1. **Fork this repository** to your GitHub account
2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll down to "GitHub Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"
3. **Access your app** at `https://yourusername.github.io/booklator`

### Option 2: Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/booklator.git
   cd booklator
   ```

2. **Serve locally** (using Python):
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js:
   ```bash
   npx serve .
   ```

3. **Open your browser** and navigate to `http://localhost:8000`

## 🔧 Setup

1. **Get an OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Enter your API Key**:
   - Open the Booklator application
   - Enter your OpenAI API key in the setup section
   - The key is stored locally in your browser

3. **Optional: Add Custom Prompt**:
   - Enter any specific translation instructions
   - Examples: "Translate in a formal academic style" or "Maintain technical terminology"

## 📖 How to Use

### 1. Upload a Document
- **Drag and drop** a .docx file onto the upload area
- **Or click "Browse Files"** to select a file
- **Or paste a Google Doc URL** (requires additional setup)

### 2. Processing
The application will:
1. **Extract text** from your document
2. **Parse into numbered paragraphs**
3. **Generate a document summary** for context
4. **Translate in chunks** of 10 paragraphs with surrounding context
5. **Show real-time progress** and status updates

### 3. View Results
- **Document summary** appears at the top
- **Side-by-side comparison** of original and translated text
- **Numbered paragraphs** with § prefix for easy reference

### 4. Download Results
- **Download Original**: Get the numbered original document
- **Download Translated**: Get the numbered translated document
- Files are downloaded as ZIP archives containing text files

## 🔍 How It Works

### Context-Aware Translation
Booklator processes documents intelligently:

1. **Document Summary**: First generates a comprehensive summary of the entire document
2. **Chunked Processing**: Breaks the document into chunks of 10 paragraphs
3. **Context Windows**: For each chunk, includes:
   - 3 paragraphs before (for context)
   - The current 10 paragraphs
   - 3 paragraphs after (for context)
4. **Maintained Structure**: Preserves paragraph numbering and formatting

### Translation Quality
- Uses OpenAI's GPT-4o model for high-quality translations
- Context windows ensure consistency across chunks
- Document summary provides overall context
- Custom prompts allow for specific translation requirements

## 🛠️ Technical Details

### Dependencies
- **Mammoth.js**: DOCX file parsing
- **JSZip**: File compression for downloads
- **FileSaver.js**: Client-side file downloads
- **OpenAI API**: GPT-4o model for translation

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### File Size Limits
- Maximum document size: ~10MB
- Recommended: Under 5MB for optimal performance

## 🔒 Privacy & Security

- **API Key Storage**: Stored locally in browser localStorage
- **No Server Processing**: All processing happens client-side
- **No Data Upload**: Documents are processed locally
- **OpenAI API**: Only document content is sent to OpenAI for translation

## 🐛 Troubleshooting

### Common Issues

**"Failed to extract text from DOCX file"**
- Ensure the file is a valid .docx format
- Try opening and resaving the file in Word/Google Docs

**"OpenAI API request failed"**
- Check your API key is correct
- Ensure you have sufficient API credits
- Verify your internet connection

**"Translation response parsing failed"**
- This is usually temporary - try again
- Check if your custom prompt is causing formatting issues

### Performance Tips

- **Smaller documents** process faster and cost less
- **Clear custom prompts** help avoid parsing errors
- **Stable internet connection** ensures reliable API calls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- OpenAI for providing the GPT-4o API
- The open source community for the libraries used
- Contributors and users of Booklator

---

**Note**: This application requires an OpenAI API key and will incur costs based on your usage. Please review OpenAI's pricing before use.
