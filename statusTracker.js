state.statusTagLookup = {};

state.characterStatusMap = state.characterStatusMap || {};
 
var StatusTracker = StatusTracker || {};

StatusTracker.LoadAllStatusTags = function() {
    JSON.parse(Campaign().get('_token_markers')||'[]').forEach( tm => state.statusTagLookup[tm.name] = tm.tag);
};

StatusTracker.SetCharacterCondition = function(CharID, statusName, value) {	
	var Chars = findObjs({
       _type: "graphic",
       _id: CharID,
    });
    if (Chars.length > 0 ) {
        var represents = Chars[0].get("represents");
				
        var character = getObj("character", represents);
        
        if (character === undefined) {
            sendChat("StatusTracker", "/w gm no character found for 'represents' " + character);
            return;
        }

		var conditionValue = findObjs({_type: "attribute", name: "condition_" + statusName, _characterid: character.id})[0]
		
		if (conditionValue !== undefined) {			
			conditionValue.set("current", value);
			
			sendChat("StatusTracker", "/w gm set condition_" + statusName + " to " + value);
		}
    } else {
		sendChat("StatusTracker", "/w gm no token with id " + CharID);
	}
}

StatusTracker.AddStatus = function(CharID, statusName, description, Duration, Marker) {
    if (CharID == "") return;
    
    var charStatus = state.characterStatusMap[CharID];
    if (charStatus === undefined) {
        charStatus = new Array();
        state.characterStatusMap[CharID] = charStatus;
    }

	for (var index = 0; index < charStatus.length; index++) {
		var existing = state.activeStatus[index];
		
		if (existing.Name === statusName) {
			var existingDuration = existing.Duration;
			
			existing.Duration = Math.max(existingDuration, Duration);
			StatusTracker.SendMessage("Status already exists, updating duration", true);
			StatusTracker.SetMarker(CharID, Marker, existing.Duration);
			
			return;
		}
	}
    
    charStatus.push({
        'Name': statusName, 
        'Description': description, 
        'Duration': Duration,
        'Marker': Marker,
    });
    
    StatusTracker.SetMarker(CharID, Marker, Duration);
	
	StatusTracker.SetCharacterCondition(CharID, statusName, 1);
}
 
StatusTracker.DelStatus = function(CharID, Name) {
    var charStatus = state.characterStatusMap[CharID];
    if (charStatus === undefined) {
        return;
    }

    for (var index = 0; index < charStatus.length; index++) {
		var status = charStatus[index];
		
        if (status.Name == Name) {
            StatusTracker.SetMarker(CharID, status.Marker, 0);
            
            charStatus.splice(index, 1);
            index--;
        }
    }
    if (charStatus.length === 0) {
        delete status[CharID];
    }
	
	StatusTracker.SetCharacterCondition(CharID, Name, 0);
}

StatusTracker.SetMarker = function(CharID, Marker, Count) {	
    //Find the token with the ID: non-linked tokens
    var currChar = findObjs({
        _type: "graphic",
        _id: CharID,
        _pageid: Campaign().get("playerpageid"),
    });    
    _.each(currChar, function(obj) {
        var tag = state.statusTagLookup[Marker] || state.statusTagLookup["info"];

        if (Count === 0) {
            obj.set("status_" + tag, false);
        } else if (Count === 1 || Count === -1) {
            obj.set("status_" + tag, true);
        } else {
            if (Count > 9) {
                Count = 9;
            }

            obj.set("status_" + tag, "" + Count);
        }
    });
}

StatusTracker.GetTokenName = function(CharID) {
    if (CharID == "") return "";
        
    //if CharID is a token, turn on the status indicator for the token
    var Chars = findObjs({
       _type: "graphic",
       _id: CharID,
    });
    if (Chars.length > 0 ) {
        var name = Chars[0].get("name");
    }
    
    return name;
}

StatusTracker.SendMessage = function(message) {    	
    //if not a direct message, assign chat limiters
    if (!message.startsWith("/direct")) {
        message = "/desc " + message;
    }
    
    sendChat("", message);
}

StatusTracker.GetStatusMessage = function(statusName, duration, description) {
	var endMessage = " for " + duration + " rounds";
	if (duration === -1) {
		endMessage = "";
	} else if (duration === 1) {
		endMessage = " ending";
    }
    
    if (description.startsWith("http")) {
        return "<a style='color:DeepSkyBlue;background-colour:transparent;padding:0' href='" + description + "'>" + statusName + "</a>" + endMessage + "";
    } else {
	    return "<a style='color:DeepSkyBlue' title='" + description + "'>" + statusName + "</a>" + endMessage + "";
    }
}

StatusTracker.PrintCharacterStatus = function(CharID) {
    var charStatus = state.characterStatusMap[CharID];
    if (charStatus === undefined) {
        return;
    }
    if (charStatus.length === 0) {
        return;
    }
        
    var charName = StatusTracker.GetTokenName(CharID)
    
	var statusMessages = "/direct <b>" + charName + " status</b><ul>";
    for (var index = 0; index < charStatus.length; index++) {
		var status = charStatus[index];
        
        var duration = status.Duration;
 
        var message = StatusTracker.GetStatusMessage(status.Name, duration, status.Description);
        var removeMessage = "";
        if (duration > 1 || duration === -1) {
            removeMessage = "  <a style='background:transparent; color:Red; float:right;padding:0' href='!status del " + status.Name + " " + CharID + "'>Remove</a>";
        }

        statusMessages += "<li><div align='left' style='clear:both'>" + message + removeMessage + "</div></li>";
    }
	statusMessages += "</ul><hr>";
	StatusTracker.SendMessage(statusMessages);
}

