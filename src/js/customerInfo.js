const customerInfoDom = `<div id="info-n-payment-type-modal" class="modal" style="display: none">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Customer Information</h2>
            <span id="customer-info-modal-close-x" class="close">&times;</span>
        </div>
        <div class="modal-body" id="customer-info-modal-body">
            <form id="customer-info-form">
                <div>
                    <label for="customer-name" class="customer-info-label">Name</label>
                    <input type="text" id="customer-name" class="customer-info-input" placeholder="John Doe">
                    <span id="customer-name-error" class="customer-info-error"></span>
                </div>

                <div class="mt-2">
                    <label for="customer-phone" class="customer-info-label">Phone Number</label>
                    <input type="tel" id="customer-phone" class="customer-info-input" placeholder="xxx-xxxxxx">
                    <span id="customer-phone-error" class="customer-info-error"></span>
                </div>

                <div class="mt-2">
                    <label for="customer-email" class="customer-info-label">Email Address</label>
                    <input type="email" id="customer-email" class="customer-info-input" placeholder="contact@email.you">
                    <span id="customer-email-error" class="customer-info-error"></span>
                </div>

                <button type="submit" id="customer-info-save" class="modal-atc-btn mt-4"> Next </button>
            </form>
        </div>
    </div>
</div>`;

const customerInfoModalEl = document.createElement("div");
customerInfoModalEl.innerHTML = customerInfoDom;
document.body.appendChild(customerInfoModalEl);


const customerInfoFormSubmitBtn = document.getElementById("customer-info-save");
const customerInfoForm = document.getElementById("customer-info-form");
const customerInfoCloseBtn = document.getElementById("customer-info-modal-close-x");

customerInfoCloseBtn.onclick = function () {
    hideCustomerInfoModal();
}

customerInfoForm.onsubmit = async function (event) {
    event.preventDefault();

    customerInfoFormSubmitBtn.setAttribute("disabled", true);
    customerInfoFormSubmitBtn.innerText = "Loading...";

    const customerName = document.getElementById("customer-name");
    const customerPhone = document.getElementById("customer-phone");
    const customerEmail = document.getElementById("customer-email");

    const customerNameError = document.getElementById("customer-name-error");
    const customerEmailError = document.getElementById("customer-email-error");
    const customerPhoneError = document.getElementById("customer-phone-error");

    // clear previous errors
    customerName.style.borderColor = "";
    customerNameError.innerText = ""
    customerPhone.style.borderColor = "";
    customerPhoneError.innerText = ""
    customerEmail.style.borderColor = "";
    customerEmailError.innerText = "";

    let hasError = 0;

    if(!customerName.value || customerName.value.length === 0) {
        customerName.style.borderColor = "red";
        customerNameError.innerText = "Please enter your name";
        hasError = true;
    }

    if(!customerEmail.value || customerEmail.value.trim().length === 0 || !validateEmail(customerEmail.value)) {
        customerEmail.style.borderColor = "red";
        customerEmailError.innerText = "Please enter your correct email address.";
        hasError = true
    }

    if(!customerPhone.value || customerPhone.value.trim().length === 0 || isNaN(customerPhone.value)) {
        customerPhone.style.borderColor = "red";
        customerPhoneError.innerText = "Please enter your correct phone number.";
        hasError = true;
    }

    // console.log(customerName, customerPhone, customerEmail);

    if(!hasError) {
        // call api to save customer information and get a user ID
        const saveCustomerDetails = await saveCustomerContactDetails(localStorage.getItem("sessionId"),
            customerName.value.trim(), customerEmail.value.trim(), customerPhone.value.trim(), DELIVERY_METHOD.collection, cityId, townId); // TODO: Patch delivery method
        // console.log(saveCustomerDetails);

        // TODO: handle status 2 => delivery charge updating for home delivery
        if(saveCustomerDetails.status === 1) {
            // Save the customer ID for billing
            localStorage.setItem("bill_user", saveCustomerDetails.userId);
            // paymentIds

            // Ask the user to select a payment method
            // TODO: Implement payment type selection (1,4). Defaults to card payment for now.
            hideCustomerInfoModal();
            showBillingAddressModal();

            // const placeOrderStatus = await placeOrder(localStorage.getItem("sessionId"), PAYMENT_METHOD.cod);
            // console.log(placeOrderStatus);
        } else {
            Toastify({
                text: "Network error :( Please try again..",
                className: "error",
                duration: (10 * 1000)
            }).showToast();
        }
    }

    customerInfoFormSubmitBtn.innerText = "Next";
    customerInfoFormSubmitBtn.removeAttribute("disabled");
}

function showCustomerInfoModal() {
    document.getElementById("info-n-payment-type-modal").style.display = "block";
}

function hideCustomerInfoModal() {
    document.getElementById("info-n-payment-type-modal").style.display = "none";
}

function validateEmail(email) {
    const re = /^([a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/i;
    return re.test(email);
}