var gmReminders = gmReminders || {};

gmReminders.GenerateNotes = function(CharID) {
    var currChar = getObj("graphic", CharID);
    var gmnotes = currChar.get("gmnotes");
    gmnotes = unescape(gmnotes);
    log(gmnotes);

    if (gmnotes.length === 0) {
        return;
    }

    var name = /(.*?) CR/
    var namematch = gmnotes.match(name);

    if (namematch === null) {
        log("gmReminder: No name found");
        return;
    }

    var message = "";

    var lines = gmnotes.split("<br>");
    var inTactics = false;
    for (var index = 0; index < lines.length; index++) {
        var line = lines[index];

        if (line.startsWith("Tactics")) {
            inTactics = true;
        } else if (inTactics) {
            var splitIndex = line.indexOf(":");
            if (splitIndex === -1) continue;

            var title = line.substr(0, splitIndex);
            var body = line.substr(splitIndex+2);

            message += "<li><a style='color:Orchid' title='" + body + "'>" + title + "</a></li>";
        } else {
            var fastHealing = /fast healing ([0-9]+)/
            var match = line.match(fastHealing);
            if (match !== null) {
                message += "<li>Fast Healing: " + match[1] + "</li>";
            }
        
            var defenses = "";
            defenses += gmReminders.GetRegexMatch(line, /DR[^;]+/);
            defenses += gmReminders.GetRegexMatch(line, /Resist[^;]+/);
            defenses += gmReminders.GetRegexMatch(line, /Immune[^;]+/);
            defenses += gmReminders.GetRegexMatch(line, /SR[^;]+/);
            if (defenses.length > 0) {
                message += "<li><a style='color:DeepSkyBlue' title='" + defenses + "'>defenses</a></li>";
            }
        
            var melee = gmReminders.GetRegexMatch(line, /Melee.+/);
            if (melee.length > 0) {
                message += "<li><a style='color:Crimson' title='" + melee + "'>melee</a></li>";
            }
        
            var ranged = gmReminders.GetRegexMatch(line, /Ranged.+/);
            if (ranged.length > 0) {
                message += "<li><a style='color:Crimson' title='" + ranged + "'>ranged</a></li>";
            }

            var aura = gmReminders.GetRegexMatch(line, /Aura.+/);
            if (aura.length > 0) {
                message += "<li><a style='color:DarkOrange' title='" + aura + "'>aura</a></li>";
            }
        }
    }

    if (message.length > 0) {
        sendChat("gmReminder", "/w gm <b>Notes for " + namematch[1] + ":</b><ul>" + message + "<ul>");
    }
};

gmReminders.GetRegexMatch = function(content, regex) {
    var match = content.match(regex);
    if (match !== null) {
        return match[0] + "; ";
    }  

    return "";
};

gmReminders.GetCurrentToken = function() {
    var turn_order = JSON.parse(Campaign().get('turnorder'));
    
    if (!turn_order.length) {
        return "";
    }
    
    var turn = turn_order.shift();
    return getObj('graphic', turn.id) || "";
};

on("change:campaign:turnorder", function(args) {
    var status_current_token = gmReminders.GetCurrentToken();
    
    if (status_current_token === "") return;
    
    if (status_current_token.id === gmReminders.currentTurn) return;
    
    gmReminders.currentTurn = status_current_token.id; 
    gmReminders.GenerateNotes(status_current_token.id);
});

on("chat:message", function(msg) {
    if (msg.type === "api" && msg.content.startsWith("!gmreminder") && msg.who.includes("(GM)")) {
        _.each(selected, function (obj){
            if (obj._type == "graphic") {
                gmReminders.GenerateNotes(obj._id);
            }
        });
    }
});