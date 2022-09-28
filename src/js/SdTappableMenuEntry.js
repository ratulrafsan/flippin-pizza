class SdTappableMenuEntry extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({'mode': 'open'});

        this.loading = true;
        this.shimmerMode = false;

        // If the main dish itself is an option, this variable will contain the optionChoiceId of that dish.
        // For example, consider Naga wing as a dish: Your order options are 3p - $4, 6p -$6 &/or it has additional popup options
        // This variable tracks if user picked the 3p option or 6p option.
        // If this variable has a value, then this.unitPrice is ignored and this option choice's price used as the dish unitPrice.
        this.mainDishOptionId = null;

        this.unitPrice = parseFloat(this.getAttribute("price"));
        this.categoryId = this.getAttribute("category");
        this.categoryName = this.getAttribute("categoryName");
        this.shopId = this.getAttribute("shopId");
        this.dishId = this.getAttribute("dish");
        this.title = this.getAttribute("title");
        if(this.hasAttribute("description")) {
            this.description = this.getAttribute("description");
        }
        if(this.hasAttribute("options")) {
            this.options = JSON.parse(atob(this.getAttribute("options")));
            this.popupOptions = this.options.filter(e => e.display_in_popup === '1');
            this.buttonOptions = this.options.filter(e => e.display_as_button === '1');
            this.selectOptions = this.options.filter(e => e.display_as_button === '0' && e.display_in_popup === '0');

            this.popupOptionsSelection = {}; // Stores what user selected from the add to card popup
            // console.log(this.title, this.popupOptions, this.buttonOptions, this.selectOptions)

            this.optionsCounter = {};
            this.options.forEach(o => {
                o.choiceList.forEach(c => {
                    this.optionsCounter[`${c.choiceId}`] = {
                        count: 1,
                        unitPrice: parseFloat(c.price)
                    }
                })
            });
        }

        if(this.hasAttribute("groups")) {
            this.groups = JSON.parse(atob(this.getAttribute("groups")));
            this.groupSelections = []; // Stores what group addons the user selected from the add to card popup
        }

        if(this.hasAttribute("addons")) {
            this.addons = JSON.parse(atob(this.getAttribute("addons")));
            this.addonSelections = []; // Stores what addon options the user selected from the add to cart popup
        }

        this.counter = 1; // Used only when no dish options are passed.

        this.menuItem = {
            "details": `${this.categoryName} - ${this.title}`,
            "dishId" : this.dishId,
            "price" : this.unitPrice,
            "shopId" : this.shopId,
            "quantity" : 0,
            "optionChoiceIds": "",
            "internal" : {}
        }


        // console.log("building:", this.title, this.options, this.groups, this.addons)
    }

    async connectedCallback() {
        this.shadowRoot.addEventListener("change", (event) => {
            if(event.target.matches("select[for='mm-food-selection']")) return;

            this.onItemCounterUpdate(event);
        });

        this.shadowRoot.addEventListener("click", async (event) => {
            // console.log(event.target);
            /*
             Add to cart button listener.
             */
            if(event.target.id === 'menu-atc-btn') {
                if (event.target.hasAttribute('cid')){
                    this.mainDishOptionId = event.target.getAttribute("cid");

                    // Find the parent option of this choice
                    const optionObj = this.options.filter(o => o.choiceList.some(c => c.choiceId === this.mainDishOptionId));
                    if(optionObj) {
                        this.menuItem["details"] += "\n" + `${optionObj[0].option_name} - ${event.target.getAttribute("cname")} | +${event.target.getAttribute("cprice")}`
                    }
                    this.menuItem['optionChoiceIds'] = event.target.getAttribute("cid");
                    this.menuItem['quantity'] = this.optionsCounter[event.target.getAttribute('cid')].count;
                    this.menuItem['price'] = this.optionsCounter[event.target.getAttribute('cid')].unitPrice;
                    // If we have popup dish options then display them
                    if(this.popupOptions && this.popupOptions.length > 0
                        || this.groups && this.groups.length > 0
                        || this.addons && this.addons.length > 0) {
                        this.renderAddToCartPopup();
                        //NOTE: computeItemTotal will be called by atc button in renderAddToCartPopup method.
                    } else {
                        this.computeItemTotal();
                        await window.addToCartAction(this.menuItem, this.shopId);
                    }
                    // console.log(this.menuItem);
                }
                // If we have popup dish options then display them
                else if(this.popupOptions && this.popupOptions.length > 0
                    || this.groups && this.groups.length > 0
                    || this.addons && this.addons.length > 0) {
                    this.menuItem['quantity'] = this.counter;
                    this.renderAddToCartPopup();
                    //NOTE: computeItemTotal will be called by atc button in renderAddToCartPopup method.
                }
                // otherwise, assume that its dish no options or popups
                else {
                    this.menuItem['quantity'] = this.counter;
                    this.computeItemTotal();
                    await window.addToCartAction(this.menuItem, this.shopId);
                    // console.log(this.menuItem);
                }
            }
        })

        this.render();
    }

    // Computes price for a single entity including its addon, group addon and options
    computeItemTotal() {
        // dish_price + (selected addon prices) + (selected group addon prices) + (selected option choices)
        let dishPrice = this.menuItem['price'];
        let addonPrice = 0;
        let groupAddonPrice = 0;
        let optionsPrice = 0;

        if(this.addons && this.menuItem["addonIds"]) {
            this.menuItem["internal"]["addon"].forEach( a => addonPrice += parseFloat(a.price));
        }

        if(this.groups && this.menuItem["groupAddonChoiceIds"]) {
            this.menuItem["internal"]["group"].forEach( ga => groupAddonPrice += parseFloat(ga.price));
        }

        if(this.menuItem["optionChoiceIds"] && this.menuItem["internal"]["options"]) {
            Object.values(this.menuItem["internal"]["options"]).forEach(o => {
                o.choiceList.forEach(c => {
                    if(c.choiceId !== this.mainDishOptionId) {
                        optionsPrice += parseFloat(c.price);
                    }
                })
            })
        }

        this.menuItem["totalPrice"] = dishPrice + addonPrice + groupAddonPrice + optionsPrice;
        this.menuItem["grandTotal"] = parseFloat(this.menuItem["totalPrice"]) * parseInt(this.menuItem["quantity"]);
    }

    renderAddToCartPopup() {
        // Create a new shadow-root and attach listeners to it
        // If a shadow root already exists, reuse it
        const modalRef = document.getElementById("popup-dish-options");
        let modalShadowRoot;

        if(!modalRef.shadowRoot) {
            modalShadowRoot = modalRef.attachShadow({"mode": "open"});
            modalShadowRoot.innerHTML =
                "<style> @import \"index-o.css\"; </style>" +
                " <div class=\"modal-content\">" +
                "        <div class=\"modal-header\">" +
                "            <h2>Dish Options</h2>" +
                "            <span id=\"modal-close\" class=\"close\">&times;</span>" +
                "        </div>" +
                "        <div class=\"modal-body\" id=\"popup-dish-options-mb\">\n" +
                "        </div>" +
                "        <div class=\"modal-footer\">" +
                "            <button id=\"modal-atc-btn\" class=\"modal-atc-btn\"> Add to cart</button>" +
                "        </div>" +
                "    </div>"
        } else {
            modalShadowRoot = modalRef.shadowRoot;
        }

        this.modalShadowRootRef = modalShadowRoot;

        const modalBody = modalShadowRoot.getElementById("popup-dish-options-mb");
        const modalAddToCart = modalShadowRoot.getElementById("modal-atc-btn");
        const modalCloseBtn = modalShadowRoot.getElementById("modal-close");

        const boundedPopupModalValueChangeListener = this.onPopupModalValueChange.bind(this);
        const boundedPopupModalAtcClickListener = this.onPopupModalAtcClick.bind(this);

        modalCloseBtn.onclick = () => {
            modalRef.style.display = 'none';
            modalShadowRoot.removeEventListener("change", boundedPopupModalValueChangeListener);
            modalAddToCart.removeEventListener("click", boundedPopupModalAtcClickListener);
            modalAddToCart.removeAttribute("disabled");
            modalBody.innerHTML = '';
            // Clear internal cart contents
            this.popupOptionsSelection = {};
            this.groupSelections = [];
            this.addonSelections = [];

            this.menuItem = {
                "details": `${this.categoryName} - ${this.title}`,
                "dishId" : this.dishId,
                "price" : this.unitPrice,
                "shopId" : this.shopId,
                "quantity" : 0,
                "optionChoiceIds": "",
                "internal" : {}
            }
        }

        modalBody.innerHTML = this.renderSelectionChoiceList();
        // show the modal
        modalRef.style.display = 'block';

        // Add the default select values to popup selection. It will be modified later if the user alters the value
        const selectableOptions = modalBody.querySelectorAll("select[ctype='choice']");
        if(selectableOptions.length > 0) {
            selectableOptions.forEach((s) => {
                this.popupOptionsSelection[`${s.getAttribute('oid')}`] = {
                    id: s.value,
                    name: `${s.getAttribute('oname')} - ${s.options[s.selectedIndex].text}`
                }
            });
        }

        modalShadowRoot.addEventListener("change", boundedPopupModalValueChangeListener);

        modalAddToCart.addEventListener("click", boundedPopupModalAtcClickListener);
    }

    onPopupModalValueChange(event)  {
        // For addons
        if(event.target.matches("input[ctype='addon']")) {
            if(event.target.checked) {
                this.addonSelections.push(event.target.value);
            } else {
                this.addonSelections = this.addonSelections.filter(i => i !== event.target.value);
            }
        }

        // For group addons
        if(event.target.matches("input[ctype='group-addon']")) {
            if(event.target.checked) {
                this.groupSelections.push(event.target.value);
            } else {
                this.groupSelections = this.groupSelections.filter(i => i !== event.target.value);
            }
        }

        // Selectable choices
        if(event.target.matches("select[ctype='choice']")) {
            this.popupOptionsSelection[`${event.target.getAttribute('oid')}`] = {
                id: event.target.value,
                name: `${event.target.getAttribute('oname')} - ${event.target.options[event.target.selectedIndex].text}`
            }
        }

        // console.log(this.groupSelections, this.addonSelections, this.popupOptionsSelection);
    }

    async onPopupModalAtcClick(event)  {
        // disable the add to cart button
        event.target.setAttribute("disabled", true);

        // When the user clicks on add to cart, build the order item object and close the popup
        if(this.addons) {
            this.menuItem["addonIds"] = this.addonSelections.join(",");
            // build description for cart
            const addonObjects = this.addons.filter(i => this.addonSelections.includes(i.addonId));
            const addonDescription = addonObjects.map(i => `${i.name} +€${i.price}`).join("\n");
            this.menuItem["details"] += "\n" + addonDescription;

            this.menuItem["internal"]["addon"] = addonObjects;
        }

        if(this.popupOptionsSelection && Object.values(this.popupOptionsSelection).length > 0) {
            const choiceIds = Object.values(this.popupOptionsSelection).map(i => i.id);
            this.menuItem["optionChoiceIds"] = this.menuItem["optionChoiceIds"] === "" ? choiceIds.join(",") :  this.menuItem["optionChoiceIds"] + "," + choiceIds.join(",") ;
            // build text description for cart
            this.options.forEach(o => {
                const selectedChoice = o.choiceList.filter(i => {
                    return choiceIds.includes(i.choiceId)
                });
                if(selectedChoice.length === 0) return;
                const description = `${o.option_name} - ${selectedChoice[0].choiceName} | +€${selectedChoice[0].price}`;
                this.menuItem["details"] += "\n" + description;

                if(!this.menuItem["internal"]["options"]) {
                    this.menuItem["internal"]["options"] = {};
                }
                this.menuItem["internal"]["options"][`${o.option_id}`]= {
                    ...o,
                    choiceList: selectedChoice
                }
            });
        }

        if(this.groups) {
            this.menuItem["groupAddonChoiceIds"] = this.groupSelections.join(",");
            // build text description for cart
            const groupAddonsOnly = (this.groups.map(i => i.addonList)).flat();
            const selectedGroupAddonObjects = groupAddonsOnly.filter(i => this.groupSelections.includes(i.addonId));
            const groupAddonDescription = selectedGroupAddonObjects.map(i => `${i.name} +€${i.price}`).join(", ");
            this.menuItem["details"] += "\n" + `${this.groups[0].groupName}-` + groupAddonDescription;

            this.menuItem["internal"]["group"] = selectedGroupAddonObjects;
        }

        this.computeItemTotal();


        window.addToCartAction(this.menuItem, this.shopId).then(e => {
            this.modalShadowRootRef.getElementById("modal-close")?.click();
        });
    }

    async attemptToAddToOnlineCart() {}


    renderSelectionChoiceList() {
        let groupCollection = "";
        let optionCollection = "";
        let addonCollection = "";

        if(this.groups && this.groups.length > 0) {

            groupCollection = `<div class="group-selection-name">${this.groups[0].groupName}</div> <div class="group-selection">` +
                this.groups[0].addonList.map(a => {
                    return `<div class="group-selection-input-container">
                        <input ctype="group-addon" id="${a.addonId}" type="checkbox" value="${a.addonId}" class="group-selection-input" >
                        <label for="${a.addonId}" class="group-selection-label">${a.name} + €${a.price}</label>
                    </div>`;
                }).join("")
            + `</div>`;
        }

        if(this.addons && this.addons.length > 0) {
            addonCollection = `<div class="group-selection-name">Addons for your dish</div><div class="group-selection">` +
                this.addons.map(a => {
                    return `<div class="group-selection-input-container">
                        <input ctype="addon" id="${a.addonId}" type="checkbox" value="${a.addonId}" class="group-selection-input">
                        <label for="${a.addonId}" class="group-selection-label">${a.name} + €${a.price}</label>
                    </div>`;
                }).join("")
                + `</div>`;
        }

        if(this.popupOptions && this.popupOptions.length > 0) {
            optionCollection = `<div class="group-selection-name">Dish Options</div>` +
                this.popupOptions.map(o => {
                return `
                 <label for="${this.categoryId}-${this.dishId}-${o.option_id}" class="block mb-2 text-sm font-medium text-gray-900">${o.option_name}</label>
                 <select id="${this.categoryId}-${this.dishId}-${o.option_id}" ctype="choice" oid="${o.option_id}" oname="${o.option_name}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 mb-6 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    ${o.choiceList.map((c,i) => `<option value="${c.choiceId}" ${i === 0 ? 'selected': ''}>${c.choiceName} + €${c.price}</option>`).join('')}
                </select>`;
            }).join("");
        }

        return optionCollection + groupCollection + addonCollection;
    }

    clamp(number, min, max) {
        return Math.max(min, Math.min(number, max));
    }

    onItemCounterUpdate(event) {
        // Event came from choice options. So update optionsCounter
        if(event.target.hasAttribute('cid')) {
            const choiceId = event.target.getAttribute('cid');
            // clamp the value to 100 max
            let val = this.clamp(Number(event.target.value), 1, 100);
            event.target.value = val;
            this.optionsCounter[choiceId].count = val;
            this.shadowRoot
                .getElementById(`price-${this.categoryId}-${this.dishId}-${choiceId}`)
                .innerText = `${(this.optionsCounter[choiceId].count * this.optionsCounter[choiceId].unitPrice).toFixed(2)}`;
        } else {
            // clamp the value to 100 max
            let val = this.clamp(Number(event.target.value),1, 100);
            event.target.value = val;
            this.counter = val;
            this.shadowRoot
                .getElementById(`price-${this.categoryId}-${this.dishId}`)
                .innerText = `${(this.counter * this.unitPrice).toFixed(2)}`;
        }
    }

    // Renders non-popup menu items.
    renderChoiceList() {
        const defaultIntractableDom = `<div class="sd-tappable-price">
                            <div class="sd-tappable-choice-name"></div>
                            <div class="sd-tappable-options-container">
                            <span class="w-1/3"><input class="sd-tappable-counter" type="number" min="1" max="100" value="${this.counter}"></span>
                            <span class="w-1/3"><sup class="font-bold">€</sup><span id="price-${this.categoryId}-${this.dishId}">${(this.counter * this.unitPrice).toFixed(2)}</span></span>
                            <button id="menu-atc-btn" class="sd-tappable-add-to-cart" style="width: 30px; height: 30px">
                                <svg id="atc-${this.categoryId}-${this.dishId}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="100%" height="100%" viewBox="0 0 256 256">
                                 <title id="add-to-cart-svg">Add To Cart</title>
                                <g stroke-miterlimit="10" stroke-width="0" transform="matrix(2.81 0 0 2.81 1.407 1.407)"><path d="M72.975 58.994h-41.12a3.5 3.5 0 0 1-3.347-2.477L15.199 13.006H3.5a3.5 3.5 0 1 1 0-7h14.289a3.5 3.5 0 0 1 3.347 2.476l13.309 43.512h36.204l10.585-25.191h-6.021a3.5 3.5 0 1 1 0-7H86.5a3.5 3.5 0 0 1 3.227 4.856L76.201 56.85a3.5 3.5 0 0 1-3.226 2.144z"/><circle cx="28.88" cy="74.33" r="6.16"/><circle cx="74.59" cy="74.33" r="6.16"/><path d="M63.653 21.403a3.499 3.499 0 0 0-4.949 0L53.3 26.807v-17.3a3.5 3.5 0 1 0-7 0v17.3l-5.404-5.404a3.5 3.5 0 0 0-4.95 4.95L47.324 37.73c.163.163.343.309.535.438.084.056.176.095.264.143.112.061.22.129.338.178.115.047.234.075.353.109.1.03.197.068.301.089.226.045.456.069.685.069s.459-.024.685-.069c.104-.021.2-.059.301-.089.118-.035.238-.062.353-.109.119-.049.227-.117.338-.178.088-.048.18-.087.264-.143.193-.129.372-.274.535-.438l11.378-11.377a3.5 3.5 0 0 0-.001-4.95z"/></g></svg>
                            </button>
                            </div>
                        </div>`;

        if(this.options) {
            if(this.buttonOptions.length > 0) {
                const allChoiceList = this.buttonOptions.map(e => e.choiceList).flat();
                return allChoiceList.map(c => {
                    return `<div class="sd-tappable-price">
                            <div class="sd-tappable-choice-name"><span>${c.choiceName ?? ''}</span><span>${c.choiceDesc ?? ''}</span></div>
                            <div class="sd-tappable-options-container">
                            <span class="w-1/3"><input class="sd-tappable-counter" type="number" min="1" max="100" ctype="choice" cid="${c.choiceId}" value="${this.optionsCounter[`${c.choiceId}`].count}"></span>
                            <span class="w-1/3"><sup class="font-bold">€</sup><span id="price-${this.categoryId}-${this.dishId}-${c.choiceId}">${(this.optionsCounter[`${c.choiceId}`].count * this.optionsCounter[`${c.choiceId}`].unitPrice).toFixed(2)}</span></span>
                            <button id="menu-atc-btn" class="sd-tappable-add-to-cart" style="width: 30px; height: 30px" cname="${c.choiceName}" cid="${c.choiceId}" cprice="€${c.price}">
                                <svg id="atc-${this.categoryId}-${this.dishId}-${c.choiceId}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="100%" height="100%" viewBox="0 0 256 256">
                                 <title id="add-to-cart-svg">Add To Cart</title>
                                <g stroke-miterlimit="10" stroke-width="0" transform="matrix(2.81 0 0 2.81 1.407 1.407)"><path d="M72.975 58.994h-41.12a3.5 3.5 0 0 1-3.347-2.477L15.199 13.006H3.5a3.5 3.5 0 1 1 0-7h14.289a3.5 3.5 0 0 1 3.347 2.476l13.309 43.512h36.204l10.585-25.191h-6.021a3.5 3.5 0 1 1 0-7H86.5a3.5 3.5 0 0 1 3.227 4.856L76.201 56.85a3.5 3.5 0 0 1-3.226 2.144z"/><circle cx="28.88" cy="74.33" r="6.16"/><circle cx="74.59" cy="74.33" r="6.16"/><path d="M63.653 21.403a3.499 3.499 0 0 0-4.949 0L53.3 26.807v-17.3a3.5 3.5 0 1 0-7 0v17.3l-5.404-5.404a3.5 3.5 0 0 0-4.95 4.95L47.324 37.73c.163.163.343.309.535.438.084.056.176.095.264.143.112.061.22.129.338.178.115.047.234.075.353.109.1.03.197.068.301.089.226.045.456.069.685.069s.459-.024.685-.069c.104-.021.2-.059.301-.089.118-.035.238-.062.353-.109.119-.049.227-.117.338-.178.088-.048.18-.087.264-.143.193-.129.372-.274.535-.438l11.378-11.377a3.5 3.5 0 0 0-.001-4.95z"/></g></svg>
                            </button>
                            </div>
                        </div>`
                }).join("");
            } else if(this.selectOptions.length > 0) {
                return this.selectOptions.map(o => {
                    return `
                 <label for="${this.categoryId}-${this.dishId}-${o.option_id}" class="block mb-2 text-sm font-medium text-gray-900">${o.option_name}</label>
                 <div class="flex flex-row justify-between w-full gap-2 items-center">
                 <select id="${this.categoryId}-${this.dishId}-${o.optionsId}"
                        class="sd-tappable-select" for="mm-food-selection">
                    ${o.choiceList.map((c,i) => `<option value="${c.choiceId}" cname="${c.choiceName}" cid="${c.choiceId}" cprice="€${c.price}" ${i === 0 ? 'selected': ''}>${c.choiceName} | €${c.price}</option>`).join('')}
                </select>
                <button for="${this.categoryId}-${this.dishId}-${o.optionsId}" id="menu-atc-btn" class="sd-tappable-add-to-cart" style="width: 30px; height: 30px">
                    <svg id="atc-${this.categoryId}-${this.dishId}-${o.optionsId}" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="100%" height="100%" viewBox="0 0 256 256">
                    <title id="add-to-cart-svg">Add To Cart</title>
                    <g stroke-miterlimit="10" stroke-width="0" transform="matrix(2.81 0 0 2.81 1.407 1.407)"><path d="M72.975 58.994h-41.12a3.5 3.5 0 0 1-3.347-2.477L15.199 13.006H3.5a3.5 3.5 0 1 1 0-7h14.289a3.5 3.5 0 0 1 3.347 2.476l13.309 43.512h36.204l10.585-25.191h-6.021a3.5 3.5 0 1 1 0-7H86.5a3.5 3.5 0 0 1 3.227 4.856L76.201 56.85a3.5 3.5 0 0 1-3.226 2.144z"/><circle cx="28.88" cy="74.33" r="6.16"/><circle cx="74.59" cy="74.33" r="6.16"/><path d="M63.653 21.403a3.499 3.499 0 0 0-4.949 0L53.3 26.807v-17.3a3.5 3.5 0 1 0-7 0v17.3l-5.404-5.404a3.5 3.5 0 0 0-4.95 4.95L47.324 37.73c.163.163.343.309.535.438.084.056.176.095.264.143.112.061.22.129.338.178.115.047.234.075.353.109.1.03.197.068.301.089.226.045.456.069.685.069s.459-.024.685-.069c.104-.021.2-.059.301-.089.118-.035.238-.062.353-.109.119-.049.227-.117.338-.178.088-.048.18-.087.264-.143.193-.129.372-.274.535-.438l11.378-11.377a3.5 3.5 0 0 0-.001-4.95z"/></g></svg>
                </button>
                </div>
                `;
                }).join("");
            } else {
                // If this dish has options, but they are meant to be displayed in popups only, display default
                return defaultIntractableDom;
            }

        } else {
            return defaultIntractableDom;
        }
    }

    render() {
        let dom = `<style> @import "index-o.css"; </style>`;
        if(this.shimmerMode) {
            dom += '<p>shim shim </p>';
        } else {
            dom += `
                <div class="sd-tappable-item" id="${this.categoryId}-${this.dishId}">
                    <div class="flex flex-col">
                        <div class="sd-product-name"><span class="name">${this.title}</span></div>
                        <div class="sd-product-desc">${this.description ?? ""}</div>
                    </div>
                    ${this.renderChoiceList()}
                </div>`;
        }


        this.shadowRoot.innerHTML = dom;
    }
}


