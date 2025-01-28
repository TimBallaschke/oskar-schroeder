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
let processedComponents = new Map();
let isProcessingComponent = false;
// Global queue for components
let queuedComponents = [];

// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    toggleLoadingState(true);
    processedComponents.clear(); // Clear processed components for a new request

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

    activeEventSource.onmessage = function(event) { // eventhandler that will be called whenever a message is received from the server
        const data = JSON.parse(event.data); // parsed the received message data from JSON string format to a JavaScript object

        switch(data.type) { // switch statement to handle different types of messages (switch statement is used to handle different cases based on the value of a variable -> alternative to if-else statements)
            case 'delta': // if the message type is 'delta', it calls the handleDelta function
                handleDelta(data.content);
                break;
            case 'complete': // if the message type is 'complete', it calls the handleComplete function
                handleComplete(data.content);
                activeEventSource.close();
                activeEventSource = null;
                toggleLoadingState(false);
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                activeEventSource = null;
                toggleLoadingState(false);
                break;
        }
    };

    activeEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        activeEventSource.close();
        activeEventSource = null;
        toggleLoadingState(false);
    };
}

function handleDelta(content) {
    console.log("Received delta:", content);

    // Safely check if content.components exists and is an array
    if (!content.components || !Array.isArray(content.components)) {
        // If there's no `components` array, just return or handle differently
        return;
    }
    
    // For each streamed component, push onto a global queue
    content.components.forEach((component) => {
        // We only queue components that have a recognized UIType
        if (component.UIType) {
            queuedComponents.push(component);
        }
    });

    // After pushing all new components into the queue, try to process
    processQueue();
}

function processQueue() {
    // If there's nothing in the queue, or we're already processing, do nothing.
    if (queuedComponents.length === 0 || isProcessingComponent) {
        return;
    }

    // Otherwise, mark that we're processing
    isProcessingComponent = true;
    
    // Dequeue the next component
    const nextComponent = queuedComponents.shift();
    
    // Process it
    processSingleComponent(nextComponent, () => {
        // Once done, mark as not processing, then recursively call processQueue again
        isProcessingComponent = false;
        processQueue();
    });
}

function processSingleComponent(component, onComplete) {
    const contentContainer = document.getElementById('content-container');

    // A unique key to track if needed. 
    const componentID = `${component.UIType}-${Date.now()}`; 

    switch (component.UIType) {
        case 'paragraphs': {
            // Create a container for these paragraphs
            const paragraphContainer = document.createElement('div');
            paragraphContainer.classList.add('paragraph-container');
            paragraphContainer.setAttribute('data-component-key', componentID);
            contentContainer.appendChild(paragraphContainer);
            
            // Ensure component.text is an array, if it's a string, convert it to an array
            const sentences = Array.isArray(component.text) ? component.text : [component.text];
            
            // Add validation to ensure we have content to process
            if (!sentences || sentences.length === 0) {
                console.warn('No text content to process');
                onComplete();
                return;
            }
            
            // Process the sentences
            processParagraphSentences(sentences, paragraphContainer, 0, onComplete);
            break;
        }
        case 'list':
            // Similarly handle lists
            // Once done, call onComplete()
            // ...
            onComplete();
            break;
        case 'table':
            // Similarly handle tables
            // ...
            onComplete();
            break;
        case 'project':
            // Similarly handle custom "project" logic
            // ...
            onComplete();
            break;
        default:
            // If unknown UIType, just call onComplete
            onComplete();
            break;
    }
}

function processParagraphSentences(sentences, container, index, onComplete) {
    // Add validation
    if (!sentences || !Array.isArray(sentences)) {
        console.error('Invalid sentences input:', sentences);
        onComplete();
        return;
    }

    if (index >= sentences.length) {
        onComplete();
        return;
    }

    // Create a <p> for the next sentence
    const p = document.createElement('p');
    container.appendChild(p);

    // Ensure the sentence is a string
    const sentence = String(sentences[index]);
    const words = sentence.split(' ');

    // Animate this sentence word by word
    animateWords(p, words, 0, () => {
        processParagraphSentences(sentences, container, index + 1, onComplete);
    });
}

function animateWords(paragraphElem, words, currentWordIndex, onSentenceComplete) {
    if (currentWordIndex >= words.length) {
        // Entire sentence is done
        onSentenceComplete();
        return;
    }

    // Append the current word (+ a space if not the first word)
    if (currentWordIndex > 0) paragraphElem.textContent += ' ';
    paragraphElem.textContent += words[currentWordIndex];

    // Delay a bit, then move to the next word
    setTimeout(() => {
        animateWords(paragraphElem, words, currentWordIndex + 1, onSentenceComplete);
    }, 30);
}

function handleComplete(content) {
    console.log("Received complete response:", content);


}

// Function to handle to enable/disable the input field and send button during streaming
function toggleLoadingState(isLoading) {
    const input = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Disable/enable the input field based on isLoading
    if (input) input.disabled = isLoading;
    
    // Disable/enable the send button based on isLoading
    if (sendButton) sendButton.disabled = isLoading;
}


// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});