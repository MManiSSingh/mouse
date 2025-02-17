// svg setup
const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3
    .select("#histogram")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Temperature");

svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Density");

// scales and axis setup
const x = d3.scaleLinear().range([0, width]);
const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);

const y = d3.scaleLinear().range([height, 0]);
const yAxis = svg.append("g");

d3.csv("../data/tidy.csv").then(data => {
    data.forEach(d => {
        d.temperature = +d.temperature;
        d.activity = +d.activity;
    });

    // initialize domain based on temperature
    x.domain(d3.extent(data, d => d.temperature));
    xAxis.call(d3.axisBottom(x).tickFormat(d3.format(".1f")));

    update(data, "all", "temperature");

    d3.select("#gender").on("change", function () {
        update(data, this.value, d3.select("#measure").node().value);
    });

    d3.select("#measure").on("change", function () {
        update(data, d3.select("#gender").node().value, this.value);
    });
});

function update(data, gender, measure) {
    data.forEach(d => d[measure] = +d[measure]);

    // separate male and female data
    let filteredMale = data.filter(d => d.gender.toLowerCase() === "male" && !isNaN(d[measure]));
    let filteredFemale = data.filter(d => d.gender.toLowerCase() === "female" && !isNaN(d[measure]));

    let filteredData = [];
    let binsMale = [], binsFemale = [];

    if (gender === "male") {
        filteredData = filteredMale;
    } else if (gender === "female") {
        filteredData = filteredFemale;
    } else { // "all" selected
        filteredData = [...filteredMale, ...filteredFemale];
    }

    // Ensure x-domain is correctly set based on the selected measure
    if (filteredData.length > 0) {
        x.domain(d3.extent(filteredData, d => d[measure])).nice();
    } else {
        x.domain([0, 1]); // Default domain if no data available
    }

    xAxis.transition().duration(500).call(d3.axisBottom(x).tickFormat(d3.format(".1f")));

    // Generate histogram bins
    const histogram = d3.histogram()
        .value(d => d[measure])
        .domain(x.domain())
        .thresholds(x.ticks(20));

    if (gender === "male" || gender === "all") {
        binsMale = histogram(filteredMale);
    }
    if (gender === "female" || gender === "all") {
        binsFemale = histogram(filteredFemale);
    }

    // compute densities
    const totalMale = filteredMale.length || 1;
    const totalFemale = filteredFemale.length || 1;

    binsMale.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalMale * width) : 0;
    });

    binsFemale.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalFemale * width) : 0;
    });

    // update y-axis domain
    y.domain([
        0,
        d3.max([...binsMale, ...binsFemale], d => d.density) || 1
    ]);
    yAxis.transition().duration(500).call(d3.axisLeft(y));

    // remove old bars
    svg.selectAll(".bar").remove();

    // draw male bars
    if (gender === "male" || gender === "all") {
        svg.selectAll(".bar-male")
            .data(binsMale)
            .enter()
            .append("rect")
            .attr("class", "bar bar-male")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.density))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("height", d => height - y(d.density))
            .attr("fill", "steelblue")
            .attr("opacity", 0.6);
    }

    // draw female bars
    if (gender === "female" || gender === "all") {
        svg.selectAll(".bar-female")
            .data(binsFemale)
            .enter()
            .append("rect")
            .attr("class", "bar bar-female")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.density))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("height", d => height - y(d.density))
            .attr("fill", "pink")
            .attr("opacity", 0.6);
    }

    // remove old labels
    svg.selectAll(".x-axis-label").remove();
    svg.selectAll(".y-axis-label").remove();

    // update labels
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(measure.charAt(0).toUpperCase() + measure.slice(1));

    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Density");
}
