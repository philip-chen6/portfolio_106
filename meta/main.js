import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let xScale;
let yScale;
let commits = [];

async function loadData() {
  return d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: `https://github.com/philip-chen6/portfolio_106/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        configurable: true,
        writable: true,
        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commitData) {
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (d) => d.line),
    (d) => d.file,
  );
  const longestFile = d3.greatest(fileLengths, (d) => d[1]);
  const averageFileLength = d3.mean(fileLengths, (d) => d[1]);
  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.datetime.toLocaleString("en", { dayPeriod: "short" }),
  );
  const busiestPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];

  const stats = [
    ["Total LOC", data.length],
    ["Total commits", commitData.length],
    ["Files", d3.group(data, (d) => d.file).size],
    ["Average file length", `${Math.round(averageFileLength)} lines`],
    ["Longest file", `${longestFile[0]} (${longestFile[1]} lines)`],
    ["Average line length", `${Math.round(d3.mean(data, (d) => d.length))} chars`],
    ["Maximum depth", d3.max(data, (d) => d.depth)],
    ["Busiest time", busiestPeriod],
  ];

  const dl = d3.select("#stats").html("").append("dl").attr("class", "stats");
  for (const [label, value] of stats) {
    dl.append("dt").text(label);
    dl.append("dd").text(value);
  }
}

function renderTooltipContent(commit) {
  if (Object.keys(commit).length === 0) return;

  const link = document.getElementById("commit-link");
  link.href = commit.url;
  link.textContent = commit.id.slice(0, 7);

  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleString("en", { dateStyle: "full" });
  document.getElementById("commit-time").textContent =
    commit.datetime.toLocaleString("en", { timeStyle: "short" });
  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-lines").textContent =
    `${commit.totalLines} lines edited`;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById("commit-tooltip").hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function getSelectedCommits(selection) {
  return selection ? commits.filter((d) => isCommitSelected(selection, d)) : [];
}

function renderSelectionCount(selection) {
  const selectedCommits = getSelectedCommits(selection);
  const countElement = document.querySelector("#selection-count");
  countElement.textContent = `${selectedCommits.length || "No"} commits selected`;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = getSelectedCommits(selection);
  const container = document.getElementById("language-breakdown");
  container.innerHTML = "";

  if (selectedCommits.length === 0) {
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${d3.format(".1~%")(proportion)})</dd>
    `;
  }
}

function renderScatterPlot(commitData) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  d3.select("#chart").html("");

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commitData, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commitData, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 18]);
  const sortedCommits = d3.sort(commitData, (d) => -d.totalLines);

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

  svg
    .append("g")
    .attr("transform", `translate(0, ${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => `${String(d % 24).padStart(2, "0")}:00`),
    );

  const dots = svg.append("g").attr("class", "dots");
  dots
    .selectAll("circle")
    .data(sortedCommits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter pointerenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove pointermove", updateTooltipPosition)
    .on("mouseleave pointerleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll("#chart circle").classed("selected", (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  svg.call(d3.brush().on("start brush end", brushed));
  svg.selectAll(".dots, .overlay ~ *").raise();
}

const data = await loadData();
commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(commits);
