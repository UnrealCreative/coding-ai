// Browser Coding AI - All logic runs client-side
const Transformers = window.transformers;

let pipelineCache = {};
let isModelsLoaded = false;

// UI Elements
const loadBtn = document.getElementById('loadBtn');
const statusEl = document.getElementById('status');
const codeInput = document.getElementById('codeInput');
const outputBox = document.getElementById('output');
const autocompleteBtn = document.getElementById('autocompleteBtn');
const bugDetectBtn = document.getElementById('bugDetectBtn');
const explainBtn = document.getElementById('explainBtn');
const generateBtn = document.getElementById('generateBtn');

// Load models
loadBtn.addEventListener('click', loadModels);
autocompleteBtn.addEventListener('click', getAutocomplete);
bugDetectBtn.addEventListener('click', detectBugs);
explainBtn.addEventListener('click', explainCode);
generateBtn.addEventListener('click', generateCode);

async function loadModels() {
    try {
        loadBtn.disabled = true;
        updateStatus('Loading AI models... (this may take 30-60 seconds)');
        
        // Load text generation pipeline for code generation
        console.log('Loading model 1/2: Code generation...');
        pipelineCache.textGen = await Transformers.pipeline(
            'text2text-generation',
            'Xenova/flan-t5-small'
        );
        
        // Load feature extraction pipeline for analysis
        console.log('Loading model 2/2: Code analysis...');
        pipelineCache.featureExtraction = await Transformers.pipeline(
            'feature-extraction',
            'Xenova/CodeBERT-small'
        );
        
        isModelsLoaded = true;
        updateStatus('✅ AI Ready!');
        autocompleteBtn.disabled = false;
        bugDetectBtn.disabled = false;
        explainBtn.disabled = false;
        generateBtn.disabled = false;
        
    } catch (error) {
        updateStatus('❌ Error loading models: ' + error.message);
        console.error('Model loading error:', error);
    } finally {
        loadBtn.disabled = false;
    }
}

function updateStatus(message) {
    statusEl.textContent = 'Status: ' + message;
}

async function getAutocomplete() {
    if (!validateInput()) return;
    const code = codeInput.value;
    
    try {
        outputBox.innerHTML = '<p class="placeholder">🔄 Generating suggestions...</p>';
        
        // Get the last few lines to suggest completion
        const lines = code.split('\n');
        const lastLine = lines[lines.length - 1];
        
        const prompt = `Complete this code line:\n${lastLine}\n\nNext line:`;
        
        const result = await pipelineCache.textGen(prompt, {
            max_length: 100,
            num_return_sequences: 1
        });
        
        let suggestions = result[0].generated_text;
        
        // Clean up the output
        suggestions = suggestions.replace(prompt, '').trim();
        
        outputBox.innerHTML = `
            <div class="success">
                <h4>✨ Suggested Completions:</h4>
                <pre>${escapeHtml(suggestions)}</pre>
            </div>
        `;
        
    } catch (error) {
        showError('Autocomplete failed: ' + error.message);
    }
}

async function detectBugs() {
    if (!validateInput()) return;
    const code = codeInput.value;
    
    try {
        outputBox.innerHTML = '<p class="placeholder">🔍 Analyzing code for bugs...</p>';
        
        const bugs = [];
        
        // Pattern-based bug detection
        const patterns = [
            { regex: /==([^=])/g, issue: '⚠️ Using == instead of ===', fix: 'Use === for strict comparison' },
            { regex: /var\s+/g, issue: '⚠️ Using var instead of let/const', fix: 'Use let or const for block-scoped variables' },
            { regex: /function\s+\w+\([^)]*\)\s*{(?:(?!return)[\s\S])*}/g, issue: '⚠️ Function without return statement', fix: 'Consider adding a return statement' },
            { regex: /\.forEach\(.*=>\s*{\s*}\s*\)/g, issue: '⚠️ Empty forEach callback', fix: 'Add logic inside the callback' },
            { regex: /null\.(?!\s*(toString|valueOf))/g, issue: '❌ Accessing property on null', fix: 'Check for null before accessing properties' },
            { regex: /async\s+function[^{]*{[^}]*await[^}]*}/gs, issue: '⚠️ Async function without proper error handling', fix: 'Add try-catch blocks around await' }
        ];
        
        patterns.forEach(pattern => {
            if (pattern.regex.test(code)) {
                bugs.push(`<li><strong>${pattern.issue}</strong> - ${pattern.fix}</li>`);
            }
        });
        
        // Check for common security issues
        if (code.includes('eval(')) {
            bugs.push('<li><strong>🔴 CRITICAL SECURITY: eval() detected!</strong> - Never use eval(). Use JSON.parse() or other safe alternatives</li>');
        }
        
        if (code.includes('innerHTML')) {
            bugs.push('<li><strong>🟠 XSS VULNERABILITY: innerHTML detected</strong> - Use textContent instead or sanitize input</li>');
        }
        
        if (bugs.length === 0) {
            outputBox.innerHTML = '<div class="success"><p>✅ No obvious bugs detected! Code looks clean.</p></div>';
        } else {
            outputBox.innerHTML = `
                <div class="error">
                    <h4>🐛 Potential Issues Found:</h4>
                    <ul>${bugs.join('')}</ul>
                </div>
            `;
        }
        
    } catch (error) {
        showError('Bug detection failed: ' + error.message);
    }
}

