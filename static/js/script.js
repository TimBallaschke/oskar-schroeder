// --------------------------------------------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------------------------------------------

// CSS Variables
function getCSSVarValue(varName, fallback = 0) {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
        
    // If the value contains calc(), let the browser compute it
    if (value.includes('calc')) {
        // Create a temporary div to compute the calculated value
        const temp = document.createElement('div');
        temp.style.setProperty('visibility', 'hidden');
        temp.style.setProperty('position', 'absolute');
        temp.style.setProperty('height', value);
        document.body.appendChild(temp);
        
        // Get the computed height in pixels
        const computed = parseInt(getComputedStyle(temp).height);
        
        // Clean up
        document.body.removeChild(temp);
        
        return computed || fallback;
    }
    
    return parseInt(value) || fallback;
}

function setCSSVarValue(varName, value, unit = 'px') {
    document.documentElement.style.setProperty(varName, `${value}${unit}`);
}

// TABLES

function addTableHeadersMobile(appendDelay, animationDelay, row, headers, lastScrollHeight) {
    setCSSVarValue('--table-rows-amount', headers.length, '');

    headers.forEach(header => {
        const headerDiv = document.createElement('div');

        setTimeout(() => {
            headerDiv.classList.add('table-header', 'no-opacity', 'light');
            headerDiv.textContent = header;
            row.appendChild(headerDiv);

            const currentScrollHeight = row.scrollHeight;
            if (currentScrollHeight !== lastScrollHeight) {
                lastScrollHeight = currentScrollHeight;
                row.style.height = `${currentScrollHeight}px`;
            }
        }, appendDelay);

        setTimeout(() => {
            headerDiv.classList.remove('no-opacity', 'light');
        }, animationDelay);
    });
};

function createTableRow(tableContainer, rowId, rowContainer, row, isFirstRow, headers, lastScrollHeight) {
    return new Promise(resolve => {

        if (isFirstRow) {
            rowContainer = document.createElement('div');
            rowContainer.classList.add('table-row-container', 'no-width', 'no-padding');
            rowContainer.setAttribute('data-row-container-id', rowId);
        
            row = document.createElement('div');
            row.classList.add('table-row');
            row.setAttribute('data-row-id', rowId);
            console.log('create first row: ', row);

        
            rowContainer.appendChild(row);
            tableContainer.appendChild(rowContainer);

            setTimeout(() => {
                rowContainer.classList.remove('no-width');
            }, 10);

            setTimeout(() => {
                rowContainer.classList.remove('no-padding');
            }, animationDuration + 10);

            if (window.innerWidth < mobileWidth) {
                addTableHeadersMobile(animationDuration + 10, 1000, row, headers, lastScrollHeight);
                setTimeout(resolve, 1500);
            } else {
                setTimeout(resolve, 500);
            }

        } else {
            rowContainer = document.createElement('div');
            rowContainer.classList.add('table-row-container', 'no-padding');
            rowContainer.setAttribute('data-row-container-id', rowId);
        
            row = document.createElement('div');
            row.classList.add('table-row');
            row.setAttribute('data-row-id', rowId);
            console.log('create other row: ', row);

        
            rowContainer.appendChild(row);
            tableContainer.appendChild(rowContainer);

            setTimeout(() => {
                rowContainer.classList.remove('no-padding');
            }, 10);

            if (window.innerWidth < mobileWidth) {
                addTableHeadersMobile(10, 500, row, headers);
                setTimeout(resolve, 1000);
            } else {
                setTimeout(resolve, 10);
            }
        }
    });
}


// --------------------------------------------------------------------------------------------
// GLOBAL VARIABLES
// --------------------------------------------------------------------------------------------

const mobileWidth = 600;

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
let reworkRenderingQueue = [];  // Add this with other global variables
let isReworkProcessing = false; // Add this with other global variables
let reworkComplete = false;

const contentContainer = document.getElementById('content-container');
const versionHistory = document.getElementById('version-history');
const plusMinusButton = document.getElementById('plus-minus-button');
let animationDuration = getCSSVarValue('--animation-duration-1', 300);




// --------------------------------------------------------------------------------------------
// SENDING & RECEIVING MESSAGES
// --------------------------------------------------------------------------------------------

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
        const selectedComponent = document.querySelector('.selected');
        selectedComponent.classList.add('light');
        
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

                const button = selectedComponent.querySelector('.project-dot');
                console.log('button', button);
                if (button) {
                    closeButtonLine(button);

                    setTimeout(() => {
                        document.body.classList.remove('component-selected');
                        selectedComponent.classList.remove('selected');
                    }, animationDuration * 1.5);
                }

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
    }, 600);

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

    }, 800);


}




