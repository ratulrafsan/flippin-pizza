class SdMenuSectionEntry extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({'mode': 'open'});
        //this._shadowRoot.appendChild(sdMenuSectionEntryTemplate.content.cloneNode(true));
        this.loading = true;
        this.loadingError = false;
        this.hideSelf = false; // Hide this section from user

        this.shopId = this.getAttribute("shop");
        this.townId = this.getAttribute("town");
        this.categoryId = this.getAttribute("category");
        this.title = this.getAttribute("title");

        this.render();
    }

    async connectedCallback() {
        this.loading = true;
        const menuItems = await this.getMenuItemsByCategoryId(this.shopId, this.townId, this.categoryId);
        // console.log(menuItems);
        if(menuItems && menuItems.menu_list && menuItems.menu_list.length > 0) {
            this.items = menuItems.menu_list;
            this.render();
        } else {
            // This section does not contain any items. Do not show
            this.hideSelf = true;
        }
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
        this.render();
    }

    shouldClearCache(cacheTime) {
        if(!cacheTime) return true;
        cacheTime = Number(cacheTime);
        const currentTime = Date.now();
        const maxHourDiff = 1; // 1 hour
        // subtract maxHourDiff hours from the current time
        // if the result of subtraction is larger than the cacheTime, the cache has expired
        return (currentTime - (maxHourDiff * 60 * 60 * 1000)) > cacheTime;
    }

    async getMenuItemsByCategoryId(shopId, townId, categoryId) {
        const cachedData = localStorage.getItem(`cached_items_${categoryId}`);
        if(cachedData) {
            if(this.shouldClearCache(localStorage.getItem(`cached_items_${categoryId}_ct`))) {
                localStorage.removeItem(`cached_items_${categoryId}`);
                localStorage.removeItem(`cached_items_${categoryId}_ct`);
            } else {
                this.loading = false;
                this.loadingError = false;
                // TODO: update base64 impl
                return JSON.parse(atob(cachedData));
            }
        }

        this.loadingError = false; // reset loading state;
        try {
            const payload = {
                'shopId': shopId,
                'townId': townId,
                'categoryId': categoryId
            }
            const response = await fetch(`${domain}/service/customer/get-menu-by-shop-n-category`, {
                method: 'POST',
                body: JSON.stringify(payload),
                mode: "cors"
            });
            this.loading = false;
            const json = await response.json();
            const ct = Date.now();
            localStorage.setItem(`cached_items_${categoryId}`, btoa(JSON.stringify(json)));
            localStorage.setItem(`cached_items_${categoryId}_ct`, ct.toString());
            return json;
        } catch (error) {
            this.loadingError = true;
            this.loading = false;
            console.error(error);
            return null;
        }
    }

    renderHeader() {
        return `<div class="sd-menu-section-header">${this.title}</div>`;
    }

    renderDisclaimer() {
        if(this.hasAttribute("disclaimer")) {
            return `<div class="sd-in-menu-disclaimer">${this.getAttribute("disclaimer")}</div>`;
        } else {
            return "";
        }
    }

    renderItems() {
        if(this.items) {
            return this.items.map((i) => {
                return `<sd-tappable-menu-item
                        price="${i.basic.price}"
                        category="${i.basic.categoryId}"
                        dish="${i.basic.dishId}"
                        title="${i.basic.title}"
                        shopId="${this.shopId}"
                        categoryName="${i.basic.categoryTitle}"
                        ${i.basic.description ? `description="${i.basic.description}"` : ''}
                        ${i.optionList ? `options="${btoa(JSON.stringify(i.optionList))}"` : ''}
                        ${i.groupAddonList ? `groups="${btoa(JSON.stringify(i.groupAddonList))}"` : ''}
                        ${i.addonList ? `addons="${btoa(JSON.stringify(i.addonList))}"` : ''}
                ></sd-tappable-menu-item>`;
            }).join("");

        }
        return "";
    }

    render() {
        let dom = '<style> @import "index-o.css"; </style>';

        if(this.hideSelf) {
            this.shadowRoot.innerHTML = "";
            return;
        }

        if(this.loading) {
            dom += "<p>Loading</p>";
        } else if(this.loadingError) {
            dom += "<p>Loading Error :( </p>";
        } else {
            dom += `
               <div class="w-full sd-menu-section-container relative ${this.getAttribute("ind") === "0" ? '' : 'mt-10'}">
                    ${this.renderHeader()}
                    ${this.renderDisclaimer()}
                    ${this.renderItems()}
               </div>`;
        }

        this.shadowRoot.innerHTML = dom;
    }

}