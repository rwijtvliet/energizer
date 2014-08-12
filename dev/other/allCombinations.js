function allArrValCombinations(arr) {
    //From an array, of which the n elements are values or subarrays of values, create an array of which the elements
    // are subarrays with n elements. The subarrays in the returned array contain all possible combinations for the
    // elements in the subarrays of the input array, so if there are 3 4-element subarrays in the input, there will be
    // 64 (4^3) 3-element subarrays in the returned array.
    // E.g. in: [[1,2], ['a','b'], 'x'] --> out: [[1,'a','x'], [1,'b','x'], ..., [2,'b','x']]
    var arr = arr.slice();//local copy
    if (arr.length == 0) {
        return [[]];
    } else {
        var result = [],
            arr0 = arr.pop();
            //arrRest = arr.slice(1);
        //console.log("array: " + JSON.stringify(arr) + ", now calling with " + JSON.stringify(arrRest));
        var restCombinations = allArrValCombinations(arr);  // recur with the rest of array
        for (var i = 0; i < restCombinations.length; i++) {
            if (!(arr0 instanceof Array)) arr0 = [arr0];
            for (var j = 0; j < arr0.length; j++) {
                var arrToAdd = restCombinations[i].slice();
                arrToAdd.push(arr0[j]);
                result.push(arrToAdd);
            }
        }
        return result;
    }
}

function allPropValCombinations(obj) {
    //From an object, of which the properties are arrays of values, create an array of objects, of which the properties
    // are single values. The objects in the returned array contain all possible combinations of array values for the
    // individual properties, so if there are 3 properties with 4-element arrays each, there will be 64 (4^3) objects
    // in the returned array.
    // E.g. in: {prop1:[1,2], prop2:['a','b']} --> out: [{prop1:1, prop2:'a'}, {prop1:1, prop2:'b'}, ...]
    var obj = $.extend(true, {}, obj), //local copy to not affect input object.
        keys = Object.keys(obj);

    if (keys.length == 0) {
        return [{}];
    } else {
        var result = [],
            key = keys[0],
            arr = pop(obj, key)[key],//take (remove) one property from object and get value array for that property
            restCombinations = allPropValCombinations(obj);  // recur with the rest of object
        for (var i = 0; i < restCombinations.length; i++) {
            if (!(arr instanceof Array)) arr = [arr];//increase robustness, in case of only one value that's not put in 1-element array.
            for (var j = 0; j < arr.length; j++) {
                var objToAdd = $.extend({}, restCombinations[i]);//make copy
                objToAdd[key] = arr[j];//and add property-value-pair
                result.push(objToAdd);
            }
        }
        return result;
    }
}
function pop(obj, key) {var value = {}; value[key] = obj[key]; delete obj[key]; return value;}

var arr = [[1,2,3], ['a','b','c'], ['x','y']];
var obj = {prop1: [1,2,3], prop2:['a','b','c'], prop3:['x','y']};
console.log("with arrays: \n original array:\n " + JSON.stringify(arr) + "\n\n all " + allArrValCombinations(arr).length + " combinations:\n " + JSON.stringify(allArrValCombinations(arr), null, 2));
console.log("with object: \n original object:\n " + JSON.stringify(obj) + "\n\n all " + allArrValCombinations(arr).length + " combinations:\n " + JSON.stringify(allPropValCombinations(obj), null, 2));
