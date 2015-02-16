// Generated by CoffeeScript 1.9.0
var checkNewSource, createStackFile, exec, fs, getRepo, log, move, path, pathRoot, removeOldDir, rimraf, rm, spawn, updateSourceDir;

path = require("path");

fs = require('fs');

spawn = require('child_process').spawn;

exec = require('child_process').exec;

log = require('printit')();

rimraf = require('rimraf');

pathRoot = "/usr/local/cozy/apps/";

checkNewSource = function(name) {
  var packagePath;
  packagePath = path.join(pathRoot, name, "package.json");
  return (name === "stack.json") || fs.existsSync(packagePath);
};

getRepo = function(name) {
  var mainRepo, rep, reps, _i, _len;
  mainRepo = path.join(pathRoot, name, name);
  if (fs.existsSync(mainRepo)) {
    reps = fs.readdirSync(mainRepo);
    for (_i = 0, _len = reps.length; _i < _len; _i++) {
      rep = reps[_i];
      if (rep.indexOf('.') === -1) {
        return rep;
      }
    }
  } else {
    rimraf(path.join(pathRoot, name), function(err) {
      if (err != null) {
        return log.error(err);
      }
    });
    return [];
  }
};

move = function(source, dest, callback) {
  var child;
  child = spawn('sudo', ["mv", source, dest]);
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function(msg) {
    return log.info(msg);
  });
  return child.on('close', function(code) {
    if (code !== 0) {
      log.info("Cannot move old source");
      return callback(name + " : Cannot move old source");
    } else {
      return callback();
    }
  });
};

rm = function(dir, callback) {
  var child;
  child = spawn('sudo', ["rm", "-rf", dir]);
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', function(msg) {
    return log.error(msg);
  });
  return child.on('close', function(code) {
    if (code !== 0) {
      log.error("Cannot move old source");
      return callback(name + " : Cannot remove old source");
    } else {
      log.info(dir + " : Moved");
      return callback();
    }
  });
};

updateSourceDir = function(apps, callback) {
  var dest, name, repo, source;
  if (apps.length > 0) {
    name = apps.pop();
    if (!checkNewSource(name)) {
      repo = getRepo(name);
      if (repo.length > 0) {
        source = path.join(pathRoot, name);
        dest = path.join(pathRoot, "tmp-" + name);
        return move(source, dest, function(err) {
          if (err != null) {
            return callback(err);
          } else {
            source = path.join(pathRoot, "tmp-" + name, name, repo);
            dest = path.join(pathRoot, name);
            return move(source, dest, function(err) {
              var appPath;
              if (err) {
                return callback(err);
              } else {
                appPath = "/usr/local/cozy/apps/tmp-" + name;
                return rm(appPath, function(err) {
                  if (err != null) {
                    return callback(err);
                  } else {
                    return updateSourceDir(apps, callback);
                  }
                });
              }
            });
          }
        });
      } else {
        return updateSourceDir(apps, callback);
      }
    } else {
      log.info(name + " : Already moved");
      return updateSourceDir(apps, callback);
    }
  } else {
    return callback();
  }
};

createStackFile = function(callback) {
  var autostartPath, stackFile;
  autostartPath = "/usr/local/cozy/autostart";
  if (fs.existsSync(autostartPath)) {
    stackFile = "/usr/local/cozy/apps/stack.json";
    return fs.open(stackFile, 'w', function(err) {
      var file, files, manifestDataSystem, manifestHome, manifestProxy, stack, _i, _len;
      files = fs.readdirSync('/usr/local/cozy/autostart/');
      stack = {};
      for (_i = 0, _len = files.length; _i < _len; _i++) {
        file = files[_i];
        if (file.indexOf('home') !== -1) {
          manifestHome = fs.readFileSync(path.join(autostartPath, file), 'utf8');
          stack.home = JSON.parse(manifestHome);
        } else if (file.indexOf('proxy') !== -1) {
          manifestProxy = fs.readFileSync(path.join(autostartPath, file), 'utf8');
          stack.proxy = JSON.parse(manifestProxy);
        } else if (file.indexOf('data-system') !== -1) {
          manifestDataSystem = fs.readFileSync(path.join(autostartPath, file), 'utf8');
          stack['data-system'] = JSON.parse(manifestDataSystem);
        }
      }
      return fs.writeFile(stackFile, JSON.stringify(stack), callback);
    });
  } else {
    return callback();
  }
};

removeOldDir = function(callback) {
  if (fs.existsSync('/etc/cozy/tokens')) {
    fs.rmdirSync('/etc/cozy/tokens');
  }
  if (fs.existsSync('/etc/cozy/controller.token')) {
    fs.unlinkSync('/etc/cozy/controller.token');
  }
  if (fs.existsSync('/usr/local/cozy/config')) {
    fs.rmdirSync('/usr/local/cozy/config');
  }
  if (fs.existsSync('/usr/local/cozy/packages')) {
    fs.rmdirSync('/usr/local/cozy/packages');
  }
  if (fs.existsSync('/usr/local/cozy/tmp')) {
    fs.rmdirSync('/usr/local/cozy/tmp');
  }
  if (fs.existsSync('/etc/cozy/pids')) {
    rimraf('/etc/cozy/pids', function(err) {
      if (err != null) {
        return log.error(err);
      }
    });
  }
  if (fs.existsSync('/usr/local/var/log/cozy')) {
    rimraf('/usr/local/var/log/cozy', function(err) {
      if (err != null) {
        return log.error(err);
      }
    });
  }
  if (fs.existsSync('/usr/local/cozy/autostart')) {
    return rimraf('/usr/local/cozy/autostart', function(err) {
      if (err != null) {
        log.error(err);
      }
      return callback(err);
    });
  }
};

module.exports.apply = function(callback) {
  var dirs;
  log.info("APPLY patch ...");
  if (fs.existsSync('/etc/cozy/controller.token')) {
    fs.unlinkSync('/etc/cozy/controller.token');
  }
  dirs = fs.readdirSync('/usr/local/cozy/apps');
  log.info("Move old source directory ...");
  return updateSourceDir(dirs, function(err) {
    if (err != null) {
      log.error(err);
      return callback(err);
    } else {
      log.info("Create Stack File ...");
      return createStackFile(function(err) {
        if (err != null) {
          return callback(err);
        } else {
          log.info("Remove old directory ...");
          return removeOldDir(function(err) {
            if (err != null) {
              return callback(err);
            } else {
              return callback();
            }
          });
        }
      });
    }
  });
};
