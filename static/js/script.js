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

function getRandomInt() {
    const options = [1, 2, 3].filter(n => n !== numberExclude);
    return options[Math.floor(Math.random() * options.length)];
}




// TABLES

function addTableHeaders(appendDelay, animationDelay, row, headers, lastScrollHeight) {

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

        const lightWidth = headerDiv.getBoundingClientRect().width;
        headerDiv.style.display = 'inline-block';
        headerDiv.style.width = `${lightWidth}px`;

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
        
            rowContainer.appendChild(row);
            tableContainer.appendChild(rowContainer);

            setTimeout(() => {
                rowContainer.classList.remove('no-width');
            }, 10);

            setTimeout(() => {
                rowContainer.classList.remove('no-padding');
            }, animationDuration + 10);

            addTableHeaders(animationDuration + 10, 1000, row, headers, lastScrollHeight);
            setTimeout(resolve, 1500);
            

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

            addTableHeaders(10, 500, row, headers);
            setTimeout(resolve, 600);
        }
    });
}

async function processImageQueue() {
    if (isImageQueueProcessing || imageQueue.length === 0) return;
    isImageQueueProcessing = true;

    try {
        while (imageQueue.length > 0) {
            await new Promise((resolve) => {
                const queueImage = imageQueue.shift();
                const imageURL = queueImage.url;
                const imageCaption = queueImage.caption;

                let imageContainer;

                // Check if the last element is an image container otherwise create a new one
                const previousElement = contentContainer.lastElementChild;
                if (!previousElement || !previousElement.classList.contains('image-container')) {
                    imageContainer = document.createElement('div');
                    imageContainer.classList.add('image-container');
                } else {
                    imageContainer = previousElement;
                }
        
                const paragraphImage = document.createElement('div');
                paragraphImage.classList.add('paragraph-image', 'no-width');
        
                // Create and add the image element
                const image = document.createElement('img');
                image.classList.add('no-opacity', 'blur');
                image.src = imageURL;
                

                const captionContainer = document.createElement('div');
                captionContainer.classList.add('image-caption');
                
                const words = imageCaption.split(' ');
                words.forEach(word => {
                    const wordSpan = document.createElement('span');
                    wordSpan.textContent = word + ' ';
                    wordSpan.classList.add('caption-word', 'no-opacity', 'light');
                    captionContainer.appendChild(wordSpan);
                });
                
                // Different order of adding elements based on mobile or desktop
                if(window.innerWidth <= mobileWidth) {
                    paragraphImage.appendChild(image);
                    paragraphImage.appendChild(captionContainer);
                } else {
                    paragraphImage.appendChild(captionContainer);
                    paragraphImage.appendChild(image);
                }

                imageContainer.appendChild(paragraphImage);
                contentContainer.appendChild(imageContainer);
        
                // Wait for image to load before removing no-width class
                image.onload = () => {
                    setTimeout(() => {
                        paragraphImage.classList.remove('no-width');
                    }, 10);
        
                    setTimeout(() => {
                        paragraphImage.style.height = `${paragraphImage.scrollHeight}px`;
                    }, 550);

                    setTimeout(() => {
                        image.classList.remove('no-opacity');
                    }, 1300);

                    setTimeout(() => {
                        image.classList.remove('blur');
                    }, 1700);

                    setTimeout(() => {
                        const captionWords = captionContainer.querySelectorAll('.caption-word');
                        let wordIndex = 0;


                        function revealNextWord() {
                            if (wordIndex < captionWords.length) {
                                captionWords[wordIndex].classList.remove('no-opacity', 'light');

                                wordIndex++;
                                setTimeout(revealNextWord, 50);
                            } else  {
                                resolve();
                            }
                        }

                        revealNextWord();

                    }, 1900);
                };
            });
        }
    } finally {
        isImageQueueProcessing = false;
    }
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
let responseCount = 1;
let projectRenderingQueue = [];
let isProjectRendering = false;

let selectedComponent = null;
let selectedComponentJSON = null;
let reworkRenderingQueue = [];  // Add this with other global variables
let isReworkProcessing = false; // Add this with other global variables
let reworkComplete = false;
let isStreaming = false;
let placeholderAnimationActive = true;

// Websearch
let isWebsearchStreamingURL = false;
let websearchBuffer = '';
let websearchWordQueue = [];
let isWebsearchContainerProcessing = false;
let isProcessingWebsearchWords = false;
let currentWebsearchTerm = null;
const webSearchColumn = document.querySelector('.websearch-column');

const userInput = document.getElementById('user-input');

const contentContainer = document.getElementById('content-container');
const plusMinusButton = document.getElementById('plus-minus-button');
let animationDuration = getCSSVarValue('--animation-duration-1', 300);

//Version History
const versionHistory = document.getElementById('version-history');
let lastScrollY = window.scrollY;
let scrolling = false;
const thresholdScroll = 10;
let versionHistoryScrollTimeout;
let headlineProcessed = false;
let displayVersionOnHoverTimeout;

// Handle Delta
// Paragraphs
let previousParagraphContainer;
let previousPreviousParagraphContainer;
let imageQueue = [];
let isImageQueueProcessing = false;
let termDescriptionCount = 0;
let paragraphContainerCount = 0;
let numberExclude = 0;



// --------------------------------------------------------------------------------------------
// INPUTBAR
// --------------------------------------------------------------------------------------------

function activateInput() {
    const bottomNavigation = document.getElementById('bottom-navigation');

    if (!bottomNavigation.classList.contains('input-active')) {
        bottomNavigation.classList.add('input-active');
    } else {
        bottomNavigation.classList.remove('input-active');
    }
}

function inputAdded() {
    const bottomNavigation = document.getElementById('bottom-navigation');
    if (userInput.value.length > 0) {
        if (!bottomNavigation.classList.contains('input-has-content-2')) {
            bottomNavigation.classList.add('input-has-content-1');

            setTimeout(() => {
                bottomNavigation.classList.remove('input-has-content-1');
                bottomNavigation.classList.add('input-has-content-2');
            }, 100);
        }
    } else {
        // console.log('input less than 0');
        bottomNavigation.classList.remove('input-has-content-2');
        bottomNavigation.classList.add('input-has-content-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('input-has-content-1');
        }, 100);
    }
}

function displayXButton() {
    const bottomNavigation = document.getElementById('bottom-navigation');
    const xButton = document.getElementById('x-button');

     if (bottomNavigation.classList.contains('input-has-content-2')) {

        bottomNavigation.classList.remove('input-has-content-2');
        bottomNavigation.classList.add('input-has-content-1');

        bottomNavigation.classList.add('streaming-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('input-has-content-1');

            bottomNavigation.classList.remove('streaming-1');
            bottomNavigation.classList.add('streaming-2');
        }, 100);
     } else {
        xButton.classList.add('rotate');
        bottomNavigation.classList.remove('streaming-2');
        bottomNavigation.classList.add('streaming-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('streaming-1');
        }, 100);

        setTimeout(() => {
            xButton.classList.remove('rotate');
        }, 500);
     }
}

function startStreamingAnimation() {
    startAnimateInput();
    displayXButton();
};

function stopStreamingAnimation() {
    stopAnimateInput();
}

function startAnimateInput() {

    placeholderAnimationActive = false;

    if (userInput.inputAnimationInterval) {
        clearInterval(userInput.inputAnimationInterval);
    }

    userInput.classList.remove('light-nav');

    userInput.inputAnimationInterval = setInterval(() => {
        
        if (userInput.classList.contains('light')) {
            userInput.classList.remove('light');
        } else {
            userInput.classList.add('light');
        }

    }, 1000);
}

function stopAnimateInput() {
    if (userInput.classList.contains('light')) {
        if (userInput.inputAnimationInterval) {
            clearInterval(userInput.inputAnimationInterval);
        }
        userInput.classList.remove('light');
        userInput.classList.add('light-nav', 'animation-settings-2');

        setTimeout(() => {
            userInput.classList.add('no-opacity');
        }, 300);

        setTimeout(() => {
            userInput.value = '';
            displayXButton();
            userInput.classList.remove('no-opacity');
        }, 500);

        setTimeout(() => {
            userInput.classList.remove('animation-settings-2');
            placeholderAnimationActive = true;
            animateInputPlaceholder();
        }, 1000);

    } else {
        setTimeout(() => {
            if (userInput.inputAnimationInterval) {
                clearInterval(userInput.inputAnimationInterval);
            }
            userInput.classList.remove('light');
            userInput.classList.add('light-nav', 'animation-settings-2');

            setTimeout(() => {
                userInput.classList.add('no-opacity');
            }, 300);
    
            setTimeout(() => {
                userInput.value = '';
                displayXButton();
                userInput.classList.remove('no-opacity');
            }, 500);

            setTimeout(() => {
                userInput.classList.remove('animation-settings-2');
                placeholderAnimationActive = true;
                animateInputPlaceholder();
            }, 1000);

        }, 1000);
    }
}




// --------------------------------------------------------------------------------------------
// SENDING & RECEIVING MESSAGES
// --------------------------------------------------------------------------------------------


function sendMessage() {
    
    const message = userInput.value.trim();
    if (message === '') return;  // Don't send empty messages
    userInput.blur();

    isStreaming = true;
    document.body.classList.add('streaming');
    startStreamingAnimation();

    processedComponents.clear(); // Clear processed components for a new request
    renderingQueue = [];  // Clear the rendering queue

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
        })
        .then(response => response.json()) // Waits for the response from the server and converts it to a JSON object
        .then(data => { // waits for the response to be converted to a JSON object
            if (data.status === "ok") { // checks if the status of the response is "ok"
                responseCount++;
                contentContainer.setAttribute('data-version-key', responseCount);
                startStreamingResponse(); // starts the streaming response
            }        
        }).catch(error => { // handles any errors that occur during the request
            console.error('Error sending message:', error); // logs the error to the console
        });

        // Only clear content container if it has content
        if (contentContainer.children.length > 0) {
            clearContentContainer(false);  // Clear the UI content
        }
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
                handleComplete(data.content);
                break;
            case 'second_complete':
                handleSecondComplete(data.content, data.stateId);  // New function to process the second chatbot's response
                activeEventSource.close();
                activeEventSource = null;
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                activeEventSource = null;
                break;
        }
    };

    activeEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        activeEventSource.close();
        activeEventSource = null;
    };
}

// Add ability to send message by pressing Enter key
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Function to handle to enable/disable the input field and send button during streaming
// function toggleLoadingState(isLoading) {
//     const sendButton = document.getElementById('send-button');
    
//     // Disable/enable the input field based on isLoading
//     if (input) input.disabled = isLoading;
    
//     // Disable/enable the send button based on isLoading
//     if (sendButton) sendButton.disabled = isLoading;
// }

