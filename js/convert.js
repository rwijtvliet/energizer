/**
 * Created by ruud on 20.06.14.
 */



(function () {
    var margin = {top: 10, right: 20, bottom: 30, left: 90},
        graphSize = [1000 - margin.left - margin.right, 700 - margin.top - margin.bottom];

    var svg = d3.select("#inf").append("svg")
        .attr("width", graphSize[0] + margin.left + margin.right)
        .attr("height", graphSize[1] + margin.top + margin.bottom);


    d3.xml("data/nrg_100a_A.TJ.0000.B_100100.DE._ALL_startPeriod=1990_endPeriod=2020.xml" , function (error, xml) {
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000...?startPeriod=1980&endPeriod=2006"//very large file
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000.B_100100.DE.?startPeriod=1990&endPeriod=2020"
        //"http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/nrg_100a/A.TJ.0000+2000+3000.B_100100.."
        var div = d3.select("#inf");

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

        makeGraph(newdata);

    });

    function makeGraph(data) {
        var graph = svg.append("g")
            .attr("width", graphSize[0])
            .attr("height", graphSize[1])
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var yDomain = [
                Math.min(0, d3.min(data, function (d) {return d.VALUE;})),
                Math.max(0, d3.max(data, function (d) {return d.VALUE;}))
            ],
            yRange = [graphSize[1], 0],
            xDomain = [
                d3.min(data, function (d) {return d.YEAR;})-0.5,
                d3.max(data, function (d) {return d.YEAR;})+0.5
            ],
            xRange = [0, graphSize[0]],
            xScale = d3.scale.linear()
                .domain(xDomain)
                .range(xRange),
            yScale = d3.scale.linear()
                .domain(yDomain)
                .range(yRange),
            yColorScale = d3.scale.linear()
                .domain(yDomain)
                .range(["green", "orange"]),
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickFormat(d3.format("0000")),
            yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left");

        //Add bars
        graph.append("g")
            .attr("class", "bars")
          .selectAll(".bar")
            .data(data)
          .enter()
          .append("rect")
            .attr("class", "bar")
            .attr("x", function(d){return xScale(d.YEAR)-15;})
            .attr("y", function(d){return yScale(d.VALUE);})
            .attr("height", function(d){return graphSize[1] - yScale(d.VALUE);})
            .attr("width", 30);
            //.attr("style", function(d){return "fill:" + yColorScale(d.VALUE);});

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
            .text("\u00D7 1000000 TJ");

    }

})();
