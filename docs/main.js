// svg setup
const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svgContainer = d3.select("#histogram");
const svg = svgContainer.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Add zoom behavior
svgContainer.call(
  d3.zoom()
    .scaleExtent([1, 5])
    .on("zoom", (event) => {
      svg.attr("transform", event.transform);
    })
);

// Tooltip element
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

// Initial axis labels
svg.append("text")
  .attr("class", "x-axis-label")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("font-family", "Georgia")
  .text("Temperature");

svg.append("text")
  .attr("class", "y-axis-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -40)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("font-family", "Georgia")
  .text("Density");

// Global scales and axes
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
const yAxis = svg.append("g");

const legend = svg.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${width - 150}, 0)`);

d3.csv("data/tidy.csv").then(data => {
  data.forEach(d => {
    d.temperature = +d.temperature;
    d.activity = +d.activity;
  });

  update(data, "all", "temperature");

  d3.select("#gender").on("change", function () {
    update(data, this.value, d3.select("#measure").node().value);
  });

  d3.select("#measure").on("change", function () {
    update(data, d3.select("#gender").node().value, this.value);
  });

  d3.select("#estrus").on("change", function () {
    update(data, d3.select("#gender").node().value, d3.select("#measure").node().value);
  });
});

function update(data, gender, measure) {
  data.forEach(d => d[measure] = +d[measure]);

  // Filter data
  const estrusChecked = d3.select("#estrus").property("checked");

  let filteredMale = data.filter(d => d.gender.toLowerCase() === "male" && !isNaN(d[measure]));
  let filteredFemale = data.filter(d => d.gender.toLowerCase() === "female" && !isNaN(d[measure]));

  let filteredEstrusTrue = [];
  let filteredEstrusFalse = [];

  if (estrusChecked) {
    filteredEstrusTrue = filteredFemale.filter(d => d.estrus.toLowerCase() === "true");
    filteredEstrusFalse = filteredFemale.filter(d => d.estrus.toLowerCase() === "false");
  }

  let filteredData = [];
  if (gender === "male") {
    filteredData = filteredMale;
  } else if (gender === "female") {
    filteredData = estrusChecked ? [...filteredEstrusTrue, ...filteredEstrusFalse] : filteredFemale;
  } else {
    filteredData = estrusChecked
      ? [...filteredMale, ...filteredEstrusTrue, ...filteredEstrusFalse]
      : [...filteredMale, ...filteredFemale];
  }

  // Update x-axis domain
  if (filteredData.length > 0) {
    x.domain(d3.extent(filteredData, d => d[measure])).nice();
  } else {
    x.domain([0, 1]);
  }

  xAxis.transition().duration(500).call(d3.axisBottom(x).tickFormat(d3.format(".1f")));

  // Create histogram bins
  const histogram = d3.histogram()
    .value(d => d[measure])
    .domain(x.domain())
    .thresholds(x.ticks(20));

  let binsMale = (gender === "male" || gender === "all") ? histogram(filteredMale) : [];
  let binsFemale = [];
  let binsEstrusTrue = [];
  let binsEstrusFalse = [];

  if (gender === "female" || gender === "all") {
    if (estrusChecked) {
      binsEstrusTrue = histogram(filteredEstrusTrue);
      binsEstrusFalse = histogram(filteredEstrusFalse);
    } else {
      binsFemale = histogram(filteredFemale);
    }
  }

  // Compute densities
  const totalMale = filteredMale.length || 1;
  const totalFemale = filteredFemale.length || 1;
  const totalEstrusTrue = filteredEstrusTrue.length || 1;
  const totalEstrusFalse = filteredEstrusFalse.length || 1;

  binsMale.forEach(bin => {
    const binWidth = bin.x1 - bin.x0;
    bin.density = binWidth > 0 ? bin.length / (totalMale * binWidth) : 0;
  });
  binsFemale.forEach(bin => {
    const binWidth = bin.x1 - bin.x0;
    bin.density = binWidth > 0 ? bin.length / (totalFemale * binWidth) : 0;
  });
  binsEstrusTrue.forEach(bin => {
    const binWidth = bin.x1 - bin.x0;
    bin.density = binWidth > 0 ? bin.length / (totalEstrusTrue * binWidth) : 0;
  });
  binsEstrusFalse.forEach(bin => {
    const binWidth = bin.x1 - bin.x0;
    bin.density = binWidth > 0 ? bin.length / (totalEstrusFalse * binWidth) : 0;
  });

  // Update y-axis domain
  y.domain([
    0,
    d3.max([...binsMale, ...binsFemale, ...binsEstrusTrue, ...binsEstrusFalse], d => d.density) || 1
  ]);
  yAxis.transition().duration(500).call(d3.axisLeft(y));

  // Update grid lines
  svg.selectAll(".grid-line").remove();
  svg.selectAll(".grid-line")
    .data(y.ticks(10))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", "lightgray")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-dasharray", "4,4");

  // Remove old bars
  svg.selectAll(".bar").remove();

  // Helper: add tooltip events
  function addTooltip(selection) {
    selection.on("mouseover", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Density: ${d.density.toFixed(3)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });
  }

  // Draw male bars
  if (gender === "male" || gender === "all") {
    addTooltip(svg.selectAll(".bar-male")
      .data(binsMale)
      .join("rect")
      .attr("class", "bar bar-male")
      .attr("x", d => x(d.x0))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("fill", "steelblue")
      .attr("opacity", 0.3)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("y", height)
      .attr("height", 0)
      .transition().duration(500)
      .attr("y", d => y(d.density))
      .attr("height", d => height - y(d.density))
      .selection());
  }

  // Draw female bars (non-estrus)
  if (!estrusChecked && (gender === "female" || gender === "all")) {
    addTooltip(svg.selectAll(".bar-female")
      .data(binsFemale)
      .join("rect")
      .attr("class", "bar bar-female")
      .attr("x", d => x(d.x0))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("fill", "orange")
      .attr("opacity", 0.3)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("y", height)
      .attr("height", 0)
      .transition().duration(500)
      .attr("y", d => y(d.density))
      .attr("height", d => height - y(d.density))
      .selection());
  }

  // Draw estrus bars
  if (estrusChecked && (gender === "female" || gender === "all")) {
    addTooltip(svg.selectAll(".bar-estrus-false")
      .data(binsEstrusFalse)
      .join("rect")
      .attr("class", "bar bar-estrus-false")
      .attr("x", d => x(d.x0))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("fill", "orange")
      .attr("opacity", 0.3)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("y", height)
      .attr("height", 0)
      .transition().duration(500)
      .attr("y", d => y(d.density))
      .attr("height", d => height - y(d.density))
      .selection());

    addTooltip(svg.selectAll(".bar-estrus-true")
      .data(binsEstrusTrue)
      .join("rect")
      .attr("class", "bar bar-estrus-true")
      .attr("x", d => x(d.x0))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("fill", "red")
      .attr("opacity", 0.3)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("y", height)
      .attr("height", 0)
      .transition().duration(500)
      .attr("y", d => y(d.density))
      .attr("height", d => height - y(d.density))
      .selection());
  }

  // Remove old labels and update axis labels
  svg.selectAll(".x-axis-label").remove();
  svg.selectAll(".y-axis-label").remove();

  svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "Georgia")
    .text(measure.charAt(0).toUpperCase() + measure.slice(1));

  svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "Georgia")
    .text("Density");

  // Update legend
  legend.selectAll("*").remove();
  let legendItems = [
    { label: "Male", color: "steelblue", active: gender === "male" || gender === "all" },
  ];

  if (estrusChecked) {
    legendItems.push({ label: "Female (Estrus)", color: "red", active: gender === "female" || gender === "all" });
    legendItems.push({ label: "Female (No Estrus)", color: "orange", active: gender === "female" || gender === "all" });
  } else {
    legendItems.push({ label: "Female", color: "orange", active: gender === "female" || gender === "all" });
  }

  let first = 0;
  let maxLabelWidth = 0;
  legendItems.forEach(item => {
    if (item.active) {
      // Temporary text element to measure label width
      let tempText = legend.append("text")
        .text(item.label)
        .style("font-size", "12px")
        .style("visibility", "hidden");
      let labelWidth = tempText.node().getComputedTextLength();
      tempText.remove();

      legend.append("rect")
        .attr("x", 0)
        .attr("y", first * 20)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", item.color)
        .style("opacity", 0.3);

      legend.append("text")
        .attr("x", 20)
        .attr("y", first * 20 + 12)
        .text(item.label)
        .style("font-size", "12px");

      first += 1;
      maxLabelWidth = Math.max(maxLabelWidth, labelWidth + 30);
    }
  });

  legend.append("rect")
    .attr("x", -5)
    .attr("y", -5)
    .attr("width", maxLabelWidth)
    .attr("height", (first * 20) + 10)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-width", 1);
}
