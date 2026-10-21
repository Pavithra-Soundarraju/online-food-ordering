
interface Meal {
    idMeal: string;
    strMeal: string;
    strMealThumb: string;
    strCategory?: string;
}

interface MealResponse {
    meals: Meal[] | null;
}

interface RecipeMeal extends Meal {
    strInstructions: string;
    [key: string]: string | null | undefined;
}

interface RecipeResponse {
    meals: RecipeMeal[] | null;
}

interface CartItem {
    meal: Meal;
    price: number;
    quantity: number;
}

const API_URL = "https://www.themealdb.com/api/json/v1/1/";
const FAVORITES_KEY = "foodie-favorites";
const CART_KEY = "foodie-cart";

// HTML elements
const foodContainer = document.getElementById("food-container");
const statusMessage = document.getElementById("status-message");
const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
const categoryFilter = document.getElementById("category-filter") as HTMLSelectElement | null;
const searchButton = document.getElementById("search-button");

const recipeSection = document.getElementById("recipe-section");
const recipeContainer = document.getElementById("recipe-container");
const backButton = document.getElementById("back-button");

const favoritesContainer = document.getElementById("favorites-container");
const cartContainer = document.getElementById("cart-container");
const cartTotal = document.getElementById("cart-total");
const checkoutButton = document.getElementById("checkout-button");
const orderMessage = document.getElementById("order-message");

const menuSection = foodContainer?.closest("section");
const searchSection = document.querySelector(".search-section");

// Application data
let allMeals: Meal[] = [];
let favoriteMeals: Meal[] = [];
let cartItems: CartItem[] = [];

// Escape special characters before displaying API text
function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character: string) => {
        const replacements: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}

// Load Favorites from localStorage
function loadFavorites(): void {
    try {
        const saved = localStorage.getItem(FAVORITES_KEY);

        if (!saved) {
            favoriteMeals = [];
            return;
        }

        const parsed: unknown = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            favoriteMeals = [];
            return;
        }

        favoriteMeals = parsed.filter((item: unknown) => {
            if (typeof item !== "object" || item === null) {
                return false;
            }

            const meal = item as Partial<Meal>;

            return (
                typeof meal.idMeal === "string" &&
                typeof meal.strMeal === "string" &&
                typeof meal.strMealThumb === "string"
            );
        }) as Meal[];
    } catch {
        favoriteMeals = [];
    }
}

function saveFavorites(): void {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteMeals));
}

function toggleFavorite(meal: Meal): void {
    const exists = favoriteMeals.some(
        (item: Meal) => item.idMeal === meal.idMeal
    );

    if (exists) {
        favoriteMeals = favoriteMeals.filter(
            (item: Meal) => item.idMeal !== meal.idMeal
        );
    } else {
        favoriteMeals.push(meal);
    }

    saveFavorites();
    displayFavorites();

    if (foodContainer) {
        displayMeals(allMeals);
    }
}

// Load Shopping Cart from localStorage
function loadCart(): void {
    try {
        const saved = localStorage.getItem(CART_KEY);

        if (!saved) {
            cartItems = [];
            return;
        }

        const parsed: unknown = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            cartItems = [];
            return;
        }

        cartItems = parsed.filter((item: unknown) => {
            if (typeof item !== "object" || item === null) {
                return false;
            }

            const cartItem = item as Partial<CartItem>;
            const meal = cartItem.meal as Partial<Meal> | undefined;

            return (
                typeof meal?.idMeal === "string" &&
                typeof meal.strMeal === "string" &&
                typeof meal.strMealThumb === "string" &&
                typeof cartItem.price === "number" &&
                Number.isFinite(cartItem.price) &&
                cartItem.price >= 0 &&
                typeof cartItem.quantity === "number" &&
                Number.isInteger(cartItem.quantity) &&
                cartItem.quantity > 0
            );
        }) as CartItem[];
    } catch {
        cartItems = [];
    }
}

function saveCart(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
}

// Generate a demo price for each meal
function getDemoPrice(meal: Meal): number {
    const lastDigits = Number(meal.idMeal.slice(-3)) || 0;
    return 120 + (lastDigits % 180);
}

