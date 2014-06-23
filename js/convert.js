/**
 * Created by ruud on 20.06.14.
 */



(function(){
    var div = d3.select("#inf");

    d3.xml("data/nrg_100a_A.TJ.0000.B_100100.DE._ALL_startPeriod=1990_endPeriod=2020.xml" , function(error, xml){
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000...?startPeriod=1980&endPeriod=2006"//very large file
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000.B_100100.DE.?startPeriod=1990&endPeriod=2020"
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000.B_100100.."


        try { //Basic initial data validation.
            if (error) throw error;
            var converter = new X2JS();
            var alldata = converter.xml2json(xml);
            if (!("GenericData" in alldata)) throw "Unexpected xml document; node 'GenericData' not found";
            if (!("DataSet" in alldata.GenericData)) {
                if (!("Footer" in alldata.GenericData && "Message" in alldata.GenericData.Footer && "Text" in alldata.GenericData.Footer.Message)) throw "Unexpected xml document; nodes 'GenericData/DataSet'  AND 'GenericData/Footer/Message/Text' not found.";
                else throw "Unexpected xml document; message from server:\n" + alldata.GenericData.Footer.Message.Text.join('\n');
            }
            var data = alldata.GenericData.DataSet.Series;      //data series in xml file
        }
        catch(err) {
            div.append("p").text("Error message:\n\n" + err);
            data = {};
        }

        var newdata = [];                                       //data series as in database
        if ("SeriesKey" in data) data = [data];                 //fix: problem with array if only 1 country
        data.forEach(function(d){
            //get all data that remains the same (=unit, country, product, indic_nrg, ...)
            var v_base = {};
            d.SeriesKey.Value.forEach(function(skv){ if (skv._id !== "UNIT" && skv._id !== "FREQ") v_base[skv._id] = skv._value; }); //leave out unit and frequency
            d.Obs.forEach(function(o){
                var v = {};
                $.extend(v,v_base);
                v.YEAR = Number(o.ObsDimension._value);
                if ("Attributes" in o && "Value" in o["Attributes"] && "_id" in o["Attributes"]["Value"] && o["Attributes"]["Value"]["_id"] === "OBS_STATUS") {
                    v.VALUE = (o["Attributes"]["Value"]["_value"] === "na" ? null : 0); //value unknown or (practically) zero.
                } else {
                    v.VALUE = o.ObsValue._value;
                    if (!isNaN(v.VALUE)){ //on this value there might be a flag. If so, it should be tested which one and what it means (TODO)
                        v.VALUE = Number(v.VALUE);
                    } else {
                        var b = "alert";
                    }
                }
                newdata.push(v);
            });
        });
        div.append("h1").text("using x2js");
        div.append("h3").text("- data as present in xml file; before parsing");
        div.append("p").text(JSON.stringify(data));
        div.append("h2").text("- data in database table style; after parsing");
        div.append("p").text(JSON.stringify(newdata));


        /*//using xml2json.js -- the worse option
        data = xml2json(xml);
        div.append("h1").text("using xml2json");
        div.append("h3").text("- data as present in xml file");
        div.append("p").text(JSON.stringify(data));*/

        var svgSize = [500,300]
        var svg = d3.select("#inf").append("svg")
            .attr("width", svgSize[0])
            .attr("height", svgSize[1]);

        var scaleY = d3.scale.linear()
            .domain([0, d3.max(newdata, function(d){return d.VALUE;})])
            .range([0, svgSize[1]]);

        var scaleY2 = d3.scale.linear()
            .domain([0 , d3.max(newdata, function(d){return d.VALUE;})])
            .range(["green", "orange"]);

        svg.selectAll("rect")
            .data(newdata)
          .enter()
          .append("rect")
            .attr("x", function(d){return (d.YEAR -1990)*20;})
            .attr("y", function(d){return svgSize[1]-scaleY(d.VALUE);})
            .attr("height", function(d){return scaleY(d.VALUE);})
            .attr("width", 15)
            .attr("style", function(d){return "fill:" + scaleY2(d.VALUE);});
    });

})();
