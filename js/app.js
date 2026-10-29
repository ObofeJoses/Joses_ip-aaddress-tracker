/* =========================================================
   IP Address Tracker: js/app.js (final, all commits merged)
   Requires: Leaflet (global L), js/config.js (local dev only)
   ========================================================= */

/* ---------- Map ---------- */
const DEFAULT_COORDS = [34.0522, -118.2437]; // placeholder until real data loads

const map = L.map("map", { zoomControl: false }).setView(DEFAULT_COORDS, 13);

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const markerIcon = L.icon({
  iconUrl: "images/icon-location.svg",
  iconSize: [46, 56],
  iconAnchor: [23, 56], // bottom tip of the pin sits on the coordinates
});

const marker = L.marker(DEFAULT_COORDS, { icon: markerIcon }).addTo(map);

/* ---------- API ---------- */
// Local dev: js/config.js defines CONFIG and the key is sent directly.
// Production: no config.js, so requests go through the Netlify proxy.
const API_KEY = typeof CONFIG !== "undefined" ? CONFIG.API_KEY : null;
const API_URL = API_KEY ? CONFIG.API_URL : "/.netlify/functions/ip";

const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6 = /^[0-9a-f:]+$/i;

function isIp(value) {
  return IPV4.test(value) || (value.includes(":") && IPV6.test(value));
}

async function getIpData(query = "") {
  const params = new URLSearchParams();
  if (API_KEY) params.set("apiKey", API_KEY); // local dev only

  // Empty query: the API (or proxy) resolves the requester's own IP
  if (query) params.set(isIp(query) ? "ipAddress" : "domain", query);

  const res = await fetch(`${API_URL}?${params}`);
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/* ---------- Render ---------- */
const els = {
  ip: document.getElementById("ip-address"),
  location: document.getElementById("location"),
  timezone: document.getElementById("timezone"),
  isp: document.getElementById("isp"),
};

function renderData({ ip, location, isp }) {
  const place = [location.city, location.region].filter(Boolean).join(", ");
  const postal = location.postalCode ? ` ${location.postalCode}` : "";

  els.ip.textContent = ip;
  els.location.textContent = `${place}${postal}` || location.country;
  els.timezone.textContent = location.timezone
    ? `UTC ${location.timezone}`
    : "–";
  els.isp.textContent = isp || "–";
}

function updateMap({ lat, lng }) {
  map.setView([lat, lng], 13);
  marker.setLatLng([lat, lng]);
}

/* ---------- UI state ---------- */
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const btn = form.querySelector(".search-btn");
const card = document.querySelector(".info-card");
const errorEl = document.getElementById("error-msg");

let errorTimer;
let requestId = 0;

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(clearError, 5000);
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function setLoading(isLoading) {
  card.classList.toggle("is-loading", isLoading);
  btn.disabled = isLoading;
}

/* ---------- Validation ---------- */
const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/i;

function normalise(value) {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/[/?#].*$/, ""); // strip path, query, hash
}

function errorMessage(err) {
  switch (err.status) {
    case 400:
    case 422:
      return "No results. Check the IP address or domain and try again.";
    case 401:
    case 403:
      return "API key rejected. Check your ipify key.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    default:
      return "Something went wrong. Check your connection and try again.";
  }
}

/* ---------- Load ---------- */
async function load(query = "") {
  const id = ++requestId; // ignore stale responses
  clearError();
  setLoading(true);

  try {
    const data = await getIpData(query);
    if (id !== requestId) return;
    renderData(data);
    updateMap(data.location);
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    showError(errorMessage(err));
  } finally {
    if (id === requestId) setLoading(false);
  }
}

/* ---------- Events ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = normalise(input.value);

  if (!query) return showError("Enter an IP address or domain.");
  if (!isIp(query) && !DOMAIN.test(query)) {
    return showError("That doesn't look like a valid IP address or domain.");
  }

  load(query);
});

/* ---------- Init ---------- */
load(); // on page load: the user's own IP