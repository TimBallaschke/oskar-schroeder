// GLOBAL VARIABLES

let activeEventSource = null; // Track the active activeEventSource connection
let isProcessing = false; // Flag to prevent concurrent processing
let responseMap = {};  // Saving the components for each response
let processedComponents = new Map(); // Current components that have been processed
let renderingQueue = [];
let responseCount = 0;
let projectRenderingQueue = [];
let isProjectRendering = false;
let selectedComponent = null;
let selectedComponentJSON = null;

// Helper function to get CSS variable value as integer
function getCSSVarValue(varName, fallback = 0) {
    return parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim()) || fallback;
}

const contentContainer = document.getElementById('content-container');
const versionHistory = document.getElementById('version-history');

const plusMinusButton = document.getElementById('plus-minus-button');

let animationDuration = getCSSVarValue('--animation-duration-1', 300);




// SENDING & RECEIVING MESSAGES

function sendMessage() {
    
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (message === '') return;  // Don't send empty messages

    toggleLoadingState(true);
    processedComponents.clear(); // Clear processed components for a new request
    renderingQueue = [];  // Clear the rendering queue
    input.value = ''; // clears the input field after sending
    inputAdded();

    if (document.body.classList.contains('component-selected')) {
        const selectedComponentJSON = document.querySelector('.selected');
        selectedComponentJSON.classList.add('light');
        // Send message to backend (Flask server)
        // This is a post request that triggers the function in main.py
        fetch('/content3', {  // HTTP request to the '/content' endpoint of your server using the Fetch API
            method: 'POST', // Specifies that this is a POST request, which is used to send data to the server
            headers: {
                'Content-Type': 'application/json', // Specifies the type of content being sent
            },
            body: JSON.stringify({
                message: message + '. Project: ' + selectedComponentJSON,
            })
        }).then(response => response.json()) // Waits for the response from the server and converts it to a JSON object
        .then(data => { // waits for the response to be converted to a JSON object
            if (data.status === "ok") { // checks if the status of the response is "ok"
                console.log('message sent to component rework bot');
                startStreamingComponentRework();
            }        
        }).catch(error => { // handles any errors that occur during the request
            console.error('Error sending message:', error); // logs the error to the console
        });

    } else {
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

        clearContentContainer();  // Clear the UI content
    }
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
    contentContainer.querySelectorAll('*').forEach(element => {
        if (element.tagName.toLowerCase() === 'span' || 
            element.tagName.toLowerCase() === 'div' || 
            element.tagName.toLowerCase() === 'p') {
            element.classList.add('light');
        }
    });

    setTimeout(() => {
        contentContainer.classList.add('no-opacity');
    }, 400);

    setTimeout(() => {
        contentContainer.innerHTML = '';

        contentContainer.querySelectorAll('*').forEach(element => {
            if (element.tagName.toLowerCase() === 'span' || 
                element.tagName.toLowerCase() === 'div' || 
                element.tagName.toLowerCase() === 'p') {
                element.classList.remove('light');
            }
        });

        contentContainer.classList.remove('no-opacity');

    }, 700);


}







// HANDLE RESPONSE TYPES