function clearContentContainer(isVersionHistory) {

    contentContainer.classList.add('animation-settings');
    previousParagraphContainer = null;
    previousPreviousParagraphContainer = null;

    // Find only the leaf nodes (elements that don't have element children)
    contentContainer.querySelectorAll('*').forEach(element => {
        // Check if this is a leaf node (no element children)
        const hasElementChildren = Array.from(element.children).length > 0;

        
        if (!hasElementChildren && 
            (element.tagName.toLowerCase() === 'span' || 
                element.tagName.toLowerCase() === 'div' || 
                element.tagName.toLowerCase() === 'p')) {

            element.classList.add('animation-settings');
            
            setTimeout(() => {
                element.classList.add('light');

                if (element.classList.contains('italic')) {
                    element.classList.remove('italic');
                }

            }, 10);
        }
    });

    setTimeout(() => {
        contentContainer.classList.add('no-opacity');
    }, 100);

    setTimeout(() => {
        contentContainer.innerHTML = '';
    }, 300);

    if (!isVersionHistory) {
        setTimeout(() => {
            contentContainer.classList.remove('animation-settings', 'no-opacity');
        }, 310);
    }
}

animateInputPlaceholder();

function animateInputPlaceholder() {
    const placeholders = [
        'Type prompt here...', // English
        'Prompt hier eingeben...', // German
        'Escribe tu indicación aquí...', // Spanish
        '在这里输入提示...', // Chinese
        'Tapez votre requête ici...', // French
        'ここに指示を入力...', // Japanese
        'Digita il comando qui...', // Italian
        '여기에 명령어를 입력하세요...', // Korean
    ];
    
    let placeholderIndex = 0;
    
    function animateSinglePlaceholder() {

        if (!placeholderAnimationActive) {
            placeholderIndex = 0;
            return;
        }

        const currentText = placeholders[placeholderIndex];
        let letterIndex = 0;
        
        // Clear the placeholder initially
        userInput.placeholder = '';
        
        // Type in the placeholder character by character
        const typeInterval = setInterval(() => {
            if (letterIndex < currentText.length) {
                // Check if current character is a space
                if (currentText[letterIndex] === ' ') {
                    // Skip the space for now (don't increment letterIndex yet)
                    let spacesToAdd = '';
                    
                    // Count consecutive spaces
                    while (letterIndex < currentText.length && currentText[letterIndex] === ' ') {
                        spacesToAdd += ' ';
                        letterIndex++;
                    }
                    
                    // If we're at the end of the string after spaces, clear interval
                    if (letterIndex >= currentText.length) {
                        clearInterval(typeInterval);
                        return;
                    }
                    
                    // Add spaces plus the next character
                    userInput.placeholder += spacesToAdd + currentText[letterIndex];
                    letterIndex++;
                } else {
                    // Add the current character
                    userInput.placeholder += currentText[letterIndex];
                    letterIndex++;
                }
            } else {
                clearInterval(typeInterval);    

                setTimeout(() => {
                    userInput.classList.add('placeholder-no-opacity');
                    placeholderIndex = (placeholderIndex + 1) % placeholders.length;

                    setTimeout(() => {
                        userInput.placeholder = '';
                        userInput.classList.remove('placeholder-no-opacity');
                    }, 600);

                    setTimeout(() => {
                        animateSinglePlaceholder();
                    }, 800);

                }, 1000); // Display complete text for 1 second
            }
        }, 50);
    }
    
    // Start the animation cycle
    animateSinglePlaceholder();
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

            // Handle headline if it exists
            if ('headline' in currentContent) {
                if (currentContent.headline.headline) {
                    if (!headlineProcessed) {
                        const headline = currentContent.headline.headline;
                        addNewVersionHistoryElement(headline);
                    }
                }   
            }

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

                        if (!component.text || !Array.isArray(component.text)) { // wait till text is available (therefore necessary information for the layout e.g. image will be available)
                            break;
                        }

                        let paragraphContainer = document.querySelector(`[data-component-key="${componentID}"]`);

                        if (!paragraphContainer) {

                            paragraphContainerCount++;
                            
                            if ((contentContainer.lastElementChild && contentContainer.lastElementChild.classList.contains('paragraph-outter-container')) || window.innerWidth <= mobileWidth) { // only execute if there is a paragraph outter container or on mobile
                                allParagraphContainers = contentContainer.querySelectorAll('.paragraph-container');
                                previousParagraphContainer = allParagraphContainers[allParagraphContainers.length - 1];
                            }

                            if(window.innerWidth <= mobileWidth) {
                                await processImageQueue();
                            } else {
                                if ((paragraphContainerCount % 2 === 1)) {
                                    await processImageQueue();
                                }
                            }

                            paragraphContainer = document.createElement('p');
                            paragraphContainer.classList.add('paragraph-container');
                            paragraphContainer.setAttribute('data-component-key', componentID);

                            // check if there is an image in the component
                            if (component.image) {
                                paragraphContainer.setAttribute('data-image-paragraph', 'true');

                                if (component.image.caption && component.image.image_url) {
                                    if (!componentMap.has('image')) {
                                        componentMap.set('image', true);
                                        imageQueue.push({
                                            url: component.image.image_url,
                                            caption: component.image.caption
                                        });
                                    }
                                }
                            }

                            // Define Layout based on previous pragraphs and images
                            if (window.innerWidth <= mobileWidth) { // On mobile
                                if (previousParagraphContainer && !previousParagraphContainer.hasAttribute('data-image-paragraph')) { // only add an indent if the previous paragraph is not an image paragraph
                                    const indentSpan = document.createElement('span');
                                    indentSpan.classList.add('indent');
                                    paragraphContainer.appendChild(indentSpan); 
                                }

                                contentContainer.appendChild(paragraphContainer);

                            } else { // On desktop
                                // Check if there is a previous paragraph container or if it is the first paragraph
                                if (!previousParagraphContainer) {
                                    const largeParagraphContainer = document.createElement('div');
                                    largeParagraphContainer.classList.add('large-paragraph-container', 'paragraph-outter-container');

                                    paragraphContainer.classList.add('large-paragraph');
                                    paragraphContainer.setAttribute('data-width', 'large');

                                    largeParagraphContainer.appendChild(paragraphContainer);
                                    contentContainer.appendChild(largeParagraphContainer);

                                    numberExclude = 1; // so the next container is not as wide as the previous one
                                } else {
                                    // Check if the paragraph container even and the previous paragraph container is not an image paragraph
                                    if ((paragraphContainerCount % 2 === 0)) {
                                        // Number even
                                        const outterContainerPreviousParagraph = previousParagraphContainer.parentElement;
                                        const containerWidth = previousParagraphContainer.getAttribute('data-width');

                                        if (containerWidth === 'large') {
                                            paragraphContainer.setAttribute('data-width', 'large');
                                        } else if (containerWidth === 'medium') {
                                            paragraphContainer.setAttribute('data-width', 'medium');
                                        } else if (containerWidth === 'small') {
                                            paragraphContainer.setAttribute('data-width', 'small');
                                        }

                                        outterContainerPreviousParagraph.appendChild(document.createTextNode(' '));
                                        outterContainerPreviousParagraph.appendChild(paragraphContainer);

                                    } else {
                                        // Number is odd
                                        randomNumber = getRandomInt();
                                        if (randomNumber === 1) {
                                            const largeParagraphContainer = document.createElement('div');
                                            largeParagraphContainer.classList.add('large-paragraph-container', 'paragraph-outter-container');
                                            paragraphContainer.setAttribute('data-width', 'large');
                                            largeParagraphContainer.appendChild(paragraphContainer);
                                            contentContainer.appendChild(largeParagraphContainer);

                                            numberExclude = 1; // so the next container is not as wide as the previous one
                                        } else if (randomNumber === 2) {
                                            const mediumParagraphContainer = document.createElement('div');
                                            mediumParagraphContainer.classList.add('medium-paragraph-container', 'paragraph-outter-container');
                                            paragraphContainer.setAttribute('data-width', 'medium');
                                            mediumParagraphContainer.appendChild(paragraphContainer);
                                            contentContainer.appendChild(mediumParagraphContainer);

                                            numberExclude = 2; // so the next container is not as wide as the previous one
                                        } else if (randomNumber === 3) {
                                            const smallParagraphContainer = document.createElement('div');
                                            smallParagraphContainer.classList.add('small-paragraph-container', 'paragraph-outter-container');
                                            paragraphContainer.setAttribute('data-width', 'small');
                                            smallParagraphContainer.appendChild(paragraphContainer);
                                            contentContainer.appendChild(smallParagraphContainer);

                                            numberExclude = 3; // so the next container is not as wide as the previous one
                                        }
                                    }
                                }
                            }
                        }
                        
                        for (const sentence of component.text) {
                            if (!componentMap.has(sentence)) {
                                componentMap.set(sentence, true);
                                await new Promise(resolve => {
                                    if (paragraphContainer.textContent) {
                                        paragraphContainer.appendChild(document.createTextNode(' '));
                                    }

                                    const parts = sentence.split(/(\[[^\]]+\])/g);
                                    let partIndex = 0;

                                    function processNextPart() {
                                        if (partIndex < parts.length) {
                                            const part = parts[partIndex];
                                            if (!part) {
                                                partIndex++;
                                                processNextPart();
                                                return;
                                            }
                                            
                                            const isItalic = part.startsWith('[') && part.endsWith(']'); // boolean to check if the part is italic
                                            const text = isItalic ? part.slice(1, -1) : part; // if the part is italic, remove the brackets and the text
                                            const words = text.trim().split(' ').filter(w => w); // split the text into words and remove empty strings
                                            
                                            if (words.length === 0) {
                                                partIndex++;
                                                processNextPart();
                                                return;
                                            }

                                            // Check if this part starts with punctuation
                                            const startWithPunctuation = /^[.,;:!?)]/.test(text.trim());
                                            
                                            // Add space between parts if needed (but not before punctuation)
                                            if (partIndex > 0 && !startWithPunctuation && 
                                                paragraphContainer.lastChild && 
                                                !paragraphContainer.lastChild.textContent.endsWith(' ')) {
                                                paragraphContainer.appendChild(document.createTextNode(' '));
                                            }
                                            
                                            let italicSpan = null;

                                            if (isItalic) {
                                                termDescriptionCount++;
                                                italicSpan = document.createElement('span');
                                                italicSpan.classList.add('term');
                                                italicSpan.setAttribute('data-term-index', termDescriptionCount);
                                                paragraphContainer.appendChild(italicSpan);
                                            }
                                            
                                            let wordIndex = 0;
                                            
                                            function addNextWord() {
                                                if (wordIndex < words.length) {
                                                    // Add space before word (except for first word)
                                                    if (wordIndex > 0) {
                                                        if (italicSpan) {
                                                            italicSpan.appendChild(document.createTextNode(' '));
                                                        } else {
                                                            paragraphContainer.appendChild(document.createTextNode(' '));
                                                        }
                                                    }
                                                    
                                                    // Create span for the word
                                                    const wordSpan = document.createElement('span');
                                                    wordSpan.textContent = words[wordIndex];
                                                    wordSpan.classList.add('word', 'paragraph-word', 'light');
                                                    
                                                    // Add to appropriate parent
                                                    if (italicSpan) {
                                                        italicSpan.appendChild(wordSpan);

                                                        setTimeout(() => {
                                                            wordSpan.classList.add('italic');
                                                        }, 10);
                                                    } else {
                                                        paragraphContainer.appendChild(wordSpan);
                                                    }

                                                    wordSpan.style.display = 'inline-block';
                                                    const lightWidth = wordSpan.getBoundingClientRect().width;
                                                    wordSpan.style.width = `${lightWidth}px`;

                                                    setTimeout(() => {
                                                        wordSpan.classList.remove('light');
                                                    }, 10);
                                                    
                                                    wordIndex++;
                                                    setTimeout(addNextWord, 50);
                                                } else {
                                                    if (isItalic) {
                                                        const termDescriptionNumberContainer = document.createElement('span');
                                                        termDescriptionNumberContainer.classList.add('term-description-number-container', `term-description-number-container-${termDescriptionCount}`, 'small');

                                                        const termDescriptionNumber = document.createElement('span');
                                                        termDescriptionNumber.classList.add('term-description-number', 'light');
                                                        termDescriptionNumber.textContent = termDescriptionCount < 10 ? `0${termDescriptionCount}` : termDescriptionCount;

                                                        termDescriptionNumberContainer.appendChild(termDescriptionNumber);
                                                        paragraphContainer.appendChild(termDescriptionNumberContainer);

                                                        setTimeout(() => {
                                                            termDescriptionNumberContainer.classList.remove('small');
                                                            termDescriptionNumber.classList.remove('light');
                                                        }, 10);

                                                        partIndex++;
                                                        setTimeout(processNextPart, 10);

                                                    } else {
                                                        partIndex++;
                                                        setTimeout(processNextPart, 0); 
                                                    }
                                                }
                                            }
                                            addNextWord();
                                        } else {
                                            resolve();
                                        }
                                    }
                                    
                                    processNextPart();
                                });
                            }
                        }
                        break;

                    case 'list':

                        let listContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!listContainer) {
                            listContainer = document.createElement('div');
                            listContainer.classList.add('list-container');
                            listContainer.setAttribute('data-component-key', componentID);
                            contentContainer.appendChild(listContainer);
                        }

                        if (!component.items) {
                            break;
                        }

                        if (!componentMap.has('items')) {
                            componentMap.set('items', new Set());
                        }

                        for (const listItem of component.items) {

                            const itemID = component.items.indexOf(listItem);

                            if (!componentMap.has(itemID)) {
                                componentMap.set(itemID, new Set());
                            }

                            let itemContainer = listContainer.querySelector(`[data-item-id="${itemID}"]`);
                            if (!itemContainer) {
                                await new Promise(resolve => {
                                    itemContainer = document.createElement('div');
                                    itemContainer.classList.add('item-container', 'no-width');
                                    itemContainer.setAttribute('data-item-id', itemID);
                                    listContainer.appendChild(itemContainer);

                                    setTimeout(() => {
                                        itemContainer.classList.remove('no-width');
                                    }, 10);

                                    setTimeout(resolve, animationDuration + 10);
                                });
                            }

                            if (listItem.prefix && 'item' in listItem && !componentMap.get(itemID).has('prefix')) {
                                await new Promise(resolve => {
                                    componentMap.get(itemID).add('prefix');
                                    const prefix = document.createElement('div');

                                    prefix.classList.add('item-prefix', 'light', 'no-opacity');

                                    const prefixString = listItem.prefix.toString();
                                    let prefixText = "";

                                    if (prefixString.length <= 1) {
                                        prefixText = "0" + prefixString;
                                    } else {
                                        prefixText = prefixString;
                                    }
                                    
                                    prefix.textContent = prefixText;

                                    prefix.style.display = 'inline-block';
                                    const lightWidth = prefix.getBoundingClientRect().width;
                                    prefix.style.width = `${lightWidth}px`;

                                    itemContainer.appendChild(prefix);
                                    const itemContainerHeight = itemContainer.scrollHeight;
                                    itemContainer.style.height = `${itemContainerHeight}px`;

                                    setTimeout(() => {
                                        prefix.classList.remove('no-opacity');
                                    }, animationDuration + 10);

                                    setTimeout(() => {
                                        prefix.classList.remove('light');
                                    }, animationDuration + 20);

                                    setTimeout(resolve, animationDuration + 20);
                                });
                            }
                            

                            if (listItem.item && !componentMap.get(itemID).has('item')) {
                                await new Promise(resolve => {
                                    componentMap.get(itemID).add('item');
                            
                                    const textContainer = document.createElement('div');
                                    textContainer.classList.add('item-text');
                                    itemContainer.appendChild(textContainer);
                            
                                    // Store initial scrollHeight
                                    let previousScrollHeight = itemContainer.scrollHeight;
                            
                                    const parts = listItem.item.split(/(\[[^\]]+\])/g);
                                    let partIndex = 0;
                            
                                    function processNextPart() {
                                        if (partIndex < parts.length) {
                                            const part = parts[partIndex];
                                            if (!part) {
                                                partIndex++;
                                                processNextPart();
                                                return;
                                            }
                            
                                            const isItalic = part.startsWith('[') && part.endsWith(']');
                                            const text = isItalic ? part.slice(1, -1) : part;
                                            const words = text.trim().split(' ').filter(w => w);
                            
                                            if (words.length === 0) {
                                                partIndex++;
                                                processNextPart();
                                                return;
                                            }
                            
                                            const startWithPunctuation = /^[.,;:!?)]/.test(text.trim());
                                            if (partIndex > 0 && !startWithPunctuation &&
                                                textContainer.lastChild && !textContainer.lastChild.textContent.endsWith(' ')) {
                                                textContainer.appendChild(document.createTextNode(' '));
                                            }
                            
                                            let italicSpan = null;
                                            if (isItalic) {
                                                termDescriptionCount++;
                                                italicSpan = document.createElement('span');
                                                italicSpan.classList.add('term');
                                                italicSpan.setAttribute('data-term-index', termDescriptionCount);
                                                textContainer.appendChild(italicSpan);
                                            }
                            
                                            let wordIndex = 0;
                            
                                            function addNextWord() {
                                                if (wordIndex < words.length) {
                                                    if (wordIndex > 0) {
                                                        (italicSpan || textContainer).appendChild(document.createTextNode(' '));
                                                    }
                            
                                                    const wordSpan = document.createElement('span');
                                                    wordSpan.textContent = words[wordIndex];
                                                    wordSpan.classList.add('word', 'item-word', 'light', 'no-opacity');
                            
                                                    if (italicSpan) {
                                                        italicSpan.appendChild(wordSpan);

                                                        setTimeout(() => {
                                                            wordSpan.classList.add('italic');
                                                        }, 10);
                                                    } else {
                                                        textContainer.appendChild(wordSpan);
                                                    }

                                                    wordSpan.style.display = 'inline-block';
                                                    const lightWidth = wordSpan.getBoundingClientRect().width;
                                                    wordSpan.style.width = `${lightWidth}px`;
                            
                                                    const currentScrollHeight = itemContainer.scrollHeight;
                                                    if (currentScrollHeight !== previousScrollHeight) {
                                                        itemContainer.style.height = `${currentScrollHeight}px`;
                                                        previousScrollHeight = currentScrollHeight;
                            
                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('no-opacity');
                                                        }, animationDuration - 200);
                            
                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('light');
                                                        }, animationDuration - 180);
                            
                                                        wordIndex++;
                                                        setTimeout(addNextWord, animationDuration - 180);
                                                    } else {
                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('no-opacity');
                                                        }, 10);
                            
                                                        setTimeout(() => {
                                                            wordSpan.classList.remove('light');
                                                        }, 50);
                            
                                                        wordIndex++;
                                                        setTimeout(addNextWord, 50);
                                                    }
                                                } else {
                                                    if (isItalic) {
                                                        const numberContainer = document.createElement('span');
                                                        numberContainer.classList.add(
                                                            'term-description-number-container',
                                                            `term-description-number-container-${termDescriptionCount}`,
                                                            'small'
                                                        );
                            
                                                        const numberSpan = document.createElement('span');
                                                        numberSpan.classList.add('term-description-number', 'light');
                                                        numberSpan.textContent =
                                                            termDescriptionCount < 10
                                                                ? `0${termDescriptionCount}`
                                                                : termDescriptionCount;
                            
                                                        numberContainer.appendChild(numberSpan);
                                                        textContainer.appendChild(numberContainer);
                            
                                                        setTimeout(() => {
                                                            numberContainer.classList.remove('small');
                                                            numberSpan.classList.remove('light');
                                                        }, 10);
                                                    }
                            
                                                    partIndex++;
                                                    setTimeout(processNextPart, 10);
                                                }
                                            }
                            
                                            addNextWord();
                                        } else {
                                            resolve();
                                        }
                                    }
                            
                                    processNextPart();
                                });
                            }
                        }
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
                            // For smaller screens, just track headers without creating elements
                            for (const header of component.headers) {
                                if (!componentMap.get('headers').has(header)) {
                                    componentMap.get('headers').add(header);
                                }
                            };
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
                                    let rowContainer = tableContainer.querySelector(`[data-row-container-id="${rowId}"]`);

                                    let lastScrollHeight = 0;
                                    let lastRowItemScrollHeight = 0;

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
                                    
                                                // Split by bracketed and non-bracketed segments
                                                const parts = item.split(/(\[[^\]]+\])/g);
                                                let partIndex = 0;
                                    
                                                function processNextPart() {
                                                    if (partIndex < parts.length) {
                                                        const part = parts[partIndex];
                                                        if (!part) {
                                                            partIndex++;
                                                            processNextPart();
                                                            return;
                                                        }
                                    
                                                        const isItalic = part.startsWith('[') && part.endsWith(']');
                                                        const text = isItalic ? part.slice(1, -1) : part;
                                                        const words = text.trim().split(' ').filter(w => w);
                                    
                                                        if (words.length === 0) {
                                                            partIndex++;
                                                            processNextPart();
                                                            return;
                                                        }

                                                                                                    // Check if this part starts with punctuation
                                                        const startWithPunctuation = /^[.,;:!?)]/.test(text.trim());
                                                        
                                                        // Add space between parts if needed (but not before punctuation)
                                                        if (partIndex > 0 && !startWithPunctuation && 
                                                            rowItem.lastChild && 
                                                            !rowItem.lastChild.textContent.endsWith(' ')) {
                                                            rowItem.appendChild(document.createTextNode(' '));
                                                        }
                                    
                                                        let italicSpan = null;
                                                        if (isItalic) {
                                                            termDescriptionCount++;
                                                            italicSpan = document.createElement('span');
                                                            italicSpan.classList.add('term');
                                                            italicSpan.setAttribute('data-term-index', termDescriptionCount);
                                                            rowItem.appendChild(italicSpan);
                                                        }
                                    
                                                        let wordIndex = 0;
                                    
                                                        function addNextWord() {
                                                            row.style.height = 'auto';
                                                            
                                                            if (wordIndex < words.length) {
                                                                if (wordIndex > 0) {
                                                                    (italicSpan || rowItem).appendChild(document.createTextNode(' '));
                                                                }
                                    
                                                                const wordSpan = document.createElement('span');
                                                                wordSpan.textContent = words[wordIndex];
                                                                wordSpan.classList.add('word', 'table-item-word', 'light', 'no-opacity');
                                                                
                                                                if (italicSpan) {
                                                                    italicSpan.appendChild(wordSpan);

                                                                    setTimeout(() => {
                                                                        wordSpan.classList.add('italic');
                                                                    }, 10);
                                                                } else {
                                                                    rowItem.appendChild(wordSpan);
                                                                }
                                                                        


                                                                wordSpan.style.display = 'inline-block';
                                                                const lightWidth = wordSpan.getBoundingClientRect().width;
                                                                wordSpan.style.width = `${lightWidth}px`;
                                    
                                                                setTimeout(() => {
                                                                    wordSpan.classList.remove('no-opacity');
                                                                }, 100);
                                                                setTimeout(() => {
                                                                    wordSpan.classList.remove('light');
                                                                }, 110);

                                                                const currentRowItemScrollHeight = rowItem.scrollHeight;
                                                                if (currentRowItemScrollHeight !== lastRowItemScrollHeight) {
                                                                    lastRowItemScrollHeight = currentRowItemScrollHeight;
                                                                    rowItem.style.height = `${currentRowItemScrollHeight}px`;
                                                                }
                                    
                                                                wordIndex++;
                                                                setTimeout(addNextWord, 50);
                                                            } else {
                                                                
                                                                if (isItalic) {
                                                                    const numberContainer = document.createElement('span');
                                                                    numberContainer.classList.add(
                                                                        'term-description-number-container',
                                                                        `term-description-number-container-${termDescriptionCount}`,
                                                                        'small'
                                                                    );
                                    
                                                                    const numberSpan = document.createElement('span');
                                                                    numberSpan.classList.add('term-description-number', 'light');
                                                                    numberSpan.textContent =
                                                                        termDescriptionCount < 10
                                                                            ? `0${termDescriptionCount}`
                                                                            : termDescriptionCount;
                                    
                                                                    numberContainer.appendChild(numberSpan);
                                                                    rowItem.appendChild(numberContainer);

                                    
                                                                    setTimeout(() => {
                                                                        numberContainer.classList.remove('small');
                                                                        numberSpan.classList.remove('light');
                                                                    }, 10);
                                                                }
                                    
                                                                partIndex++;
                                                                setTimeout(processNextPart, 10);
                                                            }
                                                        }
                                    
                                                        addNextWord();
                                                    } else {
                                                        resolve();
                                                    }
                                                }
                                                processNextPart();
                                            });
                                        }
                                    }
                                }
                            };
                        }
                        break;

                    case 'projects_list':
                        // Process the image queue in case the stream is finished which gets marked through rendering a project with UIType: stream_finished
                        // This is to make sure that the last images of paragraphs are rendered before the projects container that marks the end of the stream is added to the DOM
                        await processImageQueue();

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

                            if (project.stream_finished) {
                                console.log('project.stream_finished');

                                projectRenderingQueue.push({
                                    id: true,
                                    key: 'stream_finished',
                                    value: true,
                                    container: true,
                                    index: true
                                });

                                if (!isProjectRendering) {
                                    await renderNextProject();
                                }
                                break;
                            }

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
                                                await renderNextProject();
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
                                                await renderNextProject();
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
                                        await renderNextProject();
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

            if (key === 'stream_finished') {
                const gridProjects = document.querySelectorAll('.grid > .project');
                
                gridProjects.forEach(project => {
                    project.addEventListener('click', () => {
                        const projectNameElement = project.querySelector('.project-name-text');

                        if (projectNameElement) {
                            userInput.value = projectNameElement.textContent;

                            setTimeout(() => {
                                sendMessage();
                            }, 100);
                        }
                    });
                });

                isStreaming = false;
                break;
            }

            // console.log(`Rendering ${key} for project: ${id}`);
            let projectItem = document.querySelector(`[data-project-id="${id}"]`);

            if (container.classList.contains('grid')) {

                switch (key) {
                    case 'UIType':
                        await new Promise((resolve) => {
                            if (!projectItem) {
                                
                                projectItem = document.createElement('div');
                                projectItem.classList.add('project', 'no-width', 'no-padding', 'no-height');
                                projectItem.setAttribute('data-project-id', id);

                                container.appendChild(projectItem);

                                setTimeout(() => {
                                    projectItem.classList.remove('no-width');
                                }, 10);
                            }
    
                            setTimeout(resolve, 310);
                        });
                        break;
                    case 'images':
                        await new Promise((resolve) => {

                            let imageContainer = projectItem.querySelector('.project-images');
                            let projectInfo = projectItem.querySelector('.project-information');
    
                            if (!imageContainer) {
                                projectItem.classList.remove('no-height');
                                imageContainer = document.createElement('div');
                                imageContainer.classList.add('project-images', 'blur');
                                
                                projectInfo = document.createElement('div');
                                projectInfo.classList.add('project-information', 'no-padding');

                                projectItem.appendChild(imageContainer);
                                projectItem.appendChild(projectInfo);
                    
                                setTimeout(() => {
                                    // Process only the first image URL in the array
                                    const firstImageUrl = value[0];
                                    if (firstImageUrl) {
                                        // Check if image with this URL already exists
                                        const existingImage = imageContainer.querySelector(`img[src="${firstImageUrl}"]`);
                                        if (!existingImage) {
                                            // Create wrapper div with project-image class

                                            const imageWrapper = document.createElement('div');
                                            imageWrapper.classList.add('project-image');

                                            // Create the img element
                                            const imgElement = document.createElement('img');
                                            imgElement.classList.add('img-element', 'no-opacity', 'blur');
                                            imgElement.src = firstImageUrl;
                                            
                                            // Add img to wrapper
                                            imageWrapper.appendChild(imgElement);
                                            imageContainer.appendChild(imageWrapper);

                                            // Add fade-in effect once image is loaded
                                            imgElement.onload = () => {
                                                imgElement.classList.remove('no-opacity', 'blur');
                                                
                                                setTimeout(() => {
                                                    imageContainer.classList.remove('blur');
                                                }, 200);
                                            };
                                        }
                                    }   
                                    resolve();
                                }, animationDuration + 200);
                            } else {
                                setTimeout(() => {
                                    // Process only the first image URL in the array
                                    const firstImageUrl = value[0];
                                    if (firstImageUrl) {
                                        // Check if image with this URL already exists
                                        const existingImage = imageContainer.querySelector(`img[src="${firstImageUrl}"]`);
                                        if (!existingImage) {
                                            // Create wrapper div with project-image class

                                            const imageWrapper = document.createElement('div');
                                            imageWrapper.classList.add('project-image');

                                            // Create the img element
                                            const imgElement = document.createElement('img');
                                            imgElement.classList.add('img-element', 'no-opacity', 'blur');
                                            imgElement.src = firstImageUrl;
                                            
                                            // Add img to wrapper
                                            imageWrapper.appendChild(imgElement);
                                            imageContainer.appendChild(imageWrapper);

                                            // Add fade-in effect once image is loaded
                                            imgElement.onload = () => {
                                                imgElement.classList.remove('no-opacity', 'blur');
                                                
                                                setTimeout(() => {
                                                    imageContainer.classList.remove('blur');
                                                }, 200);
                                            };
                                        }
                                    }
                                    resolve();
                                }, 10);
                            }                              
                        });
                        break;
                    case 'name':
                        await new Promise((resolve) => {        
                            // Check if the element already exists to avoid duplicates
                            let projectName = projectItem.querySelector(`.project-name`);
                            let nameText = projectItem.querySelector(`.project-name-text`);
                            const projectInfo = projectItem.querySelector(`.project-information`);

                            if (!projectName) {
                                            
                                projectName = document.createElement('div');  // Create the container element
                                projectName.classList.add(`project-name`);
                                
                                // Create the span to wrap the name text
                                nameText = document.createElement('span');
                                nameText.classList.add('project-name-text', 'light');
                                nameText.textContent = value;
                                
                                // Append the span to the container
                                projectName.appendChild(nameText);
                                projectInfo.appendChild(projectName);

                                setTimeout(() => {
                                    nameText.classList.remove('light');
                                }, 50);
    
                            } else {
                                // Update the content if it already exists (optional)
                                projectName.textContent = value;
                            }
            
                            setTimeout(resolve, 400);
                        });
                        break;
                    case 'year':
                        await new Promise((resolve) => {
                            let projectInfo = projectItem.querySelector('.project-information');
                            const projectName = projectInfo.querySelector('.project-name');
    
                            if (projectName) {
                                let yearText = projectName.querySelector('.project-year');
                                if (!yearText) {
                                    yearText = document.createElement('span');
                                    yearText.classList.add('project-year', 'light');
                                    yearText.textContent = ` (${value})`;
                                    projectName.appendChild(yearText);
    
                                    setTimeout(() => {
                                        yearText.classList.remove('light');
                                    }, 10);
                                } else {
                                    // Update existing year span
                                    yearText.textContent = ` (${value})`;
                                }
                            }
                            setTimeout(resolve, 200);
                        });
                        break;
                    case 'material':
                        break;
                    case 'dimensions':
                        break;
                    case 'description':
                        break;
                }
            } else {
                switch (key) {
                    case 'UIType':
                        await new Promise((resolve) => {
                            if (!projectItem) {
                                projectItem = document.createElement('div');
                                projectItem.classList.add('project', 'no-width');
                                projectItem.setAttribute('data-project-id', id);
                                container.appendChild(projectItem);
                            }
    
                            setTimeout(resolve, 10);
                        });
                        break;
                    case 'name':
                        
                        if (!value) {
                            break;
                        }

                        await new Promise((resolve) => { 
                            
                            // Check if the element already exists to avoid duplicates
                            let projectName = projectItem.querySelector('.project-name');

                            if (!projectName) {
                            
                                projectName = document.createElement('div');  // Correctly create the element
                                projectName.classList.add(`project-${key}`);

                                projectItem.appendChild(projectName);
                            }
                            

                            const words = value.split(' ');
                            let wordIndex = 0;

                            function addNextWord() {
                                if (wordIndex < words.length) {

                                    if (wordIndex > 0) {
                                        projectName.appendChild(document.createTextNode(' '));
                                    }

                                    const wordSpan = document.createElement('span');
                                    wordSpan.textContent = words[wordIndex];
                                    wordSpan.classList.add('project-name-word', 'light');
                                    projectName.appendChild(wordSpan);

                                    wordSpan.style.display = 'inline-block';
                                    const lightWidth = wordSpan.getBoundingClientRect().width;
                                    wordSpan.style.width = `${lightWidth}px`;

                                    setTimeout(() => {
                                        wordSpan.classList.remove('light');
                                    }, 50);

                                    wordIndex++;

                                    setTimeout(addNextWord, 100);
                                } else {
                                    setTimeout(() => {
                                        projectItem.classList.remove('no-width');
                                    }, 200);

                                    setTimeout(resolve, animationDuration + 200);
                                }
                            }

                            addNextWord();

                        });
                        break;
                    case 'year':

                        if (!value) {
                            break;
                        }

                        await new Promise((resolve) => {

                            let projectInfoContainer = projectItem.querySelector('.project-information-container');

                            if (!projectInfoContainer) {
                                projectInfoContainer = document.createElement('div');
                                projectInfoContainer.classList.add('project-information-container');
                                projectItem.appendChild(projectInfoContainer);

                                const projectInfo = document.createElement('div');
                                projectInfo.classList.add('project-information');
                                projectInfoContainer.appendChild(projectInfo);

                                let yearText = projectInfoContainer.querySelector('.project-year');

                                if (!yearText) {
                                    yearText = document.createElement('span');
                                    yearText.classList.add('project-year', 'light');
                                    yearText.textContent = `${value}, `;
                                    projectInfo.appendChild(yearText);
    
                                    setTimeout(() => {
                                        yearText.classList.remove('light');
                                    }, 50);
                                }
                            }
                            setTimeout(resolve, 50);
                        });
                        break;
                    case 'material':
                        await new Promise((resolve) => { 
                            // Check if value is empty or undefined
                            if (!value) {
                                resolve();
                                return;
                            }
                            
                            let projectInfo = projectItem.querySelector('.project-information');
                            let projectMaterial = projectInfo.querySelector('.project-material');
                    
                            if (!projectMaterial) {
                                projectMaterial = document.createElement('span');
                                projectMaterial.classList.add('project-material');
                                projectInfo.appendChild(projectMaterial);
                            }
                            
                            const words = value.split(' ');
                            let wordIndex = 0;
                    
                            function addNextWord() {
                                if (wordIndex < words.length) {
                                    if (wordIndex > 0) {
                                        projectMaterial.appendChild(document.createTextNode(' '));
                                    }
                    
                                    const wordSpan = document.createElement('span');
                                    wordSpan.textContent = words[wordIndex];
                                    wordSpan.classList.add('project-material-word', 'light');
                                    projectMaterial.appendChild(wordSpan);

                                    wordSpan.style.display = 'inline-block';
                                    const lightWidth = wordSpan.getBoundingClientRect().width;
                                    wordSpan.style.width = `${lightWidth}px`;
                    
                                    setTimeout(() => {
                                        wordSpan.classList.remove('light');
                                    }, 50);
                    
                                    wordIndex++;
                    
                                    setTimeout(addNextWord, 50);
                                } else {
                                    resolve();
                                }
                            }
                    
                            addNextWord();
                        });
                        break;
                    case 'dimensions':

                        if (!value) {
                            resolve();
                            return;
                        }

                        await new Promise((resolve) => {
                            let projectInfo = projectItem.querySelector('.project-information');
                            let projectDimensions = projectInfo.querySelector('.project-dimensions');

                            if (!projectDimensions) {
                                projectDimensions = document.createElement('span');
                                projectDimensions.classList.add('project-dimensions', 'light');
                                projectDimensions.textContent = `, ${value}`;
                                projectInfo.appendChild(projectDimensions);
    
                                setTimeout(() => {
                                    projectDimensions.classList.remove('light');
                                }, 50);
                            }
                            setTimeout(resolve, 50);
                        });
                        break;
                    case 'images':
                        await new Promise((resolve) => {

                            let imageContainer = projectItem.querySelector('.project-images');
    
                            if (!imageContainer) {
                                imageContainer = document.createElement('div');
                                imageContainer.classList.add('project-images', 'blur');
                                
                                projectItem.appendChild(imageContainer);
            
                                const imageCounter = document.createElement('div');
                                imageCounter.classList.add('image-counter');

                                const projectInfoContainer = projectItem.querySelector('.project-information-container');
                                projectInfoContainer.appendChild(imageCounter);
                                
                                // Create new span for digits
                                const digitsSpanOne = document.createElement('span');
                                digitsSpanOne.classList.add('image-counter-digits-1', 'image-counter-digits', 'light');
                                digitsSpanOne.innerHTML = '01';

                                const digitsSpanTwo = document.createElement('span');
                                digitsSpanTwo.classList.add('image-counter-digits-2', 'image-counter-digits', 'light');
                                digitsSpanTwo.innerHTML = '/';

                                const digitsSpanThree = document.createElement('span');
                                digitsSpanThree.classList.add('image-counter-digits-3', 'image-counter-digits', 'light');
                                digitsSpanThree.innerHTML = '01';
                                
                                // Append digits span to counter
                                imageCounter.appendChild(digitsSpanOne);
                                imageCounter.appendChild(digitsSpanTwo);
                                imageCounter.appendChild(digitsSpanThree);

                                setTimeout(() => {
                                    digitsSpanOne.classList.remove('light');
                                    digitsSpanTwo.classList.remove('light');
                                    digitsSpanThree.classList.remove('light');
                                }, 50);
                                
                                
                                imageContainer.addEventListener('scroll', () => {
                                    const digitsSpanOne = projectItem.querySelector('.image-counter-digits-1');
                                    const scrollPosition = imageContainer.scrollLeft;
                                    const imageWidth = imageContainer.offsetWidth;
                                    const currentIndex = Math.round(scrollPosition / imageWidth);
                                    const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                    
                                    if (digitsSpanOne) {
                                        digitsSpanOne.innerHTML = `${(currentIndex + 1).toString().padStart(2, '0')}`;
                                    }                                    
                                    
                                });

                                setTimeout(() => {
                                    
                                    // Process each image URL in the array
                                    value.forEach(imageUrl => {
                                        // Check if image with this URL already exists
                                        const existingImage = imageContainer.querySelector(`img[src="${imageUrl}"]`);
                                        if (!existingImage) {
                                            // Create wrapper div with project-image class
                                            const imageWrapper = document.createElement('div');
                                            imageWrapper.classList.add('project-image');
                            
                                            // Create the img element
                                            const imgElement = document.createElement('img');
                                            imgElement.classList.add('img-element', 'no-opacity');
                                            imgElement.src = imageUrl;
                                            
                                            // Add img to wrapper
                                            imageWrapper.appendChild(imgElement);
                                            imageContainer.appendChild(imageWrapper);
                            
                                            // Add fade-in effect once image is loaded
                                            imgElement.onload = () => {
                                                imgElement.classList.remove('no-opacity');
                                                imgElement.classList.remove('blur');

                                                setTimeout(() => {
                                                    imageContainer.classList.remove('blur');
                                                }, 200);

                                                // Update the digits span with new total
                                                const digitsSpanThree = projectItem.querySelector('.image-counter-digits-3');
                                                const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                                digitsSpanThree.textContent = `${totalImages.toString().padStart(2, '0')}`;                                                
                                            };
                                        }
                                    }); 
                                }, animationDuration + 200);
                                setTimeout(resolve, 1200);
                            } else {
                                setTimeout(() => {
                                    resolve();
                                    
                                    // Process each image URL in the array
                                    value.forEach(imageUrl => {
                                        // Check if image with this URL already exists
                                        const existingImage = imageContainer.querySelector(`img[src="${imageUrl}"]`);
                                        if (!existingImage) {
                                            // Create wrapper div with project-image class
                                            const imageWrapper = document.createElement('div');
                                            imageWrapper.classList.add('project-image');
                            
                                            // Create the img element
                                            const imgElement = document.createElement('img');
                                            imgElement.classList.add('img-element', 'no-opacity', 'blur');
                                            imgElement.src = imageUrl;
                                            
                                            // Add img to wrapper
                                            imageWrapper.appendChild(imgElement);
                                            imageContainer.appendChild(imageWrapper);
                            
                                            // Add fade-in effect once image is loaded
                                            imgElement.onload = () => {
                                                imgElement.classList.remove('no-opacity');
                                                imgElement.classList.remove('blur');

                                                // Update the digits span with new total
                                                // Update the digits span with new total
                                                const digitsSpanThree = projectItem.querySelector('.image-counter-digits-3');
                                                const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                                digitsSpanThree.textContent = `${totalImages.toString().padStart(2, '0')}`;    
                                            };
                                        }
                                    }); 
                                }, 10);
                            }
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
                            }
                    
                            async function addSentences() {
                                // const paragraphElement = document.createElement('p');
                                // paragraphElement.classList.add('project-description-paragraph');
                                // projectDescription.appendChild(paragraphElement);
                    
                                for (const sentence of value) {
                                    const safeSentence = btoa(encodeURIComponent(sentence));
                                    if (!projectDescription.querySelector(`[data-sentence="${safeSentence}"]`)) {
                                        await new Promise((sentenceResolve) => {
                                            if (projectDescription.childNodes.length > 0) {
                                                projectDescription.appendChild(document.createTextNode(' '));
                                            }
                    
                                            const sentenceSpan = document.createElement('span');
                                            sentenceSpan.setAttribute('data-sentence', safeSentence);
                                            projectDescription.appendChild(sentenceSpan);
                    
                                            const parts = sentence.split(/(\[[^\]]+\])/g);
                                            let partIndex = 0;
                    
                                            function processNextPart() {
                                                if (partIndex < parts.length) {
                                                    const part = parts[partIndex];
                                                    if (!part) {
                                                        partIndex++;
                                                        processNextPart();
                                                        return;
                                                    }
                    
                                                    const isItalic = part.startsWith('[') && part.endsWith(']');
                                                    const text = isItalic ? part.slice(1, -1) : part;
                                                    const words = text.trim().split(' ').filter(w => w);
                    
                                                    if (words.length === 0) {
                                                        partIndex++;
                                                        processNextPart();
                                                        return;
                                                    }

                                                    // Check if this part starts with punctuation
                                                    const startWithPunctuation = /^[.,;:!?)\]]/.test(text.trim());
                                                    
                                                    // Add space between parts if needed (but not before punctuation)
                                                    if (partIndex > 0 && !startWithPunctuation && 
                                                        sentenceSpan.lastChild && 
                                                        !sentenceSpan.lastChild.textContent.endsWith(' ')) {
                                                        sentenceSpan.appendChild(document.createTextNode(' '));
                                                    }

                                                    let italicSpan = null;
                    
                                                    if (isItalic) {
                                                        termDescriptionCount++;
                                                        italicSpan = document.createElement('span');
                                                        italicSpan.classList.add('term');
                                                        italicSpan.setAttribute('data-term-index', termDescriptionCount);
                                                        sentenceSpan.appendChild(italicSpan);
                                                    }
                    
                                                    let wordIndex = 0;
                                                    let lastScrollHeight = projectDescription.scrollHeight;
                    
                                                    function addNextWord() {
                                                        if (wordIndex < words.length) {
                                                            if (wordIndex > 0) {
                                                                if (italicSpan) {
                                                                    italicSpan.appendChild(document.createTextNode(' '));
                                                                } else {
                                                                    sentenceSpan.appendChild(document.createTextNode(' '));
                                                                }
                                                            }
                    
                                                            const wordSpan = document.createElement('span');
                                                            wordSpan.textContent = words[wordIndex];
                                                            wordSpan.classList.add('word', 'project-description-word', 'light', 'no-opacity');
                                                            if (isItalic) wordSpan.classList.add('italic');
                                                            if (italicSpan) {
                                                                italicSpan.appendChild(wordSpan);
                                                            } else {
                                                                sentenceSpan.appendChild(wordSpan);
                                                            }
                    
                                                            const currentScrollHeight = projectDescription.scrollHeight;
                                                            if (currentScrollHeight !== lastScrollHeight) {
                                                                lastScrollHeight = currentScrollHeight;
                                                                projectDescription.style.height = `${currentScrollHeight}px`;
                                                            }

                                                            wordSpan.style.display = 'inline-block';
                                                            const lightWidth = wordSpan.getBoundingClientRect().width;
                                                            wordSpan.style.width = `${lightWidth}px`;
                    
                                                            setTimeout(() => {
                                                                wordSpan.classList.remove('light');
                                                                wordSpan.classList.remove('no-opacity');
                                                            }, 50);
                    
                                                            wordIndex++;
                                                            setTimeout(addNextWord, 50);
                                                        } else {
                                                            if (isItalic) {
                                                                const termDescriptionNumberContainer = document.createElement('span');
                                                                termDescriptionNumberContainer.classList.add('term-description-number-container', `term-description-number-container-${termDescriptionCount}`, 'small');
        
                                                                const termDescriptionNumber = document.createElement('span');
                                                                termDescriptionNumber.classList.add('term-description-number', 'light');
                                                                termDescriptionNumber.textContent = termDescriptionCount < 10 ? `0${termDescriptionCount}` : termDescriptionCount;
        
                                                                termDescriptionNumberContainer.appendChild(termDescriptionNumber);
                                                                sentenceSpan.appendChild(termDescriptionNumberContainer);
        
                                                                setTimeout(() => {
                                                                    termDescriptionNumberContainer.classList.remove('small');
                                                                    termDescriptionNumber.classList.remove('light');
                                                                }, 10);
        
                                                                partIndex++;
                                                                setTimeout(processNextPart, 10);
        
                                                            } else {
                                                                partIndex++;
                                                                setTimeout(processNextPart, 0); 
                                                            }
                                                        }
                                                    }
                    
                                                    addNextWord();
                                                } else {
                                                    sentenceResolve();
                                                }
                                            }
                    
                                            processNextPart();
                                        });
                                    }
                                }
                            }
                    
                            createProjectDescription().then(() => addSentences().then(() => resolve()));
                        });
                        break;
                        
                }
            }
        }
    } finally {
        // console.log('Project rendering completed');
        isProjectRendering = false;
        return Promise.resolve(); // Explicitly resolve when done
    }
}

