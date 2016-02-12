// jshint esnext:true
var request = require('request');
var stats = require('simple-statistics');
var cache = require('./cache');
var ProgressBar = require('progress');
var Report = require('./document');

function analyze(series) {
  var points = series.data.filter(function (datum) {
    return datum.property_name !== 'ERROR';
  }).map(function (datum) {
    return datum.day_percentage;
  }).slice(-180);

  var scatter = pairs(series.data, 'day_percentage');
  var a = avg(points);
  var slope = stats.linearRegression(scatter).m;
  var start = avg(points.slice(0,5));
  var end = avg(points.slice(-5));
  var max = points.reduce((_, v) => Math.max(_, v), 0);

  return {
    feature: series.name,
    raw: new Link('📈', series.rawURL),
    max: pct(max),
    avg: pct(a),
    trend: truncate(slope * 10000, 2)
  };
}

function fetchSeq(list) {
  var bar = new ProgressBar(':percent [:bar] :feature ', {
    total: list.length,
    incomplete: ' ',
    width: 30
  });
  return new Promise(function (resolve, reject) {
    var totalNum = list.length;
    var results = [];
    var current = 0;
    function next() {
      bar.tick({feature: list[current].name.substr(0, 40)});
      cache.get(list[current].url)
        .then(function (obj) {
          list[current].data = obj;
          results.push(list[current]);
          current++;
          if (current >= totalNum) {
            resolve(results);
          } else {
            setTimeout(next, 0);
          }
        }).catch(reject);
    }

    next();
  });
}

function Link(text, url) {
  this.text = text;
  this.href = url;
}
Link.prototype.toMarkdown = function() {
  return '[' + this.text + '](' + this.href + ')';
};
Link.prototype.toString = function() {
  return this.text;
};

function avg(arr) {
  return arr.reduce((last, current) => last + current, 0) / arr.length;
}

function truncate(n, digits) {
  return (n * Math.pow(10, digits) | 0) / Math.pow(10, digits);
}

function pct(n) {
  return truncate(n * 100, 2);
}

function pairs(arr, field) {
  return arr.map((row, i) => [i, row[field]]);
}

function sort(field, asc) {
  return function (a, b) {
    if (asc) {
      return b[field] > a[field] ? -1 : 1;
    }
    return b[field] > a[field] ? 1 : -1;
  };
}

function err(pre) {
  return function (err) {
    console.error(pre, err, err.stack);
  };
}

process.stdout.write('fetching CSS property list... ');
cache.get('https://www.chromestatus.com/data/csspopularity')
.then(function (data) {
  process.stdout.write('done.\n');
  console.log('ranking features');

  data = data.filter(function (feature) {
    return feature.property_name && feature.day_percentage < 0.5 && feature.property_name !== 'ERROR';
  });

  console.log('fetching individual timeseries');

  return fetchSeq(data.map(function (feature) {
    return {
      name: feature.property_name,
      id: feature.bucket_id,
      rawURL: 'https://www.chromestatus.com/metrics/css/timeline/popularity/' + feature.bucket_id,
      full: feature,
      url: 'https://www.chromestatus.com/data/timeline/csspopularity?bucket_id=' + feature.bucket_id
    };
  })).then(function(timeseries) {
    console.log('success.');

    console.log('analzying timeseries data');
    var compiled = timeseries.map(analyze);

    var rising = new Report('css-rising');
    rising.header('Rising CSS Properties');
    rising.timestamp();
    rising.table(compiled.filter(row => row.trend > 0).sort(sort('trend')));
    rising.write();

    var all = new Report('css-all');
    all.header('All CSS Properties');
    all.timestamp();
    all.table(compiled.sort(sort('feature', true)));
    all.write();

    var prefixed = compiled.filter(row => /^(alias-)?webkit-/.test(row.feature));
    prefixed.forEach(row => {
      row.unprefixed = row.feature.replace(/^(alias-)?webkit-/, '');
    });
    var prefixIndex = prefixed.map(row => row.unprefixed);
    var unprefixed = compiled.filter(row => prefixIndex.indexOf(row.feature) > -1);
    unprefixed = unprefixed.map(row => {
      var prefixedProperty = prefixed[prefixIndex.indexOf(row.feature)];
      return {
        feature: row.feature,
        bare: row.avg,
        prefixed: prefixedProperty.avg,
        diff: truncate(row.avg - prefixedProperty.avg, 2)
      };
    });

    var prefixReport = new Report('prefix');
    prefixReport.header('Prefixed vs Unprefixed Properties');
    prefixReport.timestamp();
    prefixReport.table(unprefixed.sort(sort('diff')));
    prefixReport.write();

    console.log('Done.');
  }).catch(err('processing error'));
})
.catch(err('fetch error'))
.then(function () {
  process.stdout.write('fetching JS feature list... ');
  return cache.get('https://www.chromestatus.com/data/featurepopularity');
})
.then(function (data) {
  process.stdout.write('done.\n');
  console.log('ranking features');

  data = data.filter(function (feature) {
    return feature.property_name && feature.day_percentage < 0.5 && feature.property_name !== 'ERROR';
  });

  console.log('fetching individual timeseries');

  fetchSeq(data.map(function (feature) {
    return {
      name: feature.property_name,
      rawURL: 'https://www.chromestatus.com/metrics/css/timeline/popularity/' + feature.bucket_id,
      full: feature,
      url: 'https://www.chromestatus.com/data/timeline/featurepopularity?bucket_id=' + feature.bucket_id
    };
  })).then(function(timeseries) {
    console.log('success.');

    console.log('analzying timeseries data');
    var compiled = timeseries.map(analyze);

    var all = new Report('js-all');
    all.header('All JS Features');
    all.timestamp();
    all.table(compiled.sort(sort('feature', true)));
    all.write();

    var trending = new Report('js-trending');
    trending.header('Trending JS Features');
    trending.timestamp();
    trending.table(compiled.sort(sort('trend', false)));
    trending.write();

    console.log('Done.');
  }).catch(err('processing error'));
})
.catch(err('fetch error'));
