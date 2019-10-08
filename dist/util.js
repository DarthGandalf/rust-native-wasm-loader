'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reverseString = exports.clapVersion = exports.execPermissive = exports.execAsync = undefined;

var _child_process = require('child_process');

var _util = require('util');

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const execAsync = exports.execAsync = (0, _util.promisify)(_child_process.exec);

const execPermissive = exports.execPermissive = (() => {
  var _ref = _asyncToGenerator(function* (cmd, srcDir) {
    try {
      let options = { cwd: srcDir, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 * 1024 };
      return yield execAsync(cmd, options);
    } catch (e) {
      return e;
    }
  });

  return function execPermissive(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const clapVersion = exports.clapVersion = (() => {
  var _ref2 = _asyncToGenerator(function* (tool, srcDir) {
    return (yield execPermissive(`${tool} --version`, srcDir)).stdout.split(' ').slice(-1)[0].trim();
  });

  return function clapVersion(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
})();

const reverseString = exports.reverseString = str => str.split('').reverse().join('');