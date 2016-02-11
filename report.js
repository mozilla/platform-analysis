// jshint esnext:true

var fs = require('fs');
var path = require('path');

function pad(s, length) {
  s = (s && s.toString()) || '';
  if (!length) {
    console.trace();
    throw 'bad length';
  }
  if (s.length >= length) return s;
  return s + Array(length - s.length + 1).join(' ');
}

function Report(name) {
  this.name = name;
  this.output = '';
}
Report.prototype.header = function (s) {
  this.output += '# ' + s + '\n\n';
};

Report.prototype.table = function (rows) {
  var headers = Object.keys(rows[0]);

  var widths = headers.map((h) => {
    return rows.reduce((c, r) => Math.max(c, r[h].toString().length), h.length);
  });

  this.output += headers.map((h, i) => pad(h, widths[i])).join(' | ');
  this.output += '\n';
  this.output += headers.map((h, i) => Array(widths[i]+1).join('-')).join(' | ');
  this.output += '\n';
  rows.forEach((row) => {
    this.output += headers.map((h, i) => pad(row[h].toString(), widths[i])).join(' | ');
    this.output += '\n';
  });
  this.output += '\n';
};

Report.prototype.write = function (filename) {
  if (!filename) {
    filename = this.name + '.md';
  }
  console.log('writing report', filename);
  var outputDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(path.join(outputDir, filename), this.output);
};

module.exports = Report;
