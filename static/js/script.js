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
            row.style.height = `0px`;
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
            row.style.height = `0px`;
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
                paragraphImage.style.height = `0px`;

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
const tabletWidth = 768;

let activeStreamAbort = null; // Track the active stream connection
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
let webSearchEventSource = null;
let isWebsearchStreamingURL = false;
let websearchBuffer = '';
let websearchWordQueue = [];
let isWebsearchContainerProcessing = false;
let isProcessingWebsearchWords = false;
let currentWebsearchTerm = null;
let currentLanguage = 'English'; // Global variable to store current AI response language
const webSearchColumn = document.querySelector('.websearch-column');

const userInput = document.getElementById('user-input');
const bottomNavigation = document.getElementById("bottom-navigation");
const bottomNavigationBack = document.getElementById("bottom-navigation-back");

const contentContainer = document.getElementById('content-container');
const plusMinusButton = document.getElementById('plus-minus-button');
let animationDuration = getCSSVarValue('--animation-duration-1', 300);

//Version History
const versionHistory = document.getElementById('version-history');
const startVersionHistoryElement = document.querySelector('.start-version-history-element');
const versionHistoryElement0 = document.getElementById('version-history-element-0');


let lastScrollY = window.scrollY;
let scrolling = false;
const thresholdScroll = 10;
let inputFocused = false;
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

// Thought process variables
let thoughtProcessArray = []; // Queue for processing
let processedThoughts = []; // Track all thoughts that have been processed
let isProcessingThoughts = false;
let dotAnimationInterval = null;
const thoughtProcessElement = document.getElementById('thought-process');
const thoughtProcessDots = document.getElementById('thought-process-dots');



// --------------------------------------------------------------------------------------------
// INPUTBAR
// --------------------------------------------------------------------------------------------

function activateInput(e) {
    const bottomNavigation = document.getElementById('bottom-navigation');

    if (!bottomNavigation.classList.contains('input-active')) {
        bottomNavigation.classList.add('input-active');
        inputFocused = true;
    } else {
        bottomNavigation.classList.remove('input-active');
        // Delay clearing the flag so keyboard-close scroll is also ignored
        setTimeout(() => {
            inputFocused = false;
            lastScrollY = window.scrollY;
        }, 400);
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
    const xButton = document.getElementById('x-button');

    

    if (bottomNavigation.classList.contains('prompt-proposal-opening-2')) {
        
        console.log('prompt-proposal-opening-2');
        bottomNavigation.classList.remove('prompt-proposal-opening-2', 'input-has-content-2');
        bottomNavigationBack.classList.remove('prompt-proposal-opening-2');
        bottomNavigation.classList.add('prompt-proposal-opening-1', 'input-has-content-1');
        bottomNavigationBack.classList.add('prompt-proposal-opening-1');
        bottomNavigation.classList.add('streaming-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('prompt-proposal-opening-1', 'input-has-content-1');
            bottomNavigationBack.classList.remove('prompt-proposal-opening-1');
            bottomNavigation.classList.remove('streaming-1');
            bottomNavigation.classList.add('streaming-2');

        }, 200);

    } else if (bottomNavigation.classList.contains('input-has-content-2')) {
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

    startFaviconLoading();
    startAnimateInput();
    displayXButton();

    setTimeout(() => {
        const thoughtProcessContainer = document.getElementById('thought-process-container');
        thoughtProcessContainer.classList.add('thinking-active');
        startDotAnimation(); // Start the dot animation
    }, 200);
};

function stopStreamingAnimation() {

    stopFaviconLoading();
    stopAnimateInput();

    const thoughtProcessContainer = document.getElementById('thought-process-container');
    thoughtProcessContainer.classList.remove('thinking-active');
    thoughtProcessElement.classList.add('no-opacity');

    stopDotAnimation(); // Stop the dot animation
}

function startAnimateInput() {

    placeholderAnimationActive = false;

    userInput.classList.add('animation-settings-2');
    userInput.classList.remove('light-nav');

    // userInput.inputAnimationInterval = setInterval(() => {
        
    //     if (userInput.classList.contains('light')) {
    //         userInput.classList.remove('light');
    //     } else {
    //         userInput.classList.add('light');
    //     }

    // }, 1000);
}

function stopAnimateInput() {

    userInput.classList.add('no-opacity', 'light-nav');

    setTimeout(() => {
        userInput.value = '';
        userInput.classList.remove('no-opacity');
        displayXButton();
        inputAdded();
    }, 200);

    setTimeout(() => {
        userInput.classList.remove('animation-settings-2');
        placeholderAnimationActive = true;
        animateInputPlaceholder();
    }, 800);

    // if (userInput.classList.contains('light')) {
    //     if (userInput.inputAnimationInterval) {
    //         clearInterval(userInput.inputAnimationInterval);
    //     }
    //     userInput.classList.remove('light');
    //     userInput.classList.add('light-nav', 'animation-settings-2');

    //     setTimeout(() => {
    //         userInput.classList.add('no-opacity');
    //     }, 300);

    //     setTimeout(() => {
    //         userInput.value = '';
    //         userInput.classList.remove('no-opacity');
    //         inputAdded();
    //     }, 500);

    //     setTimeout(() => {
    //         displayXButton();
    //     }, 800);

    //     setTimeout(() => {
    //         userInput.classList.remove('animation-settings-2');
    //         placeholderAnimationActive = true;
    //         animateInputPlaceholder();
    //     }, 1000);

    // } else {
    //     setTimeout(() => {
    //         if (userInput.inputAnimationInterval) {
    //             clearInterval(userInput.inputAnimationInterval);
    //         }
    //         userInput.classList.remove('light');
    //         userInput.classList.add('light-nav', 'animation-settings-2');

    //         setTimeout(() => {
    //             userInput.classList.add('no-opacity');
    //         }, 300);
    
    //         setTimeout(() => {
    //             userInput.value = '';
    //             userInput.classList.remove('no-opacity');
    //             inputAdded();
    //         }, 500);

    //         setTimeout(() => {
    //             displayXButton();
    //         }, 800);

    //         setTimeout(() => {
    //             userInput.classList.remove('animation-settings-2');
    //             placeholderAnimationActive = true;
    //             animateInputPlaceholder();
    //         }, 1000);

    //     }, 1000);
    // }
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
    headlineProcessed = false; // Reset headline processing flag for new request

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
        responseCount++;
        contentContainer.setAttribute('data-version-key', responseCount);
        startStreamingResponse(message);

        // Only clear content container if it has content
        if (contentContainer.children.length > 0) {
            clearContentContainer(false);  // Clear the UI content
        }
    }
}



