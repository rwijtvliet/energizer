function eurostatDb() {
    var esDb = {},
        dfsQ,
        dsdQs = {},
        tblQs = {},
        tbls = {};
    esDb.dfsQ = function(filter) {
        var url = "js/all_latest_ESTAT_references=none_detail=full.xml";
        dfsQ = new Promise(function(resolve, reject) {
            $.get(url).done(function(xml) {
                var dfs = parseDfsXml(xml, filter);
                resolve($.extend(true, [], dfs));
            }).fail(function(xhr, textStatus, error) {
                reject(Error(error.toString()));
            });
        });
        return dfsQ;
    };
    function parseDfsXml(xml, filter) {
        var dfsXml,
            dfs = [],
            converter = new X2JS();
        dfsXml = converter.xml2json(xml);
        dfsXml["Structure"]["Structures"]["Dataflows"]["Dataflow"].forEach(function(d) {
            var df = {
                    name: d["_id"],
                    descrs: []
                },
                add = true;
            d["Name"].forEach(function(n) {
                switch (n["_xml:lang"]) {
                    case "en":
                        df.descrs[0] = n["__text"];
                        break;
                    case "de":
                        df.descrs[1] = n["__text"];
                        break;
                    case "fr":
                        df.descrs[2] = n["__text"];
                        break;
                }
            });
            if (filter) {
                add = false;
                [].concat(filter).forEach(function(filterTerm) {
                    if (add)
                        return;
                    if (df.name.toLowerCase().indexOf(filterTerm.toLowerCase()) > -1)
                        add = true;
                    df.descrs.forEach(function(descr) {
                        if (descr.toLowerCase().indexOf(filterTerm.toLowerCase()) > -1)
                            add = true;
                    });
                });
            }
            if (add)
                dfs.push(df);
        });
        return dfs;
    }
    esDb.dsdQnames = function() {
        return Object.keys(dsdQs);
    };
    esDb.dsdQ = function(name) {
        if (dsdQs.hasOwnProperty(name))
            return dsdQs[name];
        var url = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/datastructure/ESTAT/DSD_" + name;
        dsdQs[name] = new Promise(function(resolve, reject) {
            $.get(url).done(function(xml) {
                var dsd = parseDsdXml(xml);
                dsd.name = name;
                dsd.codelist = codelist;
                dsd.codelistDict = codelistDict;
                resolve(dsd);
            }).fail(function(xhr, textStatus, error) {
                reject(Error(error.toString()));
            });
        });
        return dsdQs[name];
    };
    function parseDsdXml(xml) {
        var dsdXml,
            dsd = {
                name: name,
                dimensions: [],
                concepts: [],
                codelists: [],
                codelist: codelist,
                codelistDict: codelistDict
            },
            converter = new X2JS(),
            renameCodelists = {
                "Observation flag.": "OBS_FLAG",
                "Observation status.": "OBS_STATUS"
            };
        dsdXml = converter.xml2json(xml);
        [].concat(dsdXml["Structure"]["Structures"]["DataStructures"]["DataStructure"]["DataStructureComponents"]["DimensionList"]["Dimension"]).forEach(function(dim) {
            dsd.dimensions[+(dim._position) - 1] = dim["_id"];
        });
        var t = dsdXml["Structure"]["Structures"]["DataStructures"]["DataStructure"]["DataStructureComponents"]["DimensionList"]["TimeDimension"];
        var timePos = +(t["_position"]) - 1;
        dsd.dimensions[timePos] = t["_id"];
        if (timePos !== dsd.dimensions.length - 1) {
            var timeDim = dsd.dimensions.splice(timePos, 1)[0];
            dsd.dimensions.push(timeDim);
        }
        [].concat(dsdXml["Structure"]["Structures"]["Concepts"]["ConceptScheme"]["Concept"]).forEach(function(con) {
            dsd.concepts.push(con["_id"]);
        });
        [].concat(dsdXml["Structure"]["Structures"]["Codelists"]["Codelist"]).forEach(function(clist) {
            var codes = [];
            [].concat(clist["Code"]).forEach(function(code) {
                codes.push({
                    name: code["_id"],
                    descr: code["Name"]["__text"]
                });
            });
            var name = clist["Name"]["__text"];
            if (renameCodelists.hasOwnProperty(name))
                name = renameCodelists[name];
            dsd.codelists.push({
                name: name,
                codes: codes
            });
        });
        return dsd;
    }
    function codelist(fldName) {
        if (!fldName)
            return this.codelists;
        else {
            var codelist = $.grep(this.codelists, function(codelist) {
                return codelist.name === fldName;
            });
            if (!codelist.length)
                throw Error("Fieldname " + fldName + " not found");
            return codelist[0].codes;
        }
    }
    function codelistDict(fldName) {
        var dict = {};
        if (!fldName) {
            var fldNames = this.codelists.map(function(codelist) {
                return codelist.name;
            });
            fldNames.forEach(function(fldName) {
                dict[fldName] = codelistDict(fldName);
            });
        } else {
            var codelist = $.grep(this.codelists, function(codelist) {
                return codelist.name === fldName;
            });
            if (!codelist.length)
                throw Error("Fieldname " + fldName + " not found");
            codelist[0].codes.forEach(function(code) {
                dict[code.name] = code.descr;
            });
        }
        return dict;
    }
    esDb.codelistDict = function(name, fldName) {
        var dict = {};
        if (!name) {
            var names = dsds.map(function(dsd) {
                return dsd.name;
            });
            names.forEach(function(name) {
                dict[name] = esDb.codelistDict(name);
            });
        } else if (!fldName) {
            try {
                var fldNames = getDsd(name).codelists.map(function(codelist) {
                    return codelist.name;
                });
                fldNames.forEach(function(fldName) {
                    dict[fldName] = esDb.codelistDict(name, fldName);
                });
            } catch (e) {
                throw Error("Dsd for " + name + " not found");
            }
        } else {
            try {
                var codes = $.grep(getDsd(name).codelists, function(codelist) {
                    return codelist.name === fldName;
                })[0].codes;
                codes.forEach(function(code) {
                    dict[code.name] = code.descr;
                });
            } catch (e) {
                throw Error("Dsd for " + name + ", or fieldname " + fldName + " not found");
            }
        }
        return dict;
    };
    esDb.tblQ = function(name) {
        if (tblQs.hasOwnProperty(name))
            return tblQs[name];
        else
            return undefined;
    };
    esDb.tblQinit = function(name, fixDimFilter, timePeriod) {
        var n = arguments.length;
        if (n === 2 && (arguments[1].hasOwnProperty("startYear") || arguments[1].hasOwnProperty("endYear"))) {
            timePeriod = arguments[1];
            fixDimFilter = undefined;
        }
        if (fixDimFilter && !Object.keys(fixDimFilter).length)
            fixDimFilter = undefined;
        if (timePeriod && !Object.keys(timePeriod).length)
            timePeriod = undefined;
        if (tblQs.hasOwnProperty(name))
            delete tblQs[name];
        tblQs[name] = new Promise(function(resolve, reject) {
            var tbl = {
                name: name,
                fixDims: [],
                fixDimFilter: {},
                varDims: [],
                fields: [],
                fieldsInput: [],
                fieldsOutput: [],
                data: TAFFY()
            };
            esDb.dsdQ(name).then(function(dsd) {
                tbl.dsd = dsd;
                dsd.dimensions.forEach(function(dim) {
                    if (dim === "TIME_PERIOD")
                        return;
                    if (fixDimFilter && fixDimFilter.hasOwnProperty(dim)) {
                        tbl.fixDims.push(dim);
                        tbl.fixDimFilter[dim] = fixDimFilter[dim];
                    } else
                        tbl.varDims.push(dim);
                });
                var period = "";
                if (timePeriod) {
                    if (!isNaN(timePeriod.startYear))
                        period = "startPeriod=" + timePeriod.startYear;
                    if (!isNaN(timePeriod.endYear)) {
                        if (period)
                            period += "&";
                        period += "endPeriod=" + timePeriod.endYear;
                    }
                    if (period)
                        period = "/?" + period;
                }
                tbl.fixDims.push("TIME_PERIOD");
                tbl.fixDimFilter["TIME_PERIOD"] = period;
                dsd.concepts.forEach(function(con) {
                    if (tbl.fixDims.indexOf(con) === -1) {
                        tbl.fields.push(con);
                        if (tbl.varDims.indexOf(con) > -1 || con === "TIME" || con === "PERIOD")
                            tbl.fieldsInput.push(con);
                        else
                            tbl.fieldsOutput.push(con);
                    }
                });
                tbls[name] = tbl;
                resolve(tbl);
            });
        });
        return tblQs[name];
    };
    esDb.tblQNames = function() {
        return Object.keys(tblQs);
    };
    esDb.dataQ = function(name, varDimFilters) {
        if (!tblQs.hasOwnProperty(name))
            throw Error("Table (or promise to table) '" + name + "' has not been found.");
        var dataQ = new Promise(function(resolve, reject) {
            var fetchedData = [],
                inflight = 0;
            function checkFinished() {
                if (!inflight)
                    resolve(fetchedData);
            }
            tblQs[name].then(function(tbl) {
                [].concat(varDimFilters).forEach(function(varDimFilter) {
                    singlevalFilters(varDimFilter).forEach(function(filter) {
                        if (tbl.data(fieldFilter(filter)).count())
                            return;
                        var url = dataUrl(tbl, filter);
                        inflight++;
                        $.get(url).done(function(xml) {
                            console.log(url);
                            try {
                                var records = parseDataXml(xml, tbl.fields);
                                if (records) {
                                    if (tbl.data(fieldFilter(filter)).count())
                                        return;
                                    tbl.data.insert(records);
                                    fetchedData = fetchedData.concat(records);
                                }
                            } catch (e) {
                                reject(e);
                            }
                        }).fail(function(xhr, textStatus, error) {
                            reject(error);
                        }).always(function() {
                            inflight--;
                            checkFinished();
                        });
                    });
                });
                checkFinished();
            });
        });
        return dataQ;
    };
    function dataUrl(tbl, varDimFilter) {
        var url = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/" + tbl.name + "/",
            dimVals = [],
            dimString;
        tbl.dsd.dimensions.forEach(function(dim) {
            var dimVal;
            if (tbl.fixDimFilter.hasOwnProperty(dim))
                dimVal = tbl.fixDimFilter[dim];
            else if (varDimFilter.hasOwnProperty(dim))
                dimVal = varDimFilter[dim];
            else
                throw Error("Value for dimension '" + dim + "' (in table definition) given neither by table definition nor by the user. Use '' (empty string) to get all possible values for this dimension.");
            dimVals.push([].concat(dimVal));
        });
        dimString = dimVals.map(function(e) {
            return e.join("+");
        }).join(".");
        url += dimString;
        return url;
    }
    function parseDataXml(xml, fields) {
        var xmlData,
            newData = [],
            converter = new X2JS(),
            errText;
        xmlData = converter.xml2json(xml);
        if (!xmlData.hasOwnProperty("GenericData"))
            throw Error("Unexpected xml document; node 'GenericData' not found");
        if (!xmlData["GenericData"].hasOwnProperty("DataSet")) {
            if (!xmlData["GenericData"].hasOwnProperty("Footer") || !xmlData["GenericData"]["Footer"].hasOwnProperty("Message") || !xmlData["GenericData"]["Footer"]["Message"].hasOwnProperty("Text"))
                throw Error("Unexpected xml document; nodes 'GenericData/DataSet'  AND 'GenericData/Footer/Message/Text' not found.");
            else {
                errText = [].concat(xmlData["GenericData"]["Footer"]["Message"]["Text"]).map(function(t) {
                    return t["__text"];
                }).join(", ");
                throw Error(errText);
            }
        }
        if (!xmlData["GenericData"]["DataSet"].hasOwnProperty("Series")) {
            errText = [].concat(xmlData["GenericData"]["Footer"]["Message"]["Text"]).map(function(t) {
                return t["__text"];
            }).join(", ");
            if (errText === "No Results Found")
                return [];
            else
                throw Error("Too many records to add immediately. (" + errText + ") Try again with more narrow query.");
        }
        xmlData = xmlData["GenericData"]["DataSet"]["Series"];
        [].concat(xmlData).forEach(function(d) {
            var v_base = {};
            d["SeriesKey"]["Value"].forEach(function(skv) {
                var key = skv["_id"];
                if (fields.indexOf(key) > -1)
                    v_base[key] = skv["_value"];
            });
            [].concat(d["Obs"]).forEach(function(o) {
                var v = $.extend({}, v_base);
                v.TIME = Number(o["ObsDimension"]["_value"]);
                if (o.hasOwnProperty("Attributes") && o["Attributes"].hasOwnProperty("Value") && o["Attributes"]["Value"].hasOwnProperty("_id") && o["Attributes"]["Value"]["_id"] === "OBS_STATUS") {
                    v.OBS_STATUS = o["Attributes"]["Value"]["_value"];
                    v.OBS_VALUE = v.OBS_STATUS === "na" ? null : 0;
                } else {
                    v.OBS_VALUE = o["ObsValue"]["_value"];
                    if (v.OBS_VALUE === "NaN")
                        v.OBS_VALUE = null;
                    else if (!isNaN(v.OBS_VALUE))
                        v.OBS_VALUE = Number(v.OBS_VALUE);
                    else
                        throw Error("OBS_VALUE has unexpected value '" + v.OBS_VALUE + "' for dimensions " + JSON.stringify(v));
                }
                if (o.hasOwnProperty("Attributes") && o["Attributes"].hasOwnProperty("Value") && o["Attributes"]["Value"].hasOwnProperty("_id") && o["Attributes"]["Value"]["_id"] === "OBS_FLAG") {
                    v.OBS_FLAG = o["Attributes"]["Value"]["_value"];
                }
                newData.push(v);
            });
        });
        return newData;
    }
    function rst(tbl, fieldFilter, order) {
        order = order || "TIME asec";
        fieldFilter = $.extend(true, {}, fieldFilter);
        Object.keys(fieldFilter).forEach(function(fld) {
            if (tbl.fields.indexOf(fld) === -1)
                throw Error("Unknown fieldname '" + fld + "' present in filter.");
            if (fieldFilter[fld] === "")
                delete fieldFilter[fld];
        });
        return tbl.data(fieldFilter).order(order).get();
    }
    esDb.rst = function(name, fieldFilter, order) {
        if (!tbls.hasOwnProperty(name))
            throw Error("Table '" + name + "' has not been found.");
        return rst(tbls[name], fieldFilter, order);
    };
    esDb.rstQ = function(name, fieldFilter, order) {
        if (!tblQs.hasOwnProperty(name))
            throw Error("Table (or promise to table) '" + name + "' has not been found.");
        var rstQ = new Promise(function(resolve, reject) {
            tblQs[name].then(function(tbl) {
                esDb.dataQ(tbl.name, varDimFilter(tbl.varDims, fieldFilter)).then(function() {
                    resolve(rst(tbl, fieldFilter, order));
                }).catch(function(error) {
                    reject(error);
                });
            });
        });
        return rstQ;
    };
    function varDimFilter(varDims, fieldFilter) {
        var varDimFilter = {};
        varDims.forEach(function(dim) {
            if (!fieldFilter)
                varDimFilter[dim] = "";
            else {
                var val = fieldFilter[dim];
                if (!val || $.isPlainObject(val))
                    varDimFilter[dim] = "";
                else
                    varDimFilter[dim] = val;
            }
        });
        return varDimFilter;
    }
    function fieldFilter(varDimFilter) {
        var fieldFilter = {};
        Object.keys(varDimFilter).forEach(function(dim) {
            var val = varDimFilter[dim];
            if (val !== "")
                fieldFilter[dim] = val;
        });
        return fieldFilter;
    }
    function allPropValCombinations(obj) {
        var obj = $.extend({}, obj),
            keys = Object.keys(obj);
        if (keys.length == 0) {
            return [{}];
        } else {
            var result = [],
                key = keys[0],
                arr = pop(obj, key)[key],
                restCombinations = allPropValCombinations(obj);
            for (var i = 0; i < restCombinations.length; i++) {
                if (!(arr instanceof Array))
                    arr = [arr];
                for (var j = 0; j < arr.length; j++) {
                    var objToAdd = $.extend({}, restCombinations[i]);
                    objToAdd[key] = arr[j];
                    result.push(objToAdd);
                }
            }
            return result;
        }
    }
    function singlevalFilters(multivalFilter) {
        return allPropValCombinations(multivalFilter);
    }
    function pop(obj, key) {
        var value = {};
        value[key] = obj[key];
        delete obj[key];
        return value;
    }
    return esDb;
}
System.register("../../ES6/eurostatDb", [], function() {
    "use strict";
    var __moduleName = "../../ES6/eurostatDb";
    function eurostatDb() {
        var esDb = {},
            dfsQ,
            dsdQs = {},
            tblQs = {},
            tbls = {};
        esDb.dfsQ = function(filter) {
            var url = "js/all_latest_ESTAT_references=none_detail=full.xml";
            dfsQ = new Promise(function(resolve, reject) {
                $.get(url).done(function(xml) {
                    var dfs = parseDfsXml(xml, filter);
                    resolve($.extend(true, [], dfs));
                }).fail(function(xhr, textStatus, error) {
                    reject(Error(error.toString()));
                });
            });
            return dfsQ;
        };
        function parseDfsXml(xml, filter) {
            var dfsXml,
                dfs = [],
                converter = new X2JS();
            dfsXml = converter.xml2json(xml);
            dfsXml["Structure"]["Structures"]["Dataflows"]["Dataflow"].forEach(function(d) {
                var df = {
                        name: d["_id"],
                        descrs: []
                    },
                    add = true;
                d["Name"].forEach(function(n) {
                    switch (n["_xml:lang"]) {
                        case "en":
                            df.descrs[0] = n["__text"];
                            break;
                        case "de":
                            df.descrs[1] = n["__text"];
                            break;
                        case "fr":
                            df.descrs[2] = n["__text"];
                            break;
                    }
                });
                if (filter) {
                    add = false;
                    [].concat(filter).forEach(function(filterTerm) {
                        if (add)
                            return;
                        if (df.name.toLowerCase().indexOf(filterTerm.toLowerCase()) > -1)
                            add = true;
                        df.descrs.forEach(function(descr) {
                            if (descr.toLowerCase().indexOf(filterTerm.toLowerCase()) > -1)
                                add = true;
                        });
                    });
                }
                if (add)
                    dfs.push(df);
            });
            return dfs;
        }
        esDb.dsdQnames = function() {
            return Object.keys(dsdQs);
        };
        esDb.dsdQ = function(name) {
            if (dsdQs.hasOwnProperty(name))
                return dsdQs[name];
            var url = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/datastructure/ESTAT/DSD_" + name;
            dsdQs[name] = new Promise(function(resolve, reject) {
                $.get(url).done(function(xml) {
                    var dsd = parseDsdXml(xml);
                    dsd.name = name;
                    dsd.codelist = codelist;
                    dsd.codelistDict = codelistDict;
                    resolve(dsd);
                }).fail(function(xhr, textStatus, error) {
                    reject(Error(error.toString()));
                });
            });
            return dsdQs[name];
        };
        function parseDsdXml(xml) {
            var dsdXml,
                dsd = {
                    name: name,
                    dimensions: [],
                    concepts: [],
                    codelists: [],
                    codelist: codelist,
                    codelistDict: codelistDict
                },
                converter = new X2JS(),
                renameCodelists = {
                    "Observation flag.": "OBS_FLAG",
                    "Observation status.": "OBS_STATUS"
                };
            dsdXml = converter.xml2json(xml);
            [].concat(dsdXml["Structure"]["Structures"]["DataStructures"]["DataStructure"]["DataStructureComponents"]["DimensionList"]["Dimension"]).forEach(function(dim) {
                dsd.dimensions[+(dim._position) - 1] = dim["_id"];
            });
            var t = dsdXml["Structure"]["Structures"]["DataStructures"]["DataStructure"]["DataStructureComponents"]["DimensionList"]["TimeDimension"];
            var timePos = +(t["_position"]) - 1;
            dsd.dimensions[timePos] = t["_id"];
            if (timePos !== dsd.dimensions.length - 1) {
                var timeDim = dsd.dimensions.splice(timePos, 1)[0];
                dsd.dimensions.push(timeDim);
            }
            [].concat(dsdXml["Structure"]["Structures"]["Concepts"]["ConceptScheme"]["Concept"]).forEach(function(con) {
                dsd.concepts.push(con["_id"]);
            });
            [].concat(dsdXml["Structure"]["Structures"]["Codelists"]["Codelist"]).forEach(function(clist) {
                var codes = [];
                [].concat(clist["Code"]).forEach(function(code) {
                    codes.push({
                        name: code["_id"],
                        descr: code["Name"]["__text"]
                    });
                });
                var name = clist["Name"]["__text"];
                if (renameCodelists.hasOwnProperty(name))
                    name = renameCodelists[name];
                dsd.codelists.push({
                    name: name,
                    codes: codes
                });
            });
            return dsd;
        }
        function codelist(fldName) {
            if (!fldName)
                return this.codelists;
            else {
                var codelist = $.grep(this.codelists, function(codelist) {
                    return codelist.name === fldName;
                });
                if (!codelist.length)
                    throw Error("Fieldname " + fldName + " not found");
                return codelist[0].codes;
            }
        }
        function codelistDict(fldName) {
            var dict = {};
            if (!fldName) {
                var fldNames = this.codelists.map(function(codelist) {
                    return codelist.name;
                });
                fldNames.forEach(function(fldName) {
                    dict[fldName] = codelistDict(fldName);
                });
            } else {
                var codelist = $.grep(this.codelists, function(codelist) {
                    return codelist.name === fldName;
                });
                if (!codelist.length)
                    throw Error("Fieldname " + fldName + " not found");
                codelist[0].codes.forEach(function(code) {
                    dict[code.name] = code.descr;
                });
            }
            return dict;
        }
        esDb.codelistDict = function(name, fldName) {
            var dict = {};
            if (!name) {
                var names = dsds.map(function(dsd) {
                    return dsd.name;
                });
                names.forEach(function(name) {
                    dict[name] = esDb.codelistDict(name);
                });
            } else if (!fldName) {
                try {
                    var fldNames = getDsd(name).codelists.map(function(codelist) {
                        return codelist.name;
                    });
                    fldNames.forEach(function(fldName) {
                        dict[fldName] = esDb.codelistDict(name, fldName);
                    });
                } catch (e) {
                    throw Error("Dsd for " + name + " not found");
                }
            } else {
                try {
                    var codes = $.grep(getDsd(name).codelists, function(codelist) {
                        return codelist.name === fldName;
                    })[0].codes;
                    codes.forEach(function(code) {
                        dict[code.name] = code.descr;
                    });
                } catch (e) {
                    throw Error("Dsd for " + name + ", or fieldname " + fldName + " not found");
                }
            }
            return dict;
        };
        esDb.tblQ = function(name) {
            if (tblQs.hasOwnProperty(name))
                return tblQs[name];
            else
                return undefined;
        };
        esDb.tblQinit = function(name, fixDimFilter, timePeriod) {
            var n = arguments.length;
            if (n === 2 && (arguments[1].hasOwnProperty("startYear") || arguments[1].hasOwnProperty("endYear"))) {
                timePeriod = arguments[1];
                fixDimFilter = undefined;
            }
            if (fixDimFilter && !Object.keys(fixDimFilter).length)
                fixDimFilter = undefined;
            if (timePeriod && !Object.keys(timePeriod).length)
                timePeriod = undefined;
            if (tblQs.hasOwnProperty(name))
                delete tblQs[name];
            tblQs[name] = new Promise(function(resolve, reject) {
                var tbl = {
                    name: name,
                    fixDims: [],
                    fixDimFilter: {},
                    varDims: [],
                    fields: [],
                    fieldsInput: [],
                    fieldsOutput: [],
                    data: TAFFY()
                };
                esDb.dsdQ(name).then(function(dsd) {
                    tbl.dsd = dsd;
                    dsd.dimensions.forEach(function(dim) {
                        if (dim === "TIME_PERIOD")
                            return;
                        if (fixDimFilter && fixDimFilter.hasOwnProperty(dim)) {
                            tbl.fixDims.push(dim);
                            tbl.fixDimFilter[dim] = fixDimFilter[dim];
                        } else
                            tbl.varDims.push(dim);
                    });
                    var period = "";
                    if (timePeriod) {
                        if (!isNaN(timePeriod.startYear))
                            period = "startPeriod=" + timePeriod.startYear;
                        if (!isNaN(timePeriod.endYear)) {
                            if (period)
                                period += "&";
                            period += "endPeriod=" + timePeriod.endYear;
                        }
                        if (period)
                            period = "/?" + period;
                    }
                    tbl.fixDims.push("TIME_PERIOD");
                    tbl.fixDimFilter["TIME_PERIOD"] = period;
                    dsd.concepts.forEach(function(con) {
                        if (tbl.fixDims.indexOf(con) === -1) {
                            tbl.fields.push(con);
                            if (tbl.varDims.indexOf(con) > -1 || con === "TIME" || con === "PERIOD")
                                tbl.fieldsInput.push(con);
                            else
                                tbl.fieldsOutput.push(con);
                        }
                    });
                    tbls[name] = tbl;
                    resolve(tbl);
                });
            });
            return tblQs[name];
        };
        esDb.tblQNames = function() {
            return Object.keys(tblQs);
        };
        esDb.dataQ = function(name, varDimFilters) {
            if (!tblQs.hasOwnProperty(name))
                throw Error("Table (or promise to table) '" + name + "' has not been found.");
            var dataQ = new Promise(function(resolve, reject) {
                var fetchedData = [],
                    inflight = 0;
                function checkFinished() {
                    if (!inflight)
                        resolve(fetchedData);
                }
                tblQs[name].then(function(tbl) {
                    [].concat(varDimFilters).forEach(function(varDimFilter) {
                        singlevalFilters(varDimFilter).forEach(function(filter) {
                            if (tbl.data(fieldFilter(filter)).count())
                                return;
                            var url = dataUrl(tbl, filter);
                            inflight++;
                            $.get(url).done(function(xml) {
                                console.log(url);
                                try {
                                    var records = parseDataXml(xml, tbl.fields);
                                    if (records) {
                                        if (tbl.data(fieldFilter(filter)).count())
                                            return;
                                        tbl.data.insert(records);
                                        fetchedData = fetchedData.concat(records);
                                    }
                                } catch (e) {
                                    reject(e);
                                }
                            }).fail(function(xhr, textStatus, error) {
                                reject(error);
                            }).always(function() {
                                inflight--;
                                checkFinished();
                            });
                        });
                    });
                    checkFinished();
                });
            });
            return dataQ;
        };
        function dataUrl(tbl, varDimFilter) {
            var url = "http://ec.europa.eu/eurostat/SDMX/diss-web/rest/data/" + tbl.name + "/",
                dimVals = [],
                dimString;
            tbl.dsd.dimensions.forEach(function(dim) {
                var dimVal;
                if (tbl.fixDimFilter.hasOwnProperty(dim))
                    dimVal = tbl.fixDimFilter[dim];
                else if (varDimFilter.hasOwnProperty(dim))
                    dimVal = varDimFilter[dim];
                else
                    throw Error("Value for dimension '" + dim + "' (in table definition) given neither by table definition nor by the user. Use '' (empty string) to get all possible values for this dimension.");
                dimVals.push([].concat(dimVal));
            });
            dimString = dimVals.map(function(e) {
                return e.join("+");
            }).join(".");
            url += dimString;
            return url;
        }
        function parseDataXml(xml, fields) {
            var xmlData,
                newData = [],
                converter = new X2JS(),
                errText;
            xmlData = converter.xml2json(xml);
            if (!xmlData.hasOwnProperty("GenericData"))
                throw Error("Unexpected xml document; node 'GenericData' not found");
            if (!xmlData["GenericData"].hasOwnProperty("DataSet")) {
                if (!xmlData["GenericData"].hasOwnProperty("Footer") || !xmlData["GenericData"]["Footer"].hasOwnProperty("Message") || !xmlData["GenericData"]["Footer"]["Message"].hasOwnProperty("Text"))
                    throw Error("Unexpected xml document; nodes 'GenericData/DataSet'  AND 'GenericData/Footer/Message/Text' not found.");
                else {
                    errText = [].concat(xmlData["GenericData"]["Footer"]["Message"]["Text"]).map(function(t) {
                        return t["__text"];
                    }).join(", ");
                    throw Error(errText);
                }
            }
            if (!xmlData["GenericData"]["DataSet"].hasOwnProperty("Series")) {
                errText = [].concat(xmlData["GenericData"]["Footer"]["Message"]["Text"]).map(function(t) {
                    return t["__text"];
                }).join(", ");
                if (errText === "No Results Found")
                    return [];
                else
                    throw Error("Too many records to add immediately. (" + errText + ") Try again with more narrow query.");
            }
            xmlData = xmlData["GenericData"]["DataSet"]["Series"];
            [].concat(xmlData).forEach(function(d) {
                var v_base = {};
                d["SeriesKey"]["Value"].forEach(function(skv) {
                    var key = skv["_id"];
                    if (fields.indexOf(key) > -1)
                        v_base[key] = skv["_value"];
                });
                [].concat(d["Obs"]).forEach(function(o) {
                    var v = $.extend({}, v_base);
                    v.TIME = Number(o["ObsDimension"]["_value"]);
                    if (o.hasOwnProperty("Attributes") && o["Attributes"].hasOwnProperty("Value") && o["Attributes"]["Value"].hasOwnProperty("_id") && o["Attributes"]["Value"]["_id"] === "OBS_STATUS") {
                        v.OBS_STATUS = o["Attributes"]["Value"]["_value"];
                        v.OBS_VALUE = v.OBS_STATUS === "na" ? null : 0;
                    } else {
                        v.OBS_VALUE = o["ObsValue"]["_value"];
                        if (v.OBS_VALUE === "NaN")
                            v.OBS_VALUE = null;
                        else if (!isNaN(v.OBS_VALUE))
                            v.OBS_VALUE = Number(v.OBS_VALUE);
                        else
                            throw Error("OBS_VALUE has unexpected value '" + v.OBS_VALUE + "' for dimensions " + JSON.stringify(v));
                    }
                    if (o.hasOwnProperty("Attributes") && o["Attributes"].hasOwnProperty("Value") && o["Attributes"]["Value"].hasOwnProperty("_id") && o["Attributes"]["Value"]["_id"] === "OBS_FLAG") {
                        v.OBS_FLAG = o["Attributes"]["Value"]["_value"];
                    }
                    newData.push(v);
                });
            });
            return newData;
        }
        function rst(tbl, fieldFilter, order) {
            order = order || "TIME asec";
            fieldFilter = $.extend(true, {}, fieldFilter);
            Object.keys(fieldFilter).forEach(function(fld) {
                if (tbl.fields.indexOf(fld) === -1)
                    throw Error("Unknown fieldname '" + fld + "' present in filter.");
                if (fieldFilter[fld] === "")
                    delete fieldFilter[fld];
            });
            return tbl.data(fieldFilter).order(order).get();
        }
        esDb.rst = function(name, fieldFilter, order) {
            if (!tbls.hasOwnProperty(name))
                throw Error("Table '" + name + "' has not been found.");
            return rst(tbls[name], fieldFilter, order);
        };
        esDb.rstQ = function(name, fieldFilter, order) {
            if (!tblQs.hasOwnProperty(name))
                throw Error("Table (or promise to table) '" + name + "' has not been found.");
            var rstQ = new Promise(function(resolve, reject) {
                tblQs[name].then(function(tbl) {
                    esDb.dataQ(tbl.name, varDimFilter(tbl.varDims, fieldFilter)).then(function() {
                        resolve(rst(tbl, fieldFilter, order));
                    }).catch(function(error) {
                        reject(error);
                    });
                });
            });
            return rstQ;
        };
        function varDimFilter(varDims, fieldFilter) {
            var varDimFilter = {};
            varDims.forEach(function(dim) {
                var val = fieldFilter[dim];
                if (!val || $.isPlainObject(val))
                    varDimFilter[dim] = "";
                else
                    varDimFilter[dim] = val;
            });
            return varDimFilter;
        }
        function fieldFilter(varDimFilter) {
            var fieldFilter = {};
            Object.keys(varDimFilter).forEach(function(dim) {
                var val = varDimFilter[dim];
                if (val !== "")
                    fieldFilter[dim] = val;
            });
            return fieldFilter;
        }
        function allPropValCombinations(obj) {
            var obj = $.extend({}, obj),
                keys = Object.keys(obj);
            if (keys.length == 0) {
                return [{}];
            } else {
                var result = [],
                    key = keys[0],
                    arr = pop(obj, key)[key],
                    restCombinations = allPropValCombinations(obj);
                for (var i = 0; i < restCombinations.length; i++) {
                    if (!(arr instanceof Array))
                        arr = [arr];
                    for (var j = 0; j < arr.length; j++) {
                        var objToAdd = $.extend({}, restCombinations[i]);
                        objToAdd[key] = arr[j];
                        result.push(objToAdd);
                    }
                }
                return result;
            }
        }
        function singlevalFilters(multivalFilter) {
            return allPropValCombinations(multivalFilter);
        }
        function pop(obj, key) {
            var value = {};
            value[key] = obj[key];
            delete obj[key];
            return value;
        }
        return esDb;
    }
    return {};
});
System.get("../../ES6/eurostatDb" + '');
