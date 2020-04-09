var gmReminders = gmReminders || {};
gmReminders.customMessageMap = {};
gmReminders.guid = 0;

var attackregex = /(.+?) ([^\+]*?) (\+[0-9\/\+]+) \(([^\s]+)( plus ([^)]*))?\)/;
gmReminders.DoAttack = function (rawattack) {
	try {
		var firstAttack = rawattack.split(" or ")[0];
		var attacks = firstAttack.split(",");

		for (var i = 0; i < attacks.length; i++) {
			var attack = attacks[i].trim();

			if (!attack.match(/^\d/)) {
				attack = "1 " + attack;
			}

			var match = attack.match(attackregex);

			var countRaw = match[1];
			var attackName = match[2];
			var tohit = match[3];
			tohit = tohit.split("/");

			var damage = match[4];
			var critRange = "20-20";
			var critMult = "x2";
			if (damage.includes("/")) {
				var split = damage.split("/");
				damage = split[0];

				if (split[1].includes("-")) {
					critRange = split[1];
				} else {
					critMult = split[1];
				}

				if (split.length === 3) {
					critMult = split[2];
				}
			}
			var critvalue = critRange.split("-")[0];

			var additional = match[6];
			if (additional === undefined) additional = "";
			var additionalParts = additional.split(" and ");

			var count = countRaw.startsWith("+") ? 1 : parseInt(countRaw);
			if (count < tohit.length) {
				count = tohit.length;
			}

			var atkTemplate = "";
			for (var c = 0; c < count; c++) {
				var hit =
					c >= tohit.length ? tohit[tohit.length - 1] : tohit[c];

				var atk =
					"<td>" +
					hit +
					" hit [[1d20" +
					hit +
					"cs>" +
					critvalue +
					"]]</td><td>dam [[" +
					damage +
					"]]";

				for (var a = 0; a < additionalParts.length; a++) {
					var part = additionalParts[a];

					var partRegex = /([0-9][^\s]+) (.+)/;
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
				atkTemplate +=
					"<tr><td>crit hit [[1d20" +
					hit +
					"cs>" +
					critvalue +
					"]]</td><td>crit dam [[" +
					damage +
					"*" +
					critMult.substr(1) +
					"]]</td></tr>";
			}
			sendChat(
				"gmReminder",
				"/w gm <div class='sheet-rolltemplate-default'><table><caption>" +
					attack +
					"</caption> " +
					atkTemplate +
					"</table></div>"
			);
		}
	} catch (err) {
		sendChat(
			"gmReminder",
			"/w gm Failed to execute attack '" +
				rawattack +
				"' due to " +
				err.message
		);
	}
};

gmReminders.BuildAttackButtons = function (attackraw) {
	var attacks = attackraw.split(" or ");

	var output = "";

	for (var i = 0; i < attacks.length; i++) {
		var attack = attacks[i];

		var adjustedAttack = attack;
		if (!adjustedAttack.match(/^\d/)) {
			adjustedAttack = "1 " + adjustedAttack;
		}
		var match = adjustedAttack.match(attackregex);
		var attackname = match[2];
		var namesplit = attackname.split(" ");
		var shortname = namesplit[namesplit.length - 1];

		output +=
			"  <a style='background:transparent; color:Red; padding:0; padding-right:5px' title='" +
			attack +
			"' href='!doattack " +
			attack +
			"'>" +
			shortname +
			"</a>";
	}

	return output;
};

gmReminders.ParseSpellConsumeMap = function(spellConsumeMapRaw) {
	var spellConsumeMap = {};
	
	var split = spellConsumeMapRaw.split(",");
	for (var i = 0; i < split.length; i++) {
		var entrySplit = split[i].split(":");
		spellConsumeMap[entrySplit[0]] = parseInt(entrySplit[1]);
	}

	return spellConsumeMap;
};

gmReminders.WriteSpellConsumeMap = function(spellConsumeMap) {
	var output = new Array();
	for (var [key, value] of Object.entries(spellConsumeMap)) {
		output.push(key + ":" + value);
	}

	return output.join(",");
};

gmReminders.ConsumeSpell = function(argsRaw) {
	var args = argsRaw.split(" ");
	var charID = args[0];
	var level = args[1];
	var spellName = args[2];

	var currChar = getObj("graphic", charID);
	if (currChar === undefined) {
		return;
	}

	var gmnotes = currChar.get("gmnotes");
	gmnotes = unescape(gmnotes);

	if (gmnotes.length === 0) {
		return;
	}

	var name = /(.*?) CR/;
	var namematch = gmnotes.match(name);

	if (namematch === null) {
		return;
	}

	var lines = gmnotes.split("<br>");
	var spellConsumeMapRaw = lines[lines.length-1];
	var spellConsumeMap = {};
	if (spellConsumeMapRaw.startsWith("SpellConsumeMap ")) {
		spellConsumeMap = gmReminders.ParseSpellConsumeMap(spellConsumeMapRaw.replace("SpellConsumeMap ", ""));
	} else {
		lines.push("SpellConsumeMap ");
	}

	var key = level + "" + spellName;
	
	var value = spellConsumeMap[key];
	if (value === undefined) {
		value = 0;
	}
	log("previously consumed " + key + " " + value);

	value++;
	spellConsumeMap[key] = value;

	lines[lines.length-1] = "SpellConsumeMap " + gmReminders.WriteSpellConsumeMap(spellConsumeMap);
	currChar.set("gmnotes", lines.join("<br>"));

	gmReminders.GenerateSpellbook(charID);
};

gmReminders.GenerateSpellbook = function(CharID) {
	var currChar = getObj("graphic", CharID);
	if (currChar === undefined) {
		return;
	}

	var gmnotes = currChar.get("gmnotes");
	gmnotes = unescape(gmnotes);

	if (gmnotes.length === 0) {
		return;
	}

	var name = /(.*?) CR/;
	var namematch = gmnotes.match(name);

	if (namematch === null) {
		return;
	}

	var lines = gmnotes.split("<br>");

	var spellLevels = new Array();
	var inSpells = false;
	var clAndDetails = "";
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		if (line.includes(" Spells Prepared (CL ") || line.includes(" Spells Known (CL ")) {
			inSpells = true;
			clAndDetails = line.split("(")[1];
		} else if (inSpells) {
			if (line.length > 0 && !line.match(/^\d/)) {
				break;
			} else if (line.length > 0) {
				spellLevels.push(line);
			}
		}
	}
	if (!inSpells) {
		log("No spells found in: " + gmnotes);
		return;
	}

	var spellConsumeMapRaw = lines[lines.length-1];
	var spellConsumeMap = {};
	if (spellConsumeMapRaw.startsWith("SpellConsumeMap ")) {
		spellConsumeMap = gmReminders.ParseSpellConsumeMap(spellConsumeMapRaw.replace("SpellConsumeMap ", ""));
	}

	var message = "<b>Spellbook for " + namematch[1] + "</b>";
	message += "<div class='sheet-rolltemplate-default'><table><caption>" + clAndDetails.substr(0, clAndDetails.length-1) + "</caption>";
	for (var i = 0; i < spellLevels.length; i++) {
		var line = spellLevels[i];
		var split1 = line.split("—");
		var level = split1[0];
		var levelOnly = level.split(" ")[0];
		var spells = split1[1].split(", ");

		if (level.startsWith("0") || level.startsWith("1")) {
			continue;
		}

		message += "<tr><td style='vertical-align:top'>" + level + "</td><td>";
		var isSorcerer = level.includes("(");
		var fixedSpellCount = isSorcerer ? parseInt(level.split("(")[1].split("/")[0]) : -1;
		
		for (var s = 0; s < spells.length; s++) {
			var spell = spells[s];
			var spellText = spell;

			var spellSplit = spell.split("(");
			var spellName = spellSplit[0].trim();

			var spellCount = fixedSpellCount != -1 ? fixedSpellCount : 1;

			if (!isSorcerer && spellSplit.length > 1) {
				var spellDetails = spellSplit[1];
				var spellDetailsSplit = spellDetails.substr(0, spellDetails.length-1).split(",");

				var possiblyCount = spellDetailsSplit[0];
				if (!possiblyCount.startsWith("DC")) {
					spellCount = parseInt(possiblyCount);

					if (spellDetailsSplit.length > 1) {
						spellText = spellName + " (" + spellDetailsSplit[1] + ")";
					}
				}
			}

			var dashedSpellName = spellName.toLowerCase().replace(/ /g, "-");
			var url = "https://www.d20pfsrd.com/magic/all-spells/" + dashedSpellName.substr(0,1) + "/" + dashedSpellName;

			var spellKey = isSorcerer ? "N/A" : dashedSpellName;

			var key = levelOnly+spellKey;
			var consumed = spellConsumeMap[key];
			if (consumed === undefined) {
				consumed = 0;
			}
			spellCount -= consumed;

			if (spellCount == 0) {
				message += "<div style='text-decoration:line-through'>";
				message += "<a style='background:transparent;padding:0;' href='" + url + "'>" + spellText + "</a> ";
				message += "</div>";
			} else {
				message += "<div>";
				message += "<a style='background:transparent;padding:0;' href='" + url + "'>" + spellText + "</a> ";
				message += "<a style='background:transparent;padding:0;color:DarkMagenta' href='!consumespell " + CharID + " " + levelOnly + " " + spellKey + "'>x" + spellCount + "</a>";
				message += "</div>";
			}
		}

		message += "</td></tr>";
	}
	message += "</table></div>";

	sendChat("gmReminder", "/w gm " + message)
};

