/**
 * Created by ruud on 20.06.14.
 */



(function () {
    var margin = {top: 10, right: 20, bottom: 30, left: 90},
        graphSize = [1000 - margin.left - margin.right, 700 - margin.top - margin.bottom],
        svg = d3.select("#inf").append("svg")
            .attr("width", graphSize[0] + margin.left + margin.right)
            .attr("height", graphSize[1] + margin.top + margin.bottom),
        graph = svg.append("g")
            .attr("width", graphSize[0])
            .attr("height", graphSize[1])
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
        db = [];//database

    var allData = [];

    var dataConf = {
        name: "nrg_100a",
        filter: [
            ["A"],
            ["TJ"],
            ["0000", "2000"], //["2000", "3000", "4000", "5100", "5200", "5500", "6000", "7200"],
            ["B_100900"],
            ["EU28", "DE", "NL"],
            []
        ],
        startYear: undefined,
        endYear: undefined
    };

    fetchAndDisplay(dataConf);

    function dataUrl(dataConfig) {
        //Returns URL to obtain dataset as defined in config object.
        var url = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/" + dataConfig.name + "/";
        var filter = dataConfig.filter.map(function(d){return d.join("+");}).join(".");
        var period = "";
        if (!isNaN(dataConfig.startYear)) period = "startPeriod=" + dataConfig.startYear;
        if (!isNaN(dataConfig.endYear)) {
            if (period) period += "&";
            period += "endPeriod=" + dataConfig.endYear;
        }
        if (period) period = "?" + period;
        return url + filter + period;
    }

    function parseXmldata(xml){
        var xmlData = [],                   //data series as in xml file
            newData = [],                   //data series as wanted
            converter = new X2JS();

        xmlData = converter.xml2json(xml);
        if (!("GenericData" in xmlData)) throw "Unexpected xml document; node 'GenericData' not found";
        if (!("DataSet" in xmlData.GenericData)) {
            if (!("Footer" in xmlData.GenericData && "Message" in xmlData.GenericData.Footer && "Text" in xmlData.GenericData.Footer.Message)) throw "Unexpected xml document; nodes 'GenericData/DataSet'  AND 'GenericData/Footer/Message/Text' not found.";
            else throw "Unexpected xml document; message from server:\n" + xmlData.GenericData.Footer.Message.Text.join('\n');
        }
        xmlData = xmlData.GenericData.DataSet.Series;      //chop off uninteresting part

        if ("SeriesKey" in xmlData) xmlData = [xmlData];                 //fix: problem with array if only 1 country
        xmlData.forEach(function (d) {
            //get all data that remains the same (=unit, country, product, indic_nrg, ...)
            var v_base = {};
            d.SeriesKey.Value.forEach(function (skv) {
                //if (skv._id !== "UNIT" && skv._id !== "FREQ")
                v_base[skv._id] = skv._value;
            }); //leave out unit and frequency
            d.Obs.forEach(function (o) {
                var v = {};
                $.extend(v, v_base);
                v.YEAR = Number(o.ObsDimension._value);
                if ("Attributes" in o && "Value" in o["Attributes"] && "_id" in o["Attributes"]["Value"] && o["Attributes"]["Value"]["_id"] === "OBS_STATUS") {
                    v.VALUE = (o["Attributes"]["Value"]["_value"] === "na" ? null : 0); //value unknown or (practically) zero.
                } else {
                    v.VALUE = o.ObsValue._value;
                    if (!isNaN(v.VALUE)) { //on this value there might be a flag. If so, it should be tested which one and what it means (TODO)
                        v.VALUE = Number(v.VALUE);
                    } else {
                        var b = "alert";
                    }
                }
                newData.push(v);
            });
        });

        return newData;

    }

    function makeGraph(geo) {
        var data = filterData(geo),
            yDomain = [
                Math.min(0, d3.min(data, function (d) {return d.VALUE;})),
                Math.max(0, d3.max(data, function (d) {return d.VALUE;}))
            ],
            yRange = [graphSize[1], 0],
            xDomain = [
                d3.min(data, function (d) {return d.YEAR;})-0.5,
                d3.max(data, function (d) {return d.YEAR;})+0.5
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
            .attr("x", function(d){return xScale(d.YEAR-0.5*xBarFillRatio);})
            .attr("y", function(d){return yScale(d.VALUE);})
            .attr("height", function(d){return graphSize[1] - yScale(d.VALUE);})
            .attr("width", function(d){return xScale(d.YEAR+0.5*xBarFillRatio) - xScale(d.YEAR-0.5*xBarFillRatio);})
            .attr("style", function(d){return "fill:" + yColorScale(d.VALUE);})
          .append("svg:title")
            .text(function(d){return d.GEO + "     " + d.YEAR + "\nProduct: " + d.PRODUCT + "\n" + d.VALUE + " TJ/a";});

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

    function filterData(geo) {
        var filteredData = [];
        allData.forEach(function (d){
            if ($.inArray(d.GEO, geo) > -1) filteredData.push(d);
        });
        return filteredData;
    }

    function fetchAndDisplay(dataConfig) {
        var url = dataUrl(dataConfig);

        //url = "nrg_100a_A.TJ.0000.B_100100.DE+NL._ALL_startPeriod=1990_endPeriod=2020.xml"

        d3.xml(url, function (error, xml) {

            if (error) throw (error);
            allData = parseXmldata(xml);
            makeGraph(["NL", "DE"]);
        });
    }

})();