function startStreamingResponse(message) {

    if (activeStreamAbort) {
        activeStreamAbort.abort();
        activeStreamAbort = null;
    }

    activeStreamAbort = new AbortController();

    fetch('/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: activeStreamAbort.signal
    }).then(async response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = JSON.parse(line.slice(6));
                    switch (data.type) {
                        case 'delta':
                            handleDelta(data.content);
                            break;
                        case 'complete':
                            handleComplete(data.content);
                            break;
                        case 'second_complete':
                            handleSecondComplete(data.content, data.stateId);
                            activeStreamAbort = null;
                            reader.cancel();
                            return;
                        case 'error':
                            console.error("Error:", data.content);
                            activeStreamAbort = null;
                            isStreaming = false;
                            stopStreamingAnimation();
                            saveCurrentHTML();
                            return;
                    }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Stream error:", e);
            }
        }
    }).catch(error => {
        if (error.name !== 'AbortError') {
            console.error("Stream failed:", error);
            activeStreamAbort = null;
        }
    });
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
    webSearchColumn.classList.add('animation-settings');
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

    webSearchColumn.querySelectorAll('*').forEach(element => {
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

    document.querySelectorAll('img').forEach(img => {
        img.classList.add('blur');
    });

    setTimeout(() => {
        contentContainer.classList.add('no-opacity');
        webSearchColumn.classList.add('no-opacity');
    }, 100);

    setTimeout(() => {
        contentContainer.innerHTML = '';
        webSearchColumn.innerHTML = '';
    }, 300);

    if (!isVersionHistory) {
        setTimeout(() => {
            contentContainer.classList.remove('animation-settings', 'no-opacity');
            webSearchColumn.classList.remove('animation-settings', 'no-opacity');
        }, 310);
    }
}

animateInputPlaceholder();

function animateInputPlaceholder() {
    const placeholders = [
        'Ask about Oskar...', // English
        'Frage nach Oskar...', // German
        'Pregunta por Oskar...', // Spanish
        '询问奥斯卡...', // Chinese
        'Demande à propos d\'Oskar...', // French
        'オスカーについて聞いて...', // Japanese
        'Chiedi di Oskar...', // Italian
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
// THOUGHT PROCESS HANDLING
// --------------------------------------------------------------------------------------------

async function handleThoughtProcess(thoughtProcessData) {
    if (!thoughtProcessData) {
        return;
    }

    await stopDotAnimation(); // Stop the dot animation and wait for it to complete

    // Normalize input: convert string to array, keep arrays as-is
    let thoughtsArray;
    if (typeof thoughtProcessData === 'string') {
        thoughtsArray = [thoughtProcessData]; // Wrap string in array
    } else if (Array.isArray(thoughtProcessData)) {
        thoughtsArray = thoughtProcessData;
    } else {
        return; // Invalid input type
    }

    if (thoughtsArray.length === 0) {
        return;
    }

    // Add new thoughts to queue (avoiding duplicates based on processed thoughts)
    for (const thought of thoughtsArray) {
        if (!processedThoughts.includes(thought)) {
            thoughtProcessArray.push(thought);
            processedThoughts.push(thought);
            console.log('Added thought to queue:', thought);
        }
    }
    
    // Start processing the queue if not already processing
    setTimeout(() => {
        if (!isProcessingThoughts && thoughtProcessArray.length > 0) {
            processThoughtQueue();
        }
    }, 300);
}

async function processThoughtQueue() {
    if (isProcessingThoughts || thoughtProcessArray.length === 0) {
        return;
    }
    
    isProcessingThoughts = true;
    
    while (thoughtProcessArray.length > 0) {
        const currentThought = thoughtProcessArray.shift(); // Get first thought from queue
        
        if (thoughtProcessElement) {
            // Add fade-out effect
            thoughtProcessElement.classList.add('no-opacity');

            // Wait 200ms, then update content and fade back in
            await new Promise(resolve => {
                setTimeout(() => {
                    // Clear any previous animation
                    const oldSpan = thoughtProcessElement.querySelector('.thought-process-text');
                    if (oldSpan && oldSpan.animationInterval) {
                        clearInterval(oldSpan.animationInterval);
                    }

                    const span = document.createElement('span');
                    span.classList.add('thought-process-text');
                    span.textContent = currentThought;
                    thoughtProcessElement.innerHTML = '';
                    thoughtProcessElement.appendChild(span);

                    if (isStreaming) {
                        thoughtProcessElement.classList.remove('no-opacity');
                        setupThoughtProcessAnimation();
                    }

                    resolve();
                }, 300);
            });
            
            // Wait a bit before processing next thought (optional - adjust timing as needed)
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            break; // Exit if no element to display in
        }
    }
    
    isProcessingThoughts = false;
}

function startDotAnimation() {
    if (!thoughtProcessDots || dotAnimationInterval) {
        return; // Exit if element doesn't exist or animation already running
    }
    
    let dotCount = 0;
    const maxDots = 3;
    
    // Clear any existing content
    thoughtProcessDots.textContent = '';
    thoughtProcessDots.classList.remove('no-opacity');

    
    dotAnimationInterval = setInterval(() => {
        if (dotCount < maxDots) {
            thoughtProcessDots.textContent += '.';
            dotCount++;
        } else {
            // All dots shown, clear them and start over
            thoughtProcessDots.textContent = '';
            dotCount = 0;
        }
    }, 200); // Add a dot every 200ms
}

async function stopDotAnimation() {
    if (!dotAnimationInterval) {
        return; // No animation running
    }

    return new Promise(resolve => {
        // Let the current cycle complete naturally
        const checkCycle = () => {
            if (thoughtProcessDots.textContent === '...') {
                // Full cycle completed, now stop
                clearInterval(dotAnimationInterval);
                dotAnimationInterval = null;
                
                thoughtProcessDots.classList.add('no-opacity');
                
                setTimeout(() => {
                    thoughtProcessDots.textContent = '';
                    resolve();
                }, 200);
            } else {
                // Check again in a short time
                setTimeout(checkCycle, 50);
            }
        };
        
        checkCycle();
    });
}



// --------------------------------------------------------------------------------------------
// HANDLE RESPONSE TYPES
// --------------------------------------------------------------------------------------------

async function handleDelta(content) {
    // console.log("Received delta:", content);

    // Capture the language from AI response for websearch as soon as it's available
    if (content && content.language) {
        currentLanguage = content.language;
        console.log("Captured language from delta for websearch:", currentLanguage);
    }

    // Handle thought process first
    if (content && content.thought_process) {
        handleThoughtProcess(content.thought_process);
    }

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

                        if (component.thought_process) {
                            handleThoughtProcess(component.thought_process);
                        }

                        if (!component.text || !Array.isArray(component.text)) { // wait till text is available (therefore necessary information for the layout e.g. image will be available)
                            break;
                        }

                        let paragraphContainer = document.querySelector(`[data-component-key="${componentID}"]`);

                        if (!paragraphContainer) {

                            paragraphContainerCount++;
                            
                            if (contentContainer.lastElementChild && contentContainer.lastElementChild.classList.contains('paragraph-outter-container')) {
                                allParagraphContainers = contentContainer.querySelectorAll('.paragraph-container');
                                previousParagraphContainer = allParagraphContainers[allParagraphContainers.length - 1];
                            }

                            if ((paragraphContainerCount % 2 === 1)) {
                                await processImageQueue();
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

                            // Define Layout based on previous paragraphs and images
                            // Always use desktop wrapper div structure so CSS grid-column works at all viewport sizes
                            {
                                // Check if there is a previous paragraph container or if it is the first paragraph
                                if (!previousParagraphContainer) {
                                    const largeParagraphContainer = document.createElement('div');
                                    largeParagraphContainer.classList.add('large-paragraph-container', 'paragraph-outter-container');

                                    paragraphContainer.classList.add('large-paragraph');
                                    paragraphContainer.setAttribute('data-width', 'large');

                                    if ((contentContainer.lastElementChild && !contentContainer.lastElementChild.classList.contains('paragraph-outter-container'))) { // only execute if there is a paragraph outter container or on mobile
                                        largeParagraphContainer.classList.add('margin-top');
                                    } 


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
                                            let text = isItalic ? part.slice(1, -1) : part; // if the part is italic, remove the brackets and the text
                                            let words = text.trim().split(' ').filter(w => w); // split the text into words and remove empty strings

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
                                            if (startWithPunctuation) {
                                                const lastEl = paragraphContainer.lastElementChild;
                                                if (lastEl?.classList.contains('term-description-number-container')) {
                                                    lastEl.classList.add('no-margin-right');
                                                }
                                                if (lastEl?.classList.contains('term-nowrap')) {
                                                    lastEl.querySelector('.term-description-number-container')?.classList.add('no-margin-right');
                                                    const punctMatch = text.match(/^([.,!?;:]+)/);
                                                    if (punctMatch) {
                                                        lastEl.appendChild(document.createTextNode(punctMatch[1]));
                                                        text = text.slice(punctMatch[1].length).trimStart();
                                                        words = text.trim().split(' ').filter(w => w);
                                                        if (words.length === 0) { partIndex++; processNextPart(); return; }
                                                        paragraphContainer.appendChild(document.createTextNode(' '));
                                                    }
                                                }
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

                                                        const noWrapSpan = document.createElement('span');
                                                        noWrapSpan.classList.add('term-nowrap');
                                                        noWrapSpan.style.whiteSpace = 'nowrap';
                                                        const lastWord = italicSpan?.lastElementChild;
                                                        if (lastWord) {
                                                            italicSpan.removeChild(lastWord);
                                                            noWrapSpan.appendChild(lastWord);
                                                        }
                                                        noWrapSpan.appendChild(termDescriptionNumberContainer);
                                                        paragraphContainer.appendChild(noWrapSpan);

                                                        setTimeout(() => {
                                                            termDescriptionNumberContainer.classList.remove('small');
                                                            termDescriptionNumber.classList.remove('light');
                                                        }, 10);

                                                        termDescriptionNumberContainer.addEventListener('click', handleTermClick);

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

                        if (component.thought_process) {
                            handleThoughtProcess(component.thought_process);
                        }

                        let listContainer = document.querySelector(`[data-component-key="${componentID}"]`);
                        if (!listContainer) {
                            listContainer = document.createElement('div');
                            listContainer.classList.add('list-container');
                            listContainer.setAttribute('data-component-key', componentID);
                            
                            // Check if contentContainer already has children
                            if (contentContainer.children.length > 0) {
                                listContainer.classList.add('margin-top');
                            }
                            
                            contentContainer.appendChild(listContainer);
                        }

                        if (component.headline) {
                                const headline = listContainer.querySelector('.list-headline');
                                if (!headline) {
                                    await new Promise((resolve) => {
                                        const headline = document.createElement('div');
                                        headline.classList.add('list-headline');
                                        
                                        // Instead of setting textContent directly, add words one by one
                                        listContainer.appendChild(headline);
                                        
                                        // Split headline into words and add them one by one
                                        const words = component.headline.split(' ');
                                        let wordIndex = 0;
                                        
                                        function addNextHeadlineWord() {
                                            if (wordIndex < words.length) {
                                                if (wordIndex > 0) {
                                                    headline.appendChild(document.createTextNode(' '));
                                                }
                                                
                                                const wordSpan = document.createElement('span');
                                                wordSpan.textContent = words[wordIndex];
                                                wordSpan.classList.add('list-headline-word', 'light');
                                                headline.appendChild(wordSpan);
                                                
                                                wordSpan.style.display = 'inline-block';
                                                const lightWidth = wordSpan.getBoundingClientRect().width;
                                                wordSpan.style.width = `${lightWidth}px`;
                                                
                                                setTimeout(() => {
                                                    wordSpan.classList.remove('light');
                                                }, 50);
                                                
                                                wordIndex++;
                                                
                                                setTimeout(addNextHeadlineWord, 50);
                                            } else {
                                                resolve();
                                            }
                                        }
                                        
                                        addNextHeadlineWord();
                                    });
                                }
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
                                    itemContainer.style.height = `0px`;
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
                                            let text = isItalic ? part.slice(1, -1) : part;
                                            let words = text.trim().split(' ').filter(w => w);

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
                                            if (startWithPunctuation) {
                                                const lastEl = textContainer.lastElementChild;
                                                if (lastEl?.classList.contains('term-description-number-container')) {
                                                    lastEl.classList.add('no-margin-right');
                                                }
                                                if (lastEl?.classList.contains('term-nowrap')) {
                                                    lastEl.querySelector('.term-description-number-container')?.classList.add('no-margin-right');
                                                    const punctMatch = text.match(/^([.,!?;:]+)/);
                                                    if (punctMatch) {
                                                        lastEl.appendChild(document.createTextNode(punctMatch[1]));
                                                        text = text.slice(punctMatch[1].length).trimStart();
                                                        words = text.trim().split(' ').filter(w => w);
                                                        if (words.length === 0) { partIndex++; processNextPart(); return; }
                                                        textContainer.appendChild(document.createTextNode(' '));
                                                    }
                                                }
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

                                                        const noWrapSpan = document.createElement('span');
                                                        noWrapSpan.classList.add('term-nowrap');
                                                        noWrapSpan.style.whiteSpace = 'nowrap';
                                                        const lastWord = italicSpan?.lastElementChild;
                                                        if (lastWord) {
                                                            italicSpan.removeChild(lastWord);
                                                            noWrapSpan.appendChild(lastWord);
                                                        }
                                                        noWrapSpan.appendChild(numberContainer);
                                                        textContainer.appendChild(noWrapSpan);
                            
                                                        setTimeout(() => {
                                                            numberContainer.classList.remove('small');
                                                            numberSpan.classList.remove('light');

                                                            numberContainer.addEventListener('click', handleTermClick);
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
                                                        let text = isItalic ? part.slice(1, -1) : part;
                                                        let words = text.trim().split(' ').filter(w => w);

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
                                                        if (startWithPunctuation) {
                                                            const lastEl = rowItem.lastElementChild;
                                                            if (lastEl?.classList.contains('term-description-number-container')) {
                                                                lastEl.classList.add('no-margin-right');
                                                            }
                                                            if (lastEl?.classList.contains('term-nowrap')) {
                                                                lastEl.querySelector('.term-description-number-container')?.classList.add('no-margin-right');
                                                                const punctMatch = text.match(/^([.,!?;:]+)/);
                                                                if (punctMatch) {
                                                                    lastEl.appendChild(document.createTextNode(punctMatch[1]));
                                                                    text = text.slice(punctMatch[1].length).trimStart();
                                                                    words = text.trim().split(' ').filter(w => w);
                                                                    if (words.length === 0) { partIndex++; processNextPart(); return; }
                                                                    rowItem.appendChild(document.createTextNode(' '));
                                                                }
                                                            }
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

                                                                    const noWrapSpan = document.createElement('span');
                                                                    noWrapSpan.classList.add('term-nowrap');
                                                                    noWrapSpan.style.whiteSpace = 'nowrap';
                                                                    const lastWord = italicSpan?.lastElementChild;
                                                                    if (lastWord) {
                                                                        italicSpan.removeChild(lastWord);
                                                                        noWrapSpan.appendChild(lastWord);
                                                                    }
                                                                    noWrapSpan.appendChild(numberContainer);
                                                                    rowItem.appendChild(noWrapSpan);

                                    
                                                                    setTimeout(() => {
                                                                        numberContainer.classList.remove('small');
                                                                        numberSpan.classList.remove('light');

                                                                        numberContainer.addEventListener('click', handleTermClick);
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

                        if (component.headline) {
                            if (projectsContainer.classList.contains('grid')) {
                                const headline = projectsContainer.querySelector('.project-list-headline');
                                if (!headline) {
                                    await new Promise((resolve) => {
                                        const headline = document.createElement('div');
                                        headline.classList.add('project-list-headline');
                                        
                                        // Instead of setting textContent directly, add words one by one
                                        projectsContainer.appendChild(headline);
                                        
                                        // Split headline into words and add them one by one
                                        const words = component.headline.split(' ');
                                        let wordIndex = 0;
                                        
                                        function addNextHeadlineWord() {
                                            if (wordIndex < words.length) {
                                                if (wordIndex > 0) {
                                                    headline.appendChild(document.createTextNode(' '));
                                                }
                                                
                                                const wordSpan = document.createElement('span');
                                                wordSpan.textContent = words[wordIndex];
                                                wordSpan.classList.add('project-list-headline-word', 'light');
                                                headline.appendChild(wordSpan);
                                                
                                                wordSpan.style.display = 'inline-block';
                                                const lightWidth = wordSpan.getBoundingClientRect().width;
                                                wordSpan.style.width = `${lightWidth}px`;
                                                
                                                setTimeout(() => {
                                                    wordSpan.classList.remove('light');
                                                }, 50);
                                                
                                                wordIndex++;
                                                
                                                setTimeout(addNextHeadlineWord, 50);
                                            } else {
                                                resolve();
                                            }
                                        }
                                        
                                        addNextHeadlineWord();
                                    });
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
                    project.addEventListener('click', handleGridProjectClick);
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
                                }, 10);
    
                            } else {
                                // Update the content if it already exists (optional)
                                projectName.textContent = value;
                            }
            
                            setTimeout(resolve, 200);
                        });
                        break;
                    case 'year':
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

                                imageContainer.addEventListener('mousemove', (e) => {
                                    const rect = imageContainer.getBoundingClientRect();
                                    const isRightHalf = (e.clientX - rect.left) > rect.width / 2;
                                    imageContainer.classList.toggle('cursor-next', isRightHalf);
                                    imageContainer.classList.toggle('cursor-prev', !isRightHalf);
                                });

                                imageContainer.addEventListener('mouseleave', () => {
                                    imageContainer.classList.remove('cursor-next', 'cursor-prev');
                                });

                                imageContainer.addEventListener('click', (e) => {
                                    const rect = imageContainer.getBoundingClientRect();
                                    const isRightHalf = (e.clientX - rect.left) > rect.width / 2;
                                    const imageWidth = imageContainer.offsetWidth;
                                    const currentIndex = Math.round(imageContainer.scrollLeft / imageWidth);
                                    const totalImages = imageContainer.querySelectorAll('.project-image').length;
                                    const nextIndex = isRightHalf
                                        ? Math.min(currentIndex + 1, totalImages - 1)
                                        : Math.max(currentIndex - 1, 0);
                                    imageContainer.scrollTo({ left: nextIndex * imageWidth, behavior: 'smooth' });
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
                                                    let text = isItalic ? part.slice(1, -1) : part;
                                                    let words = text.trim().split(' ').filter(w => w);

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
                                                    if (startWithPunctuation) {
                                                        const lastEl = sentenceSpan.lastElementChild;
                                                        if (lastEl?.classList.contains('term-description-number-container')) {
                                                            lastEl.classList.add('no-margin-right');
                                                        }
                                                        if (lastEl?.classList.contains('term-nowrap')) {
                                                            lastEl.querySelector('.term-description-number-container')?.classList.add('no-margin-right');
                                                            const punctMatch = text.match(/^([.,!?;:]+)/);
                                                            if (punctMatch) {
                                                                lastEl.appendChild(document.createTextNode(punctMatch[1]));
                                                                text = text.slice(punctMatch[1].length).trimStart();
                                                                words = text.trim().split(' ').filter(w => w);
                                                                if (words.length === 0) { partIndex++; processNextPart(); return; }
                                                                sentenceSpan.appendChild(document.createTextNode(' '));
                                                            }
                                                        }
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

                                                                const noWrapSpan = document.createElement('span');
                                                                noWrapSpan.classList.add('term-nowrap');
                                                                noWrapSpan.style.whiteSpace = 'nowrap';
                                                                const lastWord = italicSpan?.lastElementChild;
                                                                if (lastWord) {
                                                                    italicSpan.removeChild(lastWord);
                                                                    noWrapSpan.appendChild(lastWord);
                                                                }
                                                                noWrapSpan.appendChild(termDescriptionNumberContainer);
                                                                sentenceSpan.appendChild(noWrapSpan);
        
                                                                setTimeout(() => {
                                                                    termDescriptionNumberContainer.classList.remove('small');
                                                                    termDescriptionNumber.classList.remove('light');
                                                                    
                                                                    termDescriptionNumberContainer.addEventListener('click', handleTermClick);
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
    console.log('handleSecondComplete called with stateId:', stateId, 'responseCount:', responseCount);

    // Store the stateId in the current response
    if (!responseMap[responseCount]) {
        responseMap[responseCount] = {};
    }
    responseMap[responseCount].stateId = stateId;
    console.log('Set stateId in responseMap[' + responseCount + ']:', responseMap[responseCount]);

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
                    saveCurrentHTML();
                    termDescriptionCount = 0;
                    
    
                    headlineProcessed = false;
                }
            }, 100);
        } else {
            handlePromptProposalsUpdate(content);
            stopStreamingAnimation();
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
    // More efficient approach: use regex to remove style attributes from HTML string
    let currentHTML = contentContainer.innerHTML;
    
    // Remove all style attributes using regex (faster than DOM manipulation)
    currentHTML = currentHTML.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove 'active' class from all elements using regex
    currentHTML = currentHTML.replace(/\s*class\s*=\s*["']([^"']*)["']/gi, (match, classes) => {
        const cleanedClasses = classes.replace(/\b\s*active\s*\b/g, '').replace(/\s+/g, ' ').trim();
        return cleanedClasses ? ` class="${cleanedClasses}"` : '';
    });
    
    console.log('currentHTML', currentHTML);

    // Get the current headline from the version history element
    const currentVersionElement = document.querySelector('.current-version-history-element');
    const currentHeadline = currentVersionElement ? 
        currentVersionElement.querySelector('.version-history-element-title')?.textContent : null;

    // Preserve existing data if it exists
    const existingEntry = responseMap[responseCount] || {};
    console.log('saveCurrentHTML called for responseCount:', responseCount, 'existing entry:', existingEntry);
    
    responseMap[responseCount] = {
        ...existingEntry, // Preserve any existing data (including stateId)
        content: currentHTML,
        headline: currentHeadline
    };
    
    console.log('Updated responseMap[' + responseCount + ']:', responseMap[responseCount]);

    // If we have a stateId in the URL, save the content to the database
    const urlParams = new URLSearchParams(window.location.search);
    const stateId = urlParams.get('state');
    
    if (stateId) {
        // Save the current state to the database
        fetch('/save_state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state_id: stateId,
                content: currentHTML,
                headline: currentHeadline
            })

        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('State saved successfully');
            } else {
                console.error('Failed to save state:', data.error);
            }
        })
        .catch(error => {
            console.error('Error saving state:', error);
        });
    }
}

function addNewVersionHistoryElement(headline) {
    console.log('addNewVersionHistoryElement', headline);
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
    versionHistoryDigits.textContent = (responseCount - 1).toString().padStart(2, '0');

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
        versionHistoryDigits.classList.remove('light');
        versionHistoryTitle.classList.remove('light');
    }, 500);

    setTimeout(() => {
        newHistoryElement.style.width = '';
    }, 2000);

    newHistoryElement.addEventListener('click', (event) => {
        handleVersionEvent(event);
    });

    newHistoryElement.addEventListener('mouseover', (event) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        document.body.classList.add('hover');
        // handleVersionEvent(event);
    });

    newHistoryElement.addEventListener('mouseout', (event) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        document.body.classList.remove('hover');
        // handleVersionEvent(event);
    });

}

// Define the handler function separately so it can be removed later
function handleVersionEvent(event) {

    if (isStreaming) {
        stopStreaming();
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

    // Update the URL with the stateId if it exists
    if (stateId) {
        const newUrl = `${window.location.origin}${window.location.pathname}?state=${stateId}`;
        window.history.pushState({ stateId: stateId }, '', newUrl);
        console.log('URL updated to:', newUrl);
    } else {
        console.log('No stateId found for version:', versionKey, 'responseMap entry:', responseMap[versionKey]);
    }

    setTimeout(() => {
        contentContainer.innerHTML = versionContent;
        contentContainer.querySelectorAll('div[style], span[style]').forEach(el => {
            el.removeAttribute('style');
        });
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
            webSearchColumn.classList.remove('animation-settings', 'no-opacity');
        }, 100);

        setTimeout(() => {
            targetElements.forEach(element => {
                // Measure and set width before removing light class
                const elementWidth = element.getBoundingClientRect().width;
                element.style.width = `${elementWidth}px`;
                element.style.display = 'inline-block';
                
                element.classList.remove('light');
            });
        }, 200);

        setTimeout(() => {
            targetElements.forEach(element => {
                element.classList.remove('animation-settings');
                element.classList.remove('no-transition');
            });
            
            // Reattach event listeners after content is loaded
            reattachEventListeners();
        }, 500);
    }, 600);
}


versionHistory.addEventListener("mousemove", (e) => {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const rect = versionHistory.getBoundingClientRect();
  const mouseX = e.clientX - rect.left; // position within container
  const containerWidth = rect.width;
  const scrollWidth = versionHistory.scrollWidth;
  const maxScroll = scrollWidth - containerWidth;
  
  // Calculate the target scroll position based on mouse position
  const ratio = mouseX / containerWidth;
  const targetScrollLeft = ratio * maxScroll * 1.1;
  
  // Store the target position
  versionHistory.targetScrollLeft = targetScrollLeft;
  
  // If we don't have an animation already running, start one
  if (!versionHistory.isScrollAnimating) {
    versionHistory.isScrollAnimating = true;
    
    // Create smooth scrolling animation
    const smoothScroll = () => {
      // Current position
      const currentPosition = versionHistory.scrollLeft;
      // Distance to target (using the possibly updated target value)
      const distance = versionHistory.targetScrollLeft - currentPosition;
      
      // If we're close enough, just set to the target and stop
      if (Math.abs(distance) < 0.5) {
        versionHistory.scrollLeft = versionHistory.targetScrollLeft;
        versionHistory.isScrollAnimating = false;
        return;
      }

      // Otherwise, move a percentage of the remaining distance (easing)
      const step = distance * 0.1; // Adjust this value to control smoothness
      versionHistory.scrollLeft = currentPosition + step;

      // Continue the animation
      requestAnimationFrame(smoothScroll);
    };
    
    // Start the animation
    requestAnimationFrame(smoothScroll);
  }
});

// Clean up animation state when mouse leaves
versionHistory.addEventListener("mouseleave", () => {
  versionHistory.isScrollAnimating = false;
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

    document.querySelectorAll('.prompt-proposal-container').forEach(c => c.classList.remove('selected'));

    promptProposal1.textContent = content.prompt_proposal_1;
    promptProposal2.textContent = content.prompt_proposal_2;
    promptProposal3.textContent = content.prompt_proposal_3;
    promptProposal4.textContent = content.prompt_proposal_4;
}

// Generic handler for clicking on prompt elements that should be copied to input
function handlePromptClick(element) {
    const promptProposal = element.querySelector('.prompt-proposal');
    userInput.value = promptProposal.innerHTML;

    document.querySelectorAll('.prompt-proposal-container').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    setTimeout(() => {
        sendMessage();
    }, 1000);
}

// Add event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const promptProposalContainer1 = document.getElementById('prompt-proposal-container-1');
    const promptProposalContainer2 = document.getElementById('prompt-proposal-container-2');
    const promptProposalContainer3 = document.getElementById('prompt-proposal-container-3');
    const promptProposalContainer4 = document.getElementById('prompt-proposal-container-4');

    promptProposalContainer1.addEventListener('click', () => handlePromptClick(promptProposalContainer1));
    promptProposalContainer2.addEventListener('click', () => handlePromptClick(promptProposalContainer2));
    promptProposalContainer3.addEventListener('click', () => handlePromptClick(promptProposalContainer3));
    promptProposalContainer4.addEventListener('click', () => handlePromptClick(promptProposalContainer4));
});

plusMinusButton.addEventListener('click', togglePromptProposals);

function togglePromptProposals() {
    // const bottomNavigation = document.getElementById('bottom-navigation');
    console.log('togglePromptProposals');

    if (!bottomNavigation.classList.contains('prompt-proposal-opening-2')) {
        bottomNavigation.classList.add('prompt-proposal-opening-1');
        bottomNavigationBack.classList.add('prompt-proposal-opening-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('prompt-proposal-opening-1');
            bottomNavigation.classList.add('prompt-proposal-opening-2');

            bottomNavigationBack.classList.remove('prompt-proposal-opening-1');
            bottomNavigationBack.classList.add('prompt-proposal-opening-2');
            
        }, animationDuration);

        setTimeout(() => {
            setupPromptAnimations();
        }, animationDuration * 8);

    } else {
        bottomNavigation.classList.remove('prompt-proposal-opening-2');
        bottomNavigation.classList.add('prompt-proposal-opening-1');

        bottomNavigationBack.classList.remove('prompt-proposal-opening-2');
        bottomNavigationBack.classList.add('prompt-proposal-opening-1');

        setTimeout(() => {
            bottomNavigation.classList.remove('prompt-proposal-opening-1');
            bottomNavigationBack.classList.remove('prompt-proposal-opening-1');
            removePromptAnimations();
        }, animationDuration);
    }
}

function closePromptProposals() {

    bottomNavigation.classList.remove('prompt-proposal-opening-2');
    bottomNavigation.classList.add('prompt-proposal-opening-1');

    bottomNavigationBack.classList.remove('prompt-proposal-opening-2');
    bottomNavigationBack.classList.add('prompt-proposal-opening-1');

    setTimeout(() => {
        bottomNavigation.classList.remove('prompt-proposal-opening-1');
        bottomNavigationBack.classList.remove('prompt-proposal-opening-1');
    }, animationDuration);
}

// Animate prompt proposals horizontally if to long for the container

function setupPromptAnimations() {
    document.querySelectorAll('.prompt-proposal').forEach(el => {
      const container = el.parentElement;
    
      // Wait until layout is stable
      requestAnimationFrame(() => {
        if (el.scrollWidth > container.clientWidth + 20) {
          const scrollDistance = container.clientWidth - el.scrollWidth;
    
          // Set custom property dynamically
          el.style.setProperty('--scroll-distance', `${scrollDistance}px`);
    
          // Adjust duration based on distance
          const baseDuration = 0.15; // seconds per pixel
          const duration = Math.abs(scrollDistance) * baseDuration;
          const durationMS = duration * 1000;
          el.style.setProperty('--scroll-duration', `${duration}s`);
    
          // Initial animation
          el.classList.add('animate-scroll');
          
          // Add a pause between animations
          const pauseDuration = 4000; // 2 seconds pause between animations
          const totalCycleDuration = durationMS + pauseDuration;
          
          // Set up interval to toggle the animation class
          const animationInterval = setInterval(() => {
            // Remove class (stops animation)
            el.classList.remove('animate-scroll');
            
            // Add small delay before restarting animation
            setTimeout(() => {
              el.classList.add('animate-scroll');
            }, pauseDuration);
            
          }, totalCycleDuration);
          
          // Store the interval ID on the element for cleanup if needed
          el.animationInterval = animationInterval;
        }
      });
    });
  }

function removePromptAnimations() {
    document.querySelectorAll('.prompt-proposal').forEach(el => {
      if (el.animationInterval) {
        clearInterval(el.animationInterval);
        el.animationInterval = null;
        el.classList.remove('animate-scroll');
      }
    });
  }

function setupThoughtProcessAnimation() {
    const textEl = thoughtProcessElement.querySelector('.thought-process-text');
    if (!textEl) return;

    requestAnimationFrame(() => {
        if (textEl.scrollWidth > thoughtProcessElement.clientWidth + 20) {
            const scrollDistance = thoughtProcessElement.clientWidth - textEl.scrollWidth;

            textEl.style.setProperty('--scroll-distance', `${scrollDistance}px`);

            const baseDuration = 0.15;
            const duration = Math.abs(scrollDistance) * baseDuration;
            const durationMS = duration * 1000;
            textEl.style.setProperty('--scroll-duration', `${duration}s`);

            textEl.classList.add('animate-scroll');

            const pauseDuration = 4000;
            const totalCycleDuration = durationMS + pauseDuration;

            if (textEl.animationInterval) {
                clearInterval(textEl.animationInterval);
            }

            textEl.animationInterval = setInterval(() => {
                textEl.classList.remove('animate-scroll');
                setTimeout(() => {
                    textEl.classList.add('animate-scroll');
                }, pauseDuration);
            }, totalCycleDuration);
        }
    });
}






// --------------------------------------------------------------------------------------------
// REATTACH EVENT LISTENERS
// --------------------------------------------------------------------------------------------

function reattachEventListeners() {
    // Reattach click event listeners to all term description number containers
    const termContainers = document.querySelectorAll('.term-description-number-container');
    termContainers.forEach(container => {
        // Remove any existing listeners to avoid duplicates
        container.removeEventListener('click', handleTermClick);
        // Add the event listener
        container.addEventListener('click', handleTermClick);
    });

    // Reattach click event listeners to all grid projects
    const gridProjects = document.querySelectorAll('.grid > .project');
    gridProjects.forEach(project => {
        // Remove any existing listeners to avoid duplicates
        project.removeEventListener('click', handleGridProjectClick);
        // Add the event listener
        project.addEventListener('click', handleGridProjectClick);
    });
}

function handleGridProjectClick() {
    const projectNameElement = this.querySelector('.project-name-text');

    if (projectNameElement) {
        userInput.value = projectNameElement.textContent;
        inputAdded();

        setTimeout(() => {
            sendMessage();
        }, 100);
    }
}

// --------------------------------------------------------------------------------------------
// WEBSEARCH
// --------------------------------------------------------------------------------------------

function handleTermClick(event) {

    currentWebsearchTerm = null;
                                                            
    const termDescriptionNumberContainer = this;
    const termContainer = termDescriptionNumberContainer.previousElementSibling;
    let termForWebsearch = '';

    if (window.innerWidth <= tabletWidth) {
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
        
        requestWebsearch(termForWebsearch, termDescriptionNumberContainer);
    }
}

async function requestWebsearch(termForWebsearch, termDescriptionNumberContainer) {
    
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
        body: JSON.stringify({message: message, language: currentLanguage}) // Include the current language from AI response
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
    if (webSearchEventSource) {
        webSearchEventSource.close();
        console.log("Closed previous activeEventSource connection.");
    }

    webSearchEventSource = new EventSource("/stream4"); // creates a new EventSource connection to the "/stream" endpoint. activeEventSource is used for Server-Sent Events (SSE), allowing the server to push data to the client in real-time over a single, long-lived connection

    webSearchEventSource.onmessage = function(event) { // eventhandler that will be called whenever a message is received from the server
        const data = JSON.parse(event.data); // parsed the received message data from JSON string format to a JavaScript object

        switch(data.type) { // switch statement to handle different types of messages (switch statement is used to handle different cases based on the value of a variable -> alternative to if-else statements)
            case 'delta': // if the message type is 'delta', it calls the handleDelta function
                handleDeltaWebsearch(data.content);
                break;
            case 'complete': // if the message type is 'complete', it calls the handleComplete function
                finalizeWebsearch(); // ensure the last word of the websearch is processed
                webSearchEventSource.close();
                webSearchEventSource = null;
                break;
            case "error": // if the message type is 'error', it logs the error to the console and closes the event source
                console.error("Error:", data.content);
                webSearchEventSource.close();
                webSearchEventSource = null;
                const serverErrorMessage = document.createElement('div');
                serverErrorMessage.className = 'error-message';
                serverErrorMessage.textContent = 'Something went wrong. Please try again.';
                contentContainer.appendChild(serverErrorMessage);
                break;
        }
    };

    webSearchEventSource.onerror = function (error) { // eventhandler that will be called if an error occurs with the event source
        console.error("activeEventSource failed:", error);
        webSearchEventSource.close();
        webSearchEventSource = null;
        const connectionErrorMessage = document.createElement('div');
        connectionErrorMessage.className = 'error-message';
        connectionErrorMessage.textContent = 'Something went wrong. Please try again.';
        contentContainer.appendChild(connectionErrorMessage);
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


    if (!isWebsearchStreamingURL) {
        // Start processing the queue if not already processing
        if (!isProcessingWebsearchWords) {
            processNextWebsearchWord();
        }
    }
}

function processNextWebsearchWord() {
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

    const termIndex = currentWebsearchTerm.getAttribute('data-term-index');
    let websearchDescriptionContainer = document.querySelector(`.term-description-container-${termIndex}`);
        
    // Add space before word if not the first word
    if (websearchDescriptionContainer.querySelector('.websearch-content')) {
        websearchDescriptionContainer.appendChild(document.createTextNode(' '));
    }
    
    // Add the span to the websearch div
    websearchDescriptionContainer.appendChild(wordSpan);
    webSearchColumn.scrollTo({ top: webSearchColumn.scrollHeight, behavior: 'smooth' });

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
        }
    }, 4000);
}

// --------------------------------------------------------------------------------------------
// STOP STREAMING
// --------------------------------------------------------------------------------------------
 function stopStreaming() {
    console.log("stopStreaming");

    if (activeStreamAbort) {
        activeStreamAbort.abort();
        activeStreamAbort = null;
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
    
    // Save current HTML when streaming stops
    saveCurrentHTML();

    const currentVersionHistoryElement = document.querySelector('.current-version-history-element');
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
                
                if (data.content) {
                    // Clear existing content
                    // clearContentContainer();
                    
                    // Set the loaded content
                    contentContainer.innerHTML = data.content;
                    wrapBareParagraphContainers();

                    // Update response count and map
                    responseCount++;
                    contentContainer.setAttribute('data-version-key', responseCount);
                    responseMap[responseCount] = {
                        content: data.content,
                        headline: data.headline,
                        stateId: stateId
                    };
                    
                    // Use the headline from the database, or a fallback
                    const headline = data.headline || "Loaded State";
                    // Reset styles and update version history
                    addNewVersionHistoryElement(headline);

                    // Reattach event listeners after content is loaded
                    reattachEventListeners();
                    
                    console.log("State loaded successfully");
                } else {
                    console.error("No content found in state data");
                }
            })
            .catch(error => {
                console.error("Error loading state:", error);
                // Show error message to user
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Could not load the requested state. It may have expired or been deleted.';
                contentContainer.appendChild(errorMessage);
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
            if (window.matchMedia('(pointer: coarse)').matches) return;
            document.body.classList.add('hover');
            // handleVersionEvent(event);
        });

        element.addEventListener('mouseout', (event) => {
            if (window.matchMedia('(pointer: coarse)').matches) return;
            document.body.classList.remove('hover');
            // handleVersionEvent(event);
        });
    });
    
    loadStateFromUrl();
    handleBottomHover();

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
          requestAnimationFrame(updateNavigationElementsOnPageScroll);
          ticking = true;
        }
    });
});

