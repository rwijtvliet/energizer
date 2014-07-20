(function(){
    d3.json("data/db/geo.json", function(error, geos){
        geos.forEach(function (geo) {
            $('#geo').append($('<option/>', {
                value: geo.name,
                text : geo.descr
            }));
        });
    });

    d3.json("data/db/nrg100a_product.json", function(error, products){
        products.forEach(function (product) {
            $('#product').append($('<option/>', {
                value: product.name,
                text : product.descr
            }));
        });
    });
})();
