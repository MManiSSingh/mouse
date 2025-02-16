// margins & dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// x-axis range and bin width
const minTemp = 35.0;
const maxTemp = 40.0;
const binWidth = 0.5;

d3.csv("../data/small_sample.csv").then(data => {
    // correct data types
    data.forEach(d => d.temperature = +d.temperature);

    // scales
    const x = d3
        .scaleLinear()
        .domain([minTemp, maxTemp])
        .range([0, width]);

    const y = d3
        .scaleLinear()
        .range([height, 0]);

    // setup svg container
    const svg = d3
        .select("#histogram")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // axes
    const xAxis = svg
        .append("g")
        .attr("transform", `translate(0,${height})`);

    const yAxis = svg
        .append("g");

    // generate bin edges
    const binEdges = d3
        .range(minTemp, maxTemp + binWidth, binWidth);

    // change x-axis ticks for every 1 unit in temperature
    xAxis.call(d3.axisBottom(x).tickValues(d3.range(35, 41, 1)));

    // axis labels
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

    function computeBins(filteredData) {
        // Initialize bins
        const bins = binEdges.slice(0, -1).map((x0, i) => ({
            x0: x0,
            x1: binEdges[i + 1],
            values: [],
            density: 0
        }));

        // sort data into bins
        filteredData.forEach(d => {
            for (let bin of bins) {
                if (d.temperature >= bin.x0 && d.temperature < bin.x1) {
                    bin.values.push(d);
                    break;
                }
            }
        });

        // compute densities
        const totalCount = filteredData.length || 1;
        bins.forEach(bin => {
            const binSize = bin.x1 - bin.x0;
            bin.density = bin.values.length / (totalCount * binSize);
        });

        return bins;
    }

    // update histogram
    function update(gender) {
        let filteredData = data;
        if (gender !== "all") {
            filteredData = data.filter(d => d.gender.toLowerCase() === gender);
        }


        // get the bins
        const bins = computeBins(filteredData);

        // update y scale
        y.domain([0, d3.max(bins, d => d.density)]);
        yAxis.transition().duration(500).call(d3.axisLeft(y));

        // bind data and build histogram bars
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

    // initialize the histogram with all data
    update("all");

    // dropdown event listener
    d3.select("#gender").on("change", function () {
        update(this.value);
    });
});