function handleComplete(content) {
    console.log("Received complete response:", content);
}

function handleSecondComplete(content, stateId) {

    // Generate a unique URL if we have a stateId
    if (stateId) {
        const newUrl = `${window.location.origin}${window.location.pathname}?state=${stateId}`;
        window.history.pushState({ stateId: stateId }, '', newUrl);
    }

    // Check if streaming is still in progress and/or there is still images to render
    if (isStreaming) {
        const checkStreamingInterval = setInterval(() => {
            if (!isStreaming && imageQueue.length === 0) {
                clearInterval(checkStreamingInterval);

                handlePromptProposalsUpdate(content);
                stopStreamingAnimation();
                activateTermDescription();
                saveCurrentHTML();
                termDescriptionCount = 0;
                

                headlineProcessed = false;
            }
        }, 100);
        
    } else {
        if (!imageQueue.length === 0) {
            const checkImageQueueInterval = setInterval(() => {
                if (imageQueue.length === 0) {
                    clearInterval(checkImageQueueInterval);
    
                    handlePromptProposalsUpdate(content);
                    stopStreamingAnimation();
                    activateTermDescription();
                    saveCurrentHTML();
                    termDescriptionCount = 0;
                    
    
                    headlineProcessed = false;
                }
            }, 100);
        } else {
            handlePromptProposalsUpdate(content);
            stopStreamingAnimation();
            activateTermDescription();
            saveCurrentHTML();
            termDescriptionCount = 0;
            
    
            headlineProcessed = false;
        }

    }
}

