let currentEventSource = null;  // Global variable to track EventSource

// Add at the top with other globals
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
let idleTimer = null;

// Generic handler for clicking on prompt elements that should be copied to input
function handlePromptClick(element) {
    const input = document.getElementById('user-input');
    input.value = element.innerHTML;
}

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    openEventSource();

    const promptProposalOne = document.querySelector('.prompt-proposal-1');
    const promptProposalTwo = document.querySelector('.prompt-proposal-2');

    promptProposalOne.addEventListener('click', () => handlePromptClick(promptProposalOne));
    promptProposalTwo.addEventListener('click', () => handlePromptClick(promptProposalTwo));
});

function openEventSource() {
    if (!currentEventSource) {
        currentEventSource = new EventSource('/content');

        currentEventSource.onmessage = function(event) {
            // Reset idle timer on any message
            resetIdleTimer();
            handleEvent(event);
        };

        currentEventSource.onerror = function(error) {
            console.error('EventSource error:', error);
            closeEventSource();
            setTimeout(openEventSource, 3000);  // Reconnect after 3 seconds
        };

        console.log('EventSource connection opened.');
    }
    // Start idle timer
    resetIdleTimer();
}

function resetIdleTimer() {
    // Clear existing timer
    if (idleTimer) {
        clearTimeout(idleTimer);
    }
    
    // Set new timer
    idleTimer = setTimeout(() => {
        console.log('Connection closed due to inactivity');
        closeEventSource();
    }, IDLE_TIMEOUT);
}

// closeEventSource function
function closeEventSource() {
    if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
        console.log('EventSource connection closed.');
    }
}

function handleEvent(event) {
    try {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'delta':
                handleDelta(data.content);
                break;
            case 'complete':
                handleComplete(data.content);
                break;
            case 'error':
                console.error('Server error:', data.content);
                break;
        }
    } catch (error) {
        console.error('Error parsing event data:', error);
    }
}

// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;

    // Ensure connection is open when sending message
    if (!currentEventSource) {
        openEventSource();
    }

    // Send the user message to the server
    fetch('/content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        console.log('Message sent successfully');
    })
    .catch(error => {
        console.error('Error sending message:', error);
    });

    // Clear the input field
    input.value = '';
}


function handleDelta(content) {
    // Update your UI with the partial content
    console.log('Received delta:', content);
    // Add your UI update logic here
}

function handleComplete(content) {
    // Update your UI with the complete response
    console.log('Received complete response:', content);
    // Add your UI update logic here
} 

// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});