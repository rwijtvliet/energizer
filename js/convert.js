/**
 * Created by ruud on 20.06.14.
 */



(function(){
    var d = d3.select("#inf");

    d3.xml("data/nrg_100a_A.TJ.0000+2000+3000.B_100100+B_101847+B_101321.._ALL.xml", function(error, xml){
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000...?startPeriod=2005&endPeriod=2006"
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000.B_100100..?startPeriod=2005&endPeriod=2009"
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000.B_100100.."

        if (error) d.append("p").text(error);

        //using x2js -- the better option
        d.append("h1").text("using x2js");

        var converter = new X2JS();
        var rawdata = converter.xml2json(xml);
        var data = rawdata["GenericData"]["DataSet"]["Series"]; //data as in xml file
        d.append("h3").text("- data as present in xml file; before parsing");
        d.append("p").text(JSON.stringify(data));

        var newdata = [];                                       //data as in database
        data.forEach(function(d){
            //get all data that remains the same (=unit, country, product, indic_nrg, ...)
            var v_base = {};
            d["SeriesKey"]["Value"].forEach(function(skv){ v_base[skv["_id"]] = skv["_value"]; });
            d["Obs"].forEach(function(o){
                var v = {};
                $.extend(v,v_base);
                v["YEAR"] = Number(o.ObsDimension["_value"]);
                if ("Attributes" in o && "Value" in o["Attributes"] && "_id" in o["Attributes"]["Value"] && o["Attributes"]["Value"]["_id"] === "OBS_STATUS") {
                    v["VALUE"] = (o["Attributes"]["Value"]["_value"] === "na" ? null : 0); //value unknown or (practically) zero.
                } else {
                    v["VALUE"] = o.ObsValue["_value"];
                    if (!isNaN(v["VALUE"])){ //on this value there might be a flag. If so, it should be tested which one and what it means (TODO)
                        v["VALUE"] = Number(v["VALUE"]);
                    }
                }
                newdata.push(v);
            });
        });
        d.append("h2").text("- data in database table style; after parsing");
        d.append("p").text(JSON.stringify(newdata));


        //using xml2json.js -- the worse option
        var data = xml2json(xml);
        d.append("h1").text("using xml2json");
        d.append("h3").text("- data as present in xml file");
        d.append("p").text(JSON.stringify(data));

    });

})();