// --------------------------------------------------------------------------------------------
// VERSION HISTORY
// --------------------------------------------------------------------------------------------

function saveCurrentHTML() {
    const currentHTML = contentContainer.innerHTML;
    console.log('currentHTML', currentHTML);

    responseMap[responseCount] = {
        content: currentHTML,
        stateId: null
    };

}

function addNewVersionHistoryElement(headline) {
    headlineProcessed = true;
    
    const historyElements = document.querySelectorAll('.version-history-element');

    // Create the new version-history element
    const newHistoryElement = document.createElement('div');
    newHistoryElement.classList.add('version-history-element', 'current-version-history-element', 'no-width');
    newHistoryElement.id = `version-history-element-${responseCount}`;
    newHistoryElement.setAttribute('version-history-key', responseCount);

    const versionHistoryElementContent = document.createElement('div');
    versionHistoryElementContent.classList.add('version-history-element-content');

    const versionHistoryNumber = document.createElement('div');
    versionHistoryNumber.classList.add('version-history-element-number');

    const versionHistoryDigits = document.createElement('div');
    versionHistoryDigits.classList.add('version-history-element-digits', 'no-opacity', 'light');
    versionHistoryDigits.textContent = (responseCount).toString().padStart(2, '0');

    const versionHistoryTitle = document.createElement('div');
    versionHistoryTitle.classList.add('version-history-element-title', 'no-opacity', 'light');
    versionHistoryTitle.textContent = headline;

    versionHistoryNumber.appendChild(versionHistoryDigits);
    versionHistoryElementContent.appendChild(versionHistoryNumber);
    versionHistoryElementContent.appendChild(versionHistoryTitle);
    newHistoryElement.appendChild(versionHistoryElementContent);
    versionHistory.insertBefore(newHistoryElement, versionHistory.firstChild);

    const versionHistoryElementPadding = getCSSVarValue('--version-history-element-padding');

    setTimeout(() => {
        newHistoryElement.style.width = versionHistoryTitle.scrollWidth + 1.5 + 'px';
        newHistoryElement.classList.remove('no-width');

        historyElements.forEach(element => {
            element.classList.remove('current-version-history-element');
        });
    }, 10);

    setTimeout(() => {
        versionHistoryDigits.classList.remove('no-opacity');
        versionHistoryTitle.classList.remove('no-opacity');
    }, 500);

    setTimeout(() => {
        versionHistoryDigits.classList.remove('light');
        versionHistoryTitle.classList.remove('light');
    }, 800);

    setTimeout(() => {
        newHistoryElement.style.width = '';
    }, 2000);

    newHistoryElement.addEventListener('click', (event) => {
        handleVersionEvent(event);
    });

    newHistoryElement.addEventListener('mouseover', (event) => {
        document.body.classList.add('hover');
        handleVersionEvent(event);
    });

    newHistoryElement.addEventListener('mouseout', (event) => {
        document.body.classList.remove('hover');
        handleVersionEvent(event);
    });

}

