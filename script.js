const input = document.getElementById("cryptoInput");
const button = document.getElementById("searchBtn");
const currencySelect = document.getElementById("currencySelect");

const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const changeEl = document.getElementById("change");
const marketcapEl = document.getElementById("marketcap");

const topCoinsDiv = document.getElementById("topCoins");
const themeBtn = document.getElementById("themeBtn");

let chart = null;
let currentCoin = null;

// =======================
// Taux EUR → MAD
// =======================
const MAD_RATE = 10.9; // Ajustable

// =======================
// Dark / Light mode
// =======================
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
});

// =======================
// Alias CoinGecko
// =======================
const aliases = {
    btc: "bitcoin",
    eth: "ethereum",
    usdt: "tether",
    bnb: "binancecoin",
    xrp: "ripple",
    ada: "cardano",
    doge: "dogecoin",
    sol: "solana"
};

// =======================
// Recherche
// =======================
button.addEventListener("click", search);
input.addEventListener("keyup", e => {
    if (e.key === "Enter") search();
});

currencySelect.addEventListener("change", () => {
    if (currentCoin) fetchCrypto(currentCoin);
});

function search() {
    let coin = input.value.toLowerCase().trim();
    if (!coin) return;

    coin = aliases[coin] || coin;
    currentCoin = coin;

    fetchCrypto(coin);
}

// =======================
// API principale
// =======================
async function fetchCrypto(coin) {
    const currency = currencySelect.value;
    const symbols = { usd: "$", eur: "€", mad: "DH" };

    // CoinGecko ne supporte pas MAD
    const apiCurrency = currency === "mad" ? "eur" : currency;

    // ---------- 1️⃣ INFOS CRYPTO
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin}`
        );

        if (!response.ok) {
            throw new Error("Crypto introuvable");
        }

        const data = await response.json();

        let price = data.market_data.current_price[apiCurrency];
        let marketcap = data.market_data.market_cap[apiCurrency];
        const change = data.market_data.price_change_percentage_24h;

        // Conversion EUR → MAD
        if (currency === "mad") {
            price *= MAD_RATE;
            marketcap *= MAD_RATE;
        }

        nameEl.innerText = `Nom : ${data.name}`;
        priceEl.innerText = `${symbols[currency]} ${price.toLocaleString()}`;
        changeEl.innerText = `${change.toFixed(2)} %`;
        marketcapEl.innerText = `${symbols[currency]} ${marketcap.toLocaleString()}`;
        changeEl.style.color = change >= 0 ? "lime" : "red";

    } catch (err) {
        console.error(err);
        alert("❌ Crypto introuvable");
        resetUI();
        return;
    }

    // ---------- 2️⃣ GRAPHIQUE
    try {
        const chartResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=${apiCurrency}&days=30`
        );

        if (!chartResponse.ok) throw new Error("Chart indisponible");

        const chartData = await chartResponse.json();

        let values = chartData.prices.map(p => p[1]);

        // Conversion graphique en MAD
        if (currency === "mad") {
            values = values.map(v => v * MAD_RATE);
        }

        const labels = chartData.prices.map(p =>
            new Date(p[0]).toLocaleDateString()
        );

        createChart(labels, values);

    } catch (chartErr) {
        console.warn("⚠️ Graphique indisponible");
        if (chart) chart.destroy();
    }
}

// =======================
// Reset UI
// =======================
function resetUI() {
    nameEl.innerText = "Nom : --";
    priceEl.innerText = "--";
    changeEl.innerText = "--";
    marketcapEl.innerText = "--";
    if (chart) chart.destroy();
}

// =======================
// Moyenne mobile (7j)
// =======================
function movingAverage(data, days = 7) {
    return data.map((_, i) => {
        if (i < days - 1) return null;
        const slice = data.slice(i - days + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / days;
    });
}

// =======================
// Graphique
// =======================
function createChart(labels, values) {
    const ctx = document.getElementById("priceChart");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Prix",
                    data: values,
                    tension: 0.3
                },
                {
                    label: "Moyenne mobile (7j)",
                    data: movingAverage(values),
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        }
    });
}

// =======================
// Top 5 cryptos
// =======================
async function loadTopCoins() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1"
        );

        const coins = await response.json();

        topCoinsDiv.innerHTML = "<h3>🔥 Top Cryptos :</h3>";

        coins.forEach(coin => {
            const btn = document.createElement("button");
            btn.innerText = coin.symbol.toUpperCase();
            btn.classList.add("coin-btn");

            btn.onclick = () => {
                input.value = coin.id;
                currentCoin = coin.id;
                fetchCrypto(coin.id);
            };

            topCoinsDiv.appendChild(btn);
        });

    } catch (err) {
        console.warn("Top coins indisponible");
    }
}

loadTopCoins();
