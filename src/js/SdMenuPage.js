class SdMenuPage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({"mode": "open"});

        this.loading = true;
        this.loadingError = false;
        this.empty = false;

        this.shopId = this.getAttribute("shopId");
        this.townId = this.getAttribute("townId");
        this.cityId = this.getAttribute("cityId");

        this.render();
    }

    async connectedCallback() {
        this.loading = true;
        const categoryList = await this.getShopMenuCategory(this.shopId);
        if(categoryList && categoryList.length > 0) {
            this.menuCategory = categoryList;
        } else {
            this.empty = true;
        }
        this.render();
    }

    async getShopMenuCategory(shopId) {
        const cachedData = localStorage.getItem("menu_cat");
        if(cachedData) {
            if(this.shouldClearCache(localStorage.getItem("menu_cat_ct"))) {
                localStorage.removeItem("menu_cat");
                localStorage.removeItem("menu_cat_ct");
            } else {
                this.loading = false;
                this.loadingError = false;
                // TODO: Update base64 impl
                return JSON.parse(atob(cachedData));
            }
        }
        this.loading = true;
        this.loadingError = false; // reset error state
        const shopMenuCategoryURL = `${domain}/service/customer/get-shop-menu-category`;
        try {
            const payload = {
                shopId: shopId
            }
            const response = await fetch(shopMenuCategoryURL, {
                method: 'POST',
                body: JSON.stringify(payload),
                mode: "cors",
            });
            this.loading = false;
            const json = await response.json();
            // save it to cache (local storage)
            localStorage.setItem("menu_cat", btoa(JSON.stringify(json)));
            localStorage.setItem("menu_cat_ct", Date.now().toString());
            return json;
        } catch (error) {
            this.loading = false;
            this.loadingError = true;
            console.error(error);
        }
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

    attributeChangedCallback(attrName, oldVal, newVal) {
        this.render();
    }

    renderMenuSections() {
        return this.menuCategory.map((section, index) =>
            `<sd-menu-section
                        ind="${index}"
                        town="${this.townId}"
                        city="${this.cityId}"
                        shop="${this.shopId}"
                        category="${section.menuCatId}"
                        title="${section.title}"
                        ></sd-menu-section>`).join("");
    }

    render() {
        let dom = `<style> @import "index-o.css"; </style>`;
        if(this.loading) {
            dom += "<p>Loading menu page</p>";
        } else if(this.loadingError) {
            dom += "<p>Failed to load menu</p>";
        } else {
            dom += `<div class="columns-1 lg:columns-2 mt-8">${this.renderMenuSections()}</div>`
        }

        this.shadowRoot.innerHTML = dom;
    }
}