// Define the handler function separately so it can be removed later
function handleVersionEvent(event) {

    if (isStreaming) {
        return;
    }

    const eventTarget = event.currentTarget;
    const eventType = event.type;

    const pagePadding = getCSSVarValue('--page-padding');
    const historyElements = document.querySelectorAll('.version-history-element');

    if (eventType === 'click') {

        historyElements.forEach(el => {
            el.classList.remove('current-version-history-element');
        });

        eventTarget.classList.add('current-version-history-element');

        displayPreviousVersion(event.currentTarget);

    } else if (eventType === 'mouseover') {
        clearTimeout(displayVersionOnHoverTimeout);
        displayVersionOnHoverTimeout = setTimeout(() => {
            displayPreviousVersion(eventTarget);
        }, 100);
    } else if (eventType === 'mouseout') {
        const currentVersionHistoryElement = document.querySelector('.current-version-history-element');
        clearTimeout(displayVersionOnHoverTimeout);
        displayVersionOnHoverTimeout = setTimeout(() => {
            displayPreviousVersion(currentVersionHistoryElement);
        }, 100);
    }
    
    // // setTimeout(() => {
    // //     const scrollLeft = clickedElement.offsetLeft - pagePadding;
        
    // //     versionHistory.scrollTo({
    // //         left: scrollLeft,
    // //         behavior: 'smooth'
    // //     });
    // // }, 300);

}

