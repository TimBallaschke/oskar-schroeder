// Function called when user sends a message
function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value;
    if (message.trim() === '') return;  // Don't send empty messages

    // Send message to backend (Flask server)
    fetch('/projects', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({message: message})
    })
    // When you make a fetch request, the server sends back a Response object
    // response.json() takes this raw data and converts (parses) it into a JavaScript object
    .then(response => response.json())  // Parse JSON response
    .then(data => {

        // Create a container for the projects and append it to the content container
        const contentContainer = document.querySelector('.content-container');
        const projectsContainer = document.createElement('div');
        projectsContainer.classList.add('projects-container');
        contentContainer.appendChild(projectsContainer);

        data.projects.forEach(project => {
            const singleProject = document.createElement('div');
            singleProject.classList.add('single-project');
            singleProject.id = project.name;
            projectsContainer.appendChild(singleProject);
        })
        // Log only the data
        console.log(data);
    })
    .catch(error => {
        // Handle any errors that occur during the request
        console.error('Error:', error);
    });

    // Clear the input field after sending
    input.value = '';
}


// Add ability to send message by pressing Enter key
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 