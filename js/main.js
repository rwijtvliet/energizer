//TODO: turn into iife: (function() {

var db = eurostatDb();
var tblQ = {};//(key, value) = (name, promise to table object)

/*var gr = graph()
 .size([1000,700]);*/
var app = angular.module("myApp", []);
var margin = {top: 10, right: 20, bottom: 30, left: 90},
    graphSize = [1000 - margin.left - margin.right, 500 - margin.top - margin.bottom];


app.service("PrepareTable", ["$q", function ($q){//returns promise to table object
    return function(name, fixDimFilter) {
        var def = $q.defer();
        db.initTable(name, fixDimFilter, function (error, tbl) {
            if (error) def.reject(error); else def.resolve(tbl);
        });
        return def.promise;
    };
}]);
app.service("FetchRst", ["$q", function ($q){
    return function (tblQ, fieldFilter) {
        var def = $q.defer();
        tblQ.then(function(tbl) {
            db.fetchRst(tbl.name, fieldFilter, function (error, rst) {
                if (error) def.reject(error); else def.resolve(rst);
            });
        });
        return def.promise;
    }
}]);

app.controller("BarChartController", ["$scope", "$window", "PrepareTable", "FetchRst", function ($scope, $window, PrepareTable, FetchRst) {
    //some starting values.
    $scope.geos = [
        {name: "DE", descr: "Germany"},
        {name: "NL", descr: "Netherlands"}
    ];
    $scope.products = [
        {name: "0000", descr: "all products"}
    ];
    $scope.fieldFilter = {GEO: ["NL"], PRODUCT: ["0000"]};
    $scope.rst = [{OBS_VALUE: 1.2, TIME: 2000}];

    //asynchronously get actual values.
    tblQ["nrg_100a"] = PrepareTable("nrg_100a", {FREQ: "A", UNIT: "TJ", INDIC_NRG: "B_100900"});
    tblQ["demo_pjanbroad"] = PrepareTable("demo_pjanbroad", {FREQ: "A", SEX: "T", AGE: "TOTAL"});
    tblQ["nrg_100a"]
        .then(function(tbl){
            $scope.products = db.codelist(tbl.name, "PRODUCT");
            $scope.geos = db.codelist(tbl.name, "GEO");
        });

    /*tblQ["nrg_100a"].then(getCodelist("geos", "GEO")).then(getCodelist("products", "PRODUCT"));
    function getCodelist(target, fldName) {
        return function (tbl) {
            $scope[target] = db.codelist(tbl.name, fldName);
            return tbl;
        };
    }*/

    $scope.updateGraph = function () {
        FetchRst(tblQ["nrg_100a"], $scope.fieldFilter)
            .then(function(rst){$scope.rst = rst;})
            .catch(showError);
    };

    //Make sure the directive notices when window is resized.
    angular.element($window).on("resize", function(){
        $scope.$apply();
    });
}]);

