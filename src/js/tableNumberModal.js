const tableNumberModalDom = `<div id="table-number-modal" class="modal" style="display: none">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Table number</h2>
        </div>
        <div class="modal-body w-full" id="table-number-modal-body">
            <div>
                <label for="customer-tbl-number" class="customer-info-label">Please enter your table number</label>
                <input type="text" id="customer-tbl-number" class="customer-info-input" placeholder="">
                <span id="customer-tbl-number-error" class="customer-info-error"></span>
            </div>
        </div>
        <div class="modal-footer">
            <button id="table-number-modal-ok-btn" class="modal-atc-btn mt-4"> Ok </button>
        </div>
    </div>
</div>`;

const tableNumberEl = document.createElement("div");
tableNumberEl.innerHTML = tableNumberModalDom;
document.body.appendChild(tableNumberEl);

const tableNumberModalRef = document.getElementById("table-number-modal");
const tableNumberInput = document.getElementById("customer-tbl-number");
const tableNumberOkButton = document.getElementById("table-number-modal-ok-btn");
const tableNumberError  = document.getElementById("customer-tbl-number-error");

tableNumberOkButton.onclick = function () {
    // clear previous errors
    tableNumberError.innerText = "";
    tableNumberInput.style.borderColor = "";

    const val = tableNumberInput.value;

    if(!val || val.length < 1) {
        tableNumberError.innerText = "Please enter your table number";
        tableNumberInput.style.borderColor = "red";
        return;
    } else {
        customerTableNumber = val;
        closeTableNumberModal();
    }
}

function closeTableNumberModal() {
    tableNumberModalRef.style.display = "none";
}

function showTableNumberModal() {
    if(customerTableNumber) return;
    tableNumberModalRef.style.display = "block";
}