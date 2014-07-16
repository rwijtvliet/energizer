var db = {};

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

addToDb(dataConf);

function addToDb(dataConfig) {
    var tblName = dataConfig.name,
        tbl;
    if (!(tblName in db)) db[tblName] = TAFFY();

    tbl = db[tblName];

    var url = dataUrl(dataConfig);

    d3.xml(url, function (error, xml) {
        var records,
            msg ="";
        if (error) throw (error);
        records = parseXmldata(xml);
        tbl.insert(records);

        tbl().limit(4).each(function(r){msg += r.GEO + " " + r.YEAR + " " + r.VALUE + "\n"});
        alert (msg);

        alert (tbl().filter({GEO:"DE", PRODUCT:"0000"}).count());
        alert (tbl().filter({PRODUCT:"0000"}).count());
    });
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