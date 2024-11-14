
//HANDLING OF USER MESSAGES
// Function called when user sends a message
function sendMessage() {
    // save user input html element in a variable
    const input = document.getElementById('user-input');
    // save user input value in a variable
    const message = input.value;
    // if user input is empty, return (prevent empty messages from being sent)
    if (message.trim() === '') return;

    // Add user's message to the chat interface (addMessageToChat is a function defined below)
    addMessageToChat(message, 'user');

    // CREATE A NEW MESSAGE ELEMENT FOR THE BOT'S RESPONSE
    // get the chat messages container from the html
    const chatMessages = document.getElementById('chat-messages');
    // create a new message element for the bot's response
    const botMessageElement = document.createElement('div');
    // add the message and bot-message classes to the new message element
    botMessageElement.classList.add('message', 'bot-message');
    // append the new message element to the chat messages container
    chatMessages.appendChild(botMessageElement);

    // Send the message to backend using the Fetch API
    // Fetch API is a modern JavaScript API for making HTTP requests
    fetch('/chat', {

        // specify the method to use for the request (POST HTTP method is used to send data to the server)
        method: 'POST',
        // specify the headers of the request
        // headers is an object that contains the headers of the request
        // headers are key-value pairs that contain metadata about the request (provide important information about the request)
        headers: {
            // specify that the data being sent is in JSON format
            'Content-Type': 'application/json',
        },
        // specify the body of the request
        // body is an object of the fetch API that contains the data being sent to the server
        // Request body = The package you're sending (part of Fetch API standard structure)
        // JSON.stringify() is a method that converts a JavaScript object into a JSON string
        body: JSON.stringify({message: message})
        //promise that awaits the response from the server
    }).then(response => {

        // Response body = The package you're receiving (part of Fetch API standard structure)
        // Create a reader to handle the streaming response
        // getReader() is a method that returns a reader object that is important for handling streaming responses
        const reader = response.body.getReader();
        // Variable to store the complete message
        let fullText = '';

        // Function to process the text chunks of the response
        // receives an object with two properties: done and value
        // done is a boolean that indicates whether the stream has been fully read
        // value is the chunk of data that was received
        // { done, value } syntax takes the done and value properties from an object
        function processText({ done, value }) {
            // if done the stream has ended so we exit the function
            if (done) {
                return;
            }

            // Convert the chunk to text
            // TextDecoder is a built-in JavaScript object that decodes a sequence of bytes into a string
            // decode() is a method that decodes a sequence of bytes into a string
            // result is stored in chunk variable
            const chunk = new TextDecoder().decode(value);
            // Parse the SSE (Server-Sent Events) format
            // split the chunk into an array of lines
            const lines = chunk.split('\n');
            // iterate over each line in the array
            lines.forEach(line => {
                // if the line starts with 'data: '
                if (line.startsWith('data: ')) {
                    try {
                        // JSON.parse() is a method that parses a JSON string and converts it into a JavaScript object
                        // remove the first 6 characters ('data: ')
                        const data = JSON.parse(line.slice(6));
                        // append the content of the data to the fullText variable
                        fullText += data.content;
                        // update the bot's message element with the full text
                        botMessageElement.textContent = fullText;
                        // scroll to the bottom of the chat messages container
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        // error handling
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            });

            // Read the next chunk (creates a recursive loop that continues reading the stream)
            // reader is a object that was created by the getReader() method above
            // read() is a method that reads the next chunk of data from the stream
            // then() is a promise that awaits the result of the read() method
            // then() takes the result of the read() method and passes it to the processText() function
            return reader.read().then(processText);
        }

        // Start reading the stream (initializes the process of reading the stream)
        return reader.read().then(processText);

        // error handling
    }).catch(error => {
        console.error('Error:', error);
        botMessageElement.textContent = 'Sorry, something went wrong.';
    });

    // Clear input field
    input.value = '';
}

// Function to add a user message to the chat interface
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add ability to send message by pressing Enter key
// Eventlistener that leads to execution of sendMessage() function
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
