require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(__dirname, "state.json");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  console.error(
    "Google Maps API key is required. Set it via GOOGLE_MAPS_API_KEY."
  );
  process.exit(1);
}

// In-memory storage
let cachedData = null; // Stores the latest categorized data
let initialOutages = new Map(); // Outages at the start of the day
let lastResetDate = null; // Tracks the last date the initialOutages was reset

// Helper function to check if it's a new day
function isNewDay() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  if (lastResetDate !== currentDate) {
    lastResetDate = currentDate;
    return true;
  }
  return false;
}

// Load state (initialOutages and lastResetDate) from file
function loadStateFromFile() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      initialOutages = new Map(
        state.initialOutages.map(([key, value]) => [key, value])
      );
      lastResetDate = state.lastResetDate;
      console.log("Loaded state from file.");
    } catch (error) {
      console.error("Error reading state file:", error);
    }
  } else {
    console.log("No state file found, starting fresh.");
  }
}

// Save state (initialOutages and lastResetDate) to file
function saveStateToFile() {
  const state = {
    initialOutages: Array.from(initialOutages.entries()),
    lastResetDate,
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  console.log("Saved state to file.");
}

// Fetch data from the PSE API
async function fetchPSEData() {
  try {
    const response = await axios.get(
      "https://www.pse.com/api/sitecore/OutageMap/AnonymoussMapListView"
    );
    const data = response.data;

    const newOutages = new Map();
    data.PseMap.forEach((entry) => {
      const id = entry.DataProvider.PointOfInterest.Id;
      const polygonCoords = entry.Polygon.map((point) => ({
        lat: parseFloat(point.Latitude),
        lng: parseFloat(point.Longitude),
      }));
      newOutages.set(id, polygonCoords);
    });

    // Reset initialOutages if it's a new day
    if (isNewDay()) {
      console.log("Resetting initialOutages for a new day");
      initialOutages = new Map(newOutages);
      saveStateToFile();
    }

    // Categorize outages
    const added = [];
    const ended = [];
    const existing = [];

    newOutages.forEach((coords, id) => {
      if (initialOutages.has(id)) {
        existing.push({ id, coords });
      } else {
        added.push({ id, coords });
      }
    });

    initialOutages.forEach((coords, id) => {
      if (!newOutages.has(id)) {
        ended.push({ id, coords });
      }
    });

    // Cache the categorized data
    cachedData = { added, ended, existing };
    console.log("Data fetched from PSE API and cached.");
  } catch (error) {
    console.error("Error fetching data from PSE API:", error);
  }
}

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML with injected Google Maps API key
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PSE Outage Map</title>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                height: 100%;
            }
            #map {
                width: 100%;
                height: 100%;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="script.js"></script>
    </body>
    </html>
  `);
});

// API endpoint to serve cached data
app.get("/api/outages", (req, res) => {
  if (!cachedData) {
    fetchPSEData()
      .then(() =>
        res.json(cachedData || { added: [], ended: [], existing: [] })
      )
      .catch((err) => res.status(500).json({ error: "Failed to fetch data" }));
  } else {
    res.json(cachedData);
  }
});

// Schedule periodic fetching every 5 minutes
setInterval(fetchPSEData, 5 * 60 * 1000); // 5 minutes

// On startup, load state and fetch data
loadStateFromFile();
fetchPSEData();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
