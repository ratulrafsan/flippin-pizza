const cartModalAndBtnDom = `
<div id="cart-modal" class="modal" style="display: none">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Your Cart</h2>
            <span id="cart-modal-close-x" class="close">&times;</span>
        </div>
        <div class="modal-body" id="cart-modal-body">

        </div>
        <div class="modal-footer">
            <button id="proceed-to-checkout" class="modal-atc-btn"> Proceed To checkout</button>
            <button id="close-cart-btn" class="modal-atc-btn"> Close </button>
        </div>
    </div>
</div>
<div id="floating-cart-button" class="floating-cart">
    <span id="floating-cart-count" class="floating-cart-count" style="visibility: hidden">0</span>
    <span class="floating-cart-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path stroke="white" fill="white" d="M20 7h-4v-3c0-2.209-1.791-4-4-4s-4 1.791-4 4v3h-4l-2 17h20l-2-17zm-11-3c0-1.654 1.346-3 3-3s3 1.346 3 3v3h-6v-3zm-4.751 18l1.529-13h2.222v1.5c0 .276.224.5.5.5s.5-.224.5-.5v-1.5h6v1.5c0 .276.224.5.5.5s.5-.224.5-.5v-1.5h2.222l1.529 13h-15.502z"/></svg>
    </span>
</div>`;

const cartContainer = document.createElement('div');
cartContainer.innerHTML = cartModalAndBtnDom;
document.body.appendChild(cartContainer);


const cartModal = document.getElementById("cart-modal");
const openCartModalButton = document.getElementById("floating-cart-button");
const cartCloseCross = document.getElementById("cart-modal-close-x");
const cartCloseButton = document.getElementById("close-cart-btn");
const cartCheckoutButton = document.getElementById("proceed-to-checkout");

let cartCanClose = true; // Prevent closing the cart when we are processing the order

openCartModalButton.onclick = async () => {
    cartModal.style.display = "block";
    buildCartContent(true);
}

cartCloseButton.onclick = cartCloseCross.onclick = function () {
    if(!cartCanClose) return;
    cartModal.style.display = "none";
}

cartCheckoutButton.onclick = async function () {
    const oldHtml = cartCheckoutButton.innerHTML;
    cartCheckoutButton.setAttribute("disabled", "yes");
    cartCheckoutButton.innerHTML = loaderDom;

    // Update the comment
    // get user's table number from URL argument (for drop-in-pub collection only)
    if (deliveryMethod === DELIVERY_METHOD.dropInPub) {
        // const urlParams = new URLSearchParams(window.location.search);
        // const tableNumber = urlParams.get('tbl') ?? window.prompt("Whats is your table number?", null);
        const comment = `Table number: ${customerTableNumber ?? "NOT SPECIFIED"} in ${pubName}. ${document.getElementById("order-comment")?.value ?? ""}`
        const commentResponse = await addCommentToOrder(localStorage.getItem("sessionId"), shopId, comment);
    }
    // Set comment, if any
    else if (deliveryMethod === DELIVERY_METHOD.collection) {
        const comment = `${document.getElementById("order-comment")?.value ?? ""}`
        if (comment.length > 0) {
            const commentResponse = await addCommentToOrder(localStorage.getItem("sessionId"), shopId, comment);
        }
    }

    // Proceed to checkout with default values
    const checkoutAttemptResponse = await proceedToCheckout(localStorage.getItem("sessionId"), cityId, townId);
    // console.log(checkoutAttemptResponse);

    if(checkoutAttemptResponse.error && checkoutAttemptResponse.error.length > 0) {
        Toastify({
            text: checkoutAttemptResponse.error,
            className: "error",
            duration: (10 * 1000)
        }).showToast();

    } else {
        // the customer can proceed to payment page so, close the cart modal and show them the customer info and payment selection modal

        // Save the card charge for final payout calculation.
        // it's defined in wfdStuff.js. Defaults to zero.
        // cardCharge = Number(checkoutAttemptResponse['cardCharge']);
        // if(isNaN(cardCharge)) cardCharge = 0;

        cartCloseButton.click();
        showCustomerInfoModal();

    }

    cartCheckoutButton.innerHTML = oldHtml;
    cartCheckoutButton.removeAttribute("disabled");
}

function updateCartCounter(cart) {
    const cartItemCounter = document.getElementById("floating-cart-count");
    const len = Object.keys(cart).length;

    if(len === 0) {
        cartItemCounter.style.visibility = "hidden";
        return;
    }

    if(len > 0 && cartItemCounter.style.visibility === "hidden") {
        cartItemCounter.style.visibility = "visible";
    }
    cartItemCounter.innerText = `${len}`;
}

updateCartCounter(getCartFromLS());

