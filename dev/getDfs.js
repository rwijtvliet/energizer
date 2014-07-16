/**
 * Created by ruud on 28.06.14.
 *
 * Purpose: get description of all dataflows available from Eurostat server and extract most important information.
 *
 * To continue with getDsds.js, save the outcome of the automatically filtered dataflow object 'dfs1' and/or 'dfs2' to a json file.
 *
 *
 */


(function () {

    var dfsUrl = "data/all_latest_ESTAT_references=none_detail=full.xml", //"http://www.ec.europa.eu/eurostat/SDMX/diss-web/rest/dataflow/ESTAT/all/latest"
        dfsCustomfilterUrl = "data/dfsCustomfilter.json",//user-defined array of dataflownames
        dfsXml = {},//all dataflow data in xml file
        dfs0 = [],//dataflows, parsed
        dfs1 = [],//dataflows, parsed and filtered once, automatically (with only possibly useful dataflows)
        dfs2 = [],//dataflows, parsed and filtered again, custom (to include only dataflows wanted by user)
        div = d3.select("body").append("div");

    d3.xml(dfsUrl, function(error, xml) {

        if (error) throw error;

        div.append("h1").text("Tables ('Dataflows') available from Eurostat");

        var converter = new X2JS();
        dfsXml = converter.xml2json(xml);

        //div.append("h2").text("Json of all data present in xml file");
        //div.append("p").text(JSON.stringify(dfsXml));

        //Parse.
        dfsXml.Structure.Structures.Dataflows.Dataflow.forEach(function(d) {
            var t = {
                name: d._id,
                descrs: []
            };
            d.Name.forEach(function(n){
                t.descrs.push({descr: n.__text, descrlan: n["_xml:lang"]});
            });
            dfs0.push(t);
        });

        div.append("h2").text("Json of most important data in xml file (selected parts of important nodes); all dataflows");
        //div.append("p").text(JSON.stringify(dfs0));

        //Automatic filter.
        dfs0.forEach(function(df0){
            var added = false;
            if ((df0.name.indexOf("nrg") > -1) || (df0.name.indexOf("pop") > -1) || (df0.name.indexOf("demo") > -1) || (df0.name.indexOf("gdp") > -1)) dfs1.push(df0);
            else {
                df0.descrs.forEach(function(descr) {
                    if (!added && inStr(descr.descr, ["energy", "climate", "carbon", "CO2", "inhabit", "citiz", "populati", "economic outp", "gross domestic", "demogr", "census"])) {
                        dfs1.push(df0);
                        added = true;
                    }
                });
            }
        });

        div.append("h2").text("Json of most important data in xml file (selected parts of important nodes); automatically filtered dataflows");
        //div.append("p").text(JSON.stringify(dfs1));

        //Custom filter.
        d3.json(dfsCustomfilterUrl, function(error, dfs3Names){
            if (error) return;

            dfs1.forEach(function(df1){
                if (dfs3Names.indexOf(df1.name) > -1) dfs2.push(df1);
            });

            div.append("h2").text("Json of most important data in xml file (selected parts of important nodes); custom filtered dataflows");
            div.append("p").text(JSON.stringify(dfs2));
        });

    });
    function inStr(toSearch, toFind) {
        if (typeof(toFind) == "String") toFind = [toFind];
        toFind.forEach(function(f){if (toSearch.indexOf(f) > -1) return true;});
        return false;
    }
})();