// display previous version
function displayPreviousVersion(element) {

    const versionKey = parseInt(element.getAttribute('version-history-key'));
    const currentVersionKey = parseInt(contentContainer.getAttribute('data-version-key'));

    if (versionKey === currentVersionKey) { // if the version is already displayed, return
        return;
    }

    contentContainer.setAttribute('data-version-key', versionKey);
    clearContentContainer(true);


    if (versionKey === 0 || versionKey === 1) {
        
        // Reset the URL to the base URL without state parameter
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.pushState({}, '', baseUrl);
        return;
    }

    // Get the corresponding content from componentsMap
    const versionContent = responseMap[versionKey].content;
    const stateId = responseMap[versionKey].stateId;

    console.log('versionContent', versionContent);

    // Update the URL with the stateId if it exists
    if (stateId) {
        const newUrl = `${window.location.origin}${window.location.pathname}?state=${stateId}`;
        window.history.pushState({ stateId: stateId }, '', newUrl);
    }

    setTimeout(() => {
        contentContainer.innerHTML = versionContent;
    }, 400);

    setTimeout(() => {
        const targetElements = Array.from(contentContainer.querySelectorAll('*')).filter(element => {
            const hasElementChildren = Array.from(element.children).length > 0;
            return !hasElementChildren && 
                (element.tagName.toLowerCase() === 'span' || 
                 element.tagName.toLowerCase() === 'div' || 
                 element.tagName.toLowerCase() === 'p');
        });


        targetElements.forEach(element => {
            element.classList.add('no-transition', 'light');
            
            setTimeout(() => {
                element.classList.add('animation-settings');
            }, 10);
        });

        setTimeout(() => {
            contentContainer.classList.remove('no-opacity');
        }, 100);

        setTimeout(() => {
            targetElements.forEach(element => {
                element.classList.remove('light');
            });
        }, 200);

        setTimeout(() => {
            targetElements.forEach(element => {
                element.classList.remove('animation-settings');
                element.classList.remove('no-transition');
            });
        }, 500);
    }, 600);
}

// const container = document.getElementById("scroll-container");

versionHistory.addEventListener("mousemove", (e) => {
  const rect = versionHistory.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; // position within container
  const containerWidth = rect.width;
  const scrollWidth = versionHistory.scrollWidth;
  const maxScroll = scrollWidth - containerWidth;
  
  // Calculate the inverse position ratio (0 to 1)
  // When mouse is at far left (mouseX = 0), we want to scroll to far right
  // When mouse is at far right (mouseX = containerWidth), we want to scroll to far left
  const ratio = mouseX / containerWidth;
  
  // Apply the ratio to get the exact scroll position
  versionHistory.scrollLeft = ratio * maxScroll;
  
});

// Clean up the stored position when mouse leaves
versionHistory.addEventListener("mouseleave", () => {
  versionHistory.lastMouseX = undefined;
});

// Scroll on desktop
function handleScrollOnHover() {
    let scrollInterval = null;
    let currentSpeed = 0;
    const maxSpeed = 8; // Maximum scroll speed
    const acceleration = 0.15; // How quickly we reach max speed
    const scrollDelay = 16; // 60fps timing
    
    const startScrolling = (direction) => {
        if (scrollInterval) return;
        
        scrollInterval = setInterval(() => {
            // Gradually increase speed until we reach maxSpeed
            if (Math.abs(currentSpeed) < maxSpeed) {
                currentSpeed += direction * acceleration;
            }
            
            // Apply the scroll
            versionHistory.scrollLeft += currentSpeed;
        }, scrollDelay);
    };

    const stopScrolling = () => {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
            
            // Decelerate smoothly
            const decelerate = setInterval(() => {
                if (Math.abs(currentSpeed) > 0.01) {
                    currentSpeed *= 0.95; // Reduce speed by 10% each frame
                    versionHistory.scrollLeft += currentSpeed;
                } else {
                    currentSpeed = 0;
                    clearInterval(decelerate);
                }
            }, scrollDelay);
        }
    };

    versionHistory.addEventListener('mousemove', (e) => {
        // e is the event object that JavaScript creates when an event occurs and contains information about the event (mouseposition)
        const rect = versionHistory.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        if (mouseX < 75) {
            // If mouse is within 100px of left edge
            startScrolling(-1);
            // Start scrolling left
        } else if (mouseX > rect.width - 75) {
            // If mouse is within 100px of right edge
            startScrolling(1);
            // Start scrolling right
        } else {
            // If mouse is in the middle area
            stopScrolling();
            // Stop any active scrolling
        }
    });

    versionHistory.addEventListener('mouseleave', () => {
        stopScrolling();
    });
}

