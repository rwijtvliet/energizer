//TODO: turn into iife: (function() {


var tblQ = {};//(key, value) = (name, promise to table object)
var db = eurostatDb();

var app = angular.module("myApp", ["ngRoute", "ngAnimate"]);
app.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/home', {
            templateUrl: 'partials/main.html',
            controller: 'BarChartController'
        }).
        when('/about', {
            templateUrl: 'partials/about.html',
            controller: 'BarChartController'
        }).
        otherwise({
            redirectTo: '/home'
        });
}]);

app.service("PrepareTable", ["$q", function ($q){//returns promise to table object
    return function(name, fixDimFilter) {
        var def = $q.defer();
        db.initTable(name, fixDimFilter, function (error, tbl) {
            if (error) def.reject(error); else def.resolve(tbl);
            console.log(JSON.stringify(db.dimensions(tbl.name)));
            console.log(JSON.stringify(db.fields(tbl.name)));
            console.log(JSON.stringify(db.fixDims(tbl.name)));
            console.log(JSON.stringify(db.varDims(tbl.name)));
            console.log(JSON.stringify(db.dsd(tbl.name).concepts));
        });
        return def.promise;
    };
}]);
app.service("FetchRst", ["$q", function ($q){
    return function (name, fieldFilter) {
        var def = $q.defer();
        tblQ[name].then(function(tbl) {
            db.fetchRst(tbl.name, fieldFilter, function (error, rst) {
                if (error) def.reject(error); else def.resolve(rst);
            });
        });
        return def.promise;
    }
}]);

app.service("Db", ["$q", function ($q){

    var Db = {};

    var tblQ = {}; //promises to tables

    Db.initTbl = function(name, fixDimFilter) {
        var def = $q.defer();
        db.initTable(name, fixDimFilter, function (error, tbl) {
            if (error) def.reject(error); else def.resolve(tbl);
        });
        tblQ[name] = def.promise;
        return def.promise;
    };

    Db.rst = function (name, fieldFilter) {
        if (!tblQ.hasOwnProperty(name)) throw Error("Table " + name + " has not been initialised yet");
        var def = $q.defer();
        tblQ[name].then(function(tbl) {
            db.fetchRst(tbl.name, fieldFilter, function (error, rst) {
                if (error) def.reject(error);
                else {
                    var rst2 = [];
                    rst.forEach(function(row){if (row.OBS_VALUE != null) rst2.push($.extend({},row));}); //clone row to 'protect' rst in eurostatDb.
                    def.resolve(rst2);
                }
            });
        });
        return def.promise;
    };

    Db.rstQuotient = function (name, fieldFilter, denomName, denomBaseFilter) {
        //The denominator should always have exactly ONE value (datapoint) for each of the records in the numerator.
        //  The denominator's .fieldsInput uniquely define a datapoint, so a single value for each of these must each be
        //  (a) defined in the denomBaseFilter, or else (b) by the numerator's datapoint that is to be divided by it. (b = join fields)
        //First, however, a rst must be fetched for the denominator, that contains all datapoins that are going to be
        //  needed. The fieldFilter necessary for this is calculated below.
        /*//example 1
        name = "nrg_100a";
        fieldFilter = {GEO: "NL", PRODUCT: ["3000", "4000"]}; //leaves TIME --> multiple TIMEs in result rst.
        denomName = "demo_pjanbroad";
        denomBaseFilter = {}; //inputfields = GEO and TIME. BaseFilter leaves GEO and TIME free --> must get GEO and TIME from numerator --> JOIN on GEO and TIME.
        //NB: must fetch with denomFieldFilter = {GEO: "NL"}.

        //example 2
        name = "nrg_100a";
        fieldFilter = {GEO: "NL", PRODUCT: ["3000", "4000"]}; //leaves TIME --> multiple TIMEs in result rst.
        denomName = "nrg_100a";
        denomBaseFilter = {PRODUCT: "0000"}; //inputfields = PRODUCT, GEO, and TIME. BaseFilter leaves GEO and TIME free --> must get GEO and TIME from numerator --> JOIN on GEO and TIME but not PRODUCT.
        //NB: must fetch with denomFieldFilter = {GEO: "NL", PRODUCT: "0000"}

        //example 3
        name = "nrg_100a";
        fieldFilter = {TIME: "1990", PRODUCT: ["3000", "4000"]}; //leaves GEO --> multiple GEOs in result rst.
        denomName = "nrg_100a";
        denomBaseFilter = {PRODUCT: "0000"}; //inputfields = PRODUCT, GEO, and TIME. BaseFilter leaves GEO and TIME free --> must get GEO and TIME from numerator --> JOIN on GEO and TIME but not PRODUCT.
        //NB: must fetch with denomFieldFilter = {TIME: "1990", PRODUCT: "0000"}*/
        //Assume: denomBaseFilter is well-formed, meaning: (a) it contains only (but not necessarily all) fieldnames that are needed, and (b) the values are single values (i.e., not arrays).
        var denomFieldFilter,
            joinFields = db.fieldsInput(denomName).filter(function(f){return !(denomBaseFilter.hasOwnProperty(f));});//input fields not yet present in 'base filter' (but which are necessary to get single denominator value)

        //Part of fieldFilter comes from 'baseFilter'. Those not in 'baseFilter' come from the numerator's fieldFilter. Those not in numerator's fieldFilter, must be "".
        denomFieldFilter = $.extend({}, denomBaseFilter);
        joinFields.forEach(function(f){denomFieldFilter[f] = (fieldFilter.hasOwnProperty(f)) ? fieldFilter[f] : "";});

        var def = $q.defer();
        $q.all([
            Db.rst(name, fieldFilter),
            Db.rst(denomName, denomFieldFilter)
        ]).then(function(rsts){
            //rsts[0] = numerator rst; rsts[1] = denominator rst (not needed).
            var rst2 = [];
            rsts[0].forEach(function(row){//do division of numerator by denominator
                //find the field filter necessary to get the correct row from the denominator table, and get that row
                joinFields.forEach(function(f){denomFieldFilter[f] = row[f];}); //those that were not yet in denomBaseFilter MUST be in row
                var denomRow = db.getRst(denomName, denomFieldFilter);
                if (denomRow.length === 0) return; //e.g. for these field values in the numerator table, the denominator dataflow does not have a datapoint.
                else if (denomRow.length !== 1) throw new Error("Multiple values found for denominator when using fieldFilter " + JSON.stringify(denomFieldFilter));
                //get the value of that row, and divide the numerator by it
                var denomVal = denomRow[0].OBS_VALUE;
                if (!denomVal) return; //denomVal === null (unknown) or 0; cannot divide; do not include in rst //TODO: make null if null? make +-infinity if 0?
                var row2 = $.extend({}, row);//deep clone not needed; row has primitive property values.
                row2.OBS_VALUE /= denomVal;
                //add
                rst2.push(row2);
            });

            def.resolve(rst2);
        });

        return def.promise;
    };

    return Db;

}]);

