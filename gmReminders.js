var gmReminders = gmReminders || {};

gmReminders.DoAttack = function(rawattack) {
    var firstAttack = rawattack.split(" or ")[0];
    var attacks = firstAttack.split(",");

    for (var i = 0; i < attacks.length; i++) {
        var attack = attacks[i].trim();

        if (!attack.match(/^\d/)) {
            attack = "1 " + attack;
        }
        
        var regex = /(.+?) ([^\+]*?) (\+[0-9\/\+]+) \(([^\s]+)( plus ([^)]*))?\)/
        var match = attack.match(regex);

        var countRaw = match[1];
        var attackName = match[2];
        var tohit = match[3];
        var damage = match[4];
        var critRange = "20-20";
        var critMult = "x2";
        if (damage.includes("/")) {
            var split = damage.split("/");
            damage = split[0];
            critRange = split[1];
            if (split.length === 3) {
                critMult = split[2];
            }
        }

        var additional = match.length > 5 ? match[6] : "";
        var additionalParts = additional.split(" and ");

        var count = countRaw.startsWith("+") ? 1 : parseInt(countRaw);

        var atkTemplate = "";
        for (var c = 0; c < count; c++) {
            var atk = "<td>hit [[1d20" + tohit + "]]</td>";
            atk += "<td>dam [[" + damage + "]]";
           
            for (var a = 0; a < additionalParts.length; a++) {
                var part = additionalParts[a];

                var partRegex = /([0-9][^\s]+) (.+)/
                var partMatch = part.match(partRegex);
                if (partMatch !== null) {
                    var roll = partMatch[1];
                    var type = partMatch[2];
                    atk += " + [[" + roll + "]] " + type;
                } else {
                    atk += " + " + part;
                }
            }

            atkTemplate += "<tr>" + atk + "</td></tr>";
        }
        sendChat("gmReminder", "/w gm <div class='sheet-rolltemplate-default'><table><caption>" + attack + "</caption> " + atkTemplate + "</table></div>");
    } 
};

gmReminders.GenerateNotes = function(CharID) {
    var currChar = getObj("graphic", CharID);
    var gmnotes = currChar.get("gmnotes");
    gmnotes = unescape(gmnotes);

    if (gmnotes.length === 0) {
        return;
    }

    var name = /(.*?) CR/
    var namematch = gmnotes.match(name);

    if (namematch === null) {
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
                var attackButton = "  <a style='background:transparent; color:Red; float:right;padding:0' href='!doattack " + attackButton + "'>Remove</a>";
                message += "<li><div align='left' style='clear:both'><a style='color:Crimson' title='" + melee + "'>melee</a>" + attackButton + "</div></li>";
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
    if (msg.type === "api" && msg.who.includes("(GM)")) {
        if (msg.content.startsWith("!gmreminder")) {
            _.each(msg.selected, function (obj){
                if (obj._type == "graphic") {
                    gmReminders.GenerateNotes(obj._id);
                }
            });
        } else if (msg.content.startsWith("!doattack")) {
            gmReminders.DoAttack(msg.content.replace("!doattack ", ""));
        }
    }
});