// Generic handler for clicking on prompt elements that should be copied to input
// function handlePromptClick(element) {
//     const input = document.getElementById('user-input');
//     input.value = element.innerHTML;
// }

// Add event listeners when the page loads
// document.addEventListener('DOMContentLoaded', () => {
//     const promptProposalOne = document.querySelector('.prompt-proposal-1');
//     const promptProposalTwo = document.querySelector('.prompt-proposal-2');

//     promptProposalOne.addEventListener('click', () => handlePromptClick(promptProposalOne));
//     promptProposalTwo.addEventListener('click', () => handlePromptClick(promptProposalTwo));
// });

let activeEventSource = null; // Track the active activeEventSource connection

// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    // Send message to backend (Flask server)
    // This is a post request that triggers the function in main.py
    fetch('/content', {  // HTTP request to the '/content' endpoint of your server using the Fetch API
        method: 'POST', // Specifies that this is a POST request, which is used to send data to the server
        headers: {
            'Content-Type': 'application/json', // Specifies the type of content being sent
        },
        body: JSON.stringify({message: message}) // Converts the message to a JSON string and sends it as the body of the request
    }).then(response => response.json()) // Waits for the response from the server and converts it to a JSON object
      .then(data => { // waits for the response to be converted to a JSON object
        if (data.status === "ok") { // checks if the status of the response is "ok"
            startStreamingResponse(); // starts the streaming response
        }        
    }).catch(error => { // handles any errors that occur during the request
        console.error('Error sending message:', error); // logs the error to the console
    });

    input.value = ''; // clears the input field after sending
}

function startStreamingResponse() {

    // Close any existing EventSource connection
    if (activeEventSource) {
        activeEventSource.close();
        console.log("Closed previous activeEventSource connection.");
    }

    activeEventSource = new EventSource("/stream"); // creates a new EventSource connection to the "/stream" endpoint. activeEventSource is used for Server-Sent Events (SSE), allowing the server to push data to the client in real-time over a single, long-lived connection
    console.log(activeEventSource);

    activeEventSource.onmessage = function(event) { // eventhandler that will be called whenever a message is received from the server
        const data = JSON.parse(event.data); // parsed the received message data from JSON string format to a JavaScript object

        switch(data.type) { // switch statement to handle different types of messages (switch statement is used to handle different cases based on the value of a variable -> alternative to if-else statements)
            case 'delta': // if the message type is 'delta', it calls the handleDelta function
                handleDelta(data.content);
                break;
            case 'complete': // if the message type is 'complete', it calls the handleComplete function
                handleComplete(data.content);
                activeEventSource.close();
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                break;
        }
    };

    activeEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        activeEventSource.close();
    };
}

function handleDelta(content) {
    console.log("Received delta:", content);
    // updateUI(content);
}

function handleComplete(content) {
    console.log("Received complete response:", content);
    // updateUI(content);
}



// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});