import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
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
		message => {
			if (message.type === 'prompt') {
				const userPrompt = message.value;
				console.log('Prompt received:', userPrompt);

				// Placeholder response — soon this will call OpenAI
				const fakeResponse = `You entered: "${userPrompt}"\n\nPretend this is AI-generated code.`;

				panel.webview.postMessage({ type: 'response', value: fakeResponse });
			}
		},
		undefined,
		context.subscriptions
	);
});
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

			<pre id="response" style="margin-top:20px;"></pre>

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
export function deactivate() {
	
}
