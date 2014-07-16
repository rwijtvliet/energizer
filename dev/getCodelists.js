/**
 * Created by ruud on 28.06.14.
 *
 * Purpose: check 'data structure description' for most useful dataflows.
 *          extract which codes are valid and which code lists are shared by certain dataflows.
 *
 *
 *
 *
 */


(function () {

    var dsdsArrayUrl = "data/dsds2.json",//json created with getDsds.js
        codelistNames = ["GEO", "PRODUCT", "INDIC_NRG", "INDIC_EN", "INDIC_NA", "UNIT", "SEX", "AGE"],
        codelists = [],//for each codelistname, find the smallest common set of codes (so, the codes that are accepted by all)
        div = d3.select("body").append("div").append("p");

    d3.json(dsdsArrayUrl, function (error, dfs) {

        if (error) throw error;

        codelistNames.forEach(function(codelistName){
            codelists.push(getCodelistInfo(codelistName, dfs));
        });

        div.text(JSON.stringify(codelists));
    });

    function getCodelistInfo(codelistName, dfs) { //get the codelists with 'codelistName', that contains all the codecombinations in the array of (all) dataflows 'dfs'
        var dfCount = 0,
            codelistDfs = [],
            commonCodes = [],
            commonCodeNames = [];

        dfs.forEach(function (df) { //each df (with dsd)

            var codes, //the codes (objects with name and descr) that belong to the codelist (if one exists for the given df)
                codeNames; //the codes (only the code names) that belong to the codelist

            try {codes = $.grep(df.dsd.codelists, function (e) {return e.name === codelistName;})[0].codes;}
            catch (e) {return;}

            dfCount++;
            codeNames = codes.map(function (e) {return e.name;});

            //See if this code combination reduces the common set of codes by not having all codes.
            if (dfCount === 1) { //add first set
                commonCodes = codes;
            } else { //reduce existing set by comparing code names
                commonCodes = $.grep(commonCodes, function (e) {return ($.inArray(e.name, codeNames) > -1); });
            }
            codelistDfs.push({name: df.name, descr: df.descr});
        });

        //Find, for each df, the codes that are not in common set.
        commonCodeNames = commonCodes.map(function(c){return c.name;});
        codelistDfs.forEach(function(codelistDf){
            var dsd = $.grep(dfs, function(df) {return (df.name === codelistDf.name);})[0].dsd,
                codes = $.grep(dsd.codelists, function(e) {return (e.name === codelistName);})[0].codes;

            codelistDf.uncommonCodes = $.grep(codes, function(c) {return ($.inArray(c.name, commonCodeNames)===-1);});
        });

        return {
            name: codelistName,
            dfCount: dfCount,
            commonCodes: commonCodes,
            dfs: codelistDfs
        };
    }

    function arraysEqual(arr1, arr2) {
        return ($(arr1).not(arr2).length == 0 && $(arr2).not(arr1).length == 0);
    }
})();

