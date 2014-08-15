function log(x) {console.log(x);}
function logj(x) {console.log(JSON.stringify(x,null,1));}

(function() {
    var app = angular.module("myApp", []);

    var db = eurostatDb();
    /*var gr = graph()
        .size([1000,700]);*/
    var margin = {top: 10, right: 20, bottom: 30, left: 90},
        graphSize = [1000 - margin.left - margin.right, 700 - margin.top - margin.bottom],
        svg = d3.select("#inf").append("svg")
            .attr("width", graphSize[0] + margin.left + margin.right)
            .attr("height", graphSize[1] + margin.top + margin.bottom),
        graph = svg.append("g")
            .attr("width", graphSize[0])
            .attr("height", graphSize[1])
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    app.service("MyService", ["$q", function ($q){
        this.getGeos = function(name) {
            var def = $q.defer();
            cm.doAsync(name, function(error){
                if (error) def.reject(error); //<-- reject the promise
                def.resolve(cm.getSomeData(name, "GEO"));
            });
            return def.promise;
        }
    }]);

    app.controller("GeoSelectController", ["$scope", "MyService", function ($scope, MyService) {
        //some starting values.
        $scope.geos = [
            {name: "DE",  descr: "Germany"},
            {name: "NL",  descr: "Netherlands"}
        ];
        $scope.geoFilter = ["NL"];

        //asynchronously get actual values.
        MyService.getGeos("nrg_100a")
            .then(function(geos){
                $scope.geos = geos;
            })
            .catch(function(error){
                alert(error);
            });
    }]);



    app.factory('SonService', function ($http, $q) {
        return {
            getWeather: function() {
                // the $http API is based on the deferred/promise APIs exposed by the $q service
                // so it returns a promise for us by default
                return $http.get('http://fishing-weather-api.com/sunday/afternoon')
                    .then(function(response) {
                        if (typeof response.data === 'object') {
                            return response.data;
                        } else {
                            // invalid response
                            return $q.reject(response.data);
                        }

                    }, function(response) {
                        // something went wrong
                        return $q.reject(response.data);
                    });
            }
        };
    });
    app.factory('codes', function($q) {
        return {
            getGeoCodes: function() {
                var db = eurostatDb();
                db.initTable("nrg_100a", {UNIT:"TJ", FREQ:"A", INDIC_NRG:"B_100900"}, function(error){
                    if (error) {showError(error); return;}
                    callback(db.codelist("nrg_100a", "GEO"));
                });
                  /*
                return  [
                    {name: "DE",  descr: "Germany"},
                    {name: "NL",  descr: "Netherlands"},
                    {name: "BE",  descr: "Belg"},
                    {name: "LU",  descr: "Lux"}
                ];*/
            }
        };
    });

    app.controller("GeoSelectController", function ($scope, codes) {
        $scope.geos = [];/*codes.getGeoCodes();/*[
            {name: "DE",  descr: "Germany"},
            {name: "NL",  descr: "Netherlands"}
        ];*/
        $scope.products = [
            {name: "0000",  descr: "all products"}
        ];/**/

        $scope.fieldFilter = {GEO: ["NL",  "BE"], PRODUCT: ["0000"]};
        codes.getGeoCodes(function(geos){
            $scope.geos = geos;
        });
        /*var db = eurostatDb();
        db.initTable("nrg_100a", {UNIT:"TJ", FREQ:"A", INDIC_NRG:"B_100900"}, function(error){
            if (error) {showError(error); return;}
            var geos = db.codelist("nrg_100a", "GEO");
            $scope.geos = geos;
            $scope.products = db.codelist("nrg_100a", "PRODUCT");
        });*/

        $scope.updateGraph = function(){
            db.fetchRst("nrg_100a", $scope.fieldFilter, function(error, rst){
                if (error) log(error.toString());
                else {
                    log(rst);
                    makeGraph(rst);
                }
            });
        }
    });

    function showError (error) {
        //TODO: adjust to show error in full screen without need to click
        alert(error);
    }
    function makeGraph (data) {
        var yDomain = [
                Math.min(0, d3.min(data, function (d) {return d.OBS_VALUE;})),
                Math.max(0, d3.max(data, function (d) {return d.OBS_VALUE;}))
            ],
            yRange = [graphSize[1], 0],
            xDomain = [
                    d3.min(data, function (d) {return d.TIME;})-0.5,
                    d3.max(data, function (d) {return d.TIME;})+0.5
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
            .attr("x", function(d){return xScale(d.TIME-0.5*xBarFillRatio);})
            .attr("y", function(d){return yScale(d.OBS_VALUE);})
            .attr("height", function(d){return graphSize[1] - yScale(d.OBS_VALUE);})
            .attr("width", function(d){return xScale(d.TIME+0.5*xBarFillRatio) - xScale(d.TIME-0.5*xBarFillRatio);})
            .attr("style", function(d){return "fill:" + yColorScale(d.OBS_VALUE);})
            .append("svg:title")
            .text(function(d){return d.GEO + "     " + d.TIME + "\nProduct: " + d.PRODUCT + "\n" + d.OBS_VALUE + " TJ/a";});

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

})();

//1: one controller for each <select>, or one controller for both?
//2: deal with asynchr data -> not appearing on screen
//3: