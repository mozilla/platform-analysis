// jshint esnext:true

var fs = require('fs');
var path = require('path');
var request = require('request');

var cachePath = path.join(__dirname, '.cache');
var indexPath = path.join(cachePath, '.index.json');

var DEBUG = false;

function error() {
  if (!DEBUG) return;
  console.error.apply(console,['[cache]'].concat(Array.from(arguments)));
}

const EXPIRY = 1000 * 60 * 60 * 8;

var index;

function init() {
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath);
  }

  try {
    index = JSON.parse(fs.readFileSync(indexPath).toString());
  } catch (e) {
    index = {};
  }
}

function update(entry, entryPath, data) {
  index[entry] = Date.now();
  try {
    fs.writeFile(entryPath, data);
    fs.writeFile(indexPath, JSON.stringify(index, null, 4));
  } catch (e) {
    error('error updating cache:', e);
  }
}

function get(url, force) {
  return new Promise(function (resolve, reject) {
    var entryPath = path.join(cachePath, encodeURIComponent(url) + '.json');
    var entry = index[url] || 0;
    var result;
    var hitFailed = true;
    if (Date.now() - entry < EXPIRY && !force) {
      try {
        result = JSON.parse(fs.readFileSync(entryPath));
        resolve(result);
        hitFailed = false;
      } catch (e) {
        error('cache error:', e);
      }
    }
    if (hitFailed) {
      if (force) {
      } else if (entry > 0) {
      } else {
      }

      error('fetching', url);
      request(url, function (error, response, body) {
        try {
          var obj = JSON.parse(body);
          resolve(obj);
          update(url, entryPath, body);
        } catch (e) {
          error('request error: ', url, e);
          reject(e);
          return;
        }
      });
    }
  });
}

init();

module.exports = {
  get: get
};