async function clearCart() {
    localStorage.removeItem("cart-storage");
    await clearServerCart(localStorage.getItem("sessionId"));
    updateCartCounter();
}


window.addToCartAction = async function (menuItem, shopId) {
    Toastify({
        text: 'Adding item to cart..',
        className: "info",
        duration: (2 * 1000)
    }).showToast();
    showDeliveryMethodModal();
    showTableNumberModal();
    const timeslot = await getShopTimeSlots(shopId);
    // TODO: update this to to support "home delivery" delivery method.
    const updateTimeSlot = await setShopTimeSlot(localStorage.getItem('sessionId'), shopId, DELIVERY_METHOD.collection, DELIVERY_SCHEDULE.now, DELIVERY_DAY.today, timeslot['collectionHours']['todayHoursData'][0]);

    if(updateTimeSlot.status === 1) {
        const onlineCartStatus = await addItemToCart(menuItem, localStorage.getItem('sessionId'));
        if(onlineCartStatus.statusCode === 2) {
            menuItem['serverIndex'] = onlineCartStatus.index;

            // save the cart data to local storage
            const storedCart = getCartFromLS();
            storedCart[`${Object.keys(storedCart).length}`] = menuItem;

            updateCartCounter(storedCart);

            saveCartToLS(storedCart);

            Toastify({
                text: "Item added to cart",
                className: "success",
                duration: (2 * 1000)
            }).showToast();
        } else {
            Toastify({
                text: onlineCartStatus.status,
                className: "error",
                duration: (10 * 1000)
            }).showToast();
        }
    } else {
        Toastify({
            text: updateTimeSlot.errorMessage,
            className: "error",
            duration: (10 * 1000)
        }).showToast();

    }
};

function alterQuantityLoading(targetDom) {
    console.log("loading enabled");
    targetDom.setAttribute("disabled", true);
    targetDom.classList.add("animate-bounce");
}

function alterQuantityReady(targetDom) {
    console.log("loading disabled");
    targetDom.removeAttribute("disabled");
    targetDom.classList.remove("animate-bounce");
}

async function onCartQuantityChange(event, type, cartItemId) {
    const cart = getCartFromLS();
    if(cart[cartItemId]) {
        const quantity = cart[cartItemId].quantity;
        if(type !== "add" && quantity <= 1) return;
        alterQuantityLoading(event.target);
        const newQuantity = type === "add" ? quantity+1 : quantity-1;
        const updateCartResponse = await updateCartItemQuantity(cart[cartItemId]["serverIndex"], newQuantity, localStorage.getItem("sessionId"));
        if(updateCartResponse.status === 1) {
            cart[cartItemId].quantity = newQuantity;
            cart[cartItemId].grandTotal = parseFloat(cart[cartItemId]["totalPrice"]) * parseInt(cart[cartItemId]["quantity"]);
            saveCartToLS(cart);
            await buildCartContent();
        } else {
            Toastify({
                text: "Network error :( Please make sure you're connected to the internet and try again.",
                className: "error",
                duration: (10 * 1000)
            }).showToast();
        }
        alterQuantityReady(event.target);
    }
}

function trashLoading(targetDom) {
    targetDom.setAttribute("disabled", true);
    const svg = targetDom.getElementsByTagName("svg")[0];
    if(svg) {
        svg.style.fill = "#D3D3D3";
    }
}

function trashReady(targetDom) {
    targetDom.removeAttribute("disabled");
    const svg = targetDom.getElementsByTagName("svg")[0];
    if(svg) {
        svg.style.fill = "#000000";
    }
}

async function onCartItemDelete(event, cartItemId) {
    const cart = getCartFromLS();
    if(cart[cartItemId]) {
        trashLoading(event.target);
        const cartDeleteResponse = await removeItemFromOnlineCart(cart[cartItemId]["serverIndex"], localStorage.getItem("sessionId"));
        if(cartDeleteResponse.status === 1) {
            Toastify({
                text: "Item removed",
                className: "success",
                duration: (5 * 1000)
            }).showToast();
            delete cart[cartItemId];
            saveCartToLS(cart);
            await buildCartContent();
        } else {
            Toastify({
                text: "Network error :( Please make sure you're connected to the internet and try again.",
                className: "error",
                duration: (10 * 1000)
            }).showToast();
        }
        trashReady(event.target);
    } else {
        console.log(cartItemId, "not found.");
        Toastify({
            text: "Something went wrong..",
            className: "error",
            duration: (10 * 1000)
        }).showToast();
    }
}

function getCartCostLS() {
    const costInLS = localStorage.getItem("cartCost");
    if(!costInLS) return null;

    return JSON.parse(Base64.decode(costInLS));
}

