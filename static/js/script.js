// Generic handler for clicking on prompt elements that should be copied to input
function handlePromptClick(element) {
    const input = document.getElementById('user-input');
    input.value = element.innerHTML;
}

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const promptProposalOne = document.querySelector('.prompt-proposal-1');
    const promptProposalTwo = document.querySelector('.prompt-proposal-2');

    promptProposalOne.addEventListener('click', () => handlePromptClick(promptProposalOne));
    promptProposalTwo.addEventListener('click', () => handlePromptClick(promptProposalTwo));
});


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
        
        // Check if projects container already exists, if not create it
        let projectsContainer = document.querySelector('.projects-container');
        if (!projectsContainer) {
            projectsContainer = document.createElement('div');
            projectsContainer.classList.add('projects-container');
            contentContainer.appendChild(projectsContainer);
        }

        // Only process projects if the request to the LLM is valid and matches the rules defined in the system prompt
        if (data.is_valid_request) {
            // Get current project IDs
            // Array.from() converts the HTML-Collection into an array
            // .map() is a build in built-in JavaScript method that transforms each element of the array using a funtion you provide
            // and returns an array of the ids of the current projects
            const currentProjectIds = Array.from(projectsContainer.children).map(child => child.id);
            // Get new project IDs
            const newProjectIds = Object.keys(data.projects);

            // Remove projects that are no longer present
            currentProjectIds.forEach(projectId => {
                if (!newProjectIds.includes(projectId)) {
                    const projectToRemove = document.getElementById(projectId);
                    if (projectToRemove) {
                        projectToRemove.remove();
                    }
                }
            });

            // Update existing projects and add new ones
            // Object.entries() transforms an object into an array of key-value pairs
            Object.entries(data.projects).forEach(([projectName, projectData]) => {
                let singleProject = document.getElementById(projectName);
                
                // If project doesn't exist, create it
                if (!singleProject) {
                    singleProject = document.createElement('div');
                    singleProject.classList.add('single-project');
                    singleProject.id = projectName;
                    projectsContainer.appendChild(singleProject);

                    // Create images container
                    const projectImagesContainer = document.createElement('div');
                    projectImagesContainer.classList.add('project-images-container');
                    singleProject.appendChild(projectImagesContainer);

                    // Create info container 
                    const projectInfoContainer = document.createElement('div');
                    projectInfoContainer.classList.add('project-info-container');
                    singleProject.appendChild(projectInfoContainer);

                    // Add project title for new projects
                    const projectTitleContainer = document.createElement('div');
                    projectTitleContainer.classList.add('project-title-container');
                    
                    const projectTitle = document.createElement('div');
                    projectTitle.innerHTML = projectName;
                    projectTitle.classList.add('project-title');
                    // Add click event listener to project title
                    projectTitle.addEventListener('click', () => handlePromptClick(projectTitle));
                    
                    projectTitleContainer.appendChild(projectTitle);
                    projectInfoContainer.appendChild(projectTitleContainer);

                    // Add first image from project's image folder
                    const projectImageContainer = document.createElement('div');
                    projectImageContainer.classList.add('project-title-image-container');
                    
                    const projectImage = document.createElement('img');
                    projectImage.src = `/static/assets/images/${projectName}/1.jpg`;
                    projectImage.alt = `${projectName} artwork`;
                    projectImage.classList.add('project-title-image');
                    
                    projectImageContainer.appendChild(projectImage);
                    projectImagesContainer.appendChild(projectImageContainer);
                }

                // Get reference to project info container (because defined in different scope)
                const projectInfoContainer = singleProject.querySelector('.project-info-container');

                // Loop through each field in the project data (year, material, dimensions, description)
                Object.entries(projectData).forEach(([fieldName, fieldData]) => {
                    let fieldDiv = singleProject.querySelector(`.${fieldName}`);
                    
                    // If field doesn't exist, create it
                    if (!fieldDiv) {
                        fieldDiv = document.createElement('div');
                        fieldDiv.classList.add(fieldName);
                        projectInfoContainer.appendChild(fieldDiv);
                    }

                    // Update field content and visibility
                    fieldDiv.innerHTML = fieldData.value;
                    
                    if (!fieldData.active) {
                        fieldDiv.classList.add('inactive');
                    } else {
                        fieldDiv.classList.remove('inactive');
                    }
                });
            });

        // Update prompt suggestions regardless of request validity
        const promptProposalOne = document.querySelector('.prompt-proposal-1');
        promptProposalOne.innerHTML = data.prompt_proposal_1;

        const promptProposalTwo = document.querySelector('.prompt-proposal-2');
        promptProposalTwo.innerHTML = data.prompt_proposal_2;
        
        }
        
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