function updateVersionHistoryOnPageScroll() {
    const currentScrollY = window.scrollY;
    const scrolledDistance = currentScrollY - lastScrollY;
  
    if (Math.abs(scrolledDistance) >= thresholdScroll) {
      if (scrolledDistance > 0) {
        // Scrolling down
        document.body.classList.add("scroll-down");
      } else {
        // Scrolling up
        document.body.classList.remove("scroll-down");
      }
  
      lastScrollY = currentScrollY;
    }
  
    scrolling = false;
}

// function to update the current version history element on mobile devices when verionHistory container gets scrolled
function updateCurrentVersion() {
    if (window.innerWidth > mobileWidth) return;

    let currentVersionElement = null;

    const pagePadding = parseInt(getCSSVarValue('--page-padding'));
    const leftEdge = pagePadding;

    const historyElements = versionHistory.querySelectorAll('.version-history-element');
    const threshold = 5;

    historyElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const elementLeft = rect.left;

        if (Math.abs(elementLeft - leftEdge) <= threshold) {
            console.log('Current version element:', element);
            currentVersionElement = element;
        }
    });

    if (currentVersionElement) {
        currentVersionElement.classList.add('current-version-history-element');
        displayPreviousVersion(currentVersionElement);
    }
}

function startVersionHistoryScrollMobile() {
    if (window.innerWidth > mobileWidth) return;

    const pagePadding = getCSSVarValue('--page-padding');
    const leftEdge = pagePadding;

    const minFontSize = getCSSVarValue('--secondary-font-size');
    const maxFontSize = getCSSVarValue('--large-font-size');
    const fontSizeRange = maxFontSize - minFontSize;

    const maxFontWeight = getCSSVarValue('--font-weight-bold');
    const minFontWeight = getCSSVarValue('--font-weight-light');
    const fontWeightRange = maxFontWeight - minFontWeight;

    const maxLetterSpacing = getCSSVarValue('--letter-spacing-large');
    const minLetterSpacing = getCSSVarValue('--letter-spacing-small');
    const letterSpacingRange = maxLetterSpacing - minLetterSpacing;

    let currentElement = versionHistory.querySelector('.current-version-history-element');
    if (currentElement) {
        // currentElement.classList.add('no-transition');
        const titleElement = currentElement.querySelector('.version-history-element-title');

        // Calculate distance from left edge
        const elementRect = currentElement.getBoundingClientRect();
        const distance = Math.abs(elementRect.left - leftEdge);
    
        const maxDistance = 1;
        const ratio = Math.max(0, 1 - (distance / maxDistance));

        const fontSize = minFontSize + (fontSizeRange * ratio);
        const fontWeight = minFontWeight + (fontWeightRange * ratio);
        const letterSpacing = minLetterSpacing + (letterSpacingRange * ratio);

        // titleElement.style.fontSize = `${fontSize}px`;
        // titleElement.style.fontVariationSettings = `"wght" ${fontWeight}`;
        // titleElement.style.letterSpacing = `${letterSpacing}px`;

        if (distance >= maxDistance) {
            console.log('distance >= maxDistance');
            // Reset styles to stylesheet defaults
            // titleElement.style.fontSize = '';
            // titleElement.style.fontVariationSettings = '';
            // titleElement.style.letterSpacing = '';

            currentElement.classList.remove('current-version-history-element', 'no-transition');
            clearContentContainer(true);
            currentElement = null;
        }
    }
}

// function animateVersionHistoryScrollMobile() {
//     if (window.innerWidth > mobileWidth) return;
    
//     const historyElements = document.querySelectorAll('.version-history-element');
//     let closestElementLeft = null;
//     let closestDistanceLeft = Infinity;
//     let closestElementRight = null;
//     let closestDistanceRight = -Infinity;

//     const pagePadding = getCSSVarValue('--page-padding');
//     const leftEdge = pagePadding;
    
//     const minFontSize = getCSSVarValue('--secondary-font-size');
//     const maxFontSize = getCSSVarValue('--large-font-size');
//     const fontSizeRange = maxFontSize - minFontSize;

//     historyElements.forEach(element => {
//         const elementRect = element.getBoundingClientRect();
//         const distance = elementRect.left - leftEdge;
                
//         if (distance < closestDistanceLeft && distance >= -1) {
//             closestDistanceLeft = distance;
//             closestElementLeft = element;
//         }

//         if (distance > closestDistanceRight && distance < -1) {
//             closestDistanceRight = distance;
//             closestElementRight = element;
//         }
//     });

//     if (closestElementRight) {
//         const titleElement = closestElementRight.querySelector('.version-history-element-title');
//         console.log('titleElement', titleElement);
//         if (titleElement) {
//             const ratio = Math.max(0, 1 - (Math.abs(closestDistanceRight + 1) / 100));
//             console.log('ratio', ratio);
//             const fontSize = minFontSize + (fontSizeRange * ratio);
//             titleElement.style.fontSize = `${fontSize}px`;
//         }
//     }

//     // Reset font size for all other elements
//     historyElements.forEach(element => {
//         if (element !== closestElementLeft && element !== closestElementRight) {
//             const titleElement = element.querySelector('.version-history-element-title');
//             if (titleElement) {
//                 titleElement.style.fontSize = `${minFontSize}px`;
//             }
//         }
//     });
// }


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
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                activeEventSource = null;
                break;
        }
    };

    activeEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        activeEventSource.close();
        activeEventSource = null;
    };
};

async function handleDeltaRework(content) {
    // console.log('handleDeltaRework', content);
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
    userInput.value = element.innerHTML;

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
// WEBSEARCH
// --------------------------------------------------------------------------------------------

function activateTermDescription() {
    const termsDescriptionNumberContainers = document.querySelectorAll('.term-description-number-container');

    termsDescriptionNumberContainers.forEach(termDescriptionNumberContainer => {
        termDescriptionNumberContainer.addEventListener('click', () => {
            const termContainer = termDescriptionNumberContainer.previousElementSibling;
            let termForWebsearch = '';

            if (window.innerWidth <= mobileWidth) {
                const websearchColumn = document.querySelector('.websearch-column');
                websearchColumn.classList.add('translate-x');
                contentContainer.classList.add('translate-x');

                setTimeout(() => {
                    contentContainer.addEventListener('click', () => {
                        websearchColumn.classList.remove('translate-x');
                        contentContainer.classList.remove('translate-x');
                    }, {once: true});
                }, 1000);
            }

            // Check if term was activated already or if there might be a websearch going on at the moment
            if (!termDescriptionNumberContainer.classList.contains('active') && !currentWebsearchTerm) {
                termDescriptionNumberContainer.classList.add('active');
                currentWebsearchTerm = termContainer;


                const termWords = termContainer.querySelectorAll('.word');
                        
                // Combine all term words into termForWebsearch
                termWords.forEach(word => {
                    // Add the word text to termForWebsearch
                    // If it's not the first word, add a space before it
                    if (termForWebsearch !== '') {
                        termForWebsearch += ' ';
                    }
                    termForWebsearch += word.textContent;
                });
                
                console.log('Term for websearch:', termForWebsearch);
                requestWebsearch(termForWebsearch, termDescriptionNumberContainer);
            }
        });
    });
}

function requestWebsearch(termForWebsearch, termDescriptionNumberContainer) {
    
    const message = termForWebsearch;
    if (message === '') return;  // Don't send empty messages

    termDescriptionNumberContainer.pulseInterval = setInterval(() => {
        termDescriptionNumberContainer.classList.add('animation-settings-3');
        if (termDescriptionNumberContainer.classList.contains('big')) {
            termDescriptionNumberContainer.classList.remove('big');
        } else {
            termDescriptionNumberContainer.classList.add('big');
        }
    }, 1000);

    // isStreaming = true;
    // document.body.classList.add('streaming');

    isWebsearchStreamingURL = false;
    websearchBuffer = '';
    websearchWordQueue = [];
    isProcessingWebsearchWords = false;

    // Send message to backend (Flask server)
    // This is a post request that triggers the function in main.py
    fetch('/content4', {  // HTTP request to the '/content' endpoint of your server using the Fetch API
        method: 'POST', // Specifies that this is a POST request, which is used to send data to the server
        headers: {
            'Content-Type': 'application/json', // Specifies the type of content being sent
        },
        body: JSON.stringify({message: message}) // Converts the message to a JSON string and sends it as the body of the request
    })
    .then(response => response.json()) // Waits for the response from the server and converts it to a JSON object
    .then(data => { // waits for the response to be converted to a JSON object
        if (data.status === "ok") { // checks if the status of the response is "ok"
            startStreamingWebsearch(); // starts the streaming response
        }        
    }).catch(error => { // handles any errors that occur during the request
        console.error('Error sending message:', error); // logs the error to the console
    });
}

function startStreamingWebsearch() {
    console.log("startStreamingWebsearch");

    // Close any existing EventSource connection
    if (activeEventSource) {
        activeEventSource.close();
        console.log("Closed previous activeEventSource connection.");
    }

    activeEventSource = new EventSource("/stream4"); // creates a new EventSource connection to the "/stream" endpoint. activeEventSource is used for Server-Sent Events (SSE), allowing the server to push data to the client in real-time over a single, long-lived connection

    activeEventSource.onmessage = function(event) { // eventhandler that will be called whenever a message is received from the server
        const data = JSON.parse(event.data); // parsed the received message data from JSON string format to a JavaScript object

        switch(data.type) { // switch statement to handle different types of messages (switch statement is used to handle different cases based on the value of a variable -> alternative to if-else statements)
            case 'delta': // if the message type is 'delta', it calls the handleDelta function
                handleDeltaWebsearch(data.content);
                break;
            case 'complete': // if the message type is 'complete', it calls the handleComplete function
                finalizeWebsearch(); // ensure the last word of the websearch is processed
                activeEventSource.close();
                activeEventSource = null;
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                activeEventSource.close();
                activeEventSource = null;
                break;
        }
    };

    activeEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        activeEventSource.close();
        activeEventSource = null;
    };
}

