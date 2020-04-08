/////////////////////////////////////////////////
/***********************************************/
var BloodAndHonor = {
  author: {
    name: "John C." || "Echo" || "SplenectomY",
    company: "Team Asshat" || "The Alehounds",
    contact: "echo@TeamAsshat.com",
  },
  version: "0.6",
  gist: "https://gist.github.com/SplenectomY/097dac3e427ec50f32c9",
  forum: "https://app.roll20.net/forum/post/1477230/",
  /***********************************************/
  /////////////////////////////////////////////////

  // This value should match the size of a standard grid in your campaign
  // Default is 70 px x 70 px square, Roll20's default.
  tokenSize: 70,

  spatters: [
    "https://s3.amazonaws.com/files.d20.io/images/118885485/oRPIivWUkRkXmIKsHLDoPA/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885486/re6Aacntn2HKF6tL1XAYew/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885481/DhyZ1CFqAvCkWaggznpsKA/thumb.png?1586243468",
    "https://s3.amazonaws.com/files.d20.io/images/118885483/G9w4ZMx6FnowYsu7eSF9IA/thumb.png?1586243468",
    "https://s3.amazonaws.com/files.d20.io/images/118885482/RbxW9i19RkXwDlUJ-KmDww/thumb.png?1586243468",
    "https://s3.amazonaws.com/files.d20.io/images/118885488/MI1puFn8W78roqNbXEm1kA/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885484/azSHiUV7SBfkhUsWuZDrOw/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885487/S3UCLToBjuEMWH1biKNnww/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885489/uwZImC6qgiictXmIbFF1fg/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885490/JkpEoGK7wq3WvgQE70K0HA/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885492/-_27uZh8MpfAibXOzD_GZw/thumb.png?1586243469",
    "https://s3.amazonaws.com/files.d20.io/images/118885491/jr5p_bKKyXM_pY_1UjWALw/thumb.png?1586243469",
  ],
  pools: [
    "https://s3.amazonaws.com/files.d20.io/images/118885351/7kpUxsrcz7LhEEx6R9L_-Q/thumb.png?1586243426",
    "https://s3.amazonaws.com/files.d20.io/images/118886608/hFwpcucR7GbS1WkGY8W1OQ/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886605/naHcKfY1lha1ZKlJd_asbw/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886602/YbDIcs-N8WA0l92fEKFYyw/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886604/lFZEH0bFXgsmSa2kr27_hA/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886606/v6ukj-EHHNoAB2sf1O2kLw/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886607/spI2w-kmuBCzplkxIzyv9Q/thumb.png?1586243739",
    "https://s3.amazonaws.com/files.d20.io/images/118886609/cV-VjzIt8eW7ZChS5-xFZg/thumb.png?1586243739",
  ],
  chooseBlood: function chooseBlood(type) {
    if (type == "spatter")
      return BloodAndHonor.spatters[
        randomInteger(BloodAndHonor.spatters.length) - 1
      ];
    if (type == "pool")
      return BloodAndHonor.pools[randomInteger(BloodAndHonor.pools.length) - 1];
  },
  getOffset: function getOffset() {
    if (randomInteger(2) == 1) return 1;
    else return -1;
  },
  hslToHex: function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  },
  bloodColor: function bloodColor(gmnotes) {
    var hue = 0;
    if (gmnotes.includes("bloodcolor_purple")) hue = 255;
    if (gmnotes.includes("bloodcolor_blue")) hue = 180;
    if (gmnotes.includes("bloodcolor_orange")) hue = 60;
    if (gmnotes.includes("bloodcolor_green")) hue = 300;

    var hueShift = randomInteger(6) - 3;
    hue += hueShift;
    if (hue < 0) hue = 0;

    var saturation = 100 - randomInteger(10);
    var lightness = 50 + (randomInteger(20) - 10);

    return BloodAndHonor.hslToHex(hue, saturation, lightness);
  },

  createBlood: function createBlood(
    gPage_id,
    gLeft,
    gTop,
    gWidth,
    gType,
    gColor
  ) {
    gLeft =
      gLeft + randomInteger(Math.floor(gWidth / 2)) * BloodAndHonor.getOffset();
    gTop =
      gTop + randomInteger(Math.floor(gWidth / 2)) * BloodAndHonor.getOffset();
    setTimeout(function () {
      toFront(
        fixedCreateObj("graphic", {
          imgsrc: gType,
          gmnotes: "blood",
          pageid: gPage_id,
          left: gLeft,
          tint_color: gColor,
          top: gTop,
          rotation: randomInteger(360) - 1,
          width: gWidth,
          height: gWidth,
          layer: "map",
        })
      );
    }, 50);
  },
};

fixedCreateObj = (function () {
  return function () {
    var obj = createObj.apply(this, arguments);
    if (obj && !obj.fbpath) {
      obj.fbpath = obj.changed._fbpath.replace(/([^\/]*\/){4}/, "/");
    }
    return obj;
  };
})();

on("ready", function (obj) {
  on("change:graphic:bar1_value", function (obj, prev) {
    var hpMax = obj.get("bar1_max");
    var hpCurr = obj.get("bar1_value");

    if (
      hpMax === "" ||
      obj.get("layer") !== "objects" ||
      obj.get("gmnotes").includes("noblood")
    ) {
      return;
    }

    // Create spatter near token if "bloodied".
    // Chance of spatter depends on severity of damage
    else if (hpCurr <= hpMax / 2 && prev["bar1_value"] > hpCurr && hpCurr > 0) {
      if (randomInteger(hpMax) > hpCurr) {
        BloodAndHonor.createBlood(
          obj.get("_pageid"),
          obj.get("left"),
          obj.get("top"),
          BloodAndHonor.tokenSize,
          BloodAndHonor.chooseBlood("spatter"),
          BloodAndHonor.bloodColor(obj.get("gmnotes"))
        );
      }
    }
    // Create pool near token if health drops below 1.
    else if (hpCurr <= 0) {
      BloodAndHonor.createBlood(
        obj.get("_pageid"),
        obj.get("left"),
        obj.get("top"),
        Math.floor(BloodAndHonor.tokenSize * 1.5),
        BloodAndHonor.chooseBlood("pool"),
        BloodAndHonor.bloodColor(obj.get("gmnotes"))
      );
    }
  });

  on("chat:message", function (msg) {
    if (msg.type == "api" && msg.content.indexOf("!clearblood") !== -1) {
      if (!msg.who.includes("GM")) {
        sendChat(
          msg.who,
          "/w " + msg.who + " You are not authorized to use that command!"
        );
        return;
      } else {
        objects = findObjs({type:'graphics', gmnotes:'blood'});
        _.each(objects, function (obj) {
          obj.remove();
        });
      }
    }
  });
});
