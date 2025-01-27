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


// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    // Send message to backend (Flask server)
    fetch('/content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: message})
    }).then(response => response.json())
      .then(data => {
        if (data.status === "ok") {
            startStreamingResponse();
        }        
    }).catch(error => {
        console.error('Error sending message:', error);
    });

    // Clear the input field after sending
    input.value = '';
}

function startStreamingResponse() {
    const eventSource = new EventSource("/stream");

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);

        switch(data.type) {
            case 'delta':
                handleDelta(data.content);
                break;
            case 'complete':
                handleComplete(data.content);
                eventSource.close();
                break;
            case "error":
                console.error("Error:", data.content);
                eventSource.close();
                break;
        }
    };

    eventSource.onerror = function (error) {
        console.error("EventSource failed:", error);
        eventSource.close();
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