gmReminders.ParseCreatureStatBlock = function(statblock) {
	var lines = statblock.split("<br>");

	var creature = {};

	var sectionTitles = ["OFFENSE", "DEFENSE", "STATISTICS", "SPECIAL ABILITIES", "TACTICS", "ECOLOGY"];

	var inTactics = false;
	var inSpecialAbilities = false;
	for (var index = 0; index < lines.length; index++) {
		var line = lines[index];

		if (line.startsWith("SpellConsumeMap ")) {
			continue;
		}

		var isNewSection = false;
		for (var i = 0; i < sectionTitles.length; i++) {
			if (line.toUpperCase().startsWith(sectionTitles[i])) {
				isNewSection = true;
				break;
			}
		}
		if (isNewSection) {
			inTactics = false;
			inSpecialAbilities = false;
		}

		if (line.toUpperCase().startsWith("TACTICS")) {
			inTactics = true;
		} else if (inTactics) {
			var tactics = creature["tactics"] || "";
			tactics += line + "\n";
			creature["tactics"] = tactics;
		}

		if (line.toUpperCase().startsWith("SPECIAL ABILITIES")) {
			inSpecialAbilities = true;
		} else if (inSpecialAbilities) {
			var sa = creature["specialabilities"] || "";
			sa += line + "\n";
			creature["specialabilities"] = sa;
		}

		var fastHealing = /fast healing ([0-9]+)/;
		var match = line.match(fastHealing);
		if (match !== null) {
			creature["fasthealing"] = match[1];
		}

		var nameRegex = /(.*?) CR /;
		var namematch = line.match(nameRegex);
		if (namematch !== null) {
			var name = namematch[1];
			name = name.replace("<p>", "");

			creature["name"] = name;
		}

		if (line.startsWith("hp ")) {
			creature["hp"] = line.replace("hp ", "").split("(")[0];
		}

		if (line.startsWith("AC")) {
			var ac = line.split("(")[0];
			creature["ac"] = ac;
		}

		gmReminders.InsertIfMatches(line, /CMD [0-9]+/, creature, "cmd");
		gmReminders.InsertIfMatches(line, /Fort \+[0-9]+/, creature, "fort");
		gmReminders.InsertIfMatches(line, /Ref \+[0-9]+/, creature, "ref");
		gmReminders.InsertIfMatches(line, /Will \+[0-9]+/, creature, "will");
		gmReminders.InsertIfMatches(line, /Defensive Abilities [^;]+/, creature, "defensiveabilities");
		gmReminders.InsertIfMatches(line, /Resist [^;]+/, creature, "resist");
		gmReminders.InsertIfMatches(line, /Immune [^;]+/, creature, "immune");
		gmReminders.InsertIfMatches(line, /DR [^;]+/, creature, "dr");
		gmReminders.InsertIfMatches(line, /SR [^;]+/, creature, "sr");
		gmReminders.InsertIfMatches(line, /Weaknesses [^;]+/, creature, "weaknesses");
		gmReminders.InsertIfMatches(line, /Special Attacks [^;]+/, creature, "specialattacks");
		gmReminders.InsertIfMatches(line, /Melee .*/, creature, "melee");
		gmReminders.InsertIfMatches(line, /Ranged .*/, creature, "ranged");
		gmReminders.InsertIfMatches(line, /CMB \+[0-9]+/, creature, "cmb");
		gmReminders.InsertIfMatches(line, /Aura .*/, creature, "aura");
		gmReminders.InsertIfMatches(line, /Speed .*/, creature, "speed");
		gmReminders.InsertIfMatches(line, /Init [^;]+/, creature, "init");
		gmReminders.InsertIfMatches(line, /Space [0-9]+ ft/, creature, "space");
		gmReminders.InsertIfMatches(line, /Reach [0-9]+ ft/, creature, "reach");

		if (line.includes(" Spells Prepared (CL ") || line.includes(" Spells Known (CL ")) {
			creature["spells"] = line;
		}
	}

	return creature;
}