async function handleDeltaWebsearch(content) {
    console.log("handleDeltaWebsearch", content);
    // console.log("Websearch Word Queue call on Delta: ", websearchWordQueue);

    // Exclude URLs from the content
    if (content.includes('http://') || 
        content.includes('https://') || 
        content.includes('www.') ||
        content.includes('.com') ||
        content.includes('.org') ||
        content.includes('.net') ||
        content.includes('](http') ||
        content.includes('](##') ||
        content.trim().startsWith('(http')) {
        console.log("URL detected: ", content);
        isWebsearchStreamingURL = true;
        return;
    }

    // If the content is a URL and there is a space, the URL has ended
    if (isWebsearchStreamingURL && 
        (content.includes(' ') || content.includes('\n') || content.includes('\r\n'))) {
        // Get the content after the URL by splitting at the first space or newline
        const splitContent = content.split(/[ \n\r\n]/);
        content = splitContent.slice(1).join(' '); // Take everything after the URL part
        isWebsearchStreamingURL = false;
    }

    if (!isWebsearchStreamingURL) {

        websearchBuffer += content;

        // Check if we have complete words (separated by spaces)
        if (websearchBuffer.includes(' ')) {
            // Split by space, keeping the last part (which might be incomplete)
            const parts = websearchBuffer.split(' ');
            const lastPart = parts.pop(); // Pop() removes the last element from an array and returns that element
            
            // Add complete words to the queue
            websearchWordQueue.push(...parts.filter(word => word.trim() !== '')); // ... is the spread operator, it spreads the elements of the array into individual elements (otherwise it would be added as one array)
            
            // Keep the last part in the buffer (it might be incomplete)
            websearchBuffer = lastPart;
        }
    }

    if (isWebsearchContainerProcessing) return;


    const termIndex = currentWebsearchTerm.getAttribute('data-term-index');
    let websearchDescriptionContainer = document.querySelector(`.term-description-container-${termIndex}`);

    if (!websearchDescriptionContainer) {
        isWebsearchContainerProcessing = true;

        await new Promise((resolve) => {

            // Different timing for desktop and mobile
            if (window.innerWidth <= mobileWidth) {

                websearchDescriptionContainer = document.createElement('div');
                websearchDescriptionContainer.classList.add('term-description-container', `term-description-container-${termIndex}`, 'no-width');
                webSearchColumn.appendChild(websearchDescriptionContainer);
    
                const termDescriptionNumberContainerCopy = document.createElement('span');
                termDescriptionNumberContainerCopy.classList.add('term-description-number-container', 'term-description-number-container-copy', 'small', 'no-opacity');
    
                const termDescriptionNumberCopy = document.createElement('span');
                termDescriptionNumberCopy.classList.add('term-description-number', 'light');
                termDescriptionNumberCopy.textContent = termIndex < 10 ? `0${termIndex}` : termIndex;
                termDescriptionNumberContainerCopy.appendChild(termDescriptionNumberCopy);
    
                termDescriptionNumberContainerCopy.appendChild(termDescriptionNumberCopy);
                websearchDescriptionContainer.appendChild(termDescriptionNumberContainerCopy);
    
                setTimeout(() => {
                    websearchDescriptionContainer.classList.remove('no-width');
                }, animationDuration * 2 + 10);
    
                setTimeout(() => {
                    termDescriptionNumberContainerCopy.classList.remove('small', 'no-opacity');
                    termDescriptionNumberCopy.classList.remove('light');

                }, animationDuration * 3 + 10);
                
                setTimeout(() => {
                    isWebsearchContainerProcessing = false;
                    resolve();
                }, animationDuration * 4);

            } else {
                websearchDescriptionContainer = document.createElement('div');
                websearchDescriptionContainer.classList.add('term-description-container', `term-description-container-${termIndex}`, 'no-width');
                webSearchColumn.appendChild(websearchDescriptionContainer);
    
                const termDescriptionNumberContainerCopy = document.createElement('span');
                termDescriptionNumberContainerCopy.classList.add('term-description-number-container', 'term-description-number-container-copy', 'small', 'no-opacity');
    
                const termDescriptionNumberCopy = document.createElement('span');
                termDescriptionNumberCopy.classList.add('term-description-number', 'light');
                termDescriptionNumberCopy.textContent = termIndex < 10 ? `0${termIndex}` : termIndex;
                termDescriptionNumberContainerCopy.appendChild(termDescriptionNumberCopy);
    
                termDescriptionNumberContainerCopy.appendChild(termDescriptionNumberCopy);
                websearchDescriptionContainer.appendChild(termDescriptionNumberContainerCopy);
    
                setTimeout(() => {
                    websearchDescriptionContainer.classList.remove('no-width');
                }, 10);
    
                setTimeout(() => {
                    termDescriptionNumberContainerCopy.classList.remove('small', 'no-opacity');
                    termDescriptionNumberCopy.classList.remove('light');
                }, animationDuration);
                
                setTimeout(() => {
                    isWebsearchContainerProcessing = false;
                    resolve();
                }, animationDuration * 2);
            }
        });
    }

    if (!isWebsearchStreamingURL) {
        // Start processing the queue if not already processing
        if (!isProcessingWebsearchWords) {
            processNextWebsearchWord(websearchDescriptionContainer);
        }
    }
}

function processNextWebsearchWord(websearchDescriptionContainer) {
    if (websearchWordQueue.length === 0) {
        isProcessingWebsearchWords = false;
        return;
    }
    
    isProcessingWebsearchWords = true;
    const word = websearchWordQueue.shift();

    // Create a span for the word
    const wordSpan = document.createElement('span');
    wordSpan.classList.add('websearch-content', 'light');
    wordSpan.textContent = word;
        
    // Add space before word if not the first word
    if (websearchDescriptionContainer.querySelector('.websearch-content')) {
        websearchDescriptionContainer.appendChild(document.createTextNode(' '));
    }
    
    // Add the span to the websearch div
    websearchDescriptionContainer.appendChild(wordSpan);

    wordSpan.style.display = 'inline-block';
    const lightWidth = wordSpan.getBoundingClientRect().width;
    wordSpan.style.width = `${lightWidth}px`;
    
    setTimeout(() => {
        wordSpan.classList.remove('light');
    }, 20);
    
    // Process the next word after delay
    setTimeout(() => {
        processNextWebsearchWord(websearchDescriptionContainer);
    }, 100);
}

function finalizeWebsearch() {
    const termIndex = currentWebsearchTerm.getAttribute('data-term-index');
    // Process any remaining content in the buffer
    if (websearchBuffer.trim() !== '') {
        const websearchDescriptionContainer = document.querySelector(`.term-description-container-${termIndex}`);

        if (websearchDescriptionContainer) {
            websearchWordQueue.push(websearchBuffer.trim());
            websearchBuffer = '';
   
            if (!isProcessingWebsearchWords) {
                processNextWebsearchWord(websearchDescriptionContainer);
            }
        }        
    }

    // Clear the pulse animation after 3 seconds (Only temporary solution since this does not match the actual time that the websearch is fully rendered)
    setTimeout(() => {
        const termDescriptionNumberContainer = document.querySelector(`.term-description-number-container-${termIndex}`);
        if (termDescriptionNumberContainer && termDescriptionNumberContainer.pulseInterval) {
            clearInterval(termDescriptionNumberContainer.pulseInterval);
            termDescriptionNumberContainer.classList.remove('animation-settings-3', 'big');

            currentWebsearchTerm = null;
        }
    }, 4000);
}

// --------------------------------------------------------------------------------------------
// STOP STREAMING
// --------------------------------------------------------------------------------------------
 function stopStreaming() {
    console.log("stopStreaming");

    if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
    }

    // Reset streaming flags
    isStreaming = false;
    isProcessing = false;
    isProjectRendering = false;
    isReworkProcessing = false;
    
    // Clear all queues
    renderingQueue = [];
    projectRenderingQueue = [];
    reworkRenderingQueue = [];

    stopStreamingAnimation();

    const currentVersionHistoryElement = document.querySelector('.current-version-history-element');
    currentVersionHistoryElement.classList.add('streaming-stopped-in-process');
 }

// --------------------------------------------------------------------------------------------
// ACCESS CONTENT THROUGH URL
// --------------------------------------------------------------------------------------------

function loadStateFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const stateId = urlParams.get('state');
    
    if (stateId) {
        console.log("Found state ID in URL:", stateId);
        
        
        // Fetch the state data from the server
        fetch(`/get_state/${stateId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('State not found');
                }
                return response.json();
            })
            .then(data => {
                console.log("Loaded state data:", data);
                
                // Process first response
                if (data.first_response) {
                    // processContent(data.first_response);
                    console.log("data.first_response", data.first_response);
                }

                if (data.second_response) {
                    console.log("data.second_response", data.second_response);

                    // displayNewVersionHistoryElement(data.second_response);
                    // handlePromptProposalsUpdate(data.second_response);
                }
            })
            .catch(error => {
                console.error("Error loading state:", error);
                // Optionally show an error message to the user
            });
    }
}


// --------------------------------------------------------------------------------------------
// DOM CONTENT LOADED
// --------------------------------------------------------------------------------------------

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.getElementById('send-button');
    const startVersionHistoryElement = document.getElementById('version-history-element-1');
    const xButton = document.getElementById('x-button');

    userInput.addEventListener('focus', activateInput);
    userInput.addEventListener('blur', activateInput);
    userInput.addEventListener('input', inputAdded);

    sendButton.addEventListener('click', sendMessage);

    xButton.addEventListener('click', stopStreaming);

    const historyElements = document.querySelectorAll('.version-history-element');
    historyElements.forEach(element => {

        element.addEventListener('click', (event) => {
            handleVersionEvent(event);
        });

        element.addEventListener('mouseover', (event) => {
            document.body.classList.add('hover');
            handleVersionEvent(event);
        });

        element.addEventListener('mouseout', (event) => {
            document.body.classList.remove('hover');
            handleVersionEvent(event);
        });
    });
    
    loadStateFromUrl();

    // Version History
    // handleScrollOnHover();

    // versionHistory.addEventListener('scroll', () => {
    //     if (window.innerWidth <= mobileWidth) {
    //         requestAnimationFrame(startVersionHistoryScrollMobile);
    //     }

    //     clearTimeout(versionHistoryScrollTimeout);
    //     versionHistoryScrollTimeout = setTimeout(() => {
    //         snapToClosestVersionElement();
    //         // updateCurrentVersion();
    //     }, 100); 
    // });

    // On Page Scroll
    window.addEventListener("scroll", () => {
        if (!scrolling) {
          requestAnimationFrame(updateVersionHistoryOnPageScroll);
          ticking = true;
        }
    });
});

function snapToClosestVersionElement() {
    if (window.innerWidth > mobileWidth) return;

    const historyElements = document.querySelectorAll('.version-history-element');
    const pagePadding = getCSSVarValue('--page-padding');
    const leftEdge = pagePadding;

    let closestElement = null;
    let closestDistance = Infinity;

    historyElements.forEach(element => {
        const elementRect = element.getBoundingClientRect();
        const distance = Math.abs(elementRect.left - leftEdge);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestElement = element;
        }
    });

    if (closestElement) {
        const targetScrollLeft = closestElement.offsetLeft - leftEdge;
        
        // Start scrolling
        versionHistory.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });

        // Check element position
        const checkPosition = () => {
            const elementRect = closestElement.getBoundingClientRect();
            const distance = Math.abs(elementRect.left - leftEdge);
            
            if (distance <= 1) {
                setTimeout(() => {
                    closestElement.classList.add('current-version-history-element');
                    displayPreviousVersion(closestElement);
                }, 100);
            } else {
                requestAnimationFrame(checkPosition);
            }
        };
        requestAnimationFrame(checkPosition);
    }
}

