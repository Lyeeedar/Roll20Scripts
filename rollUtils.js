var rollUtils = rollUtils || {};

rollUtils.EvaluateDiceExpression = function (roll) {
	let diceRegex = /[0-9]+d[0-9]+(>[0-9]+)?/

	let remainingRoll = roll;

	let hadCritHit = false;
	let hadCritMiss = false;

	let rolledDisplayString = "";
	let rolledString = "";
	while (remainingRoll != null && remainingRoll.length > 0) {
		let match = remainingRoll.match(diceRegex);
		if (match !== null) {
			let split = remainingRoll.split(diceRegex);
			rolledString += split[0];
			rolledDisplayString += split[0];

			let result = rollUtils.RollDice(match[0]);
			rolledString += result.total;

			let critResult = 20;
			if (match[1] != undefined) {
				critResult = parseInt(match[1].substr(1));
			}

			rolledDisplayString += "(";
			for (var i = 0; i < result.rolledValues.length; i++) {
				if (i > 0) {
					rolledDisplayString += "+";
				}

				let rolledValue = result.rolledValues[i];

				if (rolledValue == 1) {
					hadCritMiss = true;
					rolledDisplayString += `${rolledValue}!`;
				} else if (rolledValue >= critResult) {
					hadCritHit = true;
					rolledDisplayString += `${rolledValue}!`;
				} else {
					rolledDisplayString += `${rolledValue}`;
				}
			}
			rolledDisplayString += ")";
			
			remainingRoll = remainingRoll.substr(split[0].length + match[0].length);
		} else {
			rolledString += remainingRoll;
			rolledDisplayString += remainingRoll;
			break;
		}
	}

	let finalValue = eval(rolledString);

	roll = roll.replace("*", "x");
	rolledDisplayString = rolledDisplayString.replace("*", "x");
	return {
		originalRoll: roll,
		afterRolling: rolledDisplayString,
		result: finalValue,
		hadCritMiss: hadCritMiss,
		hadCritHit: hadCritHit
	}
};

rollUtils.RollDice = function (diceRoll) {
	let split = diceRoll.split("d");
	let count = parseInt(split[0]);
	let dice = parseInt(split[1]);
	
	let rolledValues = [];

	let value = 0;
	for (var i = 0; i < count; i++) {
		let val = randomInteger(dice);
		rolledValues.push(val);
		value += val;
	}

	return {
		total: value,
		rolledValues: rolledValues
	};
}

rollUtils.FormatRoll = function(rollResult) {
	var borderCol = "goldenrod";
	if (rollResult.hadCritHit) {
		borderCol = "green";
	} else if (rollResult.hadCritMiss) {
		borderCol = "red";
	}

	var spanStyle = `style='border:2px solid ${borderCol};background-color:yellow;padding:0.5px 2px 0.5px 2px;cursor:help'`;

	var output = `<span ${spanStyle} title='Rolling ${rollResult.originalRoll} = ${rollResult.afterRolling}'>`
	output += `${rollResult.result}`
	output += `</span>`

	return output;
};

var attackregex = /(.+?) ([^\+]*?) (\+[0-9\/\+]+) \(([^\s]+)( plus ([^)]*))?\)/;
rollUtils.DoAttack = function (rawattack, replyType) {
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
				var hit = c >= tohit.length ? tohit[tohit.length - 1] : tohit[c];

				var hitRoll = `1d20>${critvalue}${hit}`;
				var hitRollResult = rollUtils.EvaluateDiceExpression(hitRoll);

				var atk = `<td>`;
				atk += `${hit} hit ${rollUtils.FormatRoll(hitRollResult)}`;

				if (hitRollResult.hadCritHit) {
					var critRollResult = rollUtils.EvaluateDiceExpression(hitRoll);
					atk += `!!${rollUtils.FormatRoll(critRollResult)}`;
				}
				atk += `</td>`;

				var damRollResult = rollUtils.EvaluateDiceExpression(damage);
				atk += `<td>dam ${rollUtils.FormatRoll(damRollResult)}`;
				if (hitRollResult.hadCritHit) {
					var mult = parseInt(critMult.substr(1))-1;

					var critRollResult = rollUtils.EvaluateDiceExpression(`${damRollResult.result}+(${damage})*${mult}`);
					atk += `!!${rollUtils.FormatRoll(critRollResult)}`;
				}

				for (var a = 0; a < additionalParts.length; a++) {
					var part = additionalParts[a];
					if (part == undefined || part.length == 0) {
						continue;
					}

					var partRegex = /([0-9][^\s]+) (.+)/;
					var partMatch = part.match(partRegex);
					if (partMatch !== null) {
						var roll = partMatch[1];
						var type = partMatch[2];
						atk += ` + [[${roll}]] ${type}`;
					} else {
						atk += ` + ${part}`;
					}
				}

				atkTemplate += `<tr>${atk}</td></tr>`;
			}
			sendChat("rollUtils", `${replyType} <div class='sheet-rolltemplate-default'><table><caption>${attack}</caption>${atkTemplate}</table></div>`);
		}
	} catch (err) {
		sendChat("rollUtils", `${replyType} Failed to execute attack '${rawattack}' due to ${err.message}`);
	}
};

rollUtils.ExecuteRoll = function(argsraw, replyType) {
	var args = argsraw.splitArgs();
	sendChat("rollUtils", `${replyType} ${args[0]}: <div>${rollUtils.FormatRoll(rollUtils.EvaluateDiceExpression(args[1]))}</div>`);
};

on("chat:message", function (msg) {
    var replyType = msg.who.includes("(GM)") ? "/w gm" : "/direct";

	try {
		if (msg.type === "api") {
			if (msg.content.startsWith("!doattack")) {
				rollUtils.DoAttack(msg.content.replace("!doattack ", ""), replyType);
			} else if (msg.content.startsWith("!roll")) {
				rollUtils.ExecuteRoll(msg.content.replace("!roll ", ""), replyType);
			}
		}
	} catch (ex) {
		sendChat("rollUtils", `${replyType} Error ocurred whilst running '${msg.content}': ${ex.message}`);
    }
});