gmReminders.TryParseCreature = function(CharID) {
	var currChar = getObj("graphic", CharID);
	if (currChar === undefined) {
		return null;
	}

	var gmnotes = currChar.get("gmnotes");
	gmnotes = unescape(gmnotes);

	if (gmnotes.length === 0) {
		return null;
	}

	var nameRegex = /(.*?) CR/;
	var namematch = gmnotes.match(nameRegex);

	if (namematch === null) {
		return null;
	}

	return gmReminders.ParseCreatureStatBlock(gmnotes);
};

gmReminders.GenerateNotes = function (CharID) {
	var currChar = getObj("graphic", CharID);
	if (currChar === undefined) {
		return;
	}

	var gmnotes = currChar.get("gmnotes");
	gmnotes = unescape(gmnotes);

	if (gmnotes.length === 0) {
		return;
	}

	var nameRegex = /(.*?) CR/;
	var namematch = gmnotes.match(nameRegex);

	if (namematch === null) {
		return;
	}
	var name = namematch[1];

	var message = "";

	var creature = gmReminders.ParseCreatureStatBlock(gmnotes);

	if (creature["aura"] !== undefined) {
		message +=
				"<li><a style='color:DarkOrange' title='" +
				creature["aura"].replace("Aura ", "") +
				"'>Aura</a></li>";
	}

	if (creature["fasthealing"] !== undefined) {
		message += "<li>Fast Healing: " + creature["fasthealing"] + "</li>";
	}

	if (creature["ac"] !== undefined) {
		var ac = creature["ac"];
		ac += " " + creature["cmd"];

		var fort = creature["fort"];
		var fortButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Fort 1d20" + fort.replace("Fort ", "") + "' title='" + fort + "'>Fort</a>"

		var ref = creature["ref"];
		var refButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Ref 1d20" + ref.replace("Ref ", "") + "' title='" + ref + "'>Ref</a>"

		var will = creature["will"];
		var willButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Will 1d20" + will.replace("Will ", "") + "' title='" + will + "'>Will</a>"

		message +=
			"<li><a style='color:DeepSkyBlue' title='" +
			ac +
			"'>AC</a>" + fortButton + refButton + willButton + "</li>";
	}

	var defenses = [];
	if (creature["defensiveabilities"] !== undefined) defenses.push(creature["defensiveabilities"]);
	if (creature["dr"] !== undefined) defenses.push(creature["dr"]);
	if (creature["resist"] !== undefined) defenses.push(creature["resist"]);
	if (creature["immune"] !== undefined) defenses.push(creature["immune"]);
	if (creature["sr"] !== undefined) defenses.push(creature["sr"]);
	
	if (defenses.length > 0) {
		message += "<li><a style='color:DeepSkyBlue' title='" + defenses.join("&#10;") + "'>Defenses</a></li>";
	}

	if (creature["specialattacks"] !== undefined) {
		message +=
			"<li><a style='color:DeepSkyBlue' title='" +
			creature["specialattacks"].replace("Special Attacks ", "") +
			"'>Special Attacks</a></li>";
	}

	if (creature["melee"] !== undefined) {
		var attackButton = gmReminders.BuildAttackButtons(
			creature["melee"].replace("Melee ", "")
		);

		var cmb = creature["cmb"];
		var cmbButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-CMB 1d20" + cmb.replace("CMB ", "") + "' title='" + cmb + "'>CMB</a>"

		message +=
			"<li><div align='left' style='clear:both'>Melee:" +
			attackButton + cmbButton +
			"</div></li>";
	}

	if (creature["ranged"] !== undefined) {
		var attackButton = gmReminders.BuildAttackButtons(
			creature["ranged"].replace("Ranged ", "")
		);
		message +=
			"<li><div align='left' style='clear:both'>Ranged:" +
			attackButton +
			"</div></li>";
	}

	if (creature["spells"] !== undefined) {
		message +=
			"<li><a style='background:transparent; padding:0; color:DarkMagenta' href='!spellbook " + CharID + "'>Spellbook</a></li>";
	}

	if (creature["specialabilities"] !== undefined) {
		var tacticsLines = creature["specialabilities"].split("\n");
		for (var i = 0; i < tacticsLines.length; i++) {
			var line = tacticsLines[i];

			var splitIndex = line.indexOf(")");
			if (splitIndex === -1) continue;

			var title = line.substr(0, splitIndex + 1);
			var body = line.substr(splitIndex + 2);

			message +=
				"<li><a style='color:GoldenRod' title='" +
				body +
				"'>" +
				title +
				"</a></li>";
		}
	}

	if (creature["tactics"] !== undefined) {
		var tacticsLines = creature["tactics"].split("\n");
		for (var i = 0; i < tacticsLines.length; i++) {
			var line = tacticsLines[i];

			var splitIndex = line.indexOf(":");
			if (splitIndex === -1) continue;

			var title = line.substr(0, splitIndex);
			var body = line.substr(splitIndex + 2);

			message +=
				"<li><a style='color:Orchid' title='" +
				body +
				"'>" +
				title +
				"</a></li>";
		}
	}

	if (message.length > 0) {
		sendChat(
			"gmReminder",
			"/w gm <b>Notes for " +
				name +
				":</b><ul>" +
				message +
				"<ul>"
		);
	}

	var customMessages = gmReminders.customMessageMap[CharID];
	if (customMessages != undefined) {
		for (var i = 0; i < customMessages.length; i++) {
			var message = customMessages[i];

			var removeButton = "<div><a style='background:transparent; padding:0; color:Red' href='!removereminder " + CharID + " " + message.guid + "'>Remove</a><div>";

			sendChat("gmReminder", "/w gm " + message.message + removeButton);
		}
	}
};