// Function to handle mouse near bottom edge of screen
function handleBottomHover() {
    const bottomThreshold = 150; // Distance from bottom of screen to trigger
    
    document.addEventListener('mousemove', (e) => {
        const windowHeight = window.innerHeight;
        const mouseY = e.clientY;
        
        // If mouse is near bottom edge
        if (bottomNavigation.classList.contains('scroll-down')) {
            if (windowHeight - mouseY <= bottomThreshold) {
                bottomNavigation.classList.remove('scroll-down');
                bottomNavigationBack.classList.remove('scroll-down');
            }
        }
    });
}

function updateNavigationElementsOnPageScroll() {
    if (inputFocused) {
        lastScrollY = window.scrollY;
        scrolling = false;
        return;
    }

    const currentScrollY = window.scrollY;
    const scrolledDistance = currentScrollY - lastScrollY;

    if (Math.abs(scrolledDistance) >= thresholdScroll) {
      if (scrolledDistance > 0) {
        // Scrolling down
        document.body.classList.add("scroll-down");
        bottomNavigation.classList.add("scroll-down");
        bottomNavigationBack.classList.add("scroll-down");

      } else {
        // Scrolling up
        document.body.classList.remove("scroll-down");
        bottomNavigation.classList.remove("scroll-down");
        bottomNavigationBack.classList.remove("scroll-down");
      }
  
      lastScrollY = currentScrollY;
    }
  
    scrolling = false;
}




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