StatusTracker.NewTurn = function(CharID) {    
    var charStatus = state.characterStatusMap[CharID];
    if (charStatus === undefined) {
        return;
    }
    if (charStatus.length === 0) {
        return;
    }
        
    for (var index = 0; index < charStatus.length; index++) {
		var status = charStatus[index];
         
		if (status.Duration > 0) {
            status.Duration = status.Duration - 1;
            StatusTracker.SetMarker(CharID, status.Marker, status.Duration);
        }
        
        if (status.Duration === 0) {
            StatusTracker.DelStatus(CharID, status.Name);
            
            index--;
        }
    }
    
    StatusTracker.PrintCharacterStatus(CharID);
}
 
StatusTracker.GetCurrentToken = function() {
    var turn_order = JSON.parse(Campaign().get('turnorder'));
    
    if (!turn_order.length) {
        return "";
    }
    
    var turn = turn_order.shift();
    return getObj('graphic', turn.id) || "";
};

StatusTracker.OnStatusAdd = function(args, selected) {
    var statusName = args[0];
    var duration = args.length > 1 ? args[1] : -1;
    var icon = args.length > 2 ? args[2] : statusName;
    var description = args.length > 3 ? args[3] : "https://www.d20pfsrd.com/Gamemastering/conditions/#TOC-" + statusName.substr(0, 1).toUpperCase() + statusName.substr(1);

    if (selected === undefined) {
        sendChat("","/desc No tokens selected for " + statusName + ".")
    }
    
    _.each(selected, function (obj){
        if (obj._type == "graphic") {
            StatusTracker.AddStatus(obj._id, statusName, description, duration, icon);

            var tokenName = StatusTracker.GetTokenName(obj._id);
            sendChat("","/desc " + statusName + " added to " + tokenName + ".");

            StatusTracker.PrintCharacterStatus(obj._id);
        }
    });
};

StatusTracker.OnStatusDel = function(args, selected) {
    var statusName = args[0];

    if (args.length > 1) {
        var charID = args[1];
        StatusTracker.DelStatus(charID, statusName);
        
        var tokenName = StatusTracker.GetTokenName(charID);
        sendChat("","/desc " + statusName + " removed from " + tokenName + ".");

        StatusTracker.PrintCharacterStatus(charID);
    } else {
        _.each(selected, function (obj){
            if (obj._type == "graphic") {
                StatusTracker.DelStatus(obj._id, statusName);

                var tokenName = StatusTracker.GetTokenName(obj._id);
                sendChat("","/desc " + statusName + " removed from " + tokenName + ".");

                StatusTracker.PrintCharacterStatus(obj._id);
            }
        });
    }
};

StatusTracker.OnStatusClearAll = function(args, selected) {
    state.characterStatusMap = {};
    sendChat("","/desc All statuses removed.");
};

StatusTracker.OnStatusShow = function(args, selected) {

    _.each(selected, function (obj) {
        if (obj._type == "graphic") {
            StatusTracker.PrintCharacterStatus(obj._id);
        }
    });
};

on("change:campaign:turnorder", function(args) {
    var status_current_token = StatusTracker.GetCurrentToken();
    
    //Handler for non-token items in initiative
    if (status_current_token == "") return;
    
    //If turn order was changed but it is still the same persons turn, exit
    if (status_current_token.id == StatusTracker.currentTurn) return;
    
    StatusTracker.currentTurn = status_current_token.id; 
    StatusTracker.NewTurn(status_current_token.id);
});

on("chat:message", function(msg) {
    if (msg.type === "api" && msg.content.startsWith("!status")) {
        var split = msg.content.splitArgs();

        var verb = split[1];
        var args = split.slice(2);

        if (verb === "add") 
        {
            StatusTracker.OnStatusAdd(args, msg.selected);
        } 
        else if (verb === "del" || verb === "remove") 
        {
            StatusTracker.OnStatusDel(args, msg.selected);
        } 
        else if (verb === "clearall") 
        {
            if (msg.who.includes("(GM)")) {
                StatusTracker.OnStatusClearAll(args, msg.selected);
            } 
            else 
            {
                sendChat("","/desc This is a GM only command.");
            }
        }
        else if (verb === "show")
        {
            StatusTracker.OnStatusShow(args, msg.selected);
        }
        else if (verb === "help" || verb === "?")
        {
            var message = "/direct !status usage:<ul>";

            message += "<li>Add a status to the selected characters. Usage: !status add {name} {duration in rounds:-1 for permanent} {icon} {description}</li>";
            message += "<li>Remove a status from the selected characters. Usage: !status del {name}</li>";
            message += "<li>Show the status for the selected characters. Usage: !status show</li>";

            message += "</ul>";

            sendChat("", message);
        }
        else 
        {
            sendChat("","/desc Unknown status verb " + split[1] + ".")
        }
    }
});

on("ready", function() {
	StatusTracker.LoadAllStatusTags();
});