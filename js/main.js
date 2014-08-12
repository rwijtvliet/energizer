
(function() {
    var app = angular.module("myApp", []);

    var db = eurostatDb();
    var gr = graph()
        .size([1000,700]);
    var graph = svg.append("g")

    app.controller("GeoSelectController", function ($scope) {
        $scope.geos = [
            {name: "DE",  descr: "Germany"},
            {name: "NL",  descr: "Netherlands"}
        ];
        $scope.products = [
            {name: "0000",  descr: "all products"},
            {name: "NL",  descr: "Netherlands"}
        ];

        $scope.fieldFilter = {GEO: ["NL",  "BE"], PRODUCT: ["0000"]};

        db.initTable("nrg_100a", {UNIT:"TJ", FREQ:"A", INDIC_NRG:"B_100900"}, function(){
            $scope.geos = db.codelist("nrg_100a", "GEO");
            $scope.products = db.codelist("nrg_100a", "PRODUCT");
        });

        $scope.updateGraph = function(){

        }
    });
})();

//1: one controller for each <select>, or one controller for both?
//2: deal with asynchr data -> not appearing on screen
//3: