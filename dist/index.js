'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  const callback = this.async();
  load(this).then(r => callback(null, r), e => callback(e, null));
};

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _loaderUtils = require('loader-utils');

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _error = require('./error');

var _util = require('./util');

var _cargo = require('./cargo');

var _semver = require('semver');

var semver = _interopRequireWildcard(_semver);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DEFAULT_OPTIONS = {
  release: false,
  gc: false,
  target: 'wasm32-unknown-unknown',
  cargoWeb: false,
  name: undefined,
  regExp: undefined,
  wasmBindgen: false,
  wasm2es6js: false,
  typescript: false
};

const SUPPORTED_WASM_BINDGEN_VERSION = '^0.2';
const SUPPORTED_CARGO_WEB_VERSION = '^0.6.9';
const MIN_WEBPACK_NATIVE_WASM_VERSION = '^4.0.0';

const loadWasmBindgen = (() => {
  var _ref = _asyncToGenerator(function* (self, { release, target, wasmBindgen }, srcDir) {
    const wasmBindgenVersion = yield (0, _util.clapVersion)('wasm-bindgen', srcDir);
    const webpackVersion = yield (0, _util.clapVersion)('npx webpack', srcDir);

    if (!semver.satisfies(wasmBindgenVersion, SUPPORTED_WASM_BINDGEN_VERSION)) {
      throw new _error.BuildError(`wasm-bindgen version not supported; got ${wasmBindgenVersion} but need ${SUPPORTED_WASM_BINDGEN_VERSION}`);
    }

    const cmd = (0, _cargo.cargoCommand)(target, release);
    const result = yield (0, _util.execPermissive)(cmd, srcDir);

    const { wasmFile } = yield (0, _cargo.handleCargo)(self, result);

    if (!wasmFile) {
      throw new _error.BuildError('No wasm file produced as build output');
    }
    const suffixlessPath = wasmFile.slice(0, -'.wasm'.length);
    const moduleDir = _path2.default.dirname(wasmFile);

    const wasmBindgenCmd = ['wasm-bindgen', wasmFile, '--out-dir', moduleDir];

    if (wasmBindgen.typescript) {
      wasmBindgenCmd.push('--typescript');
    }

    if (wasmBindgen.nodejs) {
      wasmBindgenCmd.push('--nodejs');
    }

    if (wasmBindgen.debug) {
      wasmBindgenCmd.push('--debug');
    }

    yield (0, _util.execAsync)(wasmBindgenCmd.join(' '));
    yield _fsExtra2.default.remove(suffixlessPath + '.wasm');

    if (wasmBindgen.wasm2es6js) {
      const glueWasmPath = suffixlessPath + '_bg.wasm';
      const glueJsPath = suffixlessPath + '_bg.js';

      yield (0, _util.execAsync)(`wasm2es6js ${glueWasmPath} -o ${glueJsPath} --base64`);
      yield _fsExtra2.default.remove(glueWasmPath);
    }

    if (wasmBindgen.typescript) {
      const tsdPath = suffixlessPath + '.d.ts';
      const jsPath = suffixlessPath + '.js';
      const wasmPath = suffixlessPath + (wasmBindgen.wasm2es6js ? '_bg.js' : '_bg.wasm');

      const jsRequest = _loaderUtils2.default.stringifyRequest(self, jsPath);
      const tsdRequest = _loaderUtils2.default.stringifyRequest(self, tsdPath);
      const wasmRequest = _loaderUtils2.default.stringifyRequest(self, wasmPath);

      let contents = `
/// <reference path=${tsdRequest} />
export * from ${jsRequest};
`;
      if (wasmBindgen.wasm2es6js) {
        contents += `
import * as wasm from ${wasmRequest};
export const wasmBooted: Promise<boolean> = wasm.booted
`;
      }
      return contents;
    } else if (!wasmBindgen.wasm2es6js && semver.satisfies(webpackVersion, MIN_WEBPACK_NATIVE_WASM_VERSION)) {
      const jsRequest = _loaderUtils2.default.stringifyRequest(self, suffixlessPath + '.js');

      return `module.exports.wasmBooted = import(${jsRequest}).then(wasmModule => {
      const keys = Object.keys(wasmModule);
      for (let key of keys) module.exports[key] = wasmModule[key];
    })`;
    } else {
      const jsRequest = _loaderUtils2.default.stringifyRequest(self, suffixlessPath + '.js');
      let contents = '';
      if (wasmBindgen.nodejs) {
        contents += `module.exports = require(${jsRequest});\n`;
      } else {
        contents += `export * from ${jsRequest};\n`;
      }
      if (wasmBindgen.wasm2es6js) {
        const wasmImport = suffixlessPath + '_bg';
        const wasmRequest = _loaderUtils2.default.stringifyRequest(self, wasmImport);
        if (wasmBindgen.nodejs) {
          contents += `module.exports.wasmBooted = require(${wasmRequest}).booted\n`;
        } else {
          contents += `export {booted as wasmBooted} from ${wasmRequest};\n`;
        }
      }
      return contents;
    }
  });

  return function loadWasmBindgen(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
})();

const loadCargoWeb = (() => {
  var _ref2 = _asyncToGenerator(function* (self, { release, target, cargoWeb }, srcDir) {
    const cargoWebVersion = yield (0, _util.clapVersion)('cargo web', srcDir);

    if (!semver.satisfies(cargoWebVersion, SUPPORTED_CARGO_WEB_VERSION)) {
      throw new _error.BuildError(`cargo-web version not supported; got ${cargoWebVersion} but need ${SUPPORTED_CARGO_WEB_VERSION}`);
    }

    const cmd = (0, _cargo.cargoCommand)(target, release, ['web']);
    const result = yield (0, _util.execPermissive)(cmd, srcDir);

    const { wasmFile, jsFile } = yield (0, _cargo.handleCargo)(self, result);

    if (!wasmFile) {
      throw new _error.BuildError('No wasm file produced as build output');
    }
    if (!jsFile) {
      throw new _error.BuildError('No js file produced as build output');
    }

    const jsData = yield _fsExtra2.default.readFile(jsFile, 'utf-8');
    const wasmData = yield _fsExtra2.default.readFile(wasmFile);

    const context = self.context || self.options && self.options.context;
    const wasmOutFileName = _loaderUtils2.default.interpolateName(self, cargoWeb.name, {
      context, content: wasmData, regExp: cargoWeb.regExp
    });

    self.emitFile(wasmOutFileName, wasmData);

    // Ugly way to do replaceAll... would be great to have some way to create a custom template here
    return jsData.split(`fetch( ${JSON.stringify(_path2.default.basename(wasmFile))} )`).join(`fetch(__webpack_public_path__ + ${JSON.stringify(wasmOutFileName)})`).split(JSON.stringify(_path2.default.basename(wasmFile))).join(JSON.stringify(wasmOutFileName));
  });

  return function loadCargoWeb(_x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
})();

const loadRaw = (() => {
  var _ref3 = _asyncToGenerator(function* (self, { release, gc, target }, srcDir) {
    const cmd = (0, _cargo.cargoCommand)(target, release);
    const result = yield (0, _util.execPermissive)(cmd, srcDir);

    let { wasmFile } = yield (0, _cargo.handleCargo)(self, result);

    if (!wasmFile) {
      throw new _error.BuildError('No wasm file produced as build output');
    }

    if (gc) {
      let gcWasmFile = wasmFile.substr(0, wasmFile.length - '.wasm'.length) + '.gc.wasm';
      yield (0, _util.execAsync)(`wasm-gc ${wasmFile} ${gcWasmFile}`);
      wasmFile = gcWasmFile;
    }

    return yield _fsExtra2.default.readFile(wasmFile);
  });

  return function loadRaw(_x7, _x8, _x9) {
    return _ref3.apply(this, arguments);
  };
})();

const load = (() => {
  var _ref4 = _asyncToGenerator(function* (self) {
    const srcDir = yield (0, _cargo.findSrcDir)(self.resourcePath);
    if (!srcDir) {
      throw new _error.BuildError('No Cargo.toml file found in any parent directory.');
    }
    self.addDependency(_path2.default.join(srcDir, 'Cargo.toml'));

    const opts = Object.assign({}, DEFAULT_OPTIONS, _loaderUtils2.default.getOptions(self));
    const cargoWeb = opts.cargoWeb;
    const wasmBindgen = opts.wasmBindgen;

    if (wasmBindgen || cargoWeb) {
      try {
        if (wasmBindgen) {
          return yield loadWasmBindgen(self, opts, srcDir);
        } else if (cargoWeb) {
          return yield loadCargoWeb(self, opts, srcDir);
        } else {
          throw new Error('Unreachable code');
        }
      } catch (e) {
        if (e instanceof _error.BuildError) {
          self.emitError(e);
          return `throw new Error(${JSON.stringify(e.message)});\n`;
        } else {
          throw e;
        }
      }
    } else {
      return yield loadRaw(self, opts, srcDir);
    }
  });

  return function load(_x10) {
    return _ref4.apply(this, arguments);
  };
})();

;