// Add a meal to the cart
function addToCart(meal: Meal): void {
    const existingItem = cartItems.find(
        (item: CartItem) => item.meal.idMeal === meal.idMeal
    );

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cartItems.push({
            meal,
            price: getDemoPrice(meal),
            quantity: 1
        });
    }

    saveCart();
    displayCart();
    displayMeals(allMeals);

    if (orderMessage) {
        orderMessage.textContent = "";
    }
}

// Change quantity from a food card or the Cart page
function updateCartQuantity(mealId: string, action: string): void {
    const item = cartItems.find(
        (cartItem: CartItem) => cartItem.meal.idMeal === mealId
    );

    if (!item) {
        return;
    }

    if (action === "increase") {
        item.quantity++;
    } else if (action === "decrease") {
        item.quantity--;

        if (item.quantity <= 0) {
            cartItems = cartItems.filter(
                (cartItem: CartItem) => cartItem.meal.idMeal !== mealId
            );
        }
    } else if (action === "remove") {
        cartItems = cartItems.filter(
            (cartItem: CartItem) => cartItem.meal.idMeal !== mealId
        );
    }

    saveCart();
    displayCart();
    displayMeals(allMeals);

    if (orderMessage) {
        orderMessage.textContent = "";
    }
}

// Display the Shopping Cart page
function displayCart(): void {
    if (!cartContainer || !cartTotal) {
        return;
    }

    if (cartItems.length === 0) {
        cartContainer.innerHTML = "<p>Your cart is empty. Add meals from the menu!</p>";
        cartTotal.textContent = "0";
        return;
    }

    cartContainer.innerHTML = cartItems.map((item: CartItem) => `
        <div class="cart-item">
            <img
                src="${escapeHtml(item.meal.strMealThumb)}"
                alt="${escapeHtml(item.meal.strMeal)}"
                width="80"
            >

            <div class="cart-item-info">
                <h3>${escapeHtml(item.meal.strMeal)}</h3>
                <p>Price: ₹${item.price}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Subtotal: ₹${item.price * item.quantity}</p>

                <button
                    type="button"
                    data-cart-action="decrease"
                    data-cart-id="${escapeHtml(item.meal.idMeal)}"
                >−</button>

                <button
                    type="button"
                    data-cart-action="increase"
                    data-cart-id="${escapeHtml(item.meal.idMeal)}"
                >+</button>

                <button
                    type="button"
                    data-cart-action="remove"
                    data-cart-id="${escapeHtml(item.meal.idMeal)}"
                >Remove</button>
            </div>
        </div>
    `).join("");

    const total = cartItems.reduce(
        (sum: number, item: CartItem) =>
            sum + item.price * item.quantity,
        0
    );

    cartTotal.textContent = String(total);
}

// Display Favorites page
function displayFavorites(): void {
    if (!favoritesContainer) {
        return;
    }

    if (favoriteMeals.length === 0) {
        favoritesContainer.innerHTML =
            "<p>No favorites yet. Add meals from the menu!</p>";
        return;
    }

    favoritesContainer.innerHTML = favoriteMeals.map((meal: Meal) => `
        <div class="food-card" data-meal-id="${escapeHtml(meal.idMeal)}">
            <img
                src="${escapeHtml(meal.strMealThumb)}"
                alt="${escapeHtml(meal.strMeal)}"
                loading="lazy"
            >

            <h3>${escapeHtml(meal.strMeal)}</h3>

            <button
                type="button"
                class="favorite-icon"
                data-favorite-remove="${escapeHtml(meal.idMeal)}"
                aria-label="Remove from favorites"
                title="Remove from favorites"
            >❤️</button>

            <button
                type="button"
                class="add-cart-button"
                data-cart-add="${escapeHtml(meal.idMeal)}"
            >Add to Cart</button>
        </div>
    `).join("");
}

