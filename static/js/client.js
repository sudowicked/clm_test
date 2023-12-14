// Function to update the <select> element with data from the server
var option_value = 17;

function updateSelectWithData() {
    // Make a request to the server route
    fetch('/getSelectData')
        .then((response) => response.json())
        .then((data) => {
            const selectElement = document.getElementById('selectmask');

            const selectData = data.selectData;
            const imageExtensions = data.imageExtensions;
            
            // Clear existing options
            // selectElement.innerHTML = '';

            // Add new options based on the data

            if (selectData !== undefined) {
                selectData.forEach((optionText, index) => {
                    const extension = imageExtensions[index];
                    
                    // Capitalize the first letter of optionText
                    var capitalizedText = optionText.charAt(0).toUpperCase() + optionText.slice(1);
    
                    const option = document.createElement('option');
                    option.text = capitalizedText;
    
                    option.setAttribute('data-extension', extension); // Set the extension as a data attribute
                    
    
                    option.value = option_value;
                    // console.log(option.value);
                    option_value += 1;
    
                    selectElement.appendChild(option);
    
                });
            }

            createOptionsContainer();
        })
        .catch((error) => {
            console.error('Error fetching data:', error);
        });
}

// Call the function to update the <select> element when needed
updateSelectWithData();

var selectedItem;
const maxVisibleItems = 5; // Set the maximum visible items

