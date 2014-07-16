/**
 * Created by ruud on 28.06.14.
 *
 * Purpose: get 'data structure description' for dataflows from Eurostat server and extract most important information.
 *
 * Point dfsArrayUrl to one of the 'dfs' objects that were created in getDfs.js.
 * To continue with getCodelists.js, save the outcome of 'dsds' to a json file.
 *
 *
 */


(function () {

    var dfsArrayUrl = "data/dfs2.json",//json created with getDfs.js (with content of 'dfs1' or of 'dfs2'. 'dfs0' would be too large.)
        dsds = [],
        div = d3.select("body").append("div").append("p");

    d3.json(dfsArrayUrl, function (error, dfs) {

        if (error) throw error;

        dfs.forEach(function(d){
            var df = {}; //necessary to detach df
            df.name = d.name;
            df.descr = d.descrs[0].descr;
            getDsd(df); //TODO: try getDsd({name: df.name, descr: df.descrs[0].descr})
        });
    });

    function getDsd(df) {
        /* Returns DSD of specific dataflow */

        d3.xml("http://ec.europa.eu/eurostat/SDMX/diss-web/rest/datastructure/ESTAT/DSD_" + df.name, function (error, xml) {
            if (error) throw error;

            var dsdXml,                    //all dsd data in xml file
                dsd,                       //parsed
                converter = new X2JS();

            dsdXml = converter.xml2json(xml);

            //Parse.
            dsd = {
                dimensions: [],
                concepts: [],
                codelists: []
            };
            dsdXml.Structure.Structures.DataStructures.DataStructure.DataStructureComponents.DimensionList.Dimension.forEach(function(dim) {
                dsd.dimensions[+(dim._position) - 1] = dim._id;
            });
            var t = dsdXml.Structure.Structures.DataStructures.DataStructure.DataStructureComponents.DimensionList.TimeDimension;
            dsd.dimensions[+(t._position) - 1] = t._id;
            dsdXml.Structure.Structures.Concepts.ConceptScheme.Concept.forEach(function(con) {
                dsd.concepts.push({
                    name: con._id,
                    descr: con.Description.__text
                });
            });
            dsdXml.Structure.Structures.Codelists.Codelist.forEach(function (clist) {
                var codes = [];
                if (!(clist.Code instanceof Array)) clist.Code = [clist.Code];
                clist.Code.forEach(function(d2){
                    codes.push({
                        name: d2._id,
                        descr: d2.Name.__text
                    });
                });
                dsd.codelists.push({
                    name: clist.Name.__text,
                    codes: codes
                });
            });

            df.dsd = dsd;
            dsds.push(df);

            div.text(JSON.stringify(dsds));
        });

    }
})();