function setCartCostLS(costStruct) {
    const stringy = JSON.stringify(costStruct);
    const encoded = Base64.encode(stringy);

    localStorage.setItem("cartCost", encoded);
}

// verify the server cart matches with the local cart & return the local cart data.
// If there are mismatches, modify the local cart to match server cart.
async function syncCartWithServer() {
    const serverCart = await getCartItem(localStorage.getItem("sessionId"));
    // console.log(serverCart);
    if(!serverCart.items) {
        Toastify({
            text: "Network error :( Please make sure you're connected to the internet and try again.",
            className: "error",
            duration: (10 * 1000)
        }).showToast();
    } else {
        // save/update additional fees from server
        const additionalCosts = {
            wfdDiscountForShop : Number(serverCart.items["wfdPriceDiscount"]) ?? 0,
            wfdDiscount : Number(serverCart.items["wfdDiscount"]) ?? 0,
            couponDiscount : Number(serverCart.items["couponDiscount"]) ?? 0,
            adminFee : Number(serverCart.items["adminFee"]) ?? 0,
        }

        additionalCosts['totalDiscount'] = additionalCosts.totalDiscount + additionalCosts.wfdDiscount + additionalCosts.wfdDiscountForShop + additionalCosts.couponDiscount;
        setCartCostLS(additionalCosts);

        const lsCart = getCartFromLS();
        // if the cart stored on server is empty then return empty
        if(serverCart.items.items === null || serverCart.items.items.length === 0) {
            return {}
        } else {
            // dishes that are on the server cart but not on the local cart
            let uniqueResultsOnServerCart = serverCart.items.items.filter(function (sc) {
                return !Object.values(lsCart).some(function (lc) {
                    return sc.dishId === lc.dishId && sc.index === lc.serverIndex;
                });
            });

            // dishes that are on the local cart but not on the server cart
            let uniqueResultOnLocalCart = Object.values(lsCart).filter(function (lc) {
                return !serverCart.items.items.some(function (sc) {
                    return lc.dishId === sc.dishId && sc.index === lc.serverIndex;
                });
            });

            // console.log(uniqueResultOnLocalCart);
            // console.log(uniqueResultsOnServerCart);

            // we update the local cart to match the server cart
            // first, remove the unique items on local cart
            // then add the missing server cart items to local cart
            uniqueResultOnLocalCart.forEach(({dishId}) => {
                delete lsCart[dishId];
            });

            uniqueResultsOnServerCart.forEach(item => {
                item.serverIndex = item.index;
                const localCartIndex = `${item.dishId}-${item.index}`;
                lsCart[localCartIndex] = item;
            })

            // save the local cart to cache (local storage)
            saveCartToLS(lsCart);

            //Combine the two arrays of unique entries
            // let grandMismatch = uniqueResultsOnServerCart.concat(uniqueResultOnLocalCart);

            return lsCart;
        }
    }
}

const loaderDom = "<div role=\"status\">\n" +
    "    <svg aria-hidden=\"true\" class=\"mr-2 w-8 h-8 text-gray-200 animate-spin fill-red-600\" viewBox=\"0 0 100 101\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n" +
    "        <path d=\"M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z\" fill=\"currentColor\"/>\n" +
    "        <path d=\"M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z\" fill=\"currentFill\"/>\n" +
    "    </svg>\n" +
    "    <span class=\"sr-only\">Loading...</span>\n" +
    "</div>";

const trashIconDom = "<svg style=\"pointer-events: none\" fill=\"#000000\" xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 30 30\" width=\"30px\" height=\"30px\"><path d=\"M 13 3 A 1.0001 1.0001 0 0 0 11.986328 4 L 6 4 A 1.0001 1.0001 0 1 0 6 6 L 24 6 A 1.0001 1.0001 0 1 0 24 4 L 18.013672 4 A 1.0001 1.0001 0 0 0 17 3 L 13 3 z M 6 8 L 6 24 C 6 25.105 6.895 26 8 26 L 22 26 C 23.105 26 24 25.105 24 24 L 24 8 L 6 8 z\"/></svg>";

