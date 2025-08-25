async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not set in environment variable OPENAI_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful coding assistant built into a VS Code extension. When given a code snippet or task, respond with a JSON object that has two keys:

1. "code": A string formatted as a Markdown-style code block (using triple backticks and a language identifier like \`\`\`python or \`\`\`js) that will be rendered as a code window, just like in ChatGPT's UI. It should be cleanly indented and fully self-contained.

2. "questions": An array of objects representing comprehension questions. Each object must include:
   - id: unique string like "q1", "q2"
   - type: always "multiple-choice"
   - text: the actual question
   - options: array of 3–5 answer choices
   - correct_answer_index: the 0-based index of the correct answer
   - explanation: a short explanation for why the answer is correct

Always include all questions in the "questions" array.
The "questions" array MUST contain between 3 and 5 multiple-choice questions, no more, no less. Each must be of "type": "multiple-choice". Follow the schema as described, with options, correct_answer_index, and explanation included for each.

Respond ONLY with the JSON object and no extra commentary. Do not include markdown surrounding the JSON.
`
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('Loaded API Key:', process.env.OPENAI_API_KEY);
console.log('📁 DEBUG — Working Directory:', process.cwd());
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension Activated');
	const disposable = vscode.commands.registerCommand('vibely.helloWorld', () => {
		const panel = vscode.window.createWebviewPanel(
			'codePrompt',
			'Vibely',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.type === 'prompt') {
					const userPrompt = message.value;
					console.log('Prompt received:', userPrompt);

					try {
						const aiResponse = await callOpenAI(userPrompt);
						panel.webview.postMessage({ type: 'response', value: aiResponse }); //ai Response is the string that we need to send back to AI for comparison with user answer
					} catch (e: any) {
						panel.webview.postMessage({ type: 'response', value: 'Error: ' + e.message });
					}
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Vibely</title>
		<style>
			body {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen;
				background-color: #1e1e1e;
				padding: 20px;
				color: #ddd;
				margin: 0;
			}
			textarea {
				width: 100%;
				padding: 10px;
				font-size: 1rem;
				border-radius: 6px;
				border: 1px solid #c586c0;
				box-sizing: border-box;
				resize: vertical;
				background-color: #252526;
				color: #ddd;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen;
			}
			button {
				background-color: #c586c0;
				color: white;
				border: none;
				padding: 10px 16px;
				font-size: 0.95rem;
				border-radius: 6px;
				cursor: pointer;
				margin-top: 10px;
			}
			button:hover {
				background-color: #a74fab;
			}
			#response {
				margin-top: 20px;
				background: #2d2d2d;
				padding: 16px;
				border-radius: 8px;
				box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
			}
			.question {
				margin-bottom: 20px;
			}
			label {
				display: block;
				margin: 4px 0;
			}
			.feedback {
				color: #999;
				margin-top: 8px;
			}
			.loading-dots {
				display: inline-block;
				text-align: center;
				width: 100%;
				margin-top: 20px;
			}
			.loading-dots span {
				display: inline-block;
				width: 8px;
				height: 8px;
				margin: 0 4px;
				background-color: #c586c0;
				border-radius: 50%;
				animation: blink 1.4s infinite both;
			}
			.loading-dots span:nth-child(2) {
				animation-delay: 0.2s;
			}
			.loading-dots span:nth-child(3) {
				animation-delay: 0.4s;
			}
			@keyframes blink {
				0%, 80%, 100% {
					opacity: 0;
				}
				40% {
					opacity: 1;
				}
			}
			.text {
				color: #c586c0;
				font-weight: bolder;
				text-align: center;
				font-size: 2rem;
				letter-spacing: -2.5px;
			}

			@keyframes letter-once {
				0% {
					font-size: 2rem;
				}

				50% {
					font-size: 2.6rem;
				}

				100% {
					font-size: 2rem;
				}
			}

			.letter {
				display: inline-block;
				animation: letter-once 1s ease-in-out forwards;
			}

			.letter1 { animation-delay: 0s; }
			.letter2 { animation-delay: 0.1s; }
			.letter3 { animation-delay: 0.2s; }
			.letter4 { animation-delay: 0.3s; }
			.letter5 { animation-delay: 0.4s; }
			.letter6 { animation-delay: 0.5s; }

			.loader-text {
				font-size: 1rem;
				font-weight: 500;
				background: linear-gradient(to right, #ccc, #ccc);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				white-space: nowrap;
				overflow: hidden;
			}

			#placeholder-animator {
				position: absolute;
				top: 10px;
				left: 12px;
				pointer-events: none;
				color: #888;
				opacity: 0.6;
				max-width: calc(100% - 24px);
				overflow-wrap: break-word;
				white-space: normal;
				word-break: break-word;
			}

			@keyframes typewriter {
				0% {
					width: 0px;
				}

				100% {
					width: 240px;
				}
			}
		</style>
	</head>
	<body>
		<div class="loader">
			<p class="text">
				<span class="letter letter1">V</span>
				<span class="letter letter2">i</span>
				<span class="letter letter3">b</span>
				<span class="letter letter4">e</span>
				<span class="letter letter5">l</span>
				<span class="letter letter6">y</span>
			</p>
		</div>
		<div style="position: relative;">
			<textarea id="prompt" rows="5" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
			<div id="placeholder-animator" class="loader-text"></div>
		</div>
		<br />
		<div style="text-align: center;">
			<button onclick="sendPrompt()">Generate</button>
		</div>
		<div id="response"></div>

		<script>
			const vscode = acquireVsCodeApi();

			function escapeHtml(str) {
				return str
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#039;");
			}

			function sendPrompt() {
				const prompt = document.getElementById('prompt').value;
				const responseContainer = document.getElementById('response');
				responseContainer.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
				vscode.postMessage({ type: 'prompt', value: prompt }); //vscode.postMessage value is the user prompt that needs to be compared against the ai response for the correct answer
			}
				//basically it seems that we need to hardcode the beginning of our response prompt with: "Is this answer {user reponse} close to the expected answer of question {user first query}?"

			window.addEventListener('message', event => {
				const message = event.data;
				if (message.type === 'response') {
					try {
						const data = JSON.parse(message.value);
						if (data.questions) {
							renderQuestions(data); //what is data here? is it user reponse? should be ?
						} else {
							document.getElementById('response').innerHTML = '<pre><code style="font-family: monospace; background-color: #2d2d2d; display: block; padding: 1rem; border-radius: 8px; color: #fff;">' + escapeHtml(message.value) + '</code></pre>';
						}
					} catch (e) {
						document.getElementById('response').innerHTML = '<pre><code style="font-family: monospace; background-color: #2d2d2d; display: block; padding: 1rem; border-radius: 8px; color: #fff;">' + escapeHtml(message.value) + '</code></pre>';
					}
				}
			});

			/JUNK TODO
			function getSimilarity(a, b) { //TODO: this function currently unused, and it just compares 
				if (!a || !b) return 0; //wtf is going on here
				let matches = 0;
				const len = Math.max(a.length, b.length); // length = longer of the two
				for (let i = 0; i < Math.min(a.length, b.length); i++) { //if iteratore is less than shorter of the two
					if (a[i] === b[i]) matches++; //if the characters match then increase matches
				}
				return matches / len; //return the matches divided by the length of the longer string
			}

			//we want to know how many characters total are in the longer string that we are comparing
			// and then we want to iterate a maximum amount of indexes which is equal to the length of the shorter string so that we dont go out of bounds on the index of the shorter string
			//and we check to see if exact character matches, and if they do we increase the match count, if there is a single mistake in the string then everything will be off by one and 
			//the rest of the characters will be wrong, so we need to account for that


			//AI needs harder question w/ regard to content, prompt needs to be rethought
			async function handleSubmit(id, correctIndex, explanation, type, button) {
				const wrapper = button.closest('.question');
				const feedback = document.getElementById('feedback-' + id);
				let isCorrect = false; //assume false why?

				// Only handle multiple-choice questions
				const selected = document.querySelector(\`input[name="q-\${id}"]:checked\`);
				if (selected && parseInt(selected.value) === correctIndex) { //this statement is evaluating accuracy... how??
					isCorrect = true; 
				}
				//LOW PRI, non essential feature
				let attempts = parseInt(wrapper.dataset.attempts || '0');
				attempts++;
				wrapper.dataset.attempts = attempts;
				// validate correct? how is it done?
				if (isCorrect) {
					feedback.innerText = '✅ Correct!';
					wrapper.style.borderColor = '#4CAF50';
					wrapper.dataset.answered = 'true';
					checkAllCorrect(); //what is utility of a secondary check correct function? This needs refactoring, should be a necessary branch of the normal isCorrect function, perhaps with some kind of object storage
				} else {
					feedback.innerText = '❌ Incorrect. Try again.';
					wrapper.style.borderColor = '#e74c3c';
					if (attempts >= 3) {
						document.getElementById('hint-' + id).style.display = 'inline-block';
					}
				}
			}

			function showHint(id, explanation) { //non essential, and this utilizing another api call, perhaps worth including a hint generation in the first call....
				const feedback = document.getElementById('feedback-' + id);
				feedback.innerText = '💡 Hint: ' + explanation;
			}

			function checkAllCorrect() { //refactored.... utility
				const questions = document.querySelectorAll('.question'); 
				let allCorrect = true; // bro what? how do we know this is true? where? I see, assuming true and then trying to disprove it.... idk about that, seems dangerous
				questions.forEach(q => {
					if (q.dataset.answered !== 'true') {
						allCorrect = false;
					}
				});
				if (allCorrect) {
					document.getElementById('congrats-button').style.display = 'inline-block'; 
				}
			}

			const placeholderAnimator = document.getElementById('placeholder-animator');
			const promptInput = document.getElementById('prompt');

			const examples = [
				"Write a Python function that returns the most frequent element.",
				"Build me a landing page for my restaurant.",
				"Fix my code."
			];
			let exampleIndex = 0;
			let charIndex = 0;

			function typeWriter() {
				let typing = true;

				function type() {
					if (promptInput.value.length > 0) {
						placeholderAnimator.innerText = '';
						return;
					}

					if (typing) {
						if (charIndex <= examples[exampleIndex].length) {
							placeholderAnimator.innerText = examples[exampleIndex].substring(0, charIndex);
							charIndex++;
							setTimeout(type, 40);
						} else {
							typing = false;
							setTimeout(type, 1000);
						}
					} else {
						if (charIndex > 0) {
							charIndex--;
							placeholderAnimator.innerText = examples[exampleIndex].substring(0, charIndex);
							setTimeout(type, 25);
						} else {
							typing = true;
							exampleIndex = (exampleIndex + 1) % examples.length;
							setTimeout(type, 250);
						}
					}
				}

				type();
			}

			promptInput.addEventListener('input', () => {
				if (promptInput.value.length > 0) {
					placeholderAnimator.innerText = '';
				} else {
					typeWriter();
				}
			});

			function renderQuestions(data) {
				window.currentData = data;
				const container = document.getElementById('response');
				container.innerHTML = '';

				const codeBlock = document.createElement('pre');
				codeBlock.innerHTML = '<code style="font-family: monospace; background-color: #2d2d2d; display: block; padding: 1rem; border-radius: 8px; color: #fff;">' + escapeHtml(data.code || '') + '</code>';
				container.appendChild(codeBlock);

				let correctCount = 0;

				data.questions.forEach((q, index) => {
					const wrapper = document.createElement('div');
					wrapper.className = 'question';
					wrapper.style.border = '1px solid #555';
					wrapper.style.padding = '10px';
					wrapper.style.marginTop = '15px';
					wrapper.style.borderRadius = '6px';
					wrapper.dataset.attempts = '0';

					let inputHtml = '';
					// Always render multiple-choice since only that type is used
					inputHtml = q.options.map((opt, i) => \`
						<label style="display: block; margin: 4px 0;">
							<input type="radio" name="q-\${q.id}" value="\${i}"> \${opt}
						</label>
					\`).join('');

					wrapper.innerHTML = \`
						<p><strong>Q\${index + 1}: \${q.text}</strong></p>
						<div>\${inputHtml}</div>
						<button onclick="handleSubmit('\${q.id}', \${q.correct_answer_index ?? -1}, '\${escapeHtml(q.explanation)}', '\${q.type}', this)">Submit</button>
						<p class="feedback" id="feedback-\${q.id}"></p>
						<button style="display: none;" onclick="showHint('\${q.id}', '\${escapeHtml(q.explanation)}')" id="hint-\${q.id}">Show Hint</button>
					\`;

					container.appendChild(wrapper);
				});

				// Reveal final implementation button if all are correct
				const congratsBtn = document.createElement('button');
				congratsBtn.textContent = "🎉 Congrats! Want to implement this code?";
				congratsBtn.style.marginTop = '20px';
				congratsBtn.style.display = 'none';
				congratsBtn.onclick = () => vscode.postMessage({ type: 'implement', value: data.code });
				congratsBtn.id = "congrats-button";
				container.appendChild(congratsBtn);
			}

			typeWriter();
		</script>
	</body>
	</html>
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
