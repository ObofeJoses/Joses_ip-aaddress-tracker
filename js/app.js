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
async function getIpData(query = "") {
  const params = new URLSearchParams({ apiKey: CONFIG.API_KEY });

  // No ipAddress param: ipify returns data for the requester's own IP
  if (query) params.set("ipAddress", query);

  const res = await fetch(`${CONFIG.API_URL}?${params}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);

  return res.json();
}

/* ---------- Init ---------- */
async function init() {
  try {
    const data = await getIpData();
    console.log(data); // inspect the shape; rendered in Commit 9
  } catch (err) {
    console.error(err);
  }
}

init();