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

// GLOBAL VARIABLES

let activeEventSource = null; // Track the active activeEventSource connection
let isProcessing = false; // Flag to prevent concurrent processing
let componentsMap = {};  // Saving the components for each response
let processedComponents = new Map(); // Current components that have been processed
let renderingQueue = [];
let responseCount = 0;

const contentContainer = document.getElementById('content-container');
const versionHistory = document.getElementById('version-history');








// SENDING & RECEIVING MESSAGES

function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    toggleLoadingState(true);
    processedComponents.clear(); // Clear processed components for a new request
    renderingQueue = [];  // Clear the rendering queue
    clearContentContainer();  // Clear the UI content

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
                responseCount++;
                handleComplete(data.content);
                break;
            case 'second_complete':
                handleSecondComplete(data.content);  // New function to process the second chatbot's response
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

// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Function to handle to enable/disable the input field and send button during streaming
function toggleLoadingState(isLoading) {
    const input = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    // Disable/enable the input field based on isLoading
    if (input) input.disabled = isLoading;
    
    // Disable/enable the send button based on isLoading
    if (sendButton) sendButton.disabled = isLoading;
}

function clearContentContainer() {
    contentContainer.innerHTML = '';  // Clears all previous components
}







// HANDLE RESPONSE TYPES

async function handleDelta(content) {
    console.log("Received delta:", content);

    renderingQueue.push(content);

    if (isProcessing) {
        return; // ensures that only one instance of handleDelta is running at a time
    }

    while (renderingQueue.length > 0) {
        const currentContent = renderingQueue.shift();
        try {
            isProcessing = true;

            if (!currentContent.components || !Array.isArray(currentContent.components)) {
                continue;
            }

            for (const component of currentContent.components) {
                
                if (!component.UIType) {
                    continue;
                }

                const componentID = `${component.UIType}-${currentContent.components.indexOf(component)}`;

                
                if (!processedComponents.has(componentID)) {
                    // Only update classes for previous components if this isn't the first component
                    if (processedComponents.size > 0) {
                        const previousComponents = document.querySelectorAll('.processing');
                        previousComponents.forEach(component => {
                            component.classList.remove('processing');
                            component.classList.add('processed');
                        });
                    }

                    processedComponents.set(componentID, new Set());

                    console.log('Processing Component:', componentID);
                }


                const processedSet = processedComponents.get(componentID);

                switch (component.UIType) {
                    case 'paragraphs':
                        let paragraphContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!paragraphContainer) {
                            paragraphContainer = document.createElement('p');
                            paragraphContainer.classList.add('paragraph-container', 'processing');  // Add processing class
                            paragraphContainer.setAttribute('data-component-key', componentID);
                            contentContainer.appendChild(paragraphContainer);
                        }

                        if (!component.text || !Array.isArray(component.text)) {
                            console.warn('Invalid or missing text array in component:', component);
                            break;
                        }
                        
                        for (const sentence of component.text) {
                            if (!processedSet.has(sentence)) {
                                processedSet.add(sentence);
                                // console.log('Processed set:', processedSet);
                                await new Promise(resolve => {
                                    if (paragraphContainer.textContent) {
                                        paragraphContainer.textContent += ' ';
                                    }
                                    // Split sentence into words and add them one by one
                                    const words = sentence.split(' ');
                                    let wordIndex = 0;

                                    function addNextWord() {
                                        if (wordIndex < words.length) {
                                            // Add space before word (except for first word)
                                            if (wordIndex > 0) {
                                                paragraphContainer.textContent += ' ';
                                            }
                                            paragraphContainer.textContent += words[wordIndex];
                                            wordIndex++;
                                            // Add small delay between words
                                            setTimeout(addNextWord, 50);
                                        } else {
                                            resolve();
                                        }
                                    }

                                    addNextWord();
                                });
                            }
                        }
                        break;

                    case 'list':
                        break;

                    case 'table':
                        break;

                    case 'projects_list':
                        let projectsContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!projectsContainer) {
                            projectsContainer = document.createElement('p');
                            projectsContainer.classList.add('projects-container', 'processing');  // Add processing class
                            projectsContainer.setAttribute('data-component-key', componentID);

                            // Create the component-button div
                            const componentButton = document.createElement('div');
                            componentButton.classList.add('component-button');
                            projectsContainer.appendChild(componentButton);

                            contentContainer.appendChild(projectsContainer);
                        }
                        break;

                    default:
                        console.warn('Unknown UIType:', component.UIType);
                        return;
                }
            }

            // When queue is empty, remove 'processing' class from all elements except the first
            if (renderingQueue.length === 0) {
                const processingElements = document.querySelectorAll('.processing');
                processingElements.forEach(element => {
                    // Skip the first component
                    if (processedComponents.size > 1) {
                        element.classList.remove('processing');
                        element.classList.add('processed');
                    }
                });
            }
        } catch (error) {
            console.error("Error processing content:", error);
        } finally {
            isProcessing = false;
        }
    }
}