// Fetch food menu from TheMealDB
async function fetchMeals(): Promise<void> {
    if (!foodContainer || !statusMessage || !categoryFilter) {
        return;
    }

    statusMessage.textContent = "Loading food menu...";
    foodContainer.innerHTML = "";

    try {
        const category = categoryFilter.value;

        const url = category === "all"
            ? `${API_URL}search.php?s=chicken`
            : `${API_URL}filter.php?c=${encodeURIComponent(category)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to load food menu.");
        }

        const data: MealResponse = await response.json();

        allMeals = (data.meals ?? []).map((meal: Meal) => ({
            ...meal,
            strCategory: category === "all" ? "Chicken" : category
        }));

        displayMeals(allMeals);
    } catch (error: unknown) {
        statusMessage.textContent =
            "Unable to load food. Please check your internet connection.";

        console.error(error);
    }
}

// Display food cards and their current cart quantities
function displayMeals(meals: Meal[]): void {
    if (!foodContainer || !statusMessage) {
        return;
    }

    foodContainer.innerHTML = "";

    if (meals.length === 0) {
        statusMessage.textContent = "No food items found.";
        return;
    }

    statusMessage.textContent = `${meals.length} food item(s) found.`;

    foodContainer.innerHTML = meals.map((meal: Meal) => {
        const isFavorite = favoriteMeals.some(
            (item: Meal) => item.idMeal === meal.idMeal
        );

        const cartItem = cartItems.find(
            (item: CartItem) => item.meal.idMeal === meal.idMeal
        );

        const quantity = cartItem?.quantity ?? 0;

        const cartButtonHtml = `
    ${
        quantity === 0
            ? `<button
                   type="button"
                   class="add-cart-button"
                   data-cart-add="${escapeHtml(meal.idMeal)}">
                   Add to Cart
               </button>`
            : `<div class="cart-card-controls">
                   <button
                       type="button"
                       data-card-cart-action="decrease"
                       data-cart-id="${escapeHtml(meal.idMeal)}">−</button>

                   <span>Added to Cart Successfully</span>

                   <button
                       type="button"
                       data-card-cart-action="increase"
                       data-cart-id="${escapeHtml(meal.idMeal)}">+</button>
               </div>`
    }
`;


        return `
            <div class="food-card" data-meal-id="${escapeHtml(meal.idMeal)}">
                <img
                    src="${escapeHtml(meal.strMealThumb)}"
                    alt="${escapeHtml(meal.strMeal)}"
                    loading="lazy"
                >

                <button
                    type="button"
                    class="favorite-icon"
                    data-favorite-id="${escapeHtml(meal.idMeal)}"
                    aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                    title="${isFavorite ? "Remove from favorites" : "Add to favorites"}"
                >${isFavorite ? "❤️" : "♡"}</button>

                <h3>${escapeHtml(meal.strMeal)}</h3>
                <p>Category: ${escapeHtml(meal.strCategory ?? "Food")}</p>

                ${cartButtonHtml}

                <p>Click the card to view recipe details.</p>
            </div>
        `;
    }).join("");
}

// Search meals by name
function searchMeals(): void {
    if (!searchInput) {
        return;
    }

    const searchText = searchInput.value.trim().toLowerCase();

    const filteredMeals = allMeals.filter((meal: Meal) =>
        meal.strMeal.toLowerCase().includes(searchText)
    );

    displayMeals(filteredMeals);
}

// Display recipe details
async function showRecipe(mealId: string): Promise<void> {
    if (!recipeSection || !recipeContainer || !menuSection || !searchSection) {
        return;
    }

    recipeSection.hidden = false;
    menuSection.hidden = true;
    searchSection.setAttribute("hidden", "");
    recipeContainer.textContent = "Loading recipe...";

    try {
        const response = await fetch(
            `${API_URL}lookup.php?i=${encodeURIComponent(mealId)}`
        );

        if (!response.ok) {
            throw new Error("Unable to load recipe.");
        }

        const data: RecipeResponse = await response.json();
        const meal = data.meals?.[0];

        if (!meal) {
            recipeContainer.textContent = "Recipe details not found.";
            return;
        }

        let ingredientsHtml = "";

        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`]?.trim();
            const measure = meal[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredientsHtml += `
                    <li>
                        ${escapeHtml(ingredient)} - ${escapeHtml(measure ?? "")}
                    </li>
                `;
            }
        }

        recipeContainer.innerHTML = `
            <h2>${escapeHtml(meal.strMeal)}</h2>

            <img
                class="recipe-image"
                src="${escapeHtml(meal.strMealThumb)}"
                alt="${escapeHtml(meal.strMeal)}"
            >

            <h3>Ingredients</h3>
            <ul>${ingredientsHtml || "<li>No ingredients available.</li>"}</ul>

            <h3>Instructions</h3>
            <p>${escapeHtml(meal.strInstructions || "No instructions available.")}</p>
        `;
    } catch (error: unknown) {
        recipeContainer.textContent =
            "Unable to load recipe. Please try again.";

        console.error(error);
    }
}

