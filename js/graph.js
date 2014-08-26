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
    var gr = {},
        size = [0,0],
        strokeWidth = 2, //pixels, see scss file
        margin = {top: 15, right: 20, bottom: 30, left: 90},
        graphSize = [
            function(){return size[0] - margin.left - margin.right;},
            function(){return size[1] - margin.top - margin.bottom;}
        ];
        /*graphSize = [1000 - margin.left - margin.right, 500 - margin.top - margin.bottom];*/

    /*var /*margin = {top: 10, right: 20, bottom: 30, left: 90},
        size = [1000, 700],
        config = {xBarFillRatio: .9},
        xValue = function(d) { return +d.TIME; },//default function to get y-value from bound data object
        yValue = function(d) { return +d.OBS_VALUE; },//default function to get y-value from bound data object
        x = d3.scale.linear(),//not using d3.time.scale because always entire years plotted.
        y = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.format("0000")).tickSize(6, 0),
        yAxis = d3.svg.axis().scale(y).orient("left").tickFormat(d3.format("s")),
        line = d3.svg.line().x(xPix).y(yPix);*/
    //var xRange1 = function(){return [0, graphSize[0]()];};

    var scope,
        el,
        xRange,
        yRange,
        /*graph,
        bars,
        //xRange,
        xAxisEl,
        xAxisLabel,
        //yRange,
        yAxisEl,
        yAxisLabel,/**/
        svg = d3.select(document.createElementNS(d3.ns.prefix.svg, 'svg')),
        graph = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
        bars = graph.append("g")
            .attr("id", "bars")
            .selectAll(".bar"),
        xAxisEl = graph.append("g") //axis
            .attr("class", "axis"),
        xAxisLabel = xAxisEl.append("text") //label
            .attr("y", -4)
            .style("text-anchor", "end")
            .text("Year"),
        yAxisEl = graph.append("g") //axis
            .attr("class", "axis"),
        yAxisLabel = yAxisEl.append("text") //label
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end"),/**/



        format = {},
        xBarFillRatio = .9,
        x = d3.scale.linear(),//not using d3.time.scale because always entire years plotted.
        xAxis = d3.svg.axis()
            .scale(x)//can change x (i.e., the scale) without needing to reapply it here.
            .orient("bottom")
            .tickFormat(d3.format("0000")),
        y = d3.scale.linear()
            .nice(),
        yAxis = d3.svg.axis()
            .scale(y)//can change y (i.e., the scale) without needing to reapply it here.
            .orient("left"),
        rect = {
            top: function(d) {if (d.OBS_VALUE >= 0) return y(d.val1); else return y(d.val0) + strokeWidth/2 ;},
            height: function(d) {var D=0; if (d.OBS_VALUE < 0) D=strokeWidth; return Math.abs(y(d.val1) - y(d.val0)) - D;},
            left: function(d) {var D=0; if (d.OBS_VALUE < 0) D=strokeWidth/2; return x(d.TIME - 0.5 * xBarFillRatio)+D;},
            width: function (d) {var D=0; if (d.OBS_VALUE < 0) D=strokeWidth; return x(d.TIME + 0.5 * xBarFillRatio) - x(d.TIME - 0.5 * xBarFillRatio) - D;}
        },
        transition = {
            duration: 1000,
            ease: "cubic-in-out" //"cubic-in-out" or "elastic" or something like d3.ease("elastic", valA, valP)
        },
        sort = function(a,b) {
            if (a.OBS_VALUE >= 0 && b.OBS_VALUE < 0) return 1;
            if (a.OBS_VALUE < 0 && b.OBS_VALUE >= 0) return -1;
            var sortOrder = ["0000","2000","3000","4000","5100","5200","5500","6000","7200"].reverse();
            return (sortOrder.indexOf(a.PRODUCT) - sortOrder.indexOf(b.PRODUCT));
        };



    gr.init = function (theScope, theElement) {
        scope = theScope;
        el = theElement;
        d3.select(el).append(svg);
        /*svg = d3.select(el).append("svg");
        graph = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        bars = graph.append("g")
            .attr("id", "bars")
            .selectAll(".bar");
        xAxisEl = graph.append("g") //axis
            .attr("class", "axis");
        xAxisLabel = xAxisEl.append("text") //label
            .attr("y", -4)
            .style("text-anchor", "end")
            .text("Year");
        yAxisEl = graph.append("g") //axis
            .attr("class", "axis");
        yAxisLabel = yAxisEl.append("text") //label
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");*/

        return gr;
    };

    gr.updateSize = function (theSize) {
        theSize[0] = Math.max(theSize[0], 150);//TODO:move elsewhere. Necessary because theSize=[0,0] if no sources selected...
        theSize[1] = Math.max(theSize[1], 150);
        size = theSize;
        svg
            .attr("width", size[0])
            .attr("height", size[1]);
        graph
            .attr("width", graphSize[0]())
            .attr("height", graphSize[1]());
        xRange = [0, graphSize[0]()];
        x.rangeRound(xRange);
        xAxis.orient("bottom");
        xAxisEl
            .call(xAxis)
            .attr("transform", "translate(0," + y(0) + ")");
        xAxisLabel.attr("x", graphSize[0]());
        yRange = [graphSize[1](), 0];
        y.rangeRound(yRange);
        yAxisEl.call(yAxis);
        bars
            .attr("x", rect.left)
            .attr("y", rect.top)
            .attr("height", rect.height)
            .attr("width", rect.width);

        return gr;
    };


    gr.updateFormat = function (theFormat) {
        format = theFormat;

        yAxisLabel.text(format.yUnit);
        yAxis.tickFormat(d3.format(format.yFormat));
        bars.selectAll(".tooltip").text(tooltipText);

        return gr;
    };


    gr.updateData = function (data) {
        if (!data || !data.length) return;

        var sortedData = [];
        //Put records into separate arrays (by time).
        var times = uniqueValues(data, "TIME");
        times.forEach(function (time) {sortedData.push(data.filter(function (d) {return (d.TIME === time);}))});
        //Sort within each year (negative values first, and then by product code), and get start/end positions.
        var minVal = 0, maxVal = 0;
        sortedData.forEach(function (dataset) {

            dataset.sort(sort);

            //Add the values within each year together.
            sortedData.forEach(function (dataset) {
                var val = 0;
                dataset.forEach(function (d) {
                    if (val < 0 && d.OBS_VALUE >= 0) val = 0;//reset after products with negative value

                    d.val0 = val;
                    d.val1 = val += d.OBS_VALUE;

                    if (val < minVal) minVal = val;
                });
            });

            maxVal = Math.max(maxVal, dataset[dataset.length-1].val1);//final one is always the top one (or bottom one, if there are only negative ones)
        });

        var yDomain = [minVal, maxVal],
            xDomain = [Math.min.apply(null, times) - 0.5, Math.max.apply(null, times) + 0.5];

        if (yDomain[0]===yDomain[1]) {yDomain[0] = -1; yDomain[1] = 1;}

        //Add data before new domains are put into effect.
        bars = graph.select("#bars").selectAll(".bar").data(data, function(d){return d.TIME + d.PRODUCT;}); //not d.GEO, because only 1 country is shown at a time, and this way we get a nice transition when switching country

        bars.enter().append("rect") //starting positions
            .attr("class", function(d){var cl = "bar pr" + d.PRODUCT; if (d.OBS_VALUE < 0) cl += " neg"; return cl;}) //'classed' not working in transition for some reason
            .attr("x", function(d){return rect.left(d) + rect.width(d)})//rect.left)
            .attr("y", rect.top)
            .attr("height", rect.height)
            .attr("width", 0)//rect.width)
            .style("opacity", 1)
            .append("svg:title")
            .attr("class", "tooltip");

        bars.selectAll(".tooltip")
            .text(tooltipText);

        x.domain(xDomain);
        y.domain(yDomain);

        //http://bl.ocks.org/enjalot/1429426   has good example on transitions

        //2 transitions: new scale on Y, and new scale on X.
        yAxisEl.transition()
            .duration(transition.duration)
            .ease(transition.ease)
            .call(yAxis);
        xAxisEl.transition()
            .duration(transition.duration)
            .ease(transition.ease)
            .attr("transform", "translate(0," + y(0) + ")")
            .call(xAxis);
        bars.exit().transition()
            .duration(transition.duration)
            .ease(transition.ease)
            .attr("x", rect.left)
            .attr("y", rect.top)
            .attr("height", rect.height)
            .attr("width", 0)//rect.width)
            //.style("opacity", 0)
            .remove();
        bars.transition()
            .duration(transition.duration)
            .attr("class", function(d){var cl = "bar pr" + d.PRODUCT; if (d.OBS_VALUE < 0) cl += " neg"; return cl;}) //'classed' not working in transition for some reason
            .ease(transition.ease)
            .attr("x", rect.left)
            .attr("y", rect.top)
            .attr("height", rect.height)
            .attr("width", rect.width);//.style("opacity", 1)

        return gr;
    };

    function tooltipText () {
        var d = this.parentNode.__data__;
        var prod = $.grep(scope.products, function (p) { return (p.name === d.PRODUCT); })[0];
        if (prod) prod = prod.descr; else prod = "";
        return d.GEO + "     " + d.TIME + "\n" + prod + "\n" + d3.format(format.tooltipFormat)(d.OBS_VALUE) + " " + format.yUnit;
    }



/*


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
            x.domain(xDomain)
                .rangeRound([0, graphSize()[0]]);
            y.domain(yDomain)
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
        return x(d[0]);
    }
    function yPix (d) {//Returns y-coordinate in pixels from bound data object.
        return y(d[1]);
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
*/
    return gr;
}