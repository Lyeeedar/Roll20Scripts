var gmReminders = gmReminders || {};

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

	var lines = gmnotes.split("<br>");
	var inTactics = false;
	for (var index = 0; index < lines.length; index++) {
		var line = lines[index];

		if (
			line.startsWith("OFFENSE") ||
			line.startsWith("DEFENSE") ||
			line.startsWith("STATISTICS") ||
			line.startsWith("SPECIAL ABILITIES")
		) {
			inTactics = false;
		} else if (line.startsWith("Tactics") || line.startsWith("TACTICS")) {
			inTactics = true;
		} else if (inTactics) {
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

		var fastHealing = /fast healing ([0-9]+)/;
		var match = line.match(fastHealing);
		if (match !== null) {
			message += "<li>Fast Healing: " + match[1] + "</li>";
		}

		if (line.startsWith("AC")) {
			var ac = line.split("(")[0];
			ac += " " + gmReminders.GetRegexMatch(gmnotes, /CMD [0-9]+/);

			var fort = gmReminders.GetRegexMatch(gmnotes, /Fort \+[0-9]+/);
			var fortButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Fort 1d20" + fort.replace("Fort ", "") + "' title='" + fort + "'>Fort</a>"

			var ref = gmReminders.GetRegexMatch(gmnotes, /Ref \+[0-9]+/);
			var refButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Ref 1d20" + ref.replace("Ref ", "") + "' title='" + ref + "'>Ref</a>"

			var will = gmReminders.GetRegexMatch(gmnotes, /Will \+[0-9]+/);
			var willButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-Will 1d20" + will.replace("Will ", "") + "' title='" + will + "'>Will</a>"

			message +=
				"<li><a style='color:DeepSkyBlue' title='" +
				ac +
				"'>AC</a>" + fortButton + refButton + willButton + "</li>";
		}

		if (line.startsWith("Defensive Abilities")) {
			message +=
				"<li><a style='color:DeepSkyBlue' title='" +
				line.replace("Defensive Abilities ", "") +
				"'>Defenses</a></li>";
		}

		if (line.startsWith("Special Attacks")) {
			message +=
				"<li><a style='color:DeepSkyBlue' title='" +
				line.replace("Special Attacks ", "") +
				"'>Special Attacks</a></li>";
		}

		if (line.startsWith("Melee")) {
			var attackButton = gmReminders.BuildAttackButtons(
				line.replace("Melee ", "")
			);

			var cmb = gmReminders.GetRegexMatch(gmnotes, /CMB \+[0-9]+/);
			var cmbButton = "<a style='background:transparent;padding:0;padding-left:5px;color:DarkSlateBlue' href='!roll " + name + "-CMB 1d20" + cmb.replace("CMB ", "") + "' title='" + cmb + "'>CMB</a>"

			message +=
				"<li><div align='left' style='clear:both'>Melee:" +
				attackButton + cmbButton +
				"</div></li>";
		}

		if (line.startsWith("Ranged")) {
			var attackButton = gmReminders.BuildAttackButtons(
				line.replace("Ranged ", "")
			);
			message +=
				"<li><div align='left' style='clear:both'>Ranged:" +
				attackButton +
				"</div></li>";
		}

		if (line.startsWith("Aura")) {
			message +=
				"<li><a style='color:DarkOrange' title='" +
				line.replace("Aura ", "") +
				"'>Aura</a></li>";
		}

		if (line.includes(" Spells Prepared (CL ") || line.includes(" Spells Known (CL ")) {
			message +=
				"<li><a style='background:transparent; padding:0; color:DarkMagenta' href='!spellbook " + CharID + "'>Spellbook</a></li>";
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
};

gmReminders.GetRegexMatch = function (content, regex) {
	var match = content.match(regex);
	if (match !== null) {
		return match[0];
	}

	return "";
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

on("change:campaign:turnorder", function (args) {
	var status_current_token = gmReminders.GetCurrentToken();

	if (status_current_token === "") return;

	if (status_current_token.id === gmReminders.currentTurn) return;

	gmReminders.currentTurn = status_current_token.id;
	gmReminders.GenerateNotes(status_current_token.id);
});

on("chat:message", function (msg) {
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
		}
	}
});
