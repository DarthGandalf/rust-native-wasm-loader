'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleCargo = exports.cargoCommand = exports.findSrcDir = exports.parseDependencies = undefined;

var _error = require('./error');

var _util = require('./util');

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const parseDependencies = exports.parseDependencies = (data, baseFile) => data.split('\n').filter(str => str.startsWith(baseFile.replace(/ /g, '\\ '))).map(str => str.slice(str.indexOf(': ') + 2)).map(_util.reverseString).map(str => str.split(/(?: (?!\\))/)).reduce((allDeps, lineDeps) => [...allDeps, ...lineDeps], []).map(_util.reverseString).map(str => str.replace(/\\ /g, ' '));

const findSrcDir = exports.findSrcDir = (() => {
  var _ref = _asyncToGenerator(function* (childPath) {
    let candidate = childPath;

    while (candidate !== _path2.default.parse(candidate).root) {
      const maybeCargoFile = _path2.default.join(candidate, 'Cargo.toml');
      if (yield _fsExtra2.default.pathExists(maybeCargoFile)) {
        return candidate;
      }

      const newCandidate = _path2.default.dirname(candidate);
      if (newCandidate === candidate) {
        break;
      }
      candidate = newCandidate;
    }

    return null;
  });

  return function findSrcDir(_x) {
    return _ref.apply(this, arguments);
  };
})();

const cargoCommand = exports.cargoCommand = (target, release, subcmd = []) => {
  const cmd = ['cargo', ...subcmd, 'build', '--message-format=json', '--target=' + target];

  if (release) {
    cmd.push('--release');
  }

  return cmd.join(' ');
};

const handleCargo = exports.handleCargo = (() => {
  var _ref2 = _asyncToGenerator(function* (self, result) {
    let wasmFile;
    let jsFile;
    let hasError = false;
    outer: for (let line of result.stdout.split('\n')) {
      if (/^\s*$/.test(line)) {
        continue;
      }
      const data = JSON.parse(line);
      switch (data.reason) {
        case 'compiler-message':
        case 'message':
          switch (data.message.level) {
            case 'warning':
              self.emitWarning(new Error(data.message.rendered));
              break;
            case 'error':
              self.emitError(new Error(data.message.rendered));
              hasError = true;
              break;
          }
          break;
        case 'compiler-artifact':
          if (!wasmFile) {
            wasmFile = data.filenames.find(function (p) {
              return p.endsWith('.wasm');
            });
          }
          if (!jsFile) {
            jsFile = data.filenames.find(function (p) {
              return p.endsWith('.js');
            });
          }
          if (wasmFile) {
            break outer;
          }
          break;
      }
    }

    if (result.code) {
      throw new _error.BuildError(result);
    }

    if (hasError) {
      throw new _error.BuildError('Cargo build failed');
    }

    if (wasmFile) {
      const depFile = wasmFile.slice(0, -'.wasm'.length) + '.d';
      const depContents = yield _fsExtra2.default.readFile(depFile, 'utf-8');
      const deps = parseDependencies(depContents, wasmFile);

      for (let dep of deps) {
        self.addDependency(dep);
      }
    }

    return { wasmFile, jsFile };
  });

  return function handleCargo(_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})();