app.directive('barChart', function() {
    function link(scope, el) {
        var el = el[0],
            svg = d3.select(el).append("svg")
                .attr("width", graphSize[0] + margin.left + margin.right)
                .attr("height", graphSize[1] + margin.top + margin.bottom),
            graph = svg.append("g")
                .attr("width", graphSize[0])
                .attr("height", graphSize[1])
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
            bars = graph.append("g")
                .attr("id", "bars")
                .selectAll(".bar"),
            xBarFillRatio = .9,
            xRange = [0, graphSize[0]],
            xScale = d3.scale.linear()//not using d3.time.scale because always entire years plotted.
                .rangeRound(xRange),
            xAxis = d3.svg.axis()
                .orient("bottom")
                .tickFormat(d3.format("0000")),
            xAxisEl = graph.append("g") //axis
                .attr("class", "axis"),
            xAxisLabel = xAxisEl.append("text") //label
                .attr("y", -4)
                .style("text-anchor", "end")
                .text("Year"),
            yRange = [graphSize[1], 0],
            yScale = d3.scale.linear()
                .rangeRound(yRange).nice(),
            yAxis = d3.svg.axis()
                .orient("left")
                .tickFormat(d3.format("s")),//function(d){return d/1e6;}
            yAxisEl = graph.append("g") //axis
                .attr("class", "axis"),
            yAxisLabel = yAxisEl.append("text") //label
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("TJ/a"); //"\u00D7 1000000 TJ/a"

        //Update things on resize.
        scope.$watch(function () {
            return el.clientWidth * el.clientHeight;
        }, function () {

        });

        //Update things on data update.
        scope.$watch("data", function (data) {//data = recordset
            if (!data || !data.length) return;

            //DEBUG:
            var remove = Math.floor(Math.random()*5);
            for (var x=0; x<remove;x++) data.pop();
            remove = Math.floor(Math.random()*5);
            for (x=0; x<remove;x++) data.shift();
            if (!data || !data.length) return;
            //

            var duration = 1000,
                ease = "cubic-in-out", //"cubic-in-out" or "elastic"
                yDomain = [
                    Math.min(0, d3.min(data, function (d) {return d.OBS_VALUE;})),
                    Math.max(0, d3.max(data, function (d) {return d.OBS_VALUE;}))
                ],
                xDomain = [
                    +(d3.min(data, function (d) {return d.TIME;}) - 0.5),
                    +(d3.max(data, function (d) {return d.TIME;}) + 0.5)
                ];

            if (yDomain[0]===yDomain[1]) {yDomain[0] = -1;yDomain[1] = 1;}
            xScale.domain(xDomain);
            yScale.domain(yDomain);

            /*yScale.transition()
                .duration(duration)
                .domain(yDomain);//*/
            xAxis.scale(xScale);//TODO:necessary? or can go to top?
            xAxisLabel.attr("x", graphSize[0]);
            yAxis.scale(yScale);//TODO:necessary? or can go to top?

            var rect = {
                    top: function(d) {if (d.OBS_VALUE >= 0) return yScale(d.OBS_VALUE); else return yScale(0);},
                    height: function(d) {return Math.abs(yScale(0) - yScale(d.OBS_VALUE));},
                    left: function(d) {return xScale(d.TIME - 0.5 * xBarFillRatio);},
                    width: function (d) {return xScale(d.TIME + 0.5 * xBarFillRatio) - xScale(d.TIME - 0.5 * xBarFillRatio);}
                };

            //see http://bl.ocks.org/enjalot/1429426 for example


            //Transition 1: new scale on Y


            //new data
            bars = graph.select("#bars")
                .selectAll(".bar")
                .data(data, function(d){return d.TIME;}); //the 1994 element is updated to also represent 1994 after transition.
            //bars = bars.data(data, function(d){return d.TIME;}); //somehow not working if multiple products selected.


            //update
            bars.attr("class", function(d){return "bar pr" + d.PRODUCT;})
                //.attr("class", function(d){var cl = "bar pr" + d.PRODUCT; if (d.OBS_VALUE < 0) cl += " neg"; return cl;});
                .classed("neg", function(d){return (d.OBS_VALUE < 0);});

            //enter
            bars.enter()
              .append("rect")
                .attr("x", rect.left)
                .attr("y", yScale(0))
                .attr("height", 0)
                .attr("width", rect.width)
              .append("svg:title")
                .text(function (d) {return d.GEO + "     " + d.TIME + "\nProduct: " + d.PRODUCT + "\n" + d.OBS_VALUE + " TJ/a";});

            //exit
            bars.exit()
              .transition()
                .duration(duration)
                .style("opacity", 0)
                .remove();

            //update + enter
            bars.transition()
                .duration(duration)
                .ease(ease)
                .attr("class", function(d){var cl = "bar pr" + d.PRODUCT; if (d.OBS_VALUE < 0) cl += " neg"; return cl;}) //'classed' not working in transition for some reason
                .attr("x", rect.left)
                .attr("y", rect.top)
                .attr("height", rect.height)
                .attr("width", rect.width);

            //axes
            xAxisEl.transition()
                .duration(duration)
                .ease(ease)
                .call(xAxis)
                .attr("transform", "translate(0," + yScale(0) + ")");

            yAxisEl.transition()
                .duration(duration)
                .ease(ease)
                .call(yAxis);

            /*var duration = 1000
            arcs = arcs.data(pie(data))
            arcs.transition()
                .duration(duration)
                .attrTween('d', arcTween)

            arcs.enter()
                .append('path')
                .style('stroke', 'white')
                .attr('fill', function (d, i) {return color(i)})
                .each(function (d) {this._current = { startAngle: 2 * Math.PI - 0.001, endAngle: 2 * Math.PI }})
                .transition()
                .duration(duration)
                .attrTween('d', arcTween)

            arcs.exit()
                .transition()
                .duration(duration)
                .each(function (d) {
                    d.startAngle = 2 * Math.PI - 0.001;
                    d.endAngle = 2 * Math.PI;
                })
                .attrTween('d', arcTween).remove();//*/


        });

    }

    return {
        link: link,
        restrict: 'E',
        scope: { data: '=' }
    };
});
function showError (error) {
    //TODO: adjust to show error in full screen without need to click
    alert(error);
}

//TODO: })();