async function handleDelta(content) {
    // console.log("Received delta:", content);

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

                    processedComponents.set(componentID, new Map()); // Use a Map to track projects

                    // console.log('Processing Component:', componentID);
                }

                const componentMap = processedComponents.get(componentID);

                switch (component.UIType) {
                    case 'paragraphs':
                        let paragraphContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!paragraphContainer) {
                            paragraphContainer = document.createElement('p');
                            paragraphContainer.classList.add('paragraph-container');
                            paragraphContainer.setAttribute('data-component-key', componentID);
                            contentContainer.appendChild(paragraphContainer);
                        }

                        if (!component.text || !Array.isArray(component.text)) {
                            break;
                        }
                        
                        for (const sentence of component.text) {
                            if (!componentMap.has(sentence)) {
                                componentMap.set(sentence, true);
                                await new Promise(resolve => {
                                    if (paragraphContainer.textContent) {
                                        paragraphContainer.appendChild(document.createTextNode(' '));
                                    }
                                    // Split sentence into words and add them one by one
                                    const words = sentence.split(' ');
                                    let wordIndex = 0;

                                    function addNextWord() {
                                        if (wordIndex < words.length) {
                                            // Add space before word (except for first word)
                                            if (wordIndex > 0) {
                                                paragraphContainer.appendChild(document.createTextNode(' '));
                                            }
                                            
                                            // Create span for the word
                                            const wordSpan = document.createElement('span');
                                            wordSpan.textContent = words[wordIndex];
                                            wordSpan.classList.add('paragraph-word', 'light');
                                            paragraphContainer.appendChild(wordSpan);

                                            // Remove light class after 10ms
                                            setTimeout(() => {
                                                wordSpan.classList.remove('light');
                                            }, 10);

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
                        let tableContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!tableContainer) {
                            tableContainer = document.createElement('div');
                            tableContainer.classList.add('table-container');
                            tableContainer.setAttribute('data-component-key', componentID);
                            contentContainer.appendChild(tableContainer);
                        }

                        

                        // // Add rows if they exist in the component
                        // if (component.rows && Array.isArray(component.rows)) {
                        //     component.rows.forEach((row, index) => {
                        //         const rowKey = `row-${index}`;
                                
                        //         // Check if this row index has already been processed
                        //         if (!componentMap.has(rowKey)) {
                        //             componentMap.set(rowKey, new Set());
                                    
                        //             const tableRow = document.createElement('div');
                        //             tableRow.classList.add('table-row');
                        //             tableRow.setAttribute('data-row-index', rowIndex);
                        //             tableContainer.appendChild(tableRow);
                        //             console.log('row added', rowKey);
                        //         }

                        //         const processedElements = componentMap.get(rowKey);
                                
                        //         // Process each element in the row
                        //         if (Array.isArray(row)) {
                        //             row.forEach((element, elementIndex) => {
                        //                 // Only add element if it hasn't been processed yet
                        //                 if (!processedElements.has(elementIndex)) {
                        //                     processedElements.add(elementIndex);
                                            
                        //                     const tableCell = document.createElement('div');
                        //                     tableCell.classList.add('table-cell');
                        //                     tableCell.textContent = element;
                                            
                        //                     const targetRow = tableContainer.querySelector(`[data-row-index="${rowIndex}"]`);
                        //                     if (targetRow) {
                        //                         targetRow.appendChild(tableCell);
                        //                     }
                        //                 }
                        //             });
                        //         }
                        //     });
                        // }     
                        break;

                    case 'projects_list':
                        let projectsContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!projectsContainer) {
                            projectsContainer = document.createElement('div');
                            projectsContainer.classList.add('projects-container');
                            projectsContainer.setAttribute('data-component-key', componentID);
                            contentContainer.appendChild(projectsContainer);

                            // // Add the project list headline div
                            // const headline = document.createElement('div');
                            // headline.classList.add('project-list-headline');

                            // const dotContainer = document.createElement('div');
                            // dotContainer.classList.add('project-dot-container');
                            // const dot = document.createElement('div');
                            // dot.classList.add('project-dot', 'small');

                            // setTimeout(() => {
                            //     dot.classList.remove('small');
                            // }, 10);

                            // // Add click event listener to dot
                            // dot.addEventListener('click', () => {
                            //     document.body.classList.add('component-selected');
                            //     projectItem.classList.add('selected');
                            // });

                            // const headlineWord = document.createElement('div');
                            // headlineWord.classList.add('headline-word', 'light');
                            // headlineWord.textContent = 'Artworks';

                            // setTimeout(() => {
                            //     headlineWord.classList.remove('light');
                            // }, 10);

                            // dotContainer.appendChild(dot);
                            // headline.appendChild(dotContainer);
                            // headline.appendChild(headlineWord);
                            // projectsContainer.appendChild(headline);
                            contentContainer.appendChild(projectsContainer);
                        }

                        // Add layout classes based on response values
                        if (component.layout) {
                            if (!projectsContainer.classList.contains('fullscreen') && !projectsContainer.classList.contains('grid')) {
                                if (component.layout === 'fullscreen') {
                                    projectsContainer.classList.add('fullscreen');
                                } else if (component.layout === 'grid') {
                                    projectsContainer.classList.add('grid');
                                }
                            }
                        }

                        if (!component.projects) {
                            console.warn('Invalid projects data:', component.projects);
                            break;
                        }

                        for (const project of component.projects) {

                            if (!project.name) {
                                break;
                            }

                            const projectID = project.name;

                            // Track processed fields in projectMap
                            if (!componentMap.has(projectID)) {
                                componentMap.set(projectID, new Set());
                            }

                            const processedFields = componentMap.get(projectID);

                            // Initialize imagesSet only once per project
                            if (!processedFields.has('images')) {
                                processedFields.add('images');
                                processedFields.images = new Set(); // Store the Set as a property
                            }

                            if (!processedFields.has('description')) {
                                processedFields.add('description');
                                processedFields.description = new Set(); // Store the Set as a property
                            }
                            
                            const imagesSet = processedFields.images; // Access the Set via property
                            const descriptionSet = processedFields.description; // Access the Set via property


                            // Check for new data and add rendering tasks to the queue
                            for (const [key, value] of Object.entries(project)) {
                                if (key === 'images' && Array.isArray(value)) {
                                    for (const image of value) {
                                        if (!imagesSet.has(image)) {
                                            imagesSet.add(image);

                                            projectRenderingQueue.push({
                                                id: projectID,
                                                key: 'images',
                                                value: Array.from(imagesSet),
                                                container: projectsContainer
                                            });

                                            if (!isProjectRendering) {
                                                renderNextProject();
                                            }
                                        }
                                    }
                                } else if (key === 'description' && Array.isArray(value)) {
                                    for (const sentence of value) {
                                        if (!descriptionSet.has(sentence)) {
                                            descriptionSet.add(sentence);

                                            projectRenderingQueue.push({
                                                id: projectID,
                                                key: 'description',
                                                value: Array.from(descriptionSet),
                                                container: projectsContainer
                                            });

                                            if (!isProjectRendering) {
                                                renderNextProject();
                                            }
                                        }
                                    }

                                } else if (value && !processedFields.has(key)) {
                                    processedFields.add(key);

                                    // Push rendering task to the queue
                                    projectRenderingQueue.push({
                                        id: projectID,
                                        key: key,
                                        value: value,
                                        container: projectsContainer
                                    });

                                    if (!isProjectRendering) {
                                        renderNextProject();
                                    }
                                }
                            }
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

async function renderNextProject() {
    if (isProjectRendering || projectRenderingQueue.length === 0) return;

    isProjectRendering = true;

    try {
        while (projectRenderingQueue.length > 0) {
            const { id, key, value, container } = projectRenderingQueue.shift();

            // console.log(`Rendering ${key} for project: ${id}`);
            let projectItem = document.querySelector(`[data-project-id="${id}"]`);
            switch (key) {
                case 'UIType':
                    console.log('Project rendering started');
                    await new Promise((resolve) => {
                        if (!projectItem) {
                            projectItem = document.createElement('div');
                            projectItem.classList.add('project', 'no-width');
                            projectItem.setAttribute('data-project-id', id);
                            container.appendChild(projectItem);

                            setTimeout(() => {
                                projectItem.classList.remove('no-width');
                            }, 100);
                        }

                        setTimeout(resolve, 400);
                    });
                    break;
                case 'name':
                    await new Promise((resolve) => {        
                        // Check if the element already exists to avoid duplicates
                        let element = projectItem.querySelector(`.project-${key}`);
                        if (!element) {
                            const projectInfo = document.createElement('div');
                            projectInfo.classList.add('project-information', 'no-padding');

                            const dotContainer = document.createElement('div');
                            dotContainer.classList.add('project-dot-container', 'no-height');
                            const dot = document.createElement('div');
                            dot.classList.add('project-dot', 'small');

                                        // Modified click event listener
                            dot.addEventListener('click', () => {
                                document.body.classList.add('component-selected');
                                projectItem.classList.add('selected');
                                
                                // Find the project data in responseMap
                                const projectId = projectItem.getAttribute('data-project-id');
                                for (const response of Object.values(responseMap)) {
                                    if (response.components) {
                                        for (const component of response.components) {
                                            if (component.UIType === 'projects_list' && component.projects) {
                                                const project = component.projects.find(p => p.name === projectId);
                                                if (project) {
                                                    selectedComponentJSON = JSON.stringify(project); // Stringify the project object
                                                    selectedComponent = projectItem;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            });


                            projectInfo.appendChild(dotContainer);
                            projectItem.appendChild(projectInfo);

                            setTimeout(() => {
                                projectInfo.classList.remove('no-padding');
                                dotContainer.classList.remove('no-height');
                            }, 10);

                            setTimeout(() => {
                                dotContainer.appendChild(dot);
                            }, animationDuration);

                            setTimeout(() => {
                                dot.classList.remove('small');
                            }, animationDuration + 50);

                            setTimeout(() => {
                                element = document.createElement('div');  // Correctly create the element
                                element.classList.add(`project-${key}`, 'light');
                                element.textContent = value;
                                projectInfo.appendChild(element);
                            }, 600);

                            setTimeout(() => {
                                element.classList.remove('light');
                            }, 610);
                        } else {
                            // Update the content if it already exists (optional)
                            element.textContent = value;
                        }
        
                        setTimeout(resolve, 650);
                    });
                    break;
                case 'year':
                    await new Promise((resolve) => {
                        let projectInfo = projectItem.querySelector('.project-information');
                        const nameElement = projectInfo.querySelector('.project-name');

                        if (nameElement) {
                            let yearSpan = nameElement.querySelector('.project-year');
                            if (!yearSpan) {
                                yearSpan = document.createElement('span');
                                yearSpan.classList.add('project-year', 'light');
                                yearSpan.textContent = ` (${value})`;
                                nameElement.appendChild(yearSpan);

                                setTimeout(() => {
                                    yearSpan.classList.remove('light');
                                }, 10);
                            } else {
                                // Update existing year span
                                yearSpan.textContent = ` (${value})`;
                            }
                        }
                        setTimeout(resolve, 50);
                    });
                    break;
                case 'material':
                case 'dimensions':
                    await new Promise((resolve) => { 
                        let projectInfo = projectItem.querySelector('.project-information');

                        // Check if the element already exists to avoid duplicates
                        let element = projectInfo.querySelector(`.project-${key}`);
                        if (!element) {
                            element = document.createElement('div');  // Correctly create the element
                            element.classList.add(`project-${key}`, 'no-height', 'no-opacity', 'light');
                            element.textContent = value;
                            projectInfo.appendChild(element);

                            setTimeout(() => {
                                element.classList.remove('no-height');
                            }, 10);

                            setTimeout(() => {
                                element.classList.remove('no-opacity');
                                element.classList.remove('light');
                            }, 500);
                        } else {
                            // Update the content if it already exists (optional)
                            element.textContent = value;
                        }
        
                        setTimeout(resolve, 550);
                    });
                    break;
                case 'images':
                    await new Promise((resolve) => {
                        let imageContainer = projectItem.querySelector('.project-images');
                        let projectInfo = projectItem.querySelector('.project-information');

                        if (!imageContainer) {
                            imageContainer = document.createElement('div');
                            imageContainer.classList.add('project-images', 'no-height', 'blur', 'no-opacity');
                            projectItem.appendChild(imageContainer);

                            setTimeout(() => {
                                imageContainer.classList.remove('no-height');
                            }, 300);

                            setTimeout(() => {
                                imageContainer.classList.remove('blur', 'no-opacity');
                            }, 800);

                            setTimeout(() => {  
                                // Create image counter container
                                const imageCounter = document.createElement('div');
                                imageCounter.classList.add('image-counter', 'light');
                                imageCounter.innerHTML = `[01/${value.length.toString().padStart(2, '0')}]`;
                                projectInfo.appendChild(imageCounter);
                            }, 1500);

                            setTimeout(() => {
                                const imageCounter = projectInfo.querySelector('.image-counter');
                                if (imageCounter) {
                                    imageCounter.classList.remove('light');
                                }
                            }, 1600);

                            setTimeout(() => {
                                // Add scroll event listener to update counter after counter is created
                                imageContainer.addEventListener('scroll', () => {
                                    const scrollPosition = imageContainer.scrollLeft;
                                    const imageWidth = imageContainer.offsetWidth;
                                    const currentIndex = Math.round(scrollPosition / imageWidth);
                                    const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                    
                                    const counter = projectInfo.querySelector('.image-counter');
                                    if (counter) {
                                        counter.innerHTML = `[${(currentIndex + 1).toString().padStart(2, '0')}/${totalImages.toString().padStart(2, '0')}]`;
                                    }
                                });
                            }, 1700);
                        }
                
                        // Process each image URL in the array
                        value.forEach(imageUrl => {
                            // Check if image with this URL already exists
                            const existingImage = imageContainer.querySelector(`img[src="${imageUrl}"]`);
                            if (!existingImage) {
                                // Create wrapper div with project-image class
                                const imageWrapper = document.createElement('div');
                                imageWrapper.classList.add('project-image', 'no-opacity');
                
                                // Create the img element
                                const imgElement = document.createElement('img');
                                imgElement.classList.add('img-element');
                                imgElement.src = imageUrl;
                                
                                // Add img to wrapper
                                imageWrapper.appendChild(imgElement);
                                imageContainer.appendChild(imageWrapper);
                
                                // Add fade-in effect once image is loaded
                                imgElement.onload = () => {
                                    imageWrapper.classList.remove('no-opacity');
                                };
                            }
                        });

                        // Update counter after all images are processed
                        const imageCounter = projectItem.querySelector('.image-counter');
                        if (imageCounter) {
                            const scrollPosition = imageContainer.scrollLeft;
                            const imageWidth = imageContainer.offsetWidth;
                            const currentIndex = Math.round(scrollPosition / imageWidth);
                            const totalImages = imageContainer.querySelectorAll('.project-image').length;
                            
                            imageCounter.innerHTML = `[${(currentIndex + 1).toString().padStart(2, '0')}/${totalImages.toString().padStart(2, '0')}]`;
                        }
                                
                        setTimeout(resolve, 400);
                    });
                    break;
                case 'description':
                    await new Promise((resolve) => {
                        let projectDescription = projectItem.querySelector('.project-description');
                
                        if (!projectDescription) {
                            projectDescription = document.createElement('div');
                            projectDescription.classList.add('project-description', 'no-opacity');
                            projectItem.appendChild(projectDescription);
                
                            setTimeout(() => {
                                projectDescription.classList.remove('no-opacity');
                            }, 10);
                        }
                
                        // Use for...of instead of forEach for proper async iteration
                        async function addSentences() {
                            let projectDescription = projectItem.querySelector('.project-description');

                            if (!projectDescription) {
                                projectDescription = document.createElement('div');
                                projectDescription.classList.add('project-description', 'no-opacity');
                                projectItem.appendChild(projectDescription);

                                setTimeout(() => {
                                    projectDescription.classList.remove('no-opacity');
                                }, 10);
                            }

                            // Create a single paragraph for all sentences
                            const paragraphElement = document.createElement('p');
                            paragraphElement.classList.add('project-description-paragraph');
                            projectDescription.appendChild(paragraphElement);

                            // Process each sentence
                            for (const sentence of value) {
                                const safeSentence = btoa(encodeURIComponent(sentence));
                                
                                // Only process if this sentence hasn't been added yet
                                if (!projectDescription.querySelector(`[data-sentence="${safeSentence}"]`)) {
                                    await new Promise((sentenceResolve) => {
                                        // Add space between sentences if not the first sentence
                                        if (paragraphElement.childNodes.length > 0) {
                                            paragraphElement.appendChild(document.createTextNode(' '));
                                        }

                                        // Create a span to group the sentence (optional, for tracking)
                                        const sentenceSpan = document.createElement('span');
                                        sentenceSpan.setAttribute('data-sentence', safeSentence);
                                        paragraphElement.appendChild(sentenceSpan);

                                        // Split sentence into words and add them one by one
                                        const words = sentence.split(' ');
                                        let wordIndex = 0;

                                        function addNextWord() {
                                            if (wordIndex < words.length) {
                                                // Add space before word (except for first word)
                                                if (wordIndex > 0) {
                                                    sentenceSpan.appendChild(document.createTextNode(' '));
                                                }
                                                
                                                // Create span for the word
                                                const wordSpan = document.createElement('span');
                                                wordSpan.textContent = words[wordIndex];
                                                wordSpan.classList.add('project-description-word', 'light');
                                                sentenceSpan.appendChild(wordSpan);

                                                // Remove light class after brief delay
                                                setTimeout(() => {
                                                    wordSpan.classList.remove('light');
                                                }, 10);

                                                wordIndex++;
                                                // Add delay between words
                                                setTimeout(addNextWord, 50);
                                            } else {
                                                sentenceResolve();
                                            }
                                        }

                                        addNextWord();
                                    });
                                }
                            }
                        }

                        // Call the async function and resolve when complete
                        addSentences().then(() => resolve());
                    });
                    
                    
                    


                    break;
            }


        }
    } finally {
        // console.log('Project rendering completed');
        isProjectRendering = false;
    }
}

function handleComplete(content) {
    console.log("Received complete response:", content);
    responseMap[responseCount] = content;
}

function handleSecondComplete(content) {
    // console.log("Received second complete response:", content);

    handleVersionHistoryUpdate(content);
    handlePromptProposalsUpdate(content);
}







// VERSION HISTORY

// updating the version history
function handleVersionHistoryUpdate(content) {

    // Hide all existing version-history elements
    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(element => {
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
    versionHistoryNumber.classList.add('version-history-element-number');

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


    
// opening and closing the version history
versionHistory.addEventListener('click', openVersionHistory);

function openVersionHistory() {

    document.body.classList.add('version-history-opening-1');

    setTimeout(() => {
        document.body.classList.remove('version-history-opening-1');
        document.body.classList.add('version-history-opening-2');
    }, 10);

    setTimeout(() => {
        document.body.classList.remove('version-history-opening-2');
        document.body.classList.add('version-history-opening-3');
    }, animationDuration);

    versionHistory.removeEventListener('click', openVersionHistory);
    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(element => {
        element.addEventListener('click', handleVersionClick);
    });

    const versionHistoryClose = document.getElementById('version-history-close');
    versionHistoryClose.addEventListener('click', closeVersionHistory);

    versionHistory.removeEventListener('click', openVersionHistory);
}

function closeVersionHistory(element) {
    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(el => {
        el.removeEventListener('click', handleVersionClick);
    });

    document.body.classList.remove('version-history-opening-3');
    document.body.classList.add('version-history-opening-2');

    setTimeout(() => {
        document.body.classList.remove('version-history-opening-2');
        document.body.classList.add('version-history-opening-1');
    }, animationDuration);

    setTimeout(() => {
        document.body.classList.remove('version-history-opening-1');
    }, animationDuration * 2);

    setTimeout(() => {
        versionHistory.addEventListener('click', openVersionHistory);
        document.body.removeEventListener('click', openVersionHistory);
    }, animationDuration + 10);
}

// Define the handler function separately so it can be removed later
function handleVersionClick(event) {
    displayPreviousVersion(event.currentTarget);
}


// display previous version
function displayPreviousVersion(element) {

    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(el => {
        el.classList.remove('current-version-history-element');
    });

    setTimeout(() => {
        element.classList.add('current-version-history-element');
    }, 10);

    // Get the version key from the clicked element
    const versionKey = parseInt(element.getAttribute('version-history-key'));

    if (versionKey === 0) {
        clearContentContainer();
        closeVersionHistory(element);
        return;
    }

    // Get the corresponding content from componentsMap
    const versionContent = responseMap[versionKey];

    clearContentContainer();
    closeVersionHistory(element);

    setTimeout(() => {
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
    }, 1000);
}



// PROMPT PROPOSALS

function handlePromptProposalsUpdate(content) {
    const promptProposal1 = document.getElementById('prompt-proposal-1');
    const promptProposal2 = document.getElementById('prompt-proposal-2');
    const promptProposal3 = document.getElementById('prompt-proposal-3');
    const promptProposal4 = document.getElementById('prompt-proposal-4');

    promptProposal1.textContent = content.prompt_proposal_1;
    promptProposal2.textContent = content.prompt_proposal_2;
    promptProposal3.textContent = content.prompt_proposal_3;
    promptProposal4.textContent = content.prompt_proposal_4;
}

// Generic handler for clicking on prompt elements that should be copied to input
function handlePromptClick(element) {
    const input = document.getElementById('user-input');
    input.value = element.innerHTML;

    setTimeout(() => {
        sendMessage();
    }, 1000);
}

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const promptProposal1 = document.getElementById('prompt-proposal-1');
    const promptProposal2 = document.getElementById('prompt-proposal-2');
    const promptProposal3 = document.getElementById('prompt-proposal-3');
    const promptProposal4 = document.getElementById('prompt-proposal-4');

    promptProposal1.addEventListener('click', () => handlePromptClick(promptProposal1));
    promptProposal2.addEventListener('click', () => handlePromptClick(promptProposal2));
    promptProposal3.addEventListener('click', () => handlePromptClick(promptProposal3));
    promptProposal4.addEventListener('click', () => handlePromptClick(promptProposal4));
});

plusMinusButton.addEventListener('click', togglePromptProposals);

function togglePromptProposals() {
    const bottomNavigation = document.getElementById('bottom-navigation');

    if (!bottomNavigation.classList.contains('prompt-proposal-opening-2')) {
        bottomNavigation.classList.add('prompt-proposal-opening-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('prompt-proposal-opening-1');
                bottomNavigation.classList.add('prompt-proposal-opening-2');
            }, animationDuration);
    } else {
        bottomNavigation.classList.remove('prompt-proposal-opening-2');
        bottomNavigation.classList.add('prompt-proposal-opening-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('prompt-proposal-opening-1');
            }, animationDuration);
    }
}

function startStreamingComponentRework() {
    // Close any existing EventSource connection
    if (activeEventSource) {
        activeEventSource.close();
        console.log("Closed previous activeEventSource connection.");
    }

    activeEventSource = new EventSource("/stream3"); // creates a new EventSource connection to the "/stream" endpoint. activeEventSource is used for Server-Sent Events (SSE), allowing the server to push data to the client in real-time over a single, long-lived connection
    console.log(activeEventSource);

    activeEventSource.onmessage = function(event) { // eventhandler that will be called whenever a message is received from the server
        const data = JSON.parse(event.data); // parsed the received message data from JSON string format to a JavaScript object

        switch(data.type) { // switch statement to handle different types of messages (switch statement is used to handle different cases based on the value of a variable -> alternative to if-else statements)
            case 'delta': // if the message type is 'delta', it calls the handleDelta function
                handleDeltaRework(data.content);
                break;
            case 'complete': // if the message type is 'complete', it calls the handleComplete function
                handleCompleteRework(data.content);
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
};

function handleDeltaRework(content) {
    if (!content.component || !content.component.UIType) {
        console.warn("Invalid content structure:", content);
        return;
    }

    switch (content.component.UIType) {
        case "project":
            const project = content.component;

            if (!selectedComponent) {
                console.warn(`Project element not found for ID: ${project.name?.value}`);
                return;
            }

            const updateField = (selector, value) => {
                const element = selectedComponent.querySelector(selector);
                if (element) {
                    element.textContent = value;
                } else {
                    const newElement = document.createElement("div");
                    newElement.classList.add(selector.replace(".", ""));
                    newElement.textContent = value;
                    selectedComponent.appendChild(newElement);
                }
            };

            if (project.name && project.name.changed) {
                updateField(".project-name", project.name.value);
            }

            if (project.year && project.year.changed) {
                updateField(".project-year", project.year.value);
            }

            if (project.material && project.material.changed) {
                updateField(".project-material", project.material.value);
            }

            if (project.dimensions && project.dimensions.changed) {
                updateField(".project-dimensions", project.dimensions.value);
            }

            if (project.images && project.images.changed) {
                const imagesContainer = projectElement.querySelector(".project-images") || document.createElement("div");
                imagesContainer.classList.add("project-images");
                imagesContainer.innerHTML = ""; // Clear previous images

                project.images.value.forEach(imageUrl => {
                    const img = document.createElement("img");
                    img.src = imageUrl;
                    img.classList.add("project-image");
                    imagesContainer.appendChild(img);
                });

                if (!projectElement.contains(imagesContainer)) {
                    projectElement.appendChild(imagesContainer);
                }
            }

            if (project.description && project.description.changed) {
                updateField(".project-description", project.description.value.join(" "));
            }

            break;

        default:
            console.warn(`Unknown UIType: ${content.components.UIType}`);
            break;
    }
}

function handleCompleteRework(content) {
    console.log('handleCompleteRework', content);
}




// EVENT LISTENERS

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    userInput.addEventListener('focus', activateInput);
    userInput.addEventListener('blur', activateInput);
    userInput.addEventListener('input', inputAdded);

    sendButton.addEventListener('click', sendMessage);
});

function activateInput() {
    const bottomNavigation = document.getElementById('bottom-navigation');

    if (!bottomNavigation.classList.contains('input-active')) {
        bottomNavigation.classList.add('input-active');
    } else {
        bottomNavigation.classList.remove('input-active');
    }
}

function inputAdded() {
    const userInput = document.getElementById('user-input');
    const bottomNavigation = document.getElementById('bottom-navigation');
    if (userInput.value.length > 0) {
        // console.log('input more than 0');
        bottomNavigation.classList.add('input-has-content');
    } else {
        // console.log('input less than 0');
        bottomNavigation.classList.remove('input-has-content');
    }
}

