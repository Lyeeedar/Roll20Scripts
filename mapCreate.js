var mapCreate = mapCreate || {};

mapCreate.Tile = function(CharID) {
    var token = getObj('graphic', CharID);
    if (token === undefined) {
        log("no token found");
        return;
    }

    var img = token.get("imgsrc");
    var width = token.get("width");
    var height = token.get("height");
    var pageID = token.get("_pageid");

    var page = getObj('page', pageID);
    if (page === undefined) {
        log("no page found");
        return;
    }

    token.remove();

    var pageWidth = page.get("width") * 70;
    var pageHeight = page.get("height") * 70;

    var xCount = Math.ceil(pageWidth / width);
    var yCount = Math.ceil(pageHeight / height);

    log("beginning tile");
    for (var x = 0; x < xCount; x++) {
        for (var y = 0; y < yCount; y++) {
            log("Create object at " + x + "," + y);
            createObj('graphic', {
                name: 'mapTile',
                left: x * width,
                top: y * height,
                width: width,
                height: height,
                imgsrc: img,
                _pageid: pageID,
                layer: "map",
                gmnotes: "generated: " + img
            });
        }
    }
    log("tile complete");
};

mapCreate.Delete = function(CharID) {
    var token = getObj('graphic', CharID);
    if (token === undefined) {
        return;
    }

    var gmnotes = token.get("gmnotes");
    if (gmnotes.startsWith("generated: ")) {
        var objects = filterObjs(function (obj) {
            return obj.get("type") == "graphic" && obj.get("gmnotes") == gmnotes;
        });

        for (var i = 0; i < objects.length; i++) {
            objects[i].remove();
        }
    }
};

on("chat:message", function(msg) {
    if (msg.type === "api" && msg.who.includes("(GM)")) {
        if (msg.content.startsWith("!tile")) {
            _.each(msg.selected, function (obj){
                if (obj._type == "graphic") {
                    mapCreate.Tile(obj._id);
                }
            });
        } else if (msg.content.startsWith("!delete")) {
            _.each(msg.selected, function (obj){
                if (obj._type == "graphic") {
                    mapCreate.Delete(obj._id);
                }
            });
        }
    }
});