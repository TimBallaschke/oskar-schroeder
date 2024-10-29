// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value;
    if (message.trim() === '') return;

    // Add user's message to the chat interface
    addMessageToChat(message, 'user');

    // Create a new message element for the bot's response
    const chatMessages = document.getElementById('chat-messages');
    const botMessageElement = document.createElement('div');
    botMessageElement.classList.add('message', 'bot-message');
    chatMessages.appendChild(botMessageElement);

    // Send the message to backend
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: message})
    }).then(response => {
        const reader = response.body.getReader();
        let fullText = '';

        function processText({ done, value }) {
            if (done) {
                return;
            }

            // Convert the chunk to text
            const chunk = new TextDecoder().decode(value);
            // Parse the SSE format
            const lines = chunk.split('\n');
            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        fullText += data.content;
                        botMessageElement.textContent = fullText;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            });

            // Read the next chunk
            return reader.read().then(processText);
        }

        // Start reading the stream
        return reader.read().then(processText);
    }).catch(error => {
        console.error('Error:', error);
        botMessageElement.textContent = 'Sorry, something went wrong.';
    });

    // Clear input field
    input.value = '';
}

// Function to add a message to the chat interface
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
