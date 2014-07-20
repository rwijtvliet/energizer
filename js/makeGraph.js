/**
 * Created by ruud on 18.07.14.
 */


var margin = {top: 10, right: 20, bottom: 30, left: 90},
    graphSize = [1000 - margin.left - margin.right, 700 - margin.top - margin.bottom],
    svg = d3.select("#inf").append("svg")
        .attr("width", graphSize[0] + margin.left + margin.right)
        .attr("height", graphSize[1] + margin.top + margin.bottom),
    graph = svg.append("g")
        .attr("width", graphSize[0])
        .attr("height", graphSize[1])
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

function makeGraph(data) {
    var yDomain = [
            Math.min(0, d3.min(data, function (d) {return d.VALUE;})),
            Math.max(0, d3.max(data, function (d) {return d.VALUE;}))
        ],
        yRange = [graphSize[1], 0],
        xDomain = [
                d3.min(data, function (d) {return d.YEAR;})-0.5,
                d3.max(data, function (d) {return d.YEAR;})+0.5
        ],
        xRange = [0, graphSize[0]],
        xBarFillRatio = .9,
        xScale = d3.scale.linear()//not using d3.time.scale because always entire years plotted.
            .domain(xDomain)
            .rangeRound(xRange),
        yScale = d3.scale.linear()
            .domain(yDomain)
            .rangeRound(yRange)
            .nice(),
        yColorScale = d3.scale.linear()
            .domain(yDomain)
            .range(["green", "orange"]),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickFormat(d3.format("0000")),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .tickFormat(d3.format("s")/*function(d){return d/1e6;}*/);

    //Add bars
    graph.append("g")
        .attr("id", "bars")
      .selectAll(".bar")
        .data(data)
      .enter()
      .append("rect")
        .attr("class", "bar")
        .attr("x", function(d){return xScale(d.YEAR-0.5*xBarFillRatio);})
        .attr("y", function(d){return yScale(d.VALUE);})
        .attr("height", function(d){return graphSize[1] - yScale(d.VALUE);})
        .attr("width", function(d){return xScale(d.YEAR+0.5*xBarFillRatio) - xScale(d.YEAR-0.5*xBarFillRatio);})
        .attr("style", function(d){return "fill:" + yColorScale(d.VALUE);})
      .append("svg:title")
        .text(function(d){return d.GEO + "     " + d.YEAR + "\nProduct: " + d.PRODUCT + "\n" + d.VALUE + " TJ/a";});

    //Add axes
    graph.append("g") //axis itself
        .attr("class", "axis")
        .attr("transform", "translate(0," + graphSize[1] + ")")
        .call(xAxis)
      .append("text") //label
        .attr("y", -4)
        .attr("x", graphSize[0])
        .style("text-anchor", "end")
        .text("Year");
    graph.append("g") //axis itself
        .attr("class", "axis")
        .call(yAxis)
      .append("text") //label
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(/*"\u00D7 1000000 " + */ "TJ/a");
}

function filterData(geo) {
    var filteredData = [];
    db.
    db.forEach(function (d){
        if ($.inArray(d.GEO, geo) > -1) filteredData.push(d);
    });
    return filteredData;
}