// Function to create the optionsContainer based on the updated selectmask
function createOptionsContainer() {
    const optionsContainer = document.querySelector(".options-container");
    // const selectElement = document.getElementById("selectmask");

    var do_once = false;
    if (!do_once) {
        do_once = true;

        var currentMask = selectElement.selectedIndex;

        // Iterate over the options in the select element
        for (let i = 0; i < selectElement.options.length; i++) {
            var option = selectElement.options[i];

            // Create a new container element for each option
            var optionContainer = document.createElement('div');
            optionContainer.classList.add('option-container');

            // Create a new span element for each option
            var newOption = document.createElement('span');

            newOption.classList.add('menu-item');
            newOption.textContent = option.textContent;

            var extension = option.getAttribute('data-extension');
            newOption.setAttribute('option-extension', extension);


            // Add a "data-selected" attribute to the focused item
            if (i === currentMask) {
                newOption.setAttribute('data-selected', 'true');
            }


            // Append the new span and deleteButton elements to the container
            optionContainer.appendChild(newOption);

            if (i >= 17) {
                // Create a delete button
                var deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-button');
                deleteButton.textContent = 'delete';

                deleteButton.style.fontFamily = '"Material Symbols Outlined", sans-serif';

                // console.log(extension);

                optionContainer.appendChild(deleteButton);
            }


            // Append the container to the optionsContainer
            optionsContainer.appendChild(optionContainer);
        }

        // Get the selected item using the attribute selector
        selectedItem = document.querySelector('.menu-item[data-selected="true"]');

        // Scroll the selected item into view
        selectedItem.scrollIntoView({ behavior: 'smooth' });
    }

    var menuDeleteButtons = document.querySelectorAll(".delete-button");

    // Handle item selection
    menuDeleteButtons.forEach((item, index) => {
        item.addEventListener("click", function () {
            if (containerOpen == true) {
                // Remove the "data-selected" attribute from the previously selected item
                var menuItem = menuItems.item(index+17);
                var itemExtension = menuItem.getAttribute('option-extension');

                // Use the retrieved value as needed
                // console.log('Menu item extension:', itemExtension);

                window.location.href = `/discardUpload?image_id=${encodeURIComponent(itemExtension)}`;
            }
        });
    });

    // Add a click event listener to the document
    document.addEventListener('click', (event) => {
        const isClickInsideContainer = optionsContainer.contains(event.target);
        if (!isClickInsideContainer) {
            // Check if the click is outside the container
            optionsContainer.style.maxHeight = null; // Close the container
            optionsContainer.style.overflowY = 'hidden';
            menuItems.forEach((item, index) => {
                if (index === currentMask) {
                    setTimeout(() => {
                        item.scrollIntoView({ behavior: 'smooth' });
                    }, 400);
                }
            });
        }
    });

    var containerOpen = false;

    optionsContainer.addEventListener('click', (event) => {
        event.stopPropagation();
        if (optionsContainer.style.maxHeight) {
            optionsContainer.style.maxHeight = null; // Close the container
            optionsContainer.style.overflowY = 'hidden';
            containerOpen = false;
            // Automatically scroll to the top
            // optionsContainer.scrollTop = 0;
        } else {
            const totalHeight = optionsContainer.scrollHeight;
            const visibleHeight = maxVisibleItems * (totalHeight / optionsContainer.children.length);
            optionsContainer.style.maxHeight = visibleHeight + 'px'; // Open the container
            optionsContainer.style.overflowY = 'auto';
            containerOpen = true;
        }
    });
        
    var menuItems = document.querySelectorAll(".menu-item");
    
    // Handle item selection
    menuItems.forEach((item, index) => {
        item.addEventListener("click", function () {
            if (containerOpen == true) {
                // Remove the "data-selected" attribute from the previously selected item
                if (selectedItem) {
                    selectedItem.removeAttribute('data-selected');
                }

                // Add the "data-selected" attribute to the clicked item
                item.setAttribute('data-selected', 'true');
                selectedItem = item;

                var extension = item.getAttribute('data-extension');
                console.log(extension);

                customScroll(item,index);

                currentMask = index;
                selectElement.selectedIndex = currentMask;
                selectElement.dispatchEvent(new Event("change"));
            }
        });
    });


    function customScroll(item, index) {
        if (index >= optionsContainer.children.length - maxVisibleItems) {
            //optionsContainer.scrollTop = 6;
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth' });
            }, 400);
        }
        else {
            item.scrollIntoView({ behavior: "smooth", inline: "nearest"  }); 
        }
    };

    var arrowUp = document.getElementById("arrow-up");
    var arrowDown = document.getElementById("arrow-down");

    function arrowsUpdateAndScroll(index) {
        currentMask = index;
        selectElement.selectedIndex = currentMask;
        selectElement.dispatchEvent(new Event("change"));
        menuItems.forEach((item, index) => {
            if (index === currentMask) {
                item.scrollIntoView({ behavior: "smooth" });
            }
        });
    }
    
    arrowDown.addEventListener("click", function () {
        if (currentMask < selectElement.options.length - 1) {
            currentMask++;
        } else {
            currentMask = 0;
        }
        arrowsUpdateAndScroll(currentMask);
    });
    
    // Similar logic for arrowUp
    arrowUp.addEventListener("click", function () {
        if (currentMask > 0) {
            currentMask--;
        } else {
            currentMask = selectElement.options.length - 1;
        }
        arrowsUpdateAndScroll(currentMask);
    });
    
}



var clientimages = [];
var clientcoordinates = [];

// Function to update the images array in index.html
async function updateImages() {
    try {
        const response = await fetch('/getImages');
        const data = await response.json();
        const clientimages = data.map((item) => ({
            id: item.id,
            path: item.path
        }));

      const clientcoordinates = data.reduce((acc, item) => {
        // Assuming that item.id contains the key (e.g., "audrey")
        const key = item.id;
        const coordinates = JSON.parse(item.coordinates);
        
        // Assign the coordinates array to the key in the accumulator object
        acc[key] = coordinates;
        
        return acc;
    }, {});

        images = images.concat(clientimages);
        // console.log('Client Images:', clientcoordinates);
        // Once images are updated, call the function or execute code that relies on clientimages.
        handleClientImages(images, clientcoordinates, masks);
    } catch (error) {
        console.error('Error fetching image data:', error);
    }
}
updateImages();