function handleComplete(content) {
    // console.log("Received complete response:", content);
    componentsMap[responseCount] = content;
    console.log(componentsMap);
}

function handleSecondComplete(content) {
    console.log("Received second complete response:", content);

    handleVersionHistoryUpdate(content);
    handlePromptProposalsUpdate(content);
}







// VERSION HISTORY

function handleVersionHistoryUpdate(content) {

    // Hide all existing version-history elements
    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(element => {
        element.classList.add('display-none');
        element.classList.remove('current-version-history-element');
    });

    // Create the new version-history element
    const newHistoryElement = document.createElement('div');
    newHistoryElement.classList.add('version-history-element');
    newHistoryElement.classList.add('current-version-history-element');
    newHistoryElement.id = `version-history-element-${responseCount + 1}`; // Add unique ID based on responseCount
    newHistoryElement.setAttribute('version-history-key', responseCount);

    // Create and append the version-history-number element
    const versionHistoryNumber = document.createElement('div');
    versionHistoryNumber.classList.add('version-history-number');

    // Create and append the version-history-element-digits element
    const versionHistoryDigits = document.createElement('div');
    versionHistoryDigits.classList.add('version-history-element-digits');
    versionHistoryDigits.textContent = (responseCount + 1).toString().padStart(2, '0'); // Add leading zero if needed / padStart() is  method that ensures the string to have a minimum length characters

    versionHistoryNumber.appendChild(versionHistoryDigits);

    // Create and append the version-history-element-title element
    const versionHistoryTitle = document.createElement('div');
    versionHistoryTitle.classList.add('version-history-element-title');
    versionHistoryTitle.textContent = content.content_description; // Set title text

    // Append all elements to the new history entry
    newHistoryElement.appendChild(versionHistoryNumber);
    newHistoryElement.appendChild(versionHistoryTitle);

    // Append the new history entry to the versionHistory container
    versionHistory.appendChild(newHistoryElement);
}

versionHistory.addEventListener('click', openVersionHistory);

function openVersionHistory() {

    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(element => {
        element.classList.remove('display-none');

        element.addEventListener('click', () => displayPreviousVersion(element));
    });
}

function displayPreviousVersion(element) {

    // Get the version key from the clicked element
    const versionKey = parseInt(element.getAttribute('version-history-key'));

    // Get the corresponding content from componentsMap
    const versionContent = componentsMap[versionKey];

    clearContentContainer();

    // Update UI with the selected version's content
    if (versionContent && versionContent.components) {
        versionContent.components.forEach(component => {
            switch (component.UIType) {
                case 'paragraphs':
                    const paragraphContainer = document.createElement('p');
                    paragraphContainer.classList.add('paragraph-container', 'processed');
                    paragraphContainer.textContent = component.text.join(' ');
                    contentContainer.appendChild(paragraphContainer);
                    break;
                    
                // Add other component types as needed
                case 'projects_list':
                    // const projectsContainer = document.createElement('p');
                    // projectsContainer.classList.add('projects-container', 'processed');
                    // const componentButton = document.createElement('div');
                    // componentButton.classList.add('component-button');
                    // projectsContainer.appendChild(componentButton);
                    // contentContainer.appendChild(projectsContainer);
                    break;
            }
        });
    }
}








// PROMPT PROPOSALS

function handlePromptProposalsUpdate(content) {
    // const promptProposals = document.getElementById('prompt-proposals');
    // promptProposals.textContent = content.prompt_proposals;
}




