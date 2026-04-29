import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON("../lib/projects.json");
const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");
projectsTitle.textContent = `${projects.length} Projects`;

const searchInput = document.querySelector(".searchBar");
const colors = d3.scaleOrdinal(d3.schemeTableau10);
let query = "";
let selectedYear = null;

function getMatchingProjects() {
  return projects.filter((project) => {
    const values = Object.values(project).join("\n").toLowerCase();
    const matchesQuery = values.includes(query.toLowerCase());
    const matchesYear = selectedYear === null || project.year === selectedYear;
    return matchesQuery && matchesYear;
  });
}

function updateSelectedClasses() {
  d3.select("#projects-pie-plot")
    .selectAll("path")
    .attr("class", (d) => (d.data.label === selectedYear ? "selected" : ""));

  d3.select(".legend")
    .selectAll("li")
    .attr("class", (d) =>
      d.label === selectedYear ? "legend-item selected" : "legend-item",
    );
}

function updateProjects() {
  renderProjects(getMatchingProjects(), projectsContainer, "h2");
}

function renderPieChart(projectsGiven) {
  const svg = d3.select("#projects-pie-plot");
  const legend = d3.select(".legend");
  svg.selectAll("path").remove();
  legend.selectAll("li").remove();

  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  const data = rolledData
    .map(([year, count]) => ({ label: year, value: count }))
    .sort((a, b) => d3.descending(a.label, b.label));

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, i) => {
    svg
      .append("path")
      .datum(arcData[i])
      .attr("d", arc)
      .attr("fill", colors(i))
      .attr("class", data[i].label === selectedYear ? "selected" : "")
      .on("click", () => {
        selectedYear = selectedYear === data[i].label ? null : data[i].label;
        updateSelectedClasses();
        updateProjects();
      });
  });

  data.forEach((d, i) => {
    legend
      .append("li")
      .datum(d)
      .attr("style", `--color:${colors(i)}`)
      .attr(
        "class",
        d.label === selectedYear ? "legend-item selected" : "legend-item",
      )
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on("click", () => {
        selectedYear = selectedYear === d.label ? null : d.label;
        updateSelectedClasses();
        updateProjects();
      });
  });
}

function updatePage() {
  const queryMatches = projects.filter((project) => {
    const values = Object.values(project).join("\n").toLowerCase();
    return values.includes(query.toLowerCase());
  });
  renderPieChart(queryMatches);
  updateProjects();
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  updatePage();
});

updatePage();