gmReminders.GetRegexMatch = function (content, regex) {
	var match = content.match(regex);
	if (match !== null) {
		return match[0];
	}

	return "";
};

gmReminders.InsertIfMatches = function (content, regex, creature, key) {
	var match = content.match(regex);
	if (match !== null) {
		var value = match[0];
		creature[key] = value;
	}
};

gmReminders.GetCurrentToken = function () {
	var turn_order = JSON.parse(Campaign().get("turnorder"));

	if (!turn_order.length) {
		return "";
	}

	var turn = turn_order.shift();
	return getObj("graphic", turn.id) || "";
};

gmReminders.ExecuteRoll = function(argsraw) {
	var args = argsraw.split(" ");
	sendChat("gmReminder", "/w gm " + args[0] + ": [[" + args[1] + "]]");
}

gmReminders.CreateCharacter = function(CharID) {
	var token = getObj("graphic", CharID);
	if (token === undefined) {
		sendChat("gmReminder", "/w gm No graphic found for charID");
		return;
	}

	var gmnotes = token.get("gmnotes");
	gmnotes = unescape(gmnotes);

	if (gmnotes.length === 0) {
		sendChat("gmReminder", "/w gm No gmnotes found");
		return;
	}

	var nameRegex = /(.*?) CR/;
	var namematch = gmnotes.match(nameRegex);

	if (namematch === null) {
		sendChat("gmReminder", "/w gm No name followed by CR found");
		return;
	}

	sendChat("gmReminder", "/w gm Character creation started for " + namematch[1]);

	// parse data from gmnotes
	var creature = gmReminders.ParseCreatureStatBlock(gmnotes);

	// setup ac, hpbar, size on token
	token.set("bar1_max", creature["hp"]);
	token.set("bar1_value", creature["hp"]);

	var acRaw = parseInt(creature["ac"].replace("AC ", "").split(",")[0]);
	token.set("bar2_value", acRaw);

	var size = parseInt((creature["space"] || "Space 5 ft").split("Space")[1].split("ft")[0].trim());
	if (size > 5) {
		var units = size / 5;
		var pixels = units * 70;

		token.set("width", pixels);
		token.set("height", pixels);
	}

	token.set("name", creature["name"]);
	token.set("showname", true);

	// create character
	var char = createObj("character", {
		avatar: token.get("imgsrc"),
		name: creature["name"],
		gmnotes: gmnotes,
		archived: false,
		inplayerjournals: '',
		controlledby: ''
	});
	token.set("represents", char.get('_id'));
	setDefaultTokenForCharacter(char, token);

	// all done
	sendChat("gmReminder", "/w gm Character created for " + creature["name"]);
};