async function explainCode() {
    if (!validateInput()) return;
    const code = codeInput.value;
    
    try {
        outputBox.innerHTML = '<p class="placeholder">📖 Analyzing code structure...</p>';
        
        let explanation = '<h4>📊 Code Analysis:</h4>';
        
        // Analyze code structure
        const lines = code.split('\n').length;
        const hasClasses = /class\s+\w+/.test(code);
        const hasFunctions = /function|=>/.test(code);
        const hasAsync = /async|await/.test(code);
        const hasLoops = /for|while|forEach/.test(code);
        const hasConditionals = /if|else|switch/.test(code);
        
        explanation += '<ul>';
        explanation += `
            <li><strong>Lines of code:</strong> ${lines}</li>`;
        
        if (hasClasses) explanation += '<li><strong>✓ Contains classes</strong> - Object-oriented code detected</li>';
        if (hasFunctions) explanation += '<li><strong>✓ Contains functions</strong> - Functional code detected</li>';
        if (hasAsync) explanation += '<li><strong>✓ Async/await</strong> - Uses asynchronous operations</li>';
        if (hasLoops) explanation += '<li><strong>✓ Loops</strong> - Contains iteration logic</li>';
        if (hasConditionals) explanation += '<li><strong>✓ Conditionals</strong> - Contains branching logic</li>';
        
        explanation += '</ul>';
        
        // Get AI explanation
        const prompt = `Explain this code briefly in 2-3 sentences:\n${code.substring(0, 300)}`;
        
        const result = await pipelineCache.textGen(prompt, {
            max_length: 150,
            num_return_sequences: 1
        });
        
        let aiExplanation = result[0].generated_text;
        aiExplanation = aiExplanation.replace(prompt, '').trim();
        
        explanation += `<h4>AI Explanation:</h4><p>${escapeHtml(aiExplanation)}</p>`;
        
        outputBox.innerHTML = '<div class="success">' + explanation + '</div>';
        
    } catch (error) {
        showError('Code explanation failed: ' + error.message);
    }
}

async function generateCode() {
    if (!validateInput()) return;
    const description = codeInput.value;
    
    try {
        outputBox.innerHTML = '<p class="placeholder">🎨 Generating code...</p>';
        
        // Map common descriptions to code patterns
        const codeTemplates = {
            'fetch api': 'fetch("https://api.example.com/data")\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));',
            'async function': 'async function myFunction() {\n  try {\n    const data = await fetch("/api/data");\n    return await data.json();\n  } catch (error) {\n    console.error(error);\n  }\n}',
            'array map': 'const newArray = array.map(item => item * 2);',
            'array filter': 'const filtered = array.filter(item => item > 10);',
            'loop': 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}',
            'class': 'class MyClass {\n  constructor(name) {\n    this.name = name;\n  }\n  greet() {\n    return `Hello, ${this.name}!`;\n  }\n}',
            'event listener': 'button.addEventListener("click", () => {\n  console.log("Button clicked");\n});',
            'promise': 'const promise = new Promise((resolve, reject) => {\n  setTimeout(() => resolve("Done!"), 1000);\n});'
        };
        
        let generated = '';
        
        // Check if description matches any template
        const lowerDesc = description.toLowerCase();
        for (const [key, value] of Object.entries(codeTemplates)) {
            if (lowerDesc.includes(key)) {
                generated = value;
                break;
            }
        }
        
        // If no template matched, use AI to generate
        if (!generated) {
            const prompt = `Write JavaScript code for: ${description}\nCode:`;
            
            const result = await pipelineCache.textGen(prompt, {
                max_length: 200,
                num_return_sequences: 1
            });
            
            generated = result[0].generated_text;
            generated = generated.replace(prompt, '').trim();
        }
        
        outputBox.innerHTML = `
            <div class="success">
                <h4>🎨 Generated Code:</h4>
                <pre><code>${escapeHtml(generated)}</code></pre>
                <button onclick="copyToClipboard(\"${generated}\")">📋 Copy Code</button>
            </div>
        `;
        
    } catch (error) {
        showError('Code generation failed: ' + error.message);
    }
}

function validateInput() {
    if (!isModelsLoaded) {
        showError('Please load AI models first!');
        return false;
    }
    
    if (!codeInput.value.trim()) {
        showError('Please enter code or a description');
        return false;
    }
    
    return true;
}

function showError(message) {
    outputBox.className = 'output-box error';
    outputBox.innerHTML = `<p><strong>❌ Error:</strong> ${escapeHtml(message)}</p>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Code copied to clipboard!');
    });
}

// Disable buttons until models are loaded
autocompleteBtn.disabled = true;
bugDetectBtn.disabled = true;
explainBtn.disabled = true;
generateBtn.disabled = true;