async function buildCartContent(shouldSync) {
    const cartModalBodyRef = document.getElementById("cart-modal-body");
    // Unhide the checkout button
    cartCheckoutButton.style.display = "block";
    if(shouldSync) cartModalBodyRef.innerHTML = loaderDom;
    const storedCart = shouldSync ? await syncCartWithServer() : getCartFromLS();
    if(Object.keys(storedCart).length === 0) {
        // hide the checkout button
        cartCheckoutButton.style.display = "none";
        document.getElementById("cart-modal-body").innerHTML = "Your cart is empty!";
        document.getElementById("floating-cart-count").style.visibility = "hidden";
        return;
    }
    // pair = [key, value]
    const cartItemsDom = Object.entries(storedCart).map((pair) => {
        const cartItem = pair[1];
        const key = pair[0];
        const itemName = cartItem.details.split("\n")[0];
        const itemDetails = cartItem.details.split("\n").splice(1).join("<br>");
        return `<div class="cart-container">
                <div class="cart-desc-n-del-container">
                    <div class="cart-item-desc-container">
                        <span class="cart-item-name">${itemName}</span>
                        <span class="cart-item-details">${itemDetails}</span>
                    </div>
                    <button class="cart-item-del-btn" onclick="onCartItemDelete(event, '${key}')">
                        ${trashIconDom}
                    </button>
                </div>
                <div class="cart-quantity-n-price-container">
                    <div class="cart-quantity-container">
                        <button class="cart-quantity-change-btn" onclick="onCartQuantityChange(event, 'add', '${key}')">+</button>
                        <span class="cart-item-quantity">${cartItem.quantity}</span>
                        <button class="cart-quantity-change-btn" onclick="onCartQuantityChange(event, 'remove', '${key}')">-</button>
                    </div>
                    <div class="cart-item-price">€${parseFloat(cartItem.grandTotal).toFixed(2)}</div>
                </div>
            </div>`
    }).join("");

    const costDom = generateCostDom(storedCart)

    // Show comment input
    const addACommentDom = `<div class="flex flex-col w-full ">
                        <label for="order-comment" class="text-normal text-gray-900">Comment</label>
                        <textarea id="order-comment" class="w-full h-16 text-gray-900 bg-white border-0 focus:ring-0 " placeholder="If you have any allergy please contact us directly or leave a comment here"></textarea>
<!--                        <div class="flex w-full flex-col items-end mt-2"><button id="add-order-comment" class="modal-add-comment-btn"> Update Comment </button></div>-->
                    </div>`;
    cartModalBodyRef.innerHTML = cartItemsDom + costDom + addACommentDom;

    updateCartCounter(storedCart);
}

function generateCostDom(cart,) {
    let storedCart = cart ?? getCartFromLS();

    // Show restaurant total
    const restaurantTotal = Object.values(storedCart).map(i => i.grandTotal).reduce((a,b) => a+b, 0);
    const restaurantTotalDom = `<div class="flex flex-row justify-between items-center pt-2 border-t-2 border-gray-300">
                    <span>Restaurant Total:</span><span class="text-xl font-bold text-red-600">€${restaurantTotal.toFixed(2)}</span></div>`;
    // Show grand total with admin fee
    const cartCostLs = getCartCostLS();
    let discountAndAdminCostDom = ""
    if(cartCostLs !== null) {
        let ldom = "";
        if(cartCostLs.totalDiscount && cartCostLs.totalDiscount !== 0) {
            ldom += `<div class="mt-0 flex flex-row justify-between items-center text-normal">
                    <span>Discount: </span> <span class="text-xl font-bold text-red-600">€${cartCostLs.totalDiscount.toFixed(2)}</span>
                </div>`;
        }
        if(cartCostLs.adminFee && cartCostLs.adminFee !== 0) {
            ldom += `<div class="mt-0 flex flex-row justify-between items-center text-normal">
                    <span>Admin fee: </span> <span class="text-xl font-bold text-red-600">€${cartCostLs.adminFee.toFixed(2)}</span>
                </div>`;
        }

        // if(cardCharge && cardCharge > 0) {
        //     ldom += `<div class="mt-0 flex flex-row justify-between items-center text-normal">
        //             <span>Card charge: </span> <span class="text-xl font-bold text-red-600">€${cardCharge.toFixed(2)}</span>
        //         </div>`;
        // }

        discountAndAdminCostDom = ldom;
    }

    const grandTotal = restaurantTotal - (cartCostLs ? cartCostLs.totalDiscount : 0) + (cartCostLs ? cartCostLs.adminFee : 0);
    const grandTotalDom = `<div class="flex flex-row justify-between items-center pt-2 border-t-2 border-gray-300"><span class="font-bold text-xl">Grand Total:</span><span class="text-xl font-bold text-red-600">€${grandTotal.toFixed(2)}</span></div>`;

    localStorage.setItem("net", grandTotal);

    return restaurantTotalDom + discountAndAdminCostDom + grandTotalDom;
}

function getCartFromLS() {
    let storedCart = localStorage.getItem("cart-storage");
    if(storedCart) {
        storedCart = JSON.parse(Base64.decode(storedCart));
    } else {
        storedCart = {};
    }
    return storedCart;
}

function saveCartToLS(cartObj) {
    const stringified = JSON.stringify(cartObj);
    const encoded = Base64.encode(stringified);
    localStorage.setItem("cart-storage", encoded);
}