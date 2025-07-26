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
			'AI Code Generator',
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
			<title>AI Code Generator</title>
		</head>
		<body>
			<h2>Enter your prompt:</h2>
			<textarea id="prompt" rows="6" cols="60"></textarea><br><br>
			<button onclick="sendPrompt()">Generate Code</button>

			<pre id="response" style="margin-top:20px; white-space: pre-wrap;"></pre>

			<script>
				const vscode = acquireVsCodeApi();
				function sendPrompt() {
					const prompt = document.getElementById('prompt').value;
					vscode.postMessage({ type: 'prompt', value: prompt });
				}

				window.addEventListener('message', event => {
					const message = event.data;
					if (message.type === 'response') {
						document.getElementById('response').textContent = message.value;
					}
				});
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
				{ role: 'system', content: 'You are a helpful coding assistant.' },
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