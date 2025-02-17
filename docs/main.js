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

    // initialize the visualization
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

    const estrusChecked = d3.select("#estrus").property("checked");

    // separate male and female data
    let filteredMale = data.filter(d => d.gender.toLowerCase() === "male" && !isNaN(d[measure]));
    let filteredFemale = data.filter(d => d.gender.toLowerCase() === "female" && !isNaN(d[measure]));

    // separate female data if estrus is checked
    let filteredEstrusTrue = [];
    let filteredEstrusFalse = [];

    if (estrusChecked) {
        filteredEstrusTrue = filteredFemale.filter(d => d.estrus.toLowerCase() === "true");
        filteredEstrusFalse = filteredFemale.filter(d => d.estrus.toLowerCase() === "false");
    }

    let filteredData = [];
    let binsMale = [], binsFemale = [], binsEstrusTrue = [], binsEstrusFalse = [];

    if (gender === "male") {
        filteredData = filteredMale;
    } else if (gender === "female") {
        filteredData = estrusChecked ? [...filteredEstrusTrue, ...filteredEstrusFalse] : filteredFemale;
    } else {
        filteredData = estrusChecked ? [...filteredMale, ...filteredEstrusTrue, ...filteredEstrusFalse] : [...filteredMale, ...filteredFemale];
    }

    // set x-domain
    if (filteredData.length > 0) {
        x.domain(d3.extent(filteredData, d => d[measure])).nice();
    } else {
        x.domain([0, 1]);
    }

    xAxis.transition().duration(500).call(d3.axisBottom(x).tickFormat(d3.format(".1f")));

    const histogram = d3.histogram()
        .value(d => d[measure])
        .domain(x.domain())
        .thresholds(x.ticks(20));

    if (gender === "male" || gender === "all") {
        binsMale = histogram(filteredMale);
    }
    if (gender === "female" || gender === "all") {
        if (estrusChecked) {
            binsEstrusTrue = histogram(filteredEstrusTrue);
            binsEstrusFalse = histogram(filteredEstrusFalse);
        } else {
            binsFemale = histogram(filteredFemale);
        }
    }

    // compute densities
    const totalMale = filteredMale.length || 1;
    const totalFemale = filteredFemale.length || 1;
    const totalEstrusTrue = filteredEstrusTrue.length || 1;
    const totalEstrusFalse = filteredEstrusFalse.length || 1;

    binsMale.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalMale * width) : 0;
    });

    binsFemale.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalFemale * width) : 0;
    });

    binsEstrusTrue.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalEstrusTrue * width) : 0;
    });

    binsEstrusFalse.forEach(bin => {
        const width = bin.x1 - bin.x0;
        bin.density = width > 0 ? bin.length / (totalEstrusFalse * width) : 0;
    });

    // update y-axis domain
    y.domain([
        0,
        d3.max([...binsMale, ...binsFemale, ...binsEstrusTrue, ...binsEstrusFalse], d => d.density) || 1
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
    if (!estrusChecked && (gender === "female" || gender === "all")) {
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

    // draw estrus bars
    if (estrusChecked && (gender === "female" || gender === "all")) {
        svg.selectAll(".bar-estrus-false")
            .data(binsEstrusFalse)
            .enter()
            .append("rect")
            .attr("class", "bar bar-estrus-false")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.density))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("height", d => height - y(d.density))
            .attr("fill", "pink")
            .attr("opacity", 0.6);
    }

    if (estrusChecked && (gender === "female" || gender === "all")) {
        svg.selectAll(".bar-estrus-true")
            .data(binsEstrusTrue)
            .enter()
            .append("rect")
            .attr("class", "bar bar-estrus-true")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.density))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("height", d => height - y(d.density))
            .attr("fill", "green")
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

// attach event listener to estrus checkbox
d3.select("#estrus").on("change", function () {
    update(d3.select("#measure").node().value, d3.select("#gender").node().value);
});
