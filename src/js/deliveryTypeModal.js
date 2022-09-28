// see wfdStuff.js for the constant declarations
// deliveryMethod variable is defined there and defaults to null.

const deliveryMethodModalDom = `<div id="delivery-method-modal" class="modal" style="display: none">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Select Delivery Method</h2>
            <span id="delivery-method-modal-close-x" class="close">&times;</span>
        </div>
        <div class="modal-body" id="delivery-method-modal-body">
            <div class="flex">
                <div class="flex items-center h-5">
                    <input name="delivery-type-selection" id="drop-in-pub-radio" type="radio" value="pub" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2">
                </div>
                <div class="ml-2 text-sm">
                    <label for="drop-in-pub-radio" class="font-medium text-black">Drop In Pub</label>
                    <p id="drop-in-pub-radio-desc" class="text-xs font-normal text-black">We will drop your order by ${pubName}</p>
                </div>
            </div>

            <div class="flex">
                <div class="flex items-center h-5">
                    <input name="delivery-type-selection" id="collection-radio" aria-describedby="helper-radio-text" type="radio" value="collection" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2">
                </div>
                <div class="ml-2 text-sm">
                    <label for="collection-radio" class="font-medium text-black">Collection</label>
                    <p id="collection-radio-desc" class="text-xs font-normal text-black">You will pickup the order from our shop.</p>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button id="delivery-method-selected-btn" class="modal-atc-btn"> Okay </button>
        </div>
    </div>
</div>`;

const deliveryMethodEl = document.createElement("div");
deliveryMethodEl.innerHTML = deliveryMethodModalDom;
document.body.appendChild(deliveryMethodEl);

const deliveryMethodModal = document.getElementById("delivery-method-modal");

// Capture changes to delivery method selections.
document.addEventListener("change", (event) => {
    if(event.target.matches("input[name='delivery-type-selection']")) {
        if(event.target.value === "pub") {
            deliveryMethod = DELIVERY_METHOD.dropInPub;
        } else if (event.target.value === "collection"){
            deliveryMethod = DELIVERY_METHOD.collection
        } else if(event.target.value === "delivery") {
            deliveryMethod = DELIVERY_METHOD.delivery // WIP
        }
    }
});

document.getElementById("delivery-method-selected-btn").onclick = function () {
    if(!deliveryMethod) {
        Toastify({
            text: "Please select a delivery method!",
            className: "error",
            duration: (10 * 1000)
        }).showToast();
    } else {
        deliveryMethodModal.style.display = "none";
    }
}

// Delivery method selection modal close
document.getElementById("delivery-method-modal-close-x").onclick = function () {
    deliveryMethodModal.style.display = "none";
}

// Checks if a delivery method is set. If a method is not set then it shows the delivery method selection modal.
function showDeliveryMethodModal() {
    if(deliveryMethod) return;
    deliveryMethodModal.style.display = "block";
}