app.controller("BarChartController", ["$scope", "$window", "PrepareTable", "FetchRst", "Db", function ($scope, $window, PrepareTable, FetchRst, Db) {
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
        ],
        yDivides: [
            {name: "Aggregate", descr: "Don't divide, show total", val:0},
            {name: "Split", descr: "Show division into energy sources", val:1},
            {name: "Select...", descr: "Select energy sources", val:2}
        ],
        yUnits: [
            {name: "absolute", descr: "Absolute values", units: [
                {groupName: "absolute", name: "TJ/a", descr: "Terajoules per year", mul: 1, off: 0},
                {groupName: "absolute", name: "kTOE/a", descr: "Thousand tonnes of oil equivalent per year", mul: .0238845897, off: 0},
                {groupName: "absolute", name: "GWh/a", descr: "Gigawatt hours per year", mul: .277777778, off: 0}
            ]},
            {name: "per person", descr: "Values per inhabitant", units: [
                //{groupName: "per person", name: "MWh/person/a", descr: "Megawatt hours per person per year", mul: 277.777778, off: 0},
                {groupName: "per person", name: "kWh/person/d", descr: "Kilowatt hours per person per day", mul: 760.530, off: 0},
                {groupName: "per person", name: "kW/person", descr: "Kilowatt per person", mul: 31.68876, off: 0},
                {groupName: "per person", name: "personal slaves", descr: "Number of hypothetical 'energy slaves' working to provide energy needs for each person. Output of 1 slave: 100W during 8h/day, 5days/week.", mul: 1330.92811, off: 0} //100W per (8h/day) per (5days/week) http://www.manicore.com/anglais/documentation_a/slaves.html
            ]},
            {name: "relative", descr: "Values as fraction of that year's total", units: [
                {groupName: "relative", name: "% of total", descr: "Total for each year and country is 100%", mul: 1, off: 0}
            ]}
        ]
    };
    $scope.settings = {
        xquant: "times",
        yDivide: $scope.options.yDivides[0],
        customProductFilter: [],
        yUnit: $scope.options.yUnits[0].units[0],
        fieldFilter: {GEO: "NL", PRODUCT: ["0000"]}
    };
    $scope.graph = {
        format : {xUnit: "year", yUnit: "TJ/a", yFormat: "s", tooltipFormat: "3s"},
        rst: []
    };
    $scope.urls = {
        sidepanel:  "partials/sidepanelSimple.html",
        quickpanel: "partials/quickpanel.html",
        bottompanels: [
            "partials/bottompanelY.html",
            "partials/bottompanelX.html",
            "partials/bottompanelGeo.html",
            "partials/bottompanelUnit.html",
            "partials/bottompanelFormat.html"
        ]
    };

    //asynchronously get actual values.
    Db.initTbl("nrg_100a", {FREQ: "A", UNIT: "TJ", INDIC_NRG: "B_100900"}); //leaves GEO and PRODUCT and TIME
    Db.initTbl("demo_pjanbroad", {FREQ: "A", SEX: "T", AGE: "TOTAL"}); //leaves GEO and TIME
    tblQ["nrg_100a"] = PrepareTable("nrg_100a", {FREQ: "A", UNIT: "TJ", INDIC_NRG: "B_100900"}); //leaves GEO and PRODUCT and TIME
    tblQ["demo_pjanbroad"] = PrepareTable("demo_pjanbroad", {FREQ: "A", SEX: "T", AGE: "TOTAL"}); //leaves GEO and TIME
    tblQ["nrg_100a"]
        .then(function(tbl){
            $scope.options.products = db.codelist(tbl.name, "PRODUCT");
            $scope.options.geos = db.codelist(tbl.name, "GEO");
            $scope.options.geos.forEach(function(g){if (g.name.substring(0,2)=="EU" || g.name.substring(0,2)=="EA") g.group = "Group"; else g.group = "Individual"}); //add groups
        })
        .catch(showError);
    $scope.updateYDivide = function(){
        if ($scope.settings.yDivide.val === 0) $scope.settings.fieldFilter.PRODUCT = ["0000"];
        else if ($scope.settings.yDivide.val === 1) $scope.settings.fieldFilter.PRODUCT = $scope.options.products.map(function(p){return p.name;}).filter(function(d){return (d !== "0000");});
        else $scope.settings.fieldFilter.PRODUCT = $scope.settings.customProductFilter;
        $scope.updateGraph();
    };
    $scope.updateYUnit = function() {
        $scope.updateGraph();
    };

    $scope.updateGraph = function () {

        if ($scope.settings.yUnit.groupName === "per person") {
            Db.rstQuotient("nrg_100a", $scope.settings.fieldFilter, "demo_pjanbroad", {})
                .then(function(rst){
                    $scope.graph.format = {xUnit: "Year", yUnit: $scope.settings.yUnit.name, yFormat: "s", tooltipFormat: "2s"};
                    //var rst = $.extend(true, [], rst);
                    rst.forEach(function(row){row.OBS_VALUE = unitConv(row.OBS_VALUE);});
                    $scope.graph.rst = rst;
                })
                .catch(showError);
        } else if ($scope.settings.yUnit.groupName === "relative") {
            Db.rstQuotient("nrg_100a", $scope.settings.fieldFilter, "nrg_100a", {PRODUCT:"0000"})
                .then(function(rst){
                    $scope.graph.format = {xUnit: "Year", yUnit: $scope.settings.yUnit.name, yFormat: "%", tooltipFormat: "3%"};
                    //var rst = $.extend(true, [], rst);//must clone
                    rst.forEach(function(row){row.OBS_VALUE = unitConv(row.OBS_VALUE);});
                    $scope.graph.rst = rst;
                })
                .catch(showError);
        } else {
            Db.rst("nrg_100a", $scope.settings.fieldFilter)
                .then(function(rst){
                    $scope.graph.format = {xUnit: "Year", yUnit: $scope.settings.yUnit.name, yFormat: "s", tooltipFormat: "2s"};
                    //var rst = $.extend(true, [], rst);
                    rst.forEach(function(row){row.OBS_VALUE = unitConv(row.OBS_VALUE);});
                    $scope.graph.rst = rst;
                })
                .catch(showError);
        }
    };
    $scope.updateYDivide();

    //Make sure the directive notices when window is resized.
    angular.element($window).on("resize", function(){
        $scope.$apply();
    });

    function unitConv(val) {
        if (isNaN($scope.settings.yUnit.mul)) return 0;
        return val * $scope.settings.yUnit.mul + $scope.settings.yUnit.off;
    }
}]);

app.directive('barChart', function() {

    function link(scope, el) {
        el = el[0];
        var gr = graph();

        gr.init(scope, el);

        //Update things on resize.
        scope.$watch(function () {
            return el.clientWidth + el.clientHeight;
        }, function () {
            gr.updateSize([el.clientWidth, el.clientHeight]);
        });

        scope.$watch("format", function (newFormat) {//format {xUnit: "", yUnit: "", yFormat: "", tooltipFormat: ""};
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
        scope: { data: '=graphData', products: '=', format: '='}
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


function unitConversionFunction(mul, off) {
    mul = mul || 0;
    off = off || 0;
    return function(val){
        return val * mul + off;
    }
}

var TJ2kTOE = unitConversionFunction(.0238845897);
var TJ2GWh = unitConversionFunction(.277777778);