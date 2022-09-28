// const domain = "http://www.whatsfordinner.local";
const domain = "https://whatsfordinner.ie"
// const shopId = "507";//"512"; // hard rock cafe on test server // 507: Old school on test web
// const townId = "69";// "21"//"18"; // 69 -> Ath town center on test server
// const cityId = "11"; // test server Athelon

// local
// const shopId = "59"
// const townId = "1"
// const cityId = "10";
// live
const shopId = "743"
const townId = "18"
const cityId = "10";

const DELIVERY_METHOD = {
    collection: 1,
    delivery: 2,
    dropInPub: 1
};

const DELIVERY_DAY = {
    today: 1,
    tomorrow: 2
};

const DELIVERY_SCHEDULE = {
    now: 1,
    later: 2
}

const PAYMENT_METHOD = {
    card: 1,
    cod: 2,
    // voucher: 4
}

let deliveryMethod = null;
let paymentMethod = PAYMENT_METHOD.card;
let cardCharge = 0; // set from cartStuff -> proceed order

let customerBillingAddressId = null;
let customerOrderId = null;

let customerTableNumber = null;

const pubName = "The Ol’ 55 Pub";

const cartSessionTokenURL = `${domain}/service/customer/get-app-token`;
const shopItemsURL = `${domain}/getMenuItem` // Needs to be form data
const addToCartURL = `${domain}/service/customer/v2/add-item-to-cart`;
const getCartItemsURL = `${domain}/service/customer/get-cart-item`;
const removeFromCartURL = `${domain}/service/customer/remove-cart-item`;
const updateCartQuantityUrl = `${domain}/service/customer/update-cart-item`;
const shopMenuCategoryURL = `${domain}/service/customer/get-shop-menu-category`;
const shopMenuItemByCategoryURL = `${domain}/service/customer/get-menu-by-shop-n-category`;
const getShopTimeSlotListURL = `${domain}/service/customer/v1/get-shop-time-slot-list`;
const setShopTimeSlotURL = `${domain}/service/customer/v1/update-shop-time-slot`;
const addOrderCommentURL = `${domain}/service/customer/add-comments`;
const proceedToCheckoutURL = `${domain}/service/customer/v2/proceed-checkout`;
const saveCustomerContactURL = `${domain}/service/customer/v2/save-order-contact`;
const placeOrderURL = `${domain}/service/customer/place-order`;
const clearCartURL = `${domain}/service/customer/clear-cart`;

async function clearServerCart(sessionId) {
    try {
        const payload = {
            api_token: sessionId
        }
        const response = await fetch(clearCartURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: "cors",
        });
        return await response.json();
    }catch (error) {
        console.error(error);
    }
}

async function addItemToCart(menuItem, sessionId) {
    try {
        const payload = {
            ...menuItem,
            api_token: sessionId
        }
        const response = await fetch(addToCartURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: "cors",
        });
        return await response.json();
    }catch (error) {
        console.error(error);
    }
}

async function removeItemFromOnlineCart(serverCartItemIndex, sessionId) {
    try {
        const payload = {
            api_token : sessionId,
            index: serverCartItemIndex
        }
        const response = await fetch(removeFromCartURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: 'cors'
        });
        return await response.json();

    } catch (error) {
        console.error(error);
    }
}

