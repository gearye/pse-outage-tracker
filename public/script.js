let polygons = []; // Store polygons on the map

const mapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#f5f5f5",
      },
    ],
  },
  {
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#f5f5f5",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#bdbdbd",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#eeeeee",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#e5e5e5",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#dadada",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [
      {
        color: "#e5e5e5",
      },
    ],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [
      {
        color: "#eeeeee",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#c9c9c9",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
];

async function fetchAndDisplayPolygons() {
  try {
    const response = await fetch("/api/outages");
    const data = await response.json();

    console.log("Fetched data from server:", data); // Debugging log

    // Clear existing polygons
    polygons.forEach((polygon) => polygon.setMap(null));
    polygons = [];

    // Render polygons for each category
    renderPolygons(data.added, "#FF0000", 0.35); // New outages
    renderPolygons(data.ended, "#00FF00", 0.35); // Ended outages
    renderPolygons(data.existing, "#0000FF", 0.15); // Existing
  } catch (error) {
    console.error("Error fetching outage data:", error);
  }
}

function renderPolygons(outages, color, opacity) {
  if (!outages || outages.length === 0) {
    console.log("No polygons to render for color:", color);
    return;
  }

  outages.forEach((outage) => {
    const polygon = new google.maps.Polygon({
      paths: outage.coords,
      strokeColor: color,
      strokeOpacity: opacity * 2,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: opacity,
    });

    polygon.setMap(map);
    polygons.push(polygon);
  });

  console.log(`${outages.length} polygons rendered for color ${color}`);
}

let map; // Google Maps instance

window.onload = () => {
  // Initialize the map
  const styledMapType = new google.maps.StyledMapType(mapStyle);

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10, //
    center: { lat: 47.5, lng: -122.15 },
    mapTypeControl: false,
  });
  map.mapTypes.set("styled_map", styledMapType);
  map.setMapTypeId("styled_map");
  // Initial fetch and render
  fetchAndDisplayPolygons();

  // Set an interval to fetch new data every minute
  setInterval(fetchAndDisplayPolygons, 60000); // 1 minute = 60000 ms
};
