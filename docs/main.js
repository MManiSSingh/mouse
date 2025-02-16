// svg setup
const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3
    .select("#histogram")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Temperature");

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Density");

// scales and axis setup
const x = d3
    .scaleLinear()
    .range([0, width]);
const xAxis = svg
    .append("g")
    .attr("transform", `translate(0,${height})`);

const y = d3
    .scaleLinear()
    .range([height, 0]);
const yAxis = svg
    .append("g");

// on csv load (MAIN ENTRY POINT)
d3.csv("../data/tidy.csv").then(data => {
    for (let i = 0; i < data.length; i++) {
        data[i].temperature = +data[i].temperature;
    }

    // set initial domain
    x.domain(d3.extent(data, d => d.temperature));
    xAxis.call(d3.axisBottom(x).tickFormat(d3.format(".1f")));

    update(data, "all");

    d3.select("#gender").on("change", function () {
        update(data, this.value);
    });
});

function update(data, gender) {
    // filter data
    let filteredData = data;
    if (gender !== "all") {
        filteredData = data.filter(d => d.gender.toLowerCase() === gender);
    }

    // generate bins with histogram helper
    const histogram = d3.histogram()
        .value(d => d.temperature)
        .domain(x.domain())
        .thresholds(x.ticks(20));

    // compute bins
    const bins = histogram(filteredData);
    const totalCount = filteredData.length;
    for (let i = 0; i < bins.length; i++) {
        bins[i].density = bins[i].length / (totalCount * (bins[i].x1 - bins[i].x0));
    }

    // update scales and animate
    y.domain([0, d3.max(bins, d => d.density)]);
    yAxis.transition().duration(500).call(d3.axisLeft(y));

    // draw bins
    svg.selectAll("rect")
        .data(bins)
        .join("rect")
        .transition().duration(500)
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.density))
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("height", d => height - y(d.density))
        .attr("fill", "steelblue");
}
