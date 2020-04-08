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

	var name = /(.*?) CR/;
	var namematch = gmnotes.match(name);

	if (namematch === null) {
		return;
	}

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
			message +=
				"<li><a style='color:DeepSkyBlue' title='" +
				ac +
				"'>AC</a></li>";
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
			message +=
				"<li><div align='left' style='clear:both'>Melee:" +
				attackButton +
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

		if (line.includes(" Spells Prepared (CL ")) {
			message +=
				"<li><a style='color:DarkMagenta' href='!spellbook " + CharID + "'>Spellbook</a></li>";
		}
	}

	if (message.length > 0) {
		sendChat(
			"gmReminder",
			"/w gm <b>Notes for " +
				namematch[1] +
				":</b><ul>" +
				message +
				"<ul>"
		);
	}
};

gmReminders.GetRegexMatch = function (content, regex) {
	var match = content.match(regex);
	if (match !== null) {
		return match[0] + "; ";
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
		}
	}
});
