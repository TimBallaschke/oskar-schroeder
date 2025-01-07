function sendMessage(message) {
    fetch('/content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: message })
    }).then(response => {
        const eventSource = new EventSource('/content');
        
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'delta':
                    // Handle partial updates
                    handleDelta(data.content);
                    break;
                    
                case 'complete':
                    // Handle complete response
                    handleComplete(data.content);
                    eventSource.close();
                    break;
                    
                case 'error':
                    // Handle errors
                    console.error('Error:', data.content);
                    eventSource.close();
                    break;
            }
        };
        
        eventSource.onerror = function(error) {
            console.error('EventSource failed:', error);
            eventSource.close();
        };
    }).catch(error => {
        console.error('Error:', error);
    });
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