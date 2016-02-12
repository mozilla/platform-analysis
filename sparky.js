//jshint esnext:true

function sparky(series, width) {
  var len = series.length;
  width = width || len;
  var chunk = (len / width);
  var scaled = [];
  for (var i = 0; i < width; i++) {
    var start = Math.round(i*chunk);
    var end = Math.min(Math.round(i * chunk + chunk), len);
    var c = series.slice(start, end);
    var ca = avg(c);
    scaled.push(ca);
  }

  function avg(a) {
    return a.reduce((_, v) => _ + v, 0) / a.length;
  }

  var min = scaled.reduce((_, v) => Math.min(_, v), Infinity);
  var max = scaled.reduce((_, v) => Math.max(_, v), -Infinity);

  var range = max - min;
  var binned = scaled.map(v => {
    return Math.round((v-min) / range * 3);
  });

  var out = '';

  for (i=0; i < binned.length; i+=2) {
    var n = 0x2800;
    var a = (3-binned[i]);
    var b = (3-binned[i+1]);
    if (a === 3) {
      if (b === 3) {
        n = 0x28C0;
      } else {
        n = 0x2840 + (4 << (b+1));
      }
    } else {
      if (b === 3) {
        n = 0x2880 + (1<<a);
      } else {
        n = 0x2800 + (1<<a) + (1<<(b+3));
      }
    }
    out += String.fromCodePoint(n);
  }

  return out;
}
