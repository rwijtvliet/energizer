//TODO: turn into iife: (function() {

var db = eurostatDb();
var tblQ = {};//(key, value) = (name, promise to table object)

/*var gr = graph()
 .size([1000,700]);*/
var app = angular.module("myApp", []);
var margin = {top: 15, right: 20, bottom: 30, left: 90},
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
    $scope.fieldFilter = {GEO: "NL", PRODUCT: ["0000"]};
    $scope.customProductFilter = [];
    $scope.splitBySource = 0;
    $scope.format = {yUnit: "TJ/a", yFormat: "s", tooltipFormat: "3s"};
    $scope.to100 = false;
    $scope.rst = [];

    //asynchronously get actual values.
    tblQ["nrg_100a"] = PrepareTable("nrg_100a", {FREQ: "A", UNIT: "TJ", INDIC_NRG: "B_100900"});
    tblQ["demo_pjanbroad"] = PrepareTable("demo_pjanbroad", {FREQ: "A", SEX: "T", AGE: "TOTAL"});
    tblQ["nrg_100a"]
        .then(function(tbl){
            $scope.products = db.codelist(tbl.name, "PRODUCT");
            $scope.geos = db.codelist(tbl.name, "GEO");
        })
        .catch(showError);

    //
    $scope.updateSources = function(){
        if ($scope.splitBySource === 0) $scope.fieldFilter.PRODUCT = ["0000"];
        else if ($scope.splitBySource === 1) $scope.fieldFilter.PRODUCT = $scope.products.map(function(p){return p.name;}).filter(function(d){return (d !== "0000");});
        else $scope.fieldFilter.PRODUCT = $scope.customProductFilter;
        $scope.updateGraph();
    };
    $scope.updateGraph = function () {
        FetchRst(tblQ["nrg_100a"], $scope.fieldFilter)
            .then(function(rst){
                if ($scope.splitBySource != 1 || !$scope.to100) {

                    $scope.format = {yUnit: "TJ/a", yFormat: "s", tooltipFormat: "3s"};
                    $scope.rst = $.extend(true, [], rst);
                } else {
                    var sortedData = [];
                    var rst2 = $.extend(true, [], rst);
                    var times = uniqueValues(rst2, "TIME");
                    times.forEach(function (time) {sortedData.push(rst2.filter(function (d) {return (d.TIME === time);}))});
                    sortedData.forEach(function(dataset){
                        var total = 0;
                        dataset.forEach(function(d){total += d.OBS_VALUE;});
                        if (total > 0) dataset.forEach(function(d){d.OBS_VALUE = d.OBS_VALUE / total;});
                    });
                    $scope.format = {yUnit: "", yFormat: "%", tooltipFormat: "%"};
                    $scope.rst = rst2;
                }

            })
            .catch(showError);
    };
    $scope.updateSources();

    //Make sure the directive notices when window is resized.
    angular.element($window).on("resize", function(){
        $scope.$apply();
    });
}]);

app.directive('barChart', function() {
    var el,
        gr = graph();

    function link(scope, el) {
        el = el[0];
        gr.init(scope, el);

        /*
        var el = el[0],
            format = {},
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
            x = d3.scale.linear()//not using d3.time.scale because always entire years plotted.
                .rangeRound(xRange),
            xAxis = d3.svg.axis()
                .scale(x)//can change x (i.e., the scale) without needing to reapply it here.
                .orient("bottom")
                .tickFormat(d3.format("0000")),
            xAxisEl = graph.append("g") //axis
                .attr("class", "axis"),
            xAxisLabel = xAxisEl.append("text") //label
                .attr("y", -4)
                .attr("x", graphSize[0])
                .style("text-anchor", "end")
                .text("Year"),
            yRange = [graphSize[1], 0],
            y = d3.scale.linear()
                .rangeRound(yRange)
                .nice(),
            yAxis = d3.svg.axis()
                .scale(y)
                .orient("left"),
            yAxisEl = graph.append("g") //axis
                .attr("class", "axis"),
            yAxisLabel = yAxisEl.append("text") //label
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end"),
            rect = {
                top: function(d) {if (d.OBS_VALUE >= 0) return y(d.val1); else return y(d.val0);},
                height: function(d) {return Math.abs(y(d.val1) - y(d.val0));},
                left: function(d) {return x(d.TIME - 0.5 * xBarFillRatio);},
                width: function (d) {return x(d.TIME + 0.5 * xBarFillRatio) - x(d.TIME - 0.5 * xBarFillRatio);}
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
            };*/

        //Update things on resize.
        scope.$watch(function () {
            return el.clientWidth * el.clientHeight;
        }, function () {
            gr.updateSize([el.clientWidth, el.clientHeight]);
        });


        scope.$watch("formatting", function (newFormat) {//format {yUnit: "", yFormat: "", tooltipFormat: ""};
            gr.updateFormat(newFormat);
            /*format = newFormat;

            yAxisLabel.text(format.yUnit);
            yAxis.tickFormat(d3.format(format.yFormat));

            bars.selectAll(".tooltip").text(tooltipText);*/
        });

        //Update things on data update.
        scope.$watch("data", function (data) {//data = recordset
            gr.updateData(data);
            /*
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

            if (yDomain[0]===yDomain[1]) {yDomain[0] = -1;yDomain[1] = 1;}

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
                .attr("width", rect.width);//.style("opacity", 1)*/

        });

        /*
        function tooltipText () {
            var d = this.parentNode.__data__;
            var prod = $.grep(scope.products, function (p) { return (p.name === d.PRODUCT); })[0];
            if (prod) prod = prod.descr; else prod = "";
            return d.GEO + "     " + d.TIME + "\n" + prod + "\n" + d3.format(format.tooltipFormat)(d.OBS_VALUE) + " " + format.yUnit;
        }*/
    }


    return {
        link: link,
        restrict: 'E',
        scope: { data: '=', products: '=', formatting: '='}
    };
});
function showError (error) {
    //TODO: adjust to show error in full screen without need to click
    alert( + error);
}

//TODO: })();

//Find unique property values in array of objects.
function uniqueValues(array, propName) {
    var found = {},
        output = [],
        l = array.length,
        propVal;
    for (var i = 0; i < l; i++) {
        propVal = array[i][propName];
        if (found[propVal]) continue;
        found[propVal] = true;
        output.push(propVal);
    }
    return output;
}