gmReminders.RollInitiative = function () {
	log("Beginning set initiative");

	var turnorderRaw = Campaign().get("turnorder");
	var turnorder;
	if (turnorderRaw == "") {
		turnorder = [];
	} else {
		turnorder = JSON.parse(turnorderRaw);
	}

	for (var i = 0; i < turnorder.length; i++) {
		var turn = turnorder[i];

		if (turn.pr == null || turn.pr == "0") {
			var creature = gmReminders.TryParseCreature(turn.id);
			if (creature != null) {
				var init = parseInt(creature["init"].replace("Init ", ""));
				var initiativeValue = randomInteger(20) + init;
				turn.pr = initiativeValue;

				sendChat("gmReminders", "/w gm Rolling initiative for " + creature["name"] + ": 1d20+" + init + " = " + initiativeValue);
			}
		}
	}

	var turnorderOut = JSON.stringify(turnorder);
	Campaign().set("turnorder", turnorderOut);
	log("End set initiative");
};

gmReminders.AddCustomReminder = function (CharID, message) {

	var charMessages = gmReminders.customMessageMap[CharID];
	if (charMessages == undefined) {
		charMessages = [];
		gmReminders.customMessageMap[CharID] = charMessages;
	}

	charMessages.push({
		charID: CharID,
		message: message,
		guid: gmReminders.guid++
	});

	gmReminders.GenerateNotes(CharID);
};

