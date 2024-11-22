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
    // Await the response and parse it as JSON
    .then(response => response.json())
    // Await the data and display the projects as decided by the LLM
    .then(data => {
        // Create a container for the projects and append it to the content container
        const contentContainer = document.querySelector('.content-container');
        const projectsContainer = document.createElement('div');
        projectsContainer.classList.add('projects-container');
        contentContainer.appendChild(projectsContainer);

        // Loop through each project
        Object.entries(data.projects).forEach(([projectName, projectData]) => {
            // Create a single project DIV for each project
            const singleProject = document.createElement('div');
            singleProject.classList.add('single-project');
            singleProject.id = projectName;
            projectsContainer.appendChild(singleProject);

            // Append the project name
            const projectTitle = document.createElement('div');
            projectTitle.innerHTML = projectName;
            singleProject.appendChild(projectTitle);

            // Loop through each field in the project data (year, material, dimensions, description)
            Object.entries(projectData).forEach(([fieldName, fieldData]) => {
                // Create a new div for each field's value
                const fieldDiv = document.createElement('div');
                fieldDiv.classList.add(fieldName);
                fieldDiv.innerHTML = fieldData.value;
                singleProject.appendChild(fieldDiv);

                // Hide field if the boolean value of the field is false
                if (!fieldData.active) {
                    fieldDiv.classList.add('inactive');
                } else {
                    fieldDiv.classList.remove('inactive');
                }
            });
        });
        
        console.log(data);
    })
    .catch(error => {
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