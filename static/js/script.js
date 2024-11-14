// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value;
    if (message.trim() === '') return;  // Don't send empty messages

    // Add user's message to the chat interface
    addMessageToChat(message, 'user');

    // Send message to backend (Flask server)
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: message})
    })
    .then(response => response.json())  // Parse JSON response
    .then(data => {
        // Add AI's response to the chat interface
        addMessageToChat(data.response, 'bot');
    })
    .catch(error => {
        // Handle any errors that occur during the request
        console.error('Error:', error);
        addMessageToChat('Sorry, something went wrong.', 'bot');
    });

    // Clear the input field after sending
    input.value = '';
}

// Function to add a message to the chat interface
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    // Add appropriate CSS classes based on who sent the message
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    // Scroll to the bottom to show newest message
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 