// --------------------------------------------------------------------------------------------
// HANDLE RESPONSE TYPES
// --------------------------------------------------------------------------------------------

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
                    processedComponents.set(componentID, new Map());
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

                        if (!componentMap.has('headers')) {
                            componentMap.set('headers', new Set());
                        }
                        
                        if (component.headers && Array.isArray(component.headers)) {
                            // Create headers container for larger screens
                            if (window.innerWidth > mobileWidth) {
                                let headersContainer = tableContainer.querySelector('.headers');
                                if (!headersContainer) {
                                    headersContainer = document.createElement('div');
                                    headersContainer.classList.add('headers');
                                    tableContainer.insertBefore(headersContainer, tableContainer.firstChild);
                                }

                                for (const header of component.headers) {
                                    if (!componentMap.get('headers').has(header)) {
                                        await new Promise(resolve => {
                                            componentMap.get('headers').add(header);
                                            const headerItem = document.createElement('div');
                                            headerItem.classList.add('header-item', 'light');
                                            headerItem.textContent = header;
                                            headersContainer.appendChild(headerItem);
    
                                            setTimeout(() => {
                                                headerItem.classList.remove('light');
                                            }, 10);

                                            setTimeout(resolve, 500);
                                        });
                                    }
                                };
                            } else {
                                // For smaller screens, just track headers without creating elements
                                for (const header of component.headers) {
                                    if (!componentMap.get('headers').has(header)) {
                                        componentMap.get('headers').add(header);
                                    }
                                };
                            }
                        }
                        
                        // As soon as the rows are received, add them to the componentMap
                        if (component.rows) {
                            // console.log('componentMap', componentMap);
                            for (const rowData of component.rows) {
                                if (Array.isArray(rowData) && rowData.length > 0) { // check if the rowData is an array and has at least one item
                                    // Use first item as unique identifier for the row
                                    const rowId = `row-${component.rows.indexOf(rowData)}`;
                                    const isFirstRow = component.rows.indexOf(rowData) === 0;
                                    const headers = Array.from(componentMap.get('headers'));

                                    if (!componentMap.has(rowId)) {
                                        componentMap.set(rowId, new Set());
                                    }
                                    
                                    // Create row if it doesn't exist
                                    let row = tableContainer.querySelector(`[data-row-id="${rowId}"]`);
                                    console.log('row initialize: ', row);
                                    let rowContainer = tableContainer.querySelector(`[data-row-container-id="${rowId}"]`);

                                    let lastScrollHeight = 0;

                                    if (!row) {
                                        console.log('row as argument: ', row);
                                        await createTableRow(tableContainer, rowId, rowContainer, row, isFirstRow, headers, lastScrollHeight);
                                    }

                                    // Add each item in the row
                                    for (const item of rowData) {
                                        if (!componentMap.get(rowId).has(item)) {
                                            await new Promise(resolve => {
                                                row = tableContainer.querySelector(`[data-row-id="${rowId}"]`);
                                                row.classList.add('animation-duration');
                                                componentMap.get(rowId).add(item);

                                                const rowItem = document.createElement('div');
                                                rowItem.classList.add('row-item');
                                                rowItem.style.gridRow = `${rowData.indexOf(item) + 1}`;
                                                row.appendChild(rowItem);

                                                const words = item.split(' ');
                                                let wordIndex = 0;

                                                function addNextWord() {
                                                    // As long as there is words left in the array of words
                                                    if (wordIndex < words.length) {
                                                        // Add space before word (except for first word)
                                                        if (wordIndex > 0) {
                                                            rowItem.appendChild(document.createTextNode(' '));
                                                        }

                                                        // Create span for the word
                                                        const wordSpan = document.createElement('span');
                                                        wordSpan.textContent = words[wordIndex];
                                                        wordSpan.classList.add('table-item-word', 'light', 'no-opacity');
                                                        rowItem.appendChild(wordSpan);

                                                        const currentScrollHeight = row.scrollHeight;
                                                        if (currentScrollHeight !== lastScrollHeight) {
                                                            lastScrollHeight = currentScrollHeight;
                                                            row.style.height = `${currentScrollHeight}px`;
                                                        }

                                                        // Remove light class after 10ms
                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('no-opacity');
                                                        }, 100);

                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('light');
                                                        }, 200);

                                                        wordIndex++;
                                                        // Add small delay between words
                                                        setTimeout(addNextWord, 100);
                                                    } else {
                                                        resolve();
                                                    }    
                                                }

                                                addNextWord();
                                            });
                                        }
                                    }
                                }
                            };
                        }
                        break;

                    case 'projects_list':
                        let projectsContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!projectsContainer) {
                            projectsContainer = document.createElement('div');
                            projectsContainer.classList.add('projects-container');
                            projectsContainer.setAttribute('data-component-key', componentID);
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
                                                container: projectsContainer,
                                                index: component.projects.indexOf(project)
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
                                                container: projectsContainer,
                                                index: component.projects.indexOf(project)
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
                                        container: projectsContainer,
                                        index: component.projects.indexOf(project)
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
            const { id, key, value, container, index } = projectRenderingQueue.shift();

            // console.log(`Rendering ${key} for project: ${id}`);
            let projectItem = document.querySelector(`[data-project-id="${id}"]`);

            if (container.classList.contains('grid')) {

                let leftColumnGrid = container.querySelector('.left-column-grid');
                let rightColumnGrid = container.querySelector('.right-column-grid');
                
                if (!leftColumnGrid) {
                    leftColumnGrid = document.createElement('div');
                    leftColumnGrid.classList.add('left-column-grid');
                    container.appendChild(leftColumnGrid);
                }

                if (!rightColumnGrid) {
                    rightColumnGrid = document.createElement('div');
                    rightColumnGrid.classList.add('right-column-grid');
                    container.appendChild(rightColumnGrid);
                }

                switch (key) {
                    case 'UIType':
                        if (index === 0 || index === 1) {
                            await new Promise((resolve) => {
                                if (!projectItem) {
                                    
                                    projectItem = document.createElement('div');
                                    projectItem.classList.add('project', 'no-width', 'no-padding');
                                    projectItem.setAttribute('data-project-id', id);

                                    // Append to left column if index is even (including 0), right column if odd
                                    if (index % 2 === 0) {
                                        leftColumnGrid.appendChild(projectItem);
                                    } else {
                                        rightColumnGrid.appendChild(projectItem);
                                    } 

                                    setTimeout(() => {
                                        projectItem.classList.remove('no-width');
                                    }, 10);
                                }
        
                                setTimeout(resolve, 310);
                            });
                        } else {
                            await new Promise((resolve) => {
                                if (!projectItem) {
                                    projectItem = document.createElement('div');
                                    projectItem.classList.add('project', 'no-padding');
                                    projectItem.setAttribute('data-project-id', id);

                                    if (index % 2 === 0) {
                                        leftColumnGrid.appendChild(projectItem);
                                    } else {
                                        rightColumnGrid.appendChild(projectItem);
                                    }
                                }
                                setTimeout(resolve, 10);
                            });
                        }
                        break;
                    case 'name':
                        await new Promise((resolve) => {        
                            // Check if the element already exists to avoid duplicates
                            let element = projectItem.querySelector(`.project-${key}`);
                            if (!element) {
                                const projectInfo = document.createElement('div');
                                projectInfo.classList.add('project-information', 'no-height', 'no-padding');
                                projectItem.appendChild(projectInfo);
            
                                setTimeout(() => {
                                    projectItem.classList.remove('no-padding');
                                    projectInfo.classList.remove('no-height');
                                    // element.classList.remove('no-height');
                                }, 10);

                                setTimeout(() => {
                                    element = document.createElement('div');  // Correctly create the element
                                    element.classList.add(`project-${key}`, 'no-height', 'light');
                                    element.textContent = value;
                                    projectInfo.appendChild(element);
                                }, animationDuration + 10);

                                setTimeout(() => {
                                    element.classList.remove('light');
                                }, animationDuration + 20);
    
                            } else {
                                // Update the content if it already exists (optional)
                                element.textContent = value;
                            }
            
                            setTimeout(resolve, animationDuration + 200);
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
                            setTimeout(resolve, 100);
                        });
                        break;
                    case 'material':
                        await new Promise((resolve) => { 
                            let projectInfo = projectItem.querySelector('.project-information');
    
                            // Check if the element already exists to avoid duplicates
                            let element = projectInfo.querySelector('.project-material');
                            if (!element) {
                                element = document.createElement('div');  // Correctly create the element
                                element.classList.add('project-material', 'light');
                                element.textContent = value;
                                projectInfo.appendChild(element);
    
                                setTimeout(() => {
                                    element.classList.remove('light');
                                }, 10);
                            } else {
                                // Update the content if it already exists (optional)
                                element.textContent = value;
                            }
            
                            setTimeout(resolve, 100);
                        });
                        break;
                    case 'dimensions':
                        await new Promise((resolve) => {
                            let projectInfo = projectItem.querySelector('.project-information');
    
                            // Check if the element already exists to avoid duplicates
                            let element = projectInfo.querySelector('.project-dimensions');
                            if (!element) {
                                element = document.createElement('div');  // Correctly create the element
                                element.classList.add('project-dimensions', 'light');
                                element.textContent = value;
                                projectInfo.appendChild(element);
    
                                setTimeout(() => {
                                    element.classList.remove('light');
                                }, 10);
                            } else {
                                // Update the content if it already exists (optional)
                                element.textContent = value;
                            }
            
                            setTimeout(resolve, 100);
                        });
                        break;
                    case 'images':
                        await new Promise((resolve) => {
                            let imageContainer = projectItem.querySelector('.project-images');
                            let projectInfo = projectItem.querySelector('.project-information');
    
                            if (!imageContainer) {
                                imageContainer = document.createElement('div');
                                imageContainer.classList.add('project-images', 'no-height', 'no-margin', 'blur', 'no-opacity');
                                projectItem.appendChild(imageContainer);
                                const imageCounter = document.createElement('div');
                                imageCounter.classList.add('image-counter', 'no-height', 'no-width');
    
                                setTimeout(() => {
                                    imageContainer.classList.remove('no-height', 'no-margin');
                                    projectInfo.classList.remove('no-padding');
                                }, 10);
    
                                setTimeout(() => {
                                    imageContainer.classList.remove('blur', 'no-opacity');
                                    projectInfo.appendChild(imageCounter);
                                }, 610);
            
                                setTimeout(() => {
                                        // Create new span for digits
                                        const digitsSpan = document.createElement('span');
                                        digitsSpan.classList.add('image-counter-digits', 'light');
                                        digitsSpan.innerHTML = '01/01';
                                        
                                        // Append digits span to counter
                                        imageCounter.appendChild(digitsSpan);
                                }, 610);    

                                setTimeout(resolve, 920);
                            } else {
                                setTimeout(resolve, 10);
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
    
                                        // Update the digits span with new total
                                        const digitsSpan = projectInfo.querySelector('.image-counter-digits');
                                        const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                        const currentIndex = Math.round(imageContainer.scrollLeft / imageContainer.offsetWidth);
                                        if (digitsSpan) {
                                            digitsSpan.innerHTML = `${(currentIndex + 1).toString().padStart(2, '0')}/${totalImages.toString().padStart(2, '0')}`;
                                        }
                                    };
                                }
                            });                                
                        });
                        break;
                    case 'description':
                        // await new Promise((resolve) => {
                        //     let projectDescription = projectItem.querySelector('.project-description');
    
                        //     async function createProjectDescription() {
                        //         if (!projectDescription) {
                        //             await new Promise((descriptionResolve) => {
                        //                 projectDescription = document.createElement('div');
                        //                 projectDescription.classList.add('project-description', 'no-padding');
                        //                 projectItem.appendChild(projectDescription);
                            
                        //                 setTimeout(() => {
                        //                     projectDescription.classList.remove('no-padding');
                        //                 }, 10);
    
                        //                 setTimeout(descriptionResolve, 210);
                        //             });
                        //         }
                        //     };
                    
                        //     async function addSentences() {
    
                        //         // Create a single paragraph for all sentences
                        //         const paragraphElement = document.createElement('p');
                        //         paragraphElement.classList.add('project-description-paragraph');
                        //         projectDescription.appendChild(paragraphElement);
    
                        //         // Process each sentence
                        //         for (const sentence of value) {
                        //             const safeSentence = btoa(encodeURIComponent(sentence));
                                    
                        //             // Only process if this sentence hasn't been added yet
                        //             if (!projectDescription.querySelector(`[data-sentence="${safeSentence}"]`)) {
                        //                 await new Promise((sentenceResolve) => {
                        //                     // Add space between sentences if not the first sentence
                        //                     if (paragraphElement.childNodes.length > 0) {
                        //                         paragraphElement.appendChild(document.createTextNode(' '));
                        //                     }
    
                        //                     // Create a span to group the sentence (optional, for tracking)
                        //                     const sentenceSpan = document.createElement('span');
                        //                     sentenceSpan.setAttribute('data-sentence', safeSentence);
                        //                     paragraphElement.appendChild(sentenceSpan);
    
                        //                     // Split sentence into words and add them one by one
                        //                     const words = sentence.split(' ');
                        //                     let wordIndex = 0;
    
                        //                     let lastScrollHeight = projectDescription.scrollHeight;
    
                        //                     function addNextWord() {
                        //                         if (wordIndex < words.length) {
                        //                             // Add space before word (except for first word)
                        //                             if (wordIndex > 0) {
                        //                                 sentenceSpan.appendChild(document.createTextNode(' '));
                        //                             }
                                                    
                        //                             // Create span for the word
                        //                             const wordSpan = document.createElement('span');
                        //                             wordSpan.textContent = words[wordIndex];
                        //                             wordSpan.classList.add('project-description-word', 'light', 'no-opacity');
                        //                             sentenceSpan.appendChild(wordSpan);
    
                        //                             // adjust the height of the project description for smooth animation of increasing height
                        //                             const currentScrollHeight = projectDescription.scrollHeight;
                        //                             if (currentScrollHeight !== lastScrollHeight) {
                        //                                 console.log('ScrollHeight changed:', currentScrollHeight);
                        //                                 lastScrollHeight = currentScrollHeight;
                        //                                 projectDescription.style.height = `${currentScrollHeight}px`;
                        //                             }
    
                        //                             setTimeout(() => {
                        //                                 wordSpan.classList.remove('light');
                        //                                 wordSpan.classList.remove('no-opacity');
                        //                             }, 50);
    
                        //                             wordIndex++;
                        //                             setTimeout(addNextWord, 50);
                        //                         } else {
                        //                             console.log('sentenceResolve');
                        //                             sentenceResolve();
                        //                         }
                        //                     }
    
                        //                     addNextWord();
                        //                 });
                        //             }
                        //         }
                        //     }
    
                        //     // Call the async function and resolve when complete
                        //     createProjectDescription().then(() => addSentences().then(() => resolve()));
                        // });
                        // break;
                }
            } else {
                switch (key) {
                    case 'UIType':
                        if (index === 0) {
                            await new Promise((resolve) => {
                                if (!projectItem) {
                                    projectItem = document.createElement('div');
                                    projectItem.classList.add('project', 'no-width');
                                    projectItem.setAttribute('data-project-id', id);
                                    container.appendChild(projectItem);
        
                                    setTimeout(() => {
                                        projectItem.classList.remove('no-width');
                                    }, 10);
                                }
        
                                setTimeout(resolve, 410);
                            });
                        } else {
                            await new Promise((resolve) => {
                                if (!projectItem) {
                                    projectItem = document.createElement('div');
                                    projectItem.classList.add('project');
                                    projectItem.setAttribute('data-project-id', id);
                                    container.appendChild(projectItem);
                                }
                                setTimeout(resolve, 10);
                            });
                        }
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
    
                                dot.addEventListener('click', () => {
                                    selectComponent(dot, projectItem);
                                });
    
                                projectInfo.appendChild(dotContainer);
                                projectItem.appendChild(projectInfo);
    
                                setTimeout(() => {
                                    projectInfo.classList.remove('no-padding');
                                    dotContainer.classList.remove('no-height');
                                }, 100);
    
                                setTimeout(() => {
                                    dotContainer.appendChild(dot);
                                }, 500);
    
                                setTimeout(() => {
                                    dot.classList.remove('small');
                                }, 510);
    
                                setTimeout(() => {
                                    element = document.createElement('div');  // Correctly create the element
                                    element.classList.add(`project-${key}`, 'light');
                                    element.textContent = value;
                                    projectInfo.appendChild(element);
                                }, 900);
    
                                setTimeout(() => {
                                    element.classList.remove('light');
                                }, 1000);
                            } else {
                                // Update the content if it already exists (optional)
                                element.textContent = value;
                            }
            
                            setTimeout(resolve, 1100);
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
                        await new Promise((resolve) => { 
                            let projectInfo = projectItem.querySelector('.project-information');
    
                            // Check if the element already exists to avoid duplicates
                            let element = projectInfo.querySelector('.project-material-dimensions');
                            if (!element) {
                                element = document.createElement('div');  // Correctly create the element
                                element.classList.add('project-material-dimensions', 'light');
                                element.textContent = value;
                                projectInfo.appendChild(element);
    
                                setTimeout(() => {
                                    element.classList.remove('light');
                                }, 10);
                            } else {
                                // Update the content if it already exists (optional)
                                element.textContent = value;
                            }
            
                            setTimeout(resolve, 50);
                        });
                        break;
                    case 'dimensions':
                        await new Promise((resolve) => {
                            let projectInfo = projectItem.querySelector('.project-information');
                            const projectMaterialDimensions = projectInfo.querySelector('.project-material-dimensions');
    
                            if (projectMaterialDimensions) {
                                let dimensionsSpan = projectMaterialDimensions.querySelector('.project-dimensions');
                                if (!dimensionsSpan) {
                                    dimensionsSpan = document.createElement('span');
                                    dimensionsSpan.classList.add('project-dimensions', 'light');
                                    dimensionsSpan.textContent = `, ${value}`;
                                    projectMaterialDimensions.appendChild(dimensionsSpan);
    
                                    setTimeout(() => {
                                        dimensionsSpan.classList.remove('light');
                                    }, 10);
                                } else {
                                    // Update existing year span
                                    dimensionsSpan.textContent = ` (${value})`;
                                }
                            }
                            setTimeout(resolve, 50);
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
                                const imageCounter = document.createElement('div');
                                imageCounter.classList.add('image-counter', 'no-height', 'no-width');
    
                                setTimeout(() => {
                                    imageContainer.classList.remove('no-height');
                                }, 100);
    
                                setTimeout(() => {
                                    imageContainer.classList.remove('blur', 'no-opacity');
                                    projectInfo.appendChild(imageCounter);
                                }, 800);
    
                                setTimeout(() => {
                                    imageCounter.classList.remove('no-height');
                                }, 1300);
    
                                setTimeout(() => {
                                    imageCounter.classList.remove('no-width');
                                }, 1500);
    
                                setTimeout(() => {
                                        
                                        // Create new span for digits
                                        const digitsSpan = document.createElement('span');
                                        digitsSpan.classList.add('image-counter-digits', 'light');
                                        digitsSpan.innerHTML = '01/01';  // Changed to just show '0'
                                        
                                        // Append digits span to counter
                                        imageCounter.appendChild(digitsSpan);
                                }, 1600);
    
                                setTimeout(() => {
    
                                    const digitsSpan = projectInfo.querySelector('.image-counter-digits');
                                    digitsSpan.classList.remove('light');
    
                                    // Add scroll event listener to update counter after counter is created
                                    imageContainer.addEventListener('scroll', () => {
                                        const scrollPosition = imageContainer.scrollLeft;
                                        const imageWidth = imageContainer.offsetWidth;
                                        const currentIndex = Math.round(scrollPosition / imageWidth);
                                        const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                        
                                        if (digitsSpan) {
                                            digitsSpan.innerHTML = `${(currentIndex + 1).toString().padStart(2, '0')}/${totalImages.toString().padStart(2, '0')}`;
                                        }
                                    });
                                }, 1650);
    
                                setTimeout(resolve, 1700);
                            } else {
                                setTimeout(resolve, 300);
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
    
                                        // Update the digits span with new total
                                        const digitsSpan = projectInfo.querySelector('.image-counter-digits');
                                        const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                        const currentIndex = Math.round(imageContainer.scrollLeft / imageContainer.offsetWidth);
                                        if (digitsSpan) {
                                            digitsSpan.innerHTML = `${(currentIndex + 1).toString().padStart(2, '0')}/${totalImages.toString().padStart(2, '0')}`;
                                        }
                                    };
                                }
                            });                                
                        });
                        break;
                    case 'description':
                        await new Promise((resolve) => {
                            let projectDescription = projectItem.querySelector('.project-description');
    
                            async function createProjectDescription() {
                                if (!projectDescription) {
                                    await new Promise((descriptionResolve) => {
                                        projectDescription = document.createElement('div');
                                        projectDescription.classList.add('project-description', 'no-padding');
                                        projectItem.appendChild(projectDescription);
                            
                                        setTimeout(() => {
                                            projectDescription.classList.remove('no-padding');
                                        }, 10);
    
                                        setTimeout(descriptionResolve, 210);
                                    });
                                }
                            };
                    
                            async function addSentences() {
    
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
    
                                            let lastScrollHeight = projectDescription.scrollHeight;
    
                                            function addNextWord() {
                                                if (wordIndex < words.length) {
                                                    // Add space before word (except for first word)
                                                    if (wordIndex > 0) {
                                                        sentenceSpan.appendChild(document.createTextNode(' '));
                                                    }
                                                    
                                                    // Create span for the word
                                                    const wordSpan = document.createElement('span');
                                                    wordSpan.textContent = words[wordIndex];
                                                    wordSpan.classList.add('project-description-word', 'light', 'no-opacity');
                                                    sentenceSpan.appendChild(wordSpan);
    
                                                    // adjust the height of the project description for smooth animation of increasing height
                                                    const currentScrollHeight = projectDescription.scrollHeight;
                                                    if (currentScrollHeight !== lastScrollHeight) {
                                                        console.log('ScrollHeight changed:', currentScrollHeight);
                                                        lastScrollHeight = currentScrollHeight;
                                                        projectDescription.style.height = `${currentScrollHeight}px`;
                                                    }
    
                                                    setTimeout(() => {
                                                        wordSpan.classList.remove('light');
                                                        wordSpan.classList.remove('no-opacity');
                                                    }, 50);
    
                                                    wordIndex++;
                                                    setTimeout(addNextWord, 50);
                                                } else {
                                                    console.log('sentenceResolve');
                                                    sentenceResolve();
                                                }
                                            }
    
                                            addNextWord();
                                        });
                                    }
                                }
                            }
    
                            // Call the async function and resolve when complete
                            createProjectDescription().then(() => addSentences().then(() => resolve()));
                        });
                        break;
                }
            }
        }
    } finally {
        // console.log('Project rendering completed');
        isProjectRendering = false;
            if (projectRenderingQueue.length === 0) {
        console.log('projectRenderingQueue is empty');
    }
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






// --------------------------------------------------------------------------------------------
// VERSION HISTORY
// --------------------------------------------------------------------------------------------

// updating the version history
function handleVersionHistoryUpdate(content) {

    versionHistory.classList.remove('version-history-width-set');

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

    setTimeout(() => {
        const currentWidth = versionHistory.offsetWidth + 1;
        setCSSVarValue('--version-history-width', currentWidth);

        versionHistory.classList.add('version-history-width-set');
        
    }, 500);
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



// --------------------------------------------------------------------------------------------
// COMPONENT REWORK
// --------------------------------------------------------------------------------------------

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

async function handleDeltaRework(content) {
    console.log('handleDeltaRework', content);
    reworkRenderingQueue.push(content);

    if (isReworkProcessing) {
        return; // Exit if already processing
    }

    while (reworkRenderingQueue.length > 0) {
        try {
            isReworkProcessing = true;
            const currentContent = reworkRenderingQueue.shift();

            if (!currentContent.component || !currentContent.component.UIType) {
                console.warn("Invalid content structure:", currentContent);
                continue;
            }

            switch (currentContent.component.UIType) {
                case "project":
                    const project = currentContent.component;

                    if (!selectedComponent) {
                        console.warn(`Project element not found for ID: ${project.name?.value}`);
                        continue;
                    }

                    const updateField = (selector, value) => {
                        const element = selectedComponent.querySelector(selector);
                        if (element) {
                            element.textContent = value;
                        } else {
                            // Only create new element if selector exists in the original component structure
                            const selectorExists = selectedComponent.querySelector(selector.split('.')[1]);
                            if (selectorExists) {
                                const newElement = document.createElement("div");
                                newElement.classList.add(selector.replace(".", ""));
                                newElement.textContent = value;
                                selectedComponent.appendChild(newElement);
                            } else {
                                console.warn(`Element with selector ${selector} not found in component structure`);
                            }
                        }
                    };

                    if (project.name && project.name.changed) {
                        await updateField(".project-name", project.name.value);
                    }

                    if (project.year && project.year.changed) {
                        await updateField(".project-year", project.year.value);
                    }

                    if (project.material && project.material.changed) {
                        await updateField(".project-material", project.material.value);
                    }

                    if (project.dimensions && project.dimensions.changed) {
                        await updateField(".project-dimensions", project.dimensions.value);
                    } else {
                        const dimensionsElement = selectedComponent.querySelector('.project-dimensions');
                        if (dimensionsElement) {
                            dimensionsElement.classList.remove('light');
                        }
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

                        if (!selectedComponent.contains(imagesContainer)) {
                            selectedComponent.appendChild(imagesContainer);
                        }
                    }

                    if (project.description?.changed && Array.isArray(project.description.value)) {
                        let projectDescription = selectedComponent.querySelector('.project-description');
                        if (!projectDescription) {
                            await new Promise((resolveDescription) => {
                                projectDescription = document.createElement('div');
                                projectDescription.classList.add('project-description', 'no-padding');
                                selectedComponent.appendChild(projectDescription);

                                setTimeout(() => {
                                    projectDescription.classList.remove('no-padding');
                                }, 10);
                                setTimeout(resolveDescription, 210);
                            });
                        }

                        // Ensure the processed descriptions are tracked
                        if (!selectedComponent.processedDescriptions) {
                            selectedComponent.processedDescriptions = new Set();
                            console.log('processedDescriptions', selectedComponent);
                        }

                        for (const sentence of project.description.value) {
                            console.log('sentence', sentence);
                            if (!selectedComponent.processedDescriptions.has(sentence)) {
                                selectedComponent.processedDescriptions.add(sentence);

                                await new Promise(resolveSentence => {
                                    console.log('resolveSentence');
                                    const sentenceContainer = document.createElement('p');
                                    sentenceContainer.classList.add('project-description-paragraph');
                                    projectDescription.appendChild(sentenceContainer);

                                    const words = sentence.split(' ');
                                    let wordIndex = 0;

                                    let lastScrollHeight = projectDescription.scrollHeight;

                                    function addNextWord() {
                                        if (wordIndex < words.length) {
                                            if (wordIndex > 0) {
                                                sentenceContainer.appendChild(document.createTextNode(' '));
                                            }

                                            const wordSpan = document.createElement('span');
                                            wordSpan.textContent = words[wordIndex];
                                            wordSpan.classList.add('project-description-word', 'light', 'no-opacity');
                                            sentenceContainer.appendChild(wordSpan);

                                            // Check if scrollHeight has changed
                                            const currentScrollHeight = projectDescription.scrollHeight;
                                            if (currentScrollHeight !== lastScrollHeight) {
                                                lastScrollHeight = currentScrollHeight;
                                                projectDescription.style.height = `${currentScrollHeight}px`;
                                            }

                                            setTimeout(() => {
                                                wordSpan.classList.remove('light');
                                                wordSpan.classList.remove('no-opacity');
                                            }, 50);

                                            wordIndex++;
                                            setTimeout(addNextWord, 50);
                                        } else {
                                            resolveSentence();
                                        }
                                    }
                                    addNextWord();
                                });
                            }
                        }
                    }
                    break;

                default:
                    console.warn(`Unknown UIType: ${currentContent.component.UIType}`);
                    break;
            }
        } catch (error) {
            console.error("Error processing rework content:", error);
        } finally {
            isReworkProcessing = false;
            setTimeout(() => {
                if (reworkRenderingQueue.length === 0 && reworkComplete) {
                    reworkComplete = false;
                    console.log('reworkRenderingQueue.length === 0');
                    // Remove 'light' class from selected component
                    if (selectedComponent) {
                        selectedComponent.classList.remove('light');
                    }
                }
            }, 2500);
        }
    }
}

function handleCompleteRework(content) {
    console.log('handleCompleteRework', content);
    reworkComplete = true;


}

// --------------------------------------------------------------------------------------------
// SELECT COMPONENT
// --------------------------------------------------------------------------------------------

// const projectButton = document.querySelectorAll('.project-dot');

// projectButton.forEach(button => {
//     button.addEventListener('click', () => {
//         openProjectLine(button);
//     });
// });

function selectComponent(button, element) {
    if (!document.body.classList.contains('component-selected')) {
        document.body.classList.add('component-selected');
        element.classList.add('selected');

        getComponentData(element);
        setTimeout(() => {
            openButtonLine(button);
        }, animationDuration * 1.5);

    } else {
        closeButtonLine(button);

        setTimeout(() => {
            document.body.classList.remove('component-selected');
            element.classList.remove('selected');
        }, animationDuration * 1.5);
    }
}

function openButtonLine(button) {
    const buttonRect = button.getBoundingClientRect();
    const linePadding = 20;
    const lineBottom = getCSSVarValue('--project-line-bottom');
    const lineTop = buttonRect.bottom + linePadding;
    const lineHeight = window.innerHeight - buttonRect.bottom - lineBottom - linePadding;

    const projectLine = document.createElement('div');
    projectLine.classList.add('project-line', 'no-height', 'top-fixed');
    
    setCSSVarValue('--project-line-height', lineHeight);
    setCSSVarValue('--project-line-top', lineTop);
    
    contentContainer.appendChild(projectLine);
    document.body.classList.add('no-scroll');

    setTimeout(() => {
        projectLine.classList.remove('no-height');
    }, 10);

    setTimeout(() => {
        document.body.classList.remove('no-scroll');
        projectLine.classList.remove('top-fixed');
        projectLine.classList.add('no-transition');
    }, animationDuration + 10);

    const updateLineHeight = () => {

        const newButtonRect = button.getBoundingClientRect();
        const newLineHeight = Math.abs(window.innerHeight - newButtonRect.bottom - lineBottom - linePadding);

        if (newButtonRect.bottom >= window.innerHeight - lineBottom) {
            projectLine.classList.add('rotate');
        } else {
            projectLine.classList.remove('rotate');
        }

        setCSSVarValue('--project-line-height', newLineHeight);
        setCSSVarValue('--project-line-top', newButtonRect.bottom - linePadding);
    };

    window.addEventListener('scroll', updateLineHeight);

    // Store reference to allow removal in closeButtonLine
    button.updateLineHeight = updateLineHeight;
}

function closeButtonLine(button) {
    const buttonRect = button.getBoundingClientRect();
    const linePadding = 20;
    const lineBottom = getCSSVarValue('--project-line-bottom');
    const lineTop = buttonRect.bottom + linePadding;
    const lineHeight = window.innerHeight - buttonRect.bottom - lineBottom - linePadding;
    const projectLine = document.querySelector('.project-line');

    if (!projectLine) return; // Guard clause in case projectLine doesn't exist

    if (button.updateLineHeight) {
        window.removeEventListener('scroll', button.updateLineHeight);
        button.updateLineHeight = null;
    }

    document.body.classList.add('no-scroll');
    projectLine.classList.remove('no-transition');

    setCSSVarValue('--project-line-height', lineHeight);
    setCSSVarValue('--project-line-top', lineTop);
    
    projectLine.classList.add('top-fixed');

    setTimeout(() => {
        projectLine.classList.add('no-height');
    }, 10);

    setTimeout(() => {
        document.body.classList.remove('no-scroll');
        if (projectLine && projectLine.parentNode) {
            projectLine.parentNode.removeChild(projectLine);
        }
    }, animationDuration + 10);
}

    
// Find the project data in responseMap
function getComponentData(element) {
    const projectId = element.getAttribute('data-project-id');
    for (const response of Object.values(responseMap)) {
        if (response.components) {
            for (const component of response.components) {
                if (component.UIType === 'projects_list' && component.projects) {
                    const project = component.projects.find(p => p.name === projectId);
                    if (project) {
                        selectedComponentJSON = JSON.stringify(project); // Stringify the project object
                        selectedComponent = element;
                        console.log('selectedComponent', selectedComponent);
                        break;
                    }
                }
            }
        }
    }
}




// --------------------------------------------------------------------------------------------
// PROMPT PROPOSALS
// --------------------------------------------------------------------------------------------

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




// --------------------------------------------------------------------------------------------
// EVENT LISTENERS
// --------------------------------------------------------------------------------------------

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

