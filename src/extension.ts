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
						panel.webview.postMessage({ type: 'response', value: aiResponse });
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
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Vibely</title>
		<style>
			body {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen;
				background-color: #1e1e1e;
				padding: 20px;
				color: #ddd;
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
		<textarea id="prompt" rows="5" placeholder="e.g., Write a Python function that sorts a list by frequency..."></textarea><br>
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
				vscode.postMessage({ type: 'prompt', value: prompt });
			}

			window.addEventListener('message', event => {
				const message = event.data;
				if (message.type === 'response') {
					try {
						const data = JSON.parse(message.value);
						if (data.questions) {
							renderQuestions(data.questions);
						} else {
							document.getElementById('response').innerHTML = '<pre><code>' + escapeHtml(message.value) + '</code></pre>';
						}
					} catch (e) {
						document.getElementById('response').innerHTML = '<pre><code>' + escapeHtml(message.value) + '</code></pre>';
					}
				}
			});

			function renderQuestions(questions) {
				const container = document.getElementById('response');
				container.innerHTML = '';
				questions.forEach((q, index) => {
					const wrapper = document.createElement('div');
					wrapper.className = 'question';
					const optionsHtml = q.options?.map((opt, i) => \`
						<label>
							<input type="radio" name="q-\${q.id}" value="\${i}">
							\${opt}
						</label>
					\`).join('') || '';

					wrapper.innerHTML = \`
						<p><strong>Q\${index + 1}: \${q.text}</strong></p>
						<div>\${optionsHtml}</div>
						<button onclick="document.getElementById('feedback-\${q.id}').innerText = '\${q.explanation.replace(/'/g, "\\'")}'">Submit</button>
						<p class="feedback" id="feedback-\${q.id}"></p>
					\`;
					container.appendChild(wrapper);
				});
			}
		</script>
	</body>
	</html>
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}

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
					content: `You are an intelligent code comprehension assistant for a VS Code extension. Your core purpose is to generate highly effective and concise comprehension checks for users reviewing AI-generated code. The goal is to ensure the user truly understands the code's functionality, its implications, and how it integrates into a larger system, thereby reinforcing their learning and promoting responsible coding practices. **Input:** You will receive a \`CODE_SNIPPET\` and, occasionally, a \`CONTEXT\` that describes the snippet's purpose or the surrounding environment. **Output Format:** Generate a JSON object containing an array of comprehension \`questions\`. Each question object must have the following properties: - \`id\`: A unique string identifier for the question (e.g., "q1", "q2"). - \`type\`: String. Can be "multiple-choice", "free-response", "predict-output", "identify-purpose", "design-choice", "error-scenario", or "integration-check". - \`text\`: String. The actual question text. - \`relevant_lines\`: Array of numbers. Line numbers from the \`CODE_SNIPPET\` that are most relevant to the question (1-indexed). - \`options\`: (Required for \`multiple-choice\` type). An array of strings representing possible answers. - \`correct_answer_index\`: (Required for \`multiple-choice\` type). An integer representing the 0-indexed position of the correct option in the \`options\` array. - \`explanation\`: String. A brief, clear explanation of the correct answer or the concept being tested, provided after the user attempts the question. **Question Generation Guidelines:** 1. **Focus on Understanding:** Questions should go beyond surface-level syntax. Aim for questions that require the user to understand *why* the code works, *what* its effects are, and *how* it fits into a larger system. 2. **Prioritize Active Recall:** Encourage users to retrieve information rather than just recognize it. 3. **Vary Question Types:** Generate a mix of question types as defined above (\`multiple-choice\`, \`free-response\`, etc.) to test different aspects of comprehension. 4. **Conciseness:** Keep questions and explanations clear and to the point. Avoid overly verbose phrasing. 5. **Relevance:** All questions must be directly relevant to the provided \`CODE_SNIPPET\` and \`CONTEXT\`. 6. **Error Handling & Edge Cases:** If applicable, prompt users to consider how the code handles errors or behaves with edge cases. 7. **Design Choices:** Ask about the rationale behind specific design patterns or algorithmic choices made in the snippet. 8. **Integration & Impact:** For larger snippets or with \`CONTEXT\`, ask how the code interacts with other parts of the system or its broader implications. 9. **Generate between 2-4 questions per snippet.** 10. **Ensure \`relevant_lines\` are accurate and helpful.**`
				},
				{ role: 'user', content: prompt }
			],
			max_tokens: 500,
			temperature: 0.2,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${error}`);
	}

	const data = await response.json();
	return data.choices[0].message.content;
}