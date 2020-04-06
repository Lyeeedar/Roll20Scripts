state.statusTagLookup = {};

state.activeStatus = state.activeStatus || new Array();
 
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

//Adding a status to the tracker
StatusTracker.AddStatus = function(CharID, statusName, statusDescript, Duration, Marker) {
    if (CharID == "") return; //Don't add empty statuses
	
	for (var index = 0; index < state.activeStatus.length; index++) {
		var existing = state.activeStatus[index];
		
		if (existing.statusName == statusName) {
			var existingDuration = Number(existing.Duration || 1);
			
			existing.Duration = Math.max(existingDuration, Duration);
			StatusTracker.SendMessage("Status already exists, updating duration", true);
			StatusTracker.SetMarker(CharID, Marker, Duration-1);
			
			return;
		}
	}
    
    state.activeStatus.push({
        'CharID': CharID, 
        'Name': statusName, 
        'Description': statusDescript, 
        'Duration': Duration,
        'Marker': Marker,
    });
    
    StatusTracker.SetMarker(CharID, Marker, Duration);
	
	StatusTracker.SetCharacterCondition(CharID, statusName, 1);
}
 
StatusTracker.DelStatus = function(CharID, Name){
    for (var index = 0; index < state.activeStatus.length; index++) {
		var status = state.activeStatus[index];
		
        if (status.Name == Name && status.CharID === CharID) {
            //Remove the relevant marker
            StatusTracker.SetMarker(status.CharID, status.Marker, 0);
            
            state.activeStatus.splice(index, 1);
            index--;
        }
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
        } else if (Count === 1) {
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
	
	return "<a style='color:DeepSkyBlue' title='" + description + "'>" + statusName + "</a>" + endMessage + "";
}

StatusTracker.PrintCharacterStatus = function(CharID) {
    //loops through all durations and effects ones on the current character/token
    if (state.activeStatus.length == 0) return;
    
    //If the current token does not have any statues, exit
	var count = 0;
    for (var index = 0; index < state.activeStatus.length; index++) {
		var status = state.activeStatus[index];
        if (status.CharID == CharID) { count++ }
    }
    if (count == 0) return;
        
    //Extract the current tokens name
    var charName = StatusTracker.GetTokenName(CharID)
    
	var statusMessages = "/direct <b>" + charName + " status</b><ul>";
    for (var index = 0; index < state.activeStatus.length; index++) {
		var status = state.activeStatus[index];
        
        //Decrement Duration
        var Duration = Number(status.Duration || 1);
 
		if (status.CharID == CharID) {		
			//Still active, announced
            var message = StatusTracker.GetStatusMessage(status.Name, Duration, status.Description);
            var removeMessage = "";
            if (Duration > 1 || Duration === -1) {
                removeMessage = "  <a style='background:transparent; color:Red; float:right;padding:0' href='!StatusDel " + status.Name + " " + CharID + "'>Remove</a>";
            }

			statusMessages += "<li><div align='left' style='clear:both'>" + message + removeMessage + "</div></li>";
		}
    }
	statusMessages += "</ul><hr>";
	StatusTracker.SendMessage(statusMessages);
}

StatusTracker.NewTurn = function(CharID) {    
    //loops through all durations and effects ones on the current character/token
    if (state.activeStatus.length == 0) return;
    
    //If the current token does not have any statues, exit
	var count = 0;
    for (var index = 0; index < state.activeStatus.length; index++) {
		var status = state.activeStatus[index];
        if (status.CharID == CharID) { count++ }
    }
    if (count == 0) return;
        
    for (var index = 0; index < state.activeStatus.length; index++) {
		var status = state.activeStatus[index];
        
        //Decrement Duration
        var Duration = Number(status.Duration || 1);
 
		if (status.CharID == CharID) {
			// A -1 Duration is permanent, the current token/character's statuses are 
			// increments for the next round.
			if (Duration > 0) {
				status.Duration = Duration - 1;
				
				StatusTracker.SetMarker(CharID, status.Marker, status.Duration);
			}
			
			//Ending effects
			if (status.Duration === 0) {
                StatusTracker.DelStatus(status.CharID, status.Name);
				
				index--;
			}
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
 
on("change:campaign:turnorder", function() {
    var status_current_token = StatusTracker.GetCurrentToken();
    
    //Handler for non-token items in initiative
    if (status_current_token == "") return;
    
    //If turn order was changed but it is still the same persons turn, exit
    if (status_current_token.id == StatusTracker.currentTurn) return;
    
    StatusTracker.currentTurn = status_current_token.id; 
    StatusTracker.NewTurn(status_current_token.id);
});


on("chat:message", function(msg) {
    StatusTracker.LoadAllStatusTags();

    var cmd = "!StatusAdd ";
    
    if (msg.type === "api" && msg.content.includes(cmd)) {
        var cleanedMsg = msg.content.replace(cmd, "");
 
        //Pulls any marker first
        var marker = cleanedMsg.split("// ")[1] || undefined;
        cleanedMsg = cleanedMsg.split("//")[0];
        
        //Pulls the effect name
        var statusName = cleanedMsg.split(" ")[0];
        cleanedMsg = cleanedMsg.substr(statusName.length + 1) //Removes the target from the array

        if (marker === undefined) {
            marker = statusName;
        }
 
        //Pulls the duration
        var Duration = cleanedMsg.split(" ")[0];
        cleanedMsg = cleanedMsg.substr(Duration.length + 1) //Removes the target from the array
 
        //The remainder is the description
        var statusDescription = cleanedMsg;
        
        //Adds the status to each of the selected tokens
		if (msg.selected === undefined) {
			sendChat("","/desc No tokens selected for " + statusName + ".")
		}
		
        _.each(msg.selected, function (obj){
            //Runs through each selected token and adds the status
            if (obj._type == "graphic") { //only if the selected is a token
                StatusTracker.AddStatus(obj._id, statusName, statusDescription, Duration, marker);
				var tokenName = StatusTracker.GetTokenName(obj._id);
                sendChat("","/desc " + statusName + " added to " + tokenName + ".");

                StatusTracker.PrintCharacterStatus(obj._id);
            }
        })
    }
});

on("chat:message", function(msg) {   
    var cmd = "!StatusDel ";
    
    if (msg.type == "api" && msg.content.includes(cmd)) {
        
        var cleanedMsg = msg.content.replace(cmd, "");
        
        var statusName = cleanedMsg.split(" ")[0];
        cleanedMsg = cleanedMsg.substr(statusName.length + 1).trim();

        if (cleanedMsg.length !== 0) {
            var charID = cleanedMsg;
            StatusTracker.DelStatus(charID, statusName);
            var tokenName = StatusTracker.GetTokenName(charID);
            sendChat("","/desc " + statusName + " removed from " + tokenName + ".");

            StatusTracker.PrintCharacterStatus(charID);
        } else {
            _.each(msg.selected, function (obj){
                if (obj._type == "graphic") { //only if the selected is a token
                    StatusTracker.DelStatus(obj._id, statusName);
                    var tokenName = StatusTracker.GetTokenName(obj._id);
                    sendChat("","/desc " + statusName + " removed from " + tokenName + ".");

                    StatusTracker.PrintCharacterStatus(obj._id);
                }
            })
        }
    }
});

on("chat:message", function(msg) {   
    var cmd = "!StatusClearAll";
    
    if (msg.type == "api" && msg.content.includes(cmd) && msg.who.includes("(GM)")) {
        state.activeStatus = new Array();
        sendChat("","/desc All statuses removed.");
    }
});