async function updateCartItemQuantity(serverCartItemIndex, newQuantity, sessionId) {
    try {
        const payload = {
            api_token : sessionId,
            quantity: newQuantity,
            index: serverCartItemIndex
        }
        const response = await fetch(updateCartQuantityUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: 'cors'
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

function getBillingAddressURL(userId, deliveryAddressId) {
    return `${domain}/customer-app-web-view-v2/billing-address-android-app?userId=${userId}&deliveryAddressId=${deliveryAddressId}`
}

function getCardPaymentURL(orderId, publicId, revolutId, amount) {
    return `${domain}/revolut-payment-customer-app?orderId=${orderId}&publicId=${publicId}&revolutId=${revolutId}&amount=${amount}&type=1`;
}

async function saveCustomerContactDetails(sessionId, name, email, phone, deliveryType, cityId, townId) {
    try {
        const payload = {
            user: {
                name,
                email,
                phoneNo: phone,
            },
            api_token: sessionId,
            delivery_method: deliveryType, // collection
            address: {
                city: {city_id: cityId},
                town: {town_id: townId}
            }
        };
        const response = await fetch(saveCustomerContactURL, {
            method: 'POST',
            mode: "cors",
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function addCommentToOrder(sessionId, shopId, comment) {
    try {
        const payload = {
            comments: comment,
            shopId: shopId,
            api_token: sessionId
        }
        const response = await fetch(addOrderCommentURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: 'cors'
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function proceedToCheckout(sessionId, cityId, townId) {
    try {
        const payload = {
            'city_id' : cityId,
            'town_id' : townId,
            'api_token': sessionId
        };

        const response = await fetch(proceedToCheckoutURL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(payload)
        });

        const jsonResponse = await response.json();
        // console.log(jsonResponse);
        return jsonResponse;
    } catch (error) {
        console.error(error);
    }
}

async function placeOrder(sessionId, paymentMode, cardAmount, billingAddressId) {
    try {
        const payload = {
            'paymentMode' : paymentMode,
            'platform' : 'Android',
            'versionNo' : 'ShakeDog_Web',
            'paymentGateway': "2",
            'cashAmount' : 0,
            'cardAmount' : cardAmount,
            'billingAddressId' : billingAddressId,
            'api_token': sessionId
        };

        const response = await fetch(placeOrderURL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function getCartItem(sessionId) {
    try {
        const payload = {api_token: sessionId};
        const response = await fetch(getCartItemsURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: "cors"
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function getShopTimeSlots(shopId) {
    try {
        const payload = {
            'shopId' : shopId
        }
        const response = await fetch(getShopTimeSlotListURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: "cors"
        });

        const jsonResponse = await response.json();
        // console.log(jsonResponse);
        return jsonResponse;
    } catch (error) {
        console.error(error);
    }
}

async function setShopTimeSlot(sessionId, shopId, deliveryMethod, deliverySchedule, deliveryDay, timeSlot) {
    try {
        const payload = {
            api_token: sessionId,
            shopId: shopId,
            deliveryMethod: deliveryMethod,
            nowLaterTime: deliverySchedule,
            orderProcessDay: deliveryDay,
            orderHours: timeSlot
        };

        const response = await fetch(setShopTimeSlotURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: "cors"
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function getWFDToken(deviceId) {
    try {
        const payload = {
            'deviceToken': deviceId
        };
        const response = await fetch(cartSessionTokenURL, {
            method: 'POST',
            body: JSON.stringify(payload),
            mode: 'cors',
        });
        const jsonResponse = await response.json();
        return jsonResponse["api_token"];
    } catch (error) {
        console.error(error);
        // TODO: Catch me
    }
}

// https://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
function generateUID() {
    return ("000" + ((Math.random() * 46656) | 0).toString(36)).slice(-3) + Date.now() + ("000" + ((Math.random() * 46656) | 0).toString(36)).slice(-3);
}

// Set device ID and session ID
(async () => {
    let deviceId = localStorage.getItem("deviceId");
    let sessionId = localStorage.getItem("sessionId");
    if(!deviceId) {
        deviceId = generateUID();
        localStorage.setItem("deviceId", deviceId);
    }
    if(!sessionId || sessionId === "undefined") {
        sessionId = await getWFDToken(deviceId);
        if(!sessionId) {
            alert("Sorry! Something went wrong and I won't be able to take your order digitally. Please seek a waiter. Thank you.")
        } else {
            localStorage.setItem("sessionId", sessionId);
        }
    }
})();