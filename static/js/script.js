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
let processedComponents = new Map();
let isProcessingWords = false;
let pendingComponents = [];
let isProcessingComponent = false;
let currentComponentID = null;

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
        console.log("Closing previous EventSource connection");
        activeEventSource.close();
        console.log("Closed previous EventSource connection");
    }

    console.log("Starting new EventSource connection");
    activeEventSource = new EventSource("/stream");

    activeEventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);

        switch(data.type) {
            case 'delta':
                handleDelta(data.content);
                break;
            case 'complete':
                console.log("Received complete signal, processing final content:", data.content);
                // Process the final content before closing
                handleDelta(data.content);
                
                // Wait for processing to finish before closing connection
                const checkProcessing = setInterval(() => {
                    if (!isProcessingComponent && pendingComponents.length === 0) {
                        console.log("All components processed, closing connection");
                        clearInterval(checkProcessing);
                        activeEventSource.close();
                        activeEventSource = null;
                        toggleLoadingState(false);
                    } else {
                        console.log("Still processing components, waiting...");
                    }
                }, 100);
                break;
            case "error":
                console.error("Error received from server:", data.content);
                activeEventSource.close();
                activeEventSource = null;
                toggleLoadingState(false);
                break;
        }
    };

    activeEventSource.onerror = function (error) {
        console.error("EventSource error:", error);
        activeEventSource.close();
        activeEventSource = null;
        toggleLoadingState(false);
    };
}

function handleDelta(content) {
    // console.log("Received delta:", content);
    console.log("handleDelta called");
    const contentContainer = document.getElementById('content-container');
    
    // Only process if it's a response type
    if (content.type !== 'response') {
        console.warn('Unexpected content type:', content.type);
        return;
    }
    
    // Add new components to pending queue
    if (Array.isArray(content.components)) {
        content.components.forEach((component, index) => {
            if (!component.UIType) return;
            
            const componentID = `${component.UIType}-${index}`;
            // Only add if not already in queue and not currently processing
            if (!pendingComponents.find(pc => pc.componentID === componentID) && 
                componentID !== currentComponentID) {
                console.log(`Adding new component to queue: ${componentID}`);
                pendingComponents.push({
                    component,
                    componentID,
                    index
                });
            }
        });

        if (!isProcessingComponent) {
            processNextComponent(contentContainer);
        }
    }
}

function ensureProcessing(contentContainer) {
    console.log(`Checking processing status. Queue length: ${pendingComponents.length}, isProcessing: ${isProcessingComponent}`);
    if (!isProcessingComponent && pendingComponents.length > 0) {
        console.log(`Starting to process ${pendingComponents.length} pending components`);
        isProcessingComponent = true;
        processNextComponent(contentContainer);
    }
}

function processNextComponent(contentContainer) {
    if (pendingComponents.length === 0) {
        isProcessingComponent = false;
        currentComponentID = null;
        return;
    }

    isProcessingComponent = true;
    const {component, componentID} = pendingComponents[0];
    currentComponentID = componentID;
    console.log(`Starting to process component: ${componentID}`);

    let paragraphContainer = document.querySelector(`[data-component-key="${componentID}"]`);
    if (!paragraphContainer) {
        paragraphContainer = document.createElement('div');
        paragraphContainer.classList.add('paragraph-container');
        paragraphContainer.setAttribute('data-component-key', componentID);
        contentContainer.appendChild(paragraphContainer);
    }

    if (Array.isArray(component.text)) {
        const sentences = [...component.text];
        processSentencesSequentially(sentences, paragraphContainer, () => {
            console.log(`Finished processing all sentences for component ${componentID}`);
            pendingComponents.shift();
            currentComponentID = null;
            setTimeout(() => {
                isProcessingComponent = false;
                processNextComponent(contentContainer);
            }, 100);
        });
    } else {
        pendingComponents.shift();
        currentComponentID = null;
        setTimeout(() => {
            isProcessingComponent = false;
            processNextComponent(contentContainer);
        }, 100);
    }
}

function processSentencesSequentially(sentences, container, onComplete) {
    if (sentences.length === 0) {
        onComplete();
        return;
    }

    const sentence = sentences[0];
    const p = document.createElement('p');
    container.appendChild(p);
    
    const words = sentence.split(' ');
    animateWords(p, words, 0, () => {
        sentences.shift();
        processSentencesSequentially(sentences, container, onComplete);
    });
}

function animateWords(paragraph, words, currentIndex, onComplete) {
    if (currentIndex >= words.length) {
        onComplete();
        return;
    }

    const word = words[currentIndex];
    const shouldAddSpace = currentIndex > 0;
    paragraph.textContent += (shouldAddSpace ? ' ' : '') + word;

    setTimeout(() => {
        animateWords(paragraph, words, currentIndex + 1, onComplete);
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