// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value;
    if (message.trim() === '') return;  // Don't send empty messages

    // Send message to backend (Flask server)
    fetch('/projects', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: message})
    })
    // When you make a fetch request, the server sends back a Response object
    // response.json() takes this raw data and converts (parses) it into a JavaScript object
    .then(response => response.json())  // Parse JSON response
    .then(data => { // data is provided by the Fetch API after it processes the server's response and holds the response data
        console.log(data);
    })
    .catch(error => {
        // Handle any errors that occur during the request
        console.error('Error:', error);
    });

    // Clear the input field after sending
    input.value = '';
}


// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 