// Food menu click events
if (foodContainer) {
    foodContainer.addEventListener("click", (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const favoriteButton = target.closest<HTMLButtonElement>(
            "[data-favorite-id]"
        );

        if (favoriteButton) {
            const meal = allMeals.find(
                (item: Meal) =>
                    item.idMeal === favoriteButton.dataset.favoriteId
            );

            if (meal) {
                toggleFavorite(meal);
            }

            return;
        }

        const addButton = target.closest<HTMLButtonElement>("[data-cart-add]");

        if (addButton) {
            const meal = allMeals.find(
                (item: Meal) => item.idMeal === addButton.dataset.cartAdd
            );

            if (meal) {
                addToCart(meal);
            }

            return;
        }

        const quantityButton = target.closest<HTMLButtonElement>(
            "[data-card-cart-action]"
        );

        if (quantityButton) {
            const mealId = quantityButton.dataset.cartId;
            const action = quantityButton.dataset.cardCartAction;

            if (mealId && action) {
                updateCartQuantity(mealId, action);
            }

            return;
        }

        const foodCard = target.closest<HTMLElement>("[data-meal-id]");

        if (foodCard?.dataset.mealId) {
            void showRecipe(foodCard.dataset.mealId);
        }
    });
}

// Favorites page click events
if (favoritesContainer) {
    favoritesContainer.addEventListener("click", (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const removeButton = target.closest<HTMLButtonElement>(
            "[data-favorite-remove]"
        );

        if (removeButton) {
            const meal = favoriteMeals.find(
                (item: Meal) =>
                    item.idMeal === removeButton.dataset.favoriteRemove
            );

            if (meal) {
                toggleFavorite(meal);
            }

            return;
        }

        const addButton = target.closest<HTMLButtonElement>("[data-cart-add]");

        if (addButton) {
            const meal = favoriteMeals.find(
                (item: Meal) => item.idMeal === addButton.dataset.cartAdd
            );

            if (meal) {
                addToCart(meal);
            }

            return;
        }

        const foodCard = target.closest<HTMLElement>("[data-meal-id]");

        if (foodCard?.dataset.mealId) {
            void showRecipe(foodCard.dataset.mealId);
        }
    });
}

// Cart page click events
if (cartContainer) {
    cartContainer.addEventListener("click", (event: MouseEvent) => {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest<HTMLButtonElement>("[data-cart-action]");

        if (!button) {
            return;
        }

        const mealId = button.dataset.cartId;
        const action = button.dataset.cartAction;

        if (mealId && action) {
            updateCartQuantity(mealId, action);
        }
    });
}

// Place Order (demo checkout only)
if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
        if (!orderMessage) {
            return;
        }

        if (cartItems.length === 0) {
            orderMessage.textContent =
                "Your cart is empty. Add food before placing an order.";
            return;
        }

        const total = cartItems.reduce(
            (sum: number, item: CartItem) =>
                sum + item.price * item.quantity,
            0
        );

        orderMessage.textContent =
            `Order placed successfully! Total: ₹${total}.`;

        cartItems = [];
        saveCart();
        displayCart();
        displayMeals(allMeals);
    });
}

// Search and category filter events
if (searchButton) {
    searchButton.addEventListener("click", searchMeals);
}

if (searchInput) {
    searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") {
            searchMeals();
        }
    });
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", () => {
        if (searchInput) {
            searchInput.value = "";
        }

        void fetchMeals();
    });
}

// Back to menu from recipe
if (backButton) {
    backButton.addEventListener("click", () => {
        if (recipeSection) {
            recipeSection.hidden = true;
        }

        if (menuSection) {
            menuSection.hidden = false;
        }

        if (searchSection) {
            searchSection.removeAttribute("hidden");
        }
    });
}

// Initialize only the features available on the current page
loadFavorites();
loadCart();

if (foodContainer) {
    void fetchMeals();
}

if (favoritesContainer) {
    displayFavorites();
}

if (cartContainer) {
    displayCart();
}