gmReminders.RemoveCustomReminder = function(argsRaw) {
	var args = argsRaw.splitArgs();
	var charID = args[0];
	var guid = args[1];

	var charMessages = gmReminders.customMessageMap[charID];
	if (charMessages != undefined) {
		for (var i = 0; i < charMessages.length; i++) {
			var message = charMessages[i];
			if (message.guid == guid) {
				charMessages.splice(i, 1);
				break;
			}
		}
	};

	gmReminders.GenerateNotes(charID);
};

on("change:campaign:turnorder", function (args) {
	var status_current_token = gmReminders.GetCurrentToken();

	if (status_current_token === "") return;

	if (status_current_token.id === gmReminders.currentTurn) return;

	gmReminders.currentTurn = status_current_token.id;
	gmReminders.GenerateNotes(status_current_token.id);
});

on("chat:message", function (msg) {
	try {
		if (msg.type === "api" && msg.who.includes("(GM)")) {
			if (msg.content.startsWith("!gmreminder")) {
				_.each(msg.selected, function (obj) {
					if (obj._type == "graphic") {
						gmReminders.GenerateNotes(obj._id);
					}
				});
			} else if (msg.content.startsWith("!doattack")) {
				gmReminders.DoAttack(msg.content.replace("!doattack ", ""));
			} else if (msg.content.startsWith("!spellbook")) {
				gmReminders.GenerateSpellbook(msg.content.replace("!spellbook ", ""));
			} else if (msg.content.startsWith("!consumespell")) {
				gmReminders.ConsumeSpell(msg.content.replace("!consumespell ", ""));
			} else if (msg.content.startsWith("!roll")) {
				gmReminders.ExecuteRoll(msg.content.replace("!roll ", ""));
			} else if (msg.content.startsWith("!createcharacter")) {
				_.each(msg.selected, function (obj) {
					if (obj._type == "graphic") {
						gmReminders.CreateCharacter(obj._id);
					}
				});
			} else if (msg.content.startsWith("!initiative")) {
				gmReminders.RollInitiative();
			} else if (msg.content.startsWith("!addreminder")) {
				_.each(msg.selected, function (obj) {
					if (obj._type == "graphic") {
						gmReminders.AddCustomReminder(obj._id, msg.content.replace("!addreminder ", ""));
					}
				});
			} else if (msg.content.startsWith("!removereminder")) {
				gmReminders.RemoveCustomReminder(msg.content.replace("!removereminder ", ""));
			}
		}
	} catch (ex) {
		sendChat("gmReminders", "/w gm Error ocurred whilst running '" + msg.content + "': " + ex.message);
	}
});
