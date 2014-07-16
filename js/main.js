
/**
 * Created by ruud on 27.06.14.
 */

(function() {
    var app = angular.module("myApp", []);

    app.controller("DataController", function () {
        var data = this;

        this.geos = geos;
        this.products = products;
        this.selection = {};

        this.applySelection = function() {
            alert("alent")
        };
    });

    var products = [
        {name: "0000"},
        {name: "2000"}
    ];
    var geos = [
        {name: "Germany",
            geo: "DE"},
        {name: "Netherlands",
            geo: "NL"}
    ];
})();