// --------------------------------------------------------------------------------------------
// WINDOW RESIZE
// --------------------------------------------------------------------------------------------

// Function to reset all inline styles on DIV and SPAN elements
function resetStyles() {
    const divs = document.querySelectorAll('div[style]');
    const spans = document.querySelectorAll('span[style]');

    divs.forEach(div => {
    div.removeAttribute('style');
    });

    spans.forEach(span => {
    span.removeAttribute('style');
    });

    wrapBareParagraphContainers();
}

// Wraps any bare .paragraph-container direct children of contentContainer in a
// large-paragraph-container div so the CSS grid-column rules apply on desktop.
// This fixes content that was saved / rendered with the old mobile-only structure.
function wrapBareParagraphContainers() {
    Array.from(contentContainer.children)
        .filter(el => el.classList.contains('paragraph-container'))
        .forEach(p => {
            const wrapper = document.createElement('div');
            wrapper.classList.add('large-paragraph-container', 'paragraph-outter-container');
            contentContainer.insertBefore(wrapper, p);
            wrapper.appendChild(p);
        });
}

// Add the event listener for window resize
window.addEventListener('resize', resetStyles);

// Favicon
const faviconCanvas = document.createElement('canvas');
faviconCanvas.width = 64;
faviconCanvas.height = 64;
const faviconCtx = faviconCanvas.getContext('2d');

const faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
document.head.appendChild(faviconLink);

function renderFaviconLabel(label) {
    const size = 64;
    faviconCtx.clearRect(0, 0, size, size);
    faviconCtx.font = `625 ${size * 0.8}px Booton`;
    faviconCtx.fillStyle = '#000000';
    faviconCtx.textAlign = 'center';
    faviconCtx.textBaseline = 'middle';
    faviconCtx.fillText(label, size / 2, size / 2);
    faviconLink.href = faviconCanvas.toDataURL('image/png');
}

function updateFavicon(key) {
    renderFaviconLabel(String(key).padStart(2, '0'));
}

const faviconLoadingChars = ['S', '/', '!', '&', 'O', '$', '*', '(', '=', '#', ')', '+', '?'];
let faviconLoadingInterval = null;
let faviconLoadingIndex = 0;

function startFaviconLoading() {
    faviconLoadingIndex = 0;
    faviconLoadingInterval = setInterval(() => {
        renderFaviconLabel(faviconLoadingChars[faviconLoadingIndex % faviconLoadingChars.length]);
        faviconLoadingIndex++;
    }, 200);
}

function stopFaviconLoading() {
    if (faviconLoadingInterval) {
        clearInterval(faviconLoadingInterval);
        faviconLoadingInterval = null;
        const current = document.querySelector('.current-version-history-element');
        updateFavicon(current ? parseInt(current.getAttribute('version-history-key')) - 1 : 0);
    }
}

document.fonts.ready.then(() => {
    updateFavicon(0);

    const versionHistory = document.getElementById('version-history');
    if (versionHistory) {
        new MutationObserver(() => {
            const current = document.querySelector('.current-version-history-element');
            if (current) updateFavicon(parseInt(current.getAttribute('version-history-key')) - 1);
        }).observe(versionHistory, { subtree: true, attributeFilter: ['class'] });
    }
});

