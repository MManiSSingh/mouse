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
const minTemp = 35.0;
const maxTemp = 40.0;

const x = d3
    .scaleLinear()
    .domain([minTemp, maxTemp])
    .range([0, width]);

const xAxis = svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues(d3.range(35, 41, 1)));

const y = d3
    .scaleLinear()
    .range([height, 0]);

const yAxis = svg
    .append("g");

// on csv load (MAIN ENTRY POINT)
d3.csv("../data/small_sample.csv").then(data => {
    // correct data types
    for (let i = 0; i < data.length; i++) {
        data[i].temperature = +data[i].temperature;
    }

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

    // compute bins
    const bins = computeBins(filteredData);

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

function computeBins(data) {
    // generate bins
    const binWidth = 0.5;
    const binEdges = d3.range(minTemp, maxTemp + binWidth, binWidth);
    const bins = [];
    for (let i = 0; i < binEdges.length - 1; i++) {
        bins.push({
            x0: binEdges[i],
            x1: binEdges[i + 1],
            density: 0
        });
    }

    // accumulate densities per bin
    const totalCount = data.length || 1;
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < bins.length; j++) {
            if (data[i].temperature >= bins[j].x0 && data[i].temperature < bins[j].x1) {
                bins[j].density += 1 / (totalCount * (bins[j].x1 - bins[j].x0));
                break;
            }
        }
    }

    return bins;
}
