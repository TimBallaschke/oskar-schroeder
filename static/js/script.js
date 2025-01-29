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
let isProcessing = false; // Flag to prevent concurrent processing
let componentsMap = new Map();

// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    toggleLoadingState(true);

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
    console.log("New EventSource connection created");

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
        currentEventSource = null;
        toggleLoadingState(false);
    };
}

// Factory function to initialize component structures
function createComponentStructure(component) {
    switch (component.UIType) {
        case 'paragraphs':
            return {
                UIType: 'paragraphs',
                sentences: new Set(),
                // fullText: '',
            };
        case 'list':
            return {
                items: new Set(),
                type: component.listType || 'unordered'
            };
        case 'table':
            return {
                headers: [],
                rows: [],
                caption: ''
            };
        case 'project':
            return {
                title: '',
                description: '',
                steps: new Set(),
                resources: new Set()
            };
        default:
            return {};
    }
}

function handleDelta(content) {
    console.log("Received delta:", content);

    if (!content.components) {
        return;
    }
    
    content.components.forEach((component, index) => {
        // Ensure UIType exists
        if (!component.UIType) {
            return;
        }

        // Generate a unique component ID
        const componentID = `${component.UIType}-${index}`;

        if (!componentsMap.has(componentID)) {
            console.log(`Creating new component: ${componentID}`);
            componentsMap.set(componentID, createComponentStructure(component));
        }

        const existingComponent = componentsMap.get(componentID);


        // Update based on component type
        switch (component.UIType) {
            case 'paragraphs':
                if (component.text && Array.isArray(component.text)) {
                    component.text.forEach(sentence => existingComponent.sentences.add(sentence));
                }
                break;

            case 'list':
                component.items.forEach(item => existingComponent.items.add(item));
                break;

            case 'table':
                existingComponent.headers = component.headers || existingComponent.headers;
                existingComponent.rows.push(...component.rows);
                existingComponent.caption = component.caption || existingComponent.caption;
                break;

            case 'project':
                existingComponent.title = component.title || existingComponent.title;
                existingComponent.description = component.description || existingComponent.description;
                component.steps.forEach(step => existingComponent.steps.add(step));
                component.resources.forEach(resource => existingComponent.resources.add(resource));
                break;

            default:
                console.warn("Unknown UIType:", component.UIType);
                return;
        }

        componentsMap.set(componentID, existingComponent);
        console.log('componentsMap:', componentsMap);
    });
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

function resetProcessingState() {
    components.clear();
    isProcessing = false;
}

// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});