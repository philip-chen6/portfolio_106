import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@1.13.3/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const STATIONS_URL = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
const TRAFFIC_URL = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";
const BOSTON_BIKE_LANES_URL =
  "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson";
const CAMBRIDGE_BIKE_LANES_URL =
  "https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson";

let map;
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString("en-US", { timeStyle: "short" });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat();
  }

  const minMinute = (minute - 60 + 1440) % 1440;
  const maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    return tripsByMinute
      .slice(minMinute)
      .concat(tripsByMinute.slice(0, maxMinute + 1))
      .flat();
  }

  return tripsByMinute.slice(minMinute, maxMinute + 1).flat();
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id,
  );
  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    const id = station.short_name;
    const stationDepartures = departures.get(id) ?? 0;
    const stationArrivals = arrivals.get(id) ?? 0;
    return {
      ...station,
      departures: stationDepartures,
      arrivals: stationArrivals,
      totalTraffic: stationDepartures + stationArrivals,
    };
  });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function getMapStyle() {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
      },
    ],
  };
}

function addBikeLaneLayer(id, data) {
  map.addSource(id, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id,
    type: "line",
    source: id,
    paint: {
      "line-color": "#32D400",
      "line-width": 3,
      "line-opacity": 0.55,
    },
  });
}

function stationTitle(station) {
  return `${station.name}
${station.totalTraffic} trips
${station.departures} departures
${station.arrivals} arrivals`;
}

mapboxgl.accessToken = "";

map = new mapboxgl.Map({
  container: "map",
  style: getMapStyle(),
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

map.addControl(new mapboxgl.NavigationControl());

map.on("load", async () => {
  addBikeLaneLayer("boston-bike-lanes", BOSTON_BIKE_LANES_URL);
  addBikeLaneLayer("cambridge-bike-lanes", CAMBRIDGE_BIKE_LANES_URL);

  const svg = d3.select(".map-wrapper").select("svg");
  const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
  const stationData = await d3.json(STATIONS_URL);
  const baseStations = stationData.data.stations;

  await d3.csv(TRAFFIC_URL, (trip) => {
    trip.started_at = new Date(trip.started_at);
    trip.ended_at = new Date(trip.ended_at);
    departuresByMinute[minutesSinceMidnight(trip.started_at)].push(trip);
    arrivalsByMinute[minutesSinceMidnight(trip.ended_at)].push(trip);
    return trip;
  });

  const stations = computeStationTraffic(baseStations);
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  const circles = svg
    .selectAll("circle")
    .data(stations, (d) => d.short_name)
    .join("circle")
    .attr("r", (d) => radiusScale(d.totalTraffic))
    .style("--departure-ratio", (d) =>
      d.totalTraffic ? stationFlow(d.departures / d.totalTraffic) : 0.5,
    )
    .each(function (d) {
      d3.select(this).append("title").text(stationTitle(d));
    });

  function updatePositions() {
    circles
      .attr("cx", (d) => getCoords(d).cx)
      .attr("cy", (d) => getCoords(d).cy);
  }

  function updateScatterPlot(timeFilter) {
    const filteredStations = computeStationTraffic(baseStations, timeFilter);
    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

    circles
      .data(filteredStations, (d) => d.short_name)
      .attr("r", (d) => radiusScale(d.totalTraffic))
      .style("--departure-ratio", (d) =>
        d.totalTraffic ? stationFlow(d.departures / d.totalTraffic) : 0.5,
      )
      .select("title")
      .text((d) => stationTitle(d));
  }

  const timeSlider = document.getElementById("time-slider");
  const selectedTime = document.getElementById("selected-time");
  const anyTimeLabel = document.getElementById("any-time");

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = "";
      anyTimeLabel.style.display = "block";
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = "none";
    }

    updateScatterPlot(timeFilter);
  }

  updatePositions();
  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("resize", updatePositions);
  map.on("moveend", updatePositions);

  timeSlider.addEventListener("input", updateTimeDisplay);
  updateTimeDisplay();
});
