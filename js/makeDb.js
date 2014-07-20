(function(){

var workOffline = true; //DEBUG; set to true to develop/test without live internet connection

var db = {};//database

var dataConfig = {
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


var margin = {top: 10, right: 20, bottom: 30, left: 90},
    graphSize = [1000 - margin.left - margin.right, 700 - margin.top - margin.bottom],
    svg = d3.select("#inf").append("svg")
        .attr("width", graphSize[0] + margin.left + margin.right)
        .attr("height", graphSize[1] + margin.top + margin.bottom),
    graph = svg.append("g")
        .attr("width", graphSize[0])
        .attr("height", graphSize[1])
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");







$("#geo").change(changeHandler).keypress(changeHandler);
$("#product").change(changeHandler).keypress(changeHandler);
function changeHandler() {
    dataConfig.filter[2] = $("#product").val();
    dataConfig.filter[4] = $("#geo").val();
    if (dataConfig.filter[2] !== null && dataConfig.filter[4] !== null) addToDb(dataConfig);
}

function addToDb (dataConf) {
    var tblName = dataConf.name,
        singleConfig, //config with only one exact records
        tbl,
        cnt=0;

    //Create (if necessary) and select table.
    if (!(tblName in db)) db[tblName] = TAFFY();
    tbl = db[tblName];

    console.log(JSON.stringify(dataConf)); //DEBUG
    //Check if data already exists, and only get from server if not.
    singleConfig = $.extend(true, {}, dataConf); //copy by value
    dataConf.filter[2].forEach(function(product){
        dataConf.filter[3].forEach(function(indic){
            dataConf.filter[4].forEach(function(geo){
                if (!(tbl({PRODUCT:product, INDIC_NRG: indic, GEO:geo}).count())) {
                    cnt++;
                    singleConfig.filter[2] = [product];
                    singleConfig.filter[3] = [indic];
                    singleConfig.filter[4] = [geo];
                    var url = dataUrl(singleConfig);
                    d3.xml(url, function (error, xml) {
                        var records;
                        if (error) throw (error);
                        records = parseXmldata(xml);
                        tbl.insert(records);
                        plotIfReady();
                    });
                }
            });
        });
    });
    plotIfReady();
    console.log(cnt + " requests needed to get the (missing) datasets in " + JSON.stringify(dataConf)); //DEBUG
}

function plotIfReady() {
    //Check data and plot/update graph.
    if (!allDataAvailable(dataConfig)) return false;

    var tblName = dataConfig.name,
        filter = {
            GEO: dataConfig.filter[4],
            INDIC_NRG: dataConfig.filter[3],
            PRODUCT: dataConfig.filter[2]
        },
        rst = db[tblName](filter),
        data = rst.get();
    console.log("found " + rst.count() + " records to plot: " + JSON.stringify(data));//DEBUG
    makeGraph(data);
}

function allDataAvailable (dataConf) {
    //Check if all data that is to be plotted is available for plotting.
    var tblName = dataConf.name,
        tbl = db[tblName],
        allAvailable = true;

    dataConf.filter[2].forEach(function(product){
        if (!allAvailable) return;//stop checking if data is already found missing
        dataConf.filter[3].forEach(function(indic){
            if (!allAvailable) return;
            dataConf.filter[4].forEach(function(geo){
                if (!allAvailable) return;
                if (!(tbl({PRODUCT:product, INDIC_NRG:indic, GEO:geo}).count())) allAvailable = false;
            });
        });
    });
    return allAvailable;
}


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
    url += filter + period;
    if (workOffline) url = "data/db/offline/" + dataConfig.name + "_" + filter + "_ALL.xml"; //DEBUG/dev
    return url;
}

function parseXmldata(xml){
    var xmlData, //data series as in xml file
        newData = [], //data series as wanted
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
                    throw "VALUE is NaN"
                }
            }
            newData.push(v);
        });
    });

    return newData;
}




function setupGraph () {

}



function makeGraph (data) {
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

})();