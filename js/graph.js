/**
 * Created by ruud on 20.07.14.
 *
 * Making graphs.
 *
 * Use:
 *   initialisation:
 *     myGraph = graph()
 *   configuration to override defaults:
 *     myGraph.size([500,300])
 *            .
 *
 *
 */



function graph() {

    var margin = {top: 10, right: 20, bottom: 30, left: 90},
        size = [1000, 700],
        config = {xBarFillRatio: .9},
        xValue = function(d) { return +d.year; },//default function to get y-value from bound data object
        yValue = function(d) { return +d.value; },//default function to get y-value from bound data object
        xScale = d3.scale.linear(),//not using d3.time.scale because always entire years plotted.
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickFormat(d3.format("0000")).tickSize(6, 0),
        yAxis = d3.svg.axis().scale(yScale).orient("left").tickFormat(d3.format("s")/*function(d){return d/1e6;}*/),
        line = d3.svg.line().x(xPix).y(yPix);

    function gr(selection) {
        selection.each(function(data){
            //Convert data to standard representation: [x value, y value].
            //So all data can from here on be called with x value = datapoint[0], y value = datapoint[1].
            data = data.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i)];
            });

            var xDomain = [//d3.extent(function(d){return d[0];}),
                    d3.min(data, function (d) {return d[0];}),
                    d3.max(data, function (d) {return d[0];})
                ],
                yDomain = [
                    Math.min(0, d3.min(data, function (d) {return d[1];})),
                    Math.max(0, d3.max(data, function (d) {return d[1];}))
                ];

            console.log ("xDomain: " + JSON.stringify(xDomain) + "       | yDomain " + JSON.stringify(yDomain));//DEBUG
            //Update range and domain of scales.
            xScale.domain(xDomain)
                .rangeRound([0, graphSize()[0]]);
            yScale.domain(yDomain)
                .rangeRound([graphSize()[1], 0])
                .nice();

            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg").data([data]);

            // Otherwise, create the skeletal chart.
            var gEnter = svg.enter().append("svg").append("g");
            gEnter.append("g").attr("id", "shape").append("path").attr("id", "line");
            gEnter.append("g").attr("class", "x axis");
            gEnter.append("g").attr("class", "y axis");

            // Update the outer dimensions.
            svg.attr("width", size[0])
                .attr("height", size[1]);

            // Update the inner dimensions.
            var g = svg.select("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Update the line.
            g.select("#shape").select("#line")
                .attr("d", line);

            // Update the axes.
            g.select(".x.axis")
                .attr("transform", "translate(0," + graphSize()[1] + ")")
                .call(xAxis);
            g.select(".y.axis")
                .call(yAxis);
        });
    }

    function xPix (d) {//Returns x-coordinate in pixels from bound data object.
        return xScale(d[0]);
    }
    function yPix (d) {//Returns y-coordinate in pixels from bound data object.
        return yScale(d[1]);
    }

    //Getters/setters.
    gr.margin = function(_) {//Gets/sets an object with properties 'top', 'bottom', 'left', and 'right' in pixels.
        if (!arguments.length) return margin;
        margin = _;
        return gr;
    };
    gr.size = function(_) {//Gets/sets a 2-element array with svg size in pixels.
        if (!arguments.length) return size;
        size = _;
        return gr;
    };
    gr.config = function(_) {//Gets/sets an object with properties 'xBarFillRatio', ...
        if (!arguments.length) return config;
        config = _;
        return gr;
    };
    gr.x = function(_) {//Gets/sets the function to get x-value from bound data object.
        if (!arguments.length) return xValue; //TODO: check if xValue can be renamed x (or vice versa) like with 'margin' and 'size'.
        xValue = _;
        return gr;
    };
    gr.y = function(_) {//Gets/sets the function to get y-value from bound data object.
        if (!arguments.length) return yValue; //TODO: check if yValue can be renamed x (or vice versa) like with 'margin' and 'size'.
        yValue = _;
        return gr;
    };

    function graphSize() {return [size[0] - margin.left - margin.right, size[1] - margin.top - margin.bottom]; }

    return gr;
}