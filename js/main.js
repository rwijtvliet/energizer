//TODO: turn into iife: (function() {

var db = eurostatDb();
var tblQ = {};//(key, value) = (name, promise to table object)

/*var gr = graph()
 .size([1000,700]);*/
var app = angular.module("myApp", ["ngRoute"]);
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
    $scope.options = {
        geos: [
            {name: "DE", descr: "Germany"},
            {name: "NL", descr: "Netherlands"}
        ],
        products: [
            {name: "0000", descr: "all products"}
        ],
        xquants: [
            {name: "countries", descr: "for multiple countries"},
            {name: "times", descr: "for multiple years"}
        ]
    };
    $scope.settings = {
        xquant: "times",
        splitBySource: 0,
        customProductFilter: [],
        to100: false,
        fieldFilter: {GEO: "NL", PRODUCT: ["0000"]}
    };
    $scope.graph = {
        format : {yUnit: "TJ/a", yFormat: "s", tooltipFormat: "3s"},
        rst: []
    };
    $scope.urls = {
        sidepanel:  "partials/sidepanelSimple.html",
        quickpanel: "partials/quickpanel.html"
    };


    //asynchronously get actual values.
    tblQ["nrg_100a"] = PrepareTable("nrg_100a", {FREQ: "A", UNIT: "TJ", INDIC_NRG: "B_100900"});
    tblQ["demo_pjanbroad"] = PrepareTable("demo_pjanbroad", {FREQ: "A", SEX: "T", AGE: "TOTAL"});
    tblQ["nrg_100a"]
        .then(function(tbl){
            $scope.options.products = db.codelist(tbl.name, "PRODUCT");
            $scope.options.geos = db.codelist(tbl.name, "GEO");
        })
        .catch(showError);

    //
    $scope.updateSources = function(){
        if ($scope.settings.splitBySource === 0) $scope.settings.fieldFilter.PRODUCT = ["0000"];
        else if ($scope.settings.splitBySource === 1) $scope.settings.fieldFilter.PRODUCT = $scope.options.products.map(function(p){return p.name;}).filter(function(d){return (d !== "0000");});
        else $scope.settings.fieldFilter.PRODUCT = $scope.settings.customProductFilter;
        $scope.updateGraph();
    };
    $scope.updateGraph = function () {
        FetchRst(tblQ["nrg_100a"], $scope.settings.fieldFilter)
            .then(function(rst){
                if ($scope.settings.splitBySource != 1 || !$scope.settings.to100) {

                    $scope.graph.format = {yUnit: "TJ/a", yFormat: "s", tooltipFormat: "2s"};
                    $scope.graph.rst = $.extend(true, [], rst);
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
                    $scope.graph.format = {yUnit: "", yFormat: "%", tooltipFormat: "%"};
                    $scope.graph.rst = rst2;
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

    function link(scope, el) {
        el = el[0];
        var gr = graph();

        gr.init(scope, el);

        //Update things on resize.
        scope.$watch(function () {
            return el.clientWidth * el.clientHeight;
        }, function () {
            gr.updateSize([el.clientWidth, el.clientHeight]);
        });

        scope.$watch("format", function (newFormat) {//format {yUnit: "", yFormat: "", tooltipFormat: ""};
            gr.updateFormat(newFormat);
        });

        //Update things on data update.
        scope.$watch("data", function (data) {//data = recordset
            gr.updateData(data);
        });
    }

    return {
        link: link,
        restrict: 'E',
        scope: { data: '=', products: '=', format: '='}
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