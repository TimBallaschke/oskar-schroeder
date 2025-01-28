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
let isStreaming = false;

let processedComponents = new Map(); // Tracks components AND their sub-elements

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
                currentEventSource = null;
                toggleLoadingState(false);
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                currentEventSource = null;
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

function handleDelta(content) {
    console.log("Received delta:", content);

    const contentContainer = document.getElementById('content-container');

    content.components.forEach((component, index) => {

        // Generate a unique key for each component based on its type and position
        const componentKey = index;

        if (!processedComponents.has(componentKey)) {
            processedComponents.set(componentKey, new Set()); // Initialize if new
        }

        const processedSet = processedComponents.get(componentKey); // Retrieve sub-element tracker

        let element;
        
        switch (component.UIType) {
            case 'paragraphs':
                let paragraphContainer = document.querySelector(`[data-component-key="${componentKey}"]`);

                if (!paragraphContainer) {
                    paragraphContainer = document.createElement('div');
                    paragraphContainer.classList.add('paragraph-container');
                    paragraphContainer.setAttribute('data-component-key', componentKey);
                    contentContainer.appendChild(paragraphContainer);
                }

                component.text.forEach(sentence => {
                    if (processedSet.has(sentence)) return;
                    processedSet.add(sentence);

                    let p = document.createElement('p');
                    p.textContent = sentence;
                    paragraphContainer.appendChild(p);
                });

                console.log(processedComponents);
                break;

            case 'list':
                element = document.createElement('ul');
                component.items.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    element.appendChild(li);
                });

                component.text.forEach(sentence => {
                    if (processedSet.has(sentence)) return;
                    processedSet.add(sentence);

                    let p = document.createElement('p');
                    p.textContent = sentence;
                    paragraphContainer.appendChild(p);
                });
                break;

            case 'table':
                element = document.createElement('table');
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                component.headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                element.appendChild(thead);

                const tbody = document.createElement('tbody');
                component.rows.forEach(row => {
                    const tr = document.createElement('tr');
                    row.forEach(cell => {
                        const td = document.createElement('td');
                        td.textContent = cell;
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
                element.appendChild(tbody);
                break;

            case 'project':
                element = document.createElement('div');
                element.innerHTML = `
                    <h3>${component.name} (${component.year})</h3>
                    <p><strong>Material:</strong> ${component.material}</p>
                    <p><strong>Dimensions:</strong> ${component.dimensions}</p>
                    <p>${component.description.join('</p><p>')}</p>
                `;
                break;

            default:
                console.warn('Unknown UIType:', component.UIType);
                return;
        }

        processedComponents.add(JSON.stringify(component)); // Add the processed component to the set
        contentContainer.appendChild(element);
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


// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});