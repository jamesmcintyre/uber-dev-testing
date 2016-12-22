'use strict';

const fs = require('fs');

const watch = require('watch');

const parser = require('gitignore-parser');
const gitignore = parser.compile(fs.readFileSync('.gitignore', 'utf8'));

const _ = require('lodash');


let globalOptions = {};


//TODO: this won't be full-proof but good for now
const getCurrentPath = () => process.cwd();

const getPackageJSON = (modulePath) => {
  const pckgJsonPath = `${(modulePath || getCurrentPath())}/package.json`;
  if (fs.existsSync(pckgJsonPath)) {
    return JSON.parse(fs.readFileSync(pckgJsonPath, 'utf8'));
  }
  //TODO: add proper error handling
  console.log("There is no package.json in this directory!");
};

const getDependancies = (pkgJSON, opts) => {
  if (!opts || !("dev" in opts)) {
    opts = { dev: true };
  }
  const deps = opts.dev
    ? Object.assign(pkgJSON.dependencies, pkgJSON.devDependencies)
    : pkgJSON.dependencies;
  if (deps) {
    return Object.keys(deps).map(key => {
      let obj = {};
      obj[key] = deps[key];
      return obj;
    })
  }
  console.log("No dependencies!");
}

const getLocalDependancies = (deps) => {
  return deps
    .filter(dep => Object.values(dep)[0].includes('file:/'))
    .map(dep => {
      return {
        moduleName: Object.keys(dep)[0],
        modulePath: Object.values(dep)[0].replace('file:', '')
      };
    })
}


const getNestedLocalDependancies = (localDependencies, cb) => {
  localDependencies.forEach((dep) => {
    const levelOneNestedDeps = getLocalDependancies(getDependancies(getPackageJSON(dep.modulePath)));

    let levelTwoNestedDeps = levelOneNestedDeps.length > 0
      ? levelOneNestedDeps.map((dep) => getLocalDependancies(getDependancies(getPackageJSON(dep.modulePath))))
      : [];
    levelTwoNestedDeps = [].concat.apply([], levelTwoNestedDeps);

    let levelThreeNestedDeps = levelTwoNestedDeps.length > 0
      ? levelTwoNestedDeps.map((dep) => getLocalDependancies(getDependancies(getPackageJSON(dep.modulePath))))
      : [];
    levelThreeNestedDeps = [].concat.apply([], levelThreeNestedDeps);

    const recurseThreeLevelsLocalDeps = levelOneNestedDeps.concat(levelTwoNestedDeps, levelThreeNestedDeps);

    // TODO: likely best to do unlimited recursing here but will settle for 3 levels deep for now
    // simply refact getNestedLocalDependancies to normalize input array w/ one level deep array then call itself if result array is larger
    // than input array, getNestedLocalDependancies would take input,
    cb(recurseThreeLevelsLocalDeps);
  })
}


const addNestedLocalDependancies = (localDependencies, cb) => {
  getNestedLocalDependancies(localDependencies, (allNestedDependancies) => {
    const allLocalDependancies = localDependencies.concat(allNestedDependancies);
    const deduped = _.uniqBy(allLocalDependancies, 'modulePath');
    cb(deduped);
  });
}


//TODO NEXT: write a fn that build an object tree of deps, then a fn that takes a path from change
// event and finds it in that three then finds the module with uses it that is in the root pkg.json
// then a fn which kills webpack-dev-server, npm i's that module and restarts webpack-dev-server
// lastly an options to constantly re-gen a prompt to run correct combo of the above but allow
// user to choose when to rebuild




const watchLocalPaths = (localDeps, filterFn) => {

  const pathsArray = localDeps.map(dep => dep.modulePath);
  const options = {
    filter: filterFn,
    ignoreUnreadableDir: true,
    ignoreNotPermitted: true,
    ignoreDotFiles: true
  }

  pathsArray.forEach((path) => {
    watch.watchTree(path, options, function (f, curr, prev) {
      if (typeof f == "object" && prev === null && curr === null) {
        // Finished walking the tree
        console.log('finished walking the tree');
      } else if (prev === null) {
        // f is a new file
        console.log(`${f} is a new file`)
      } else if (curr.nlink === 0) {
        // f was removed
        console.log(`${f} was removed`)
      } else {
        // f was changed
        if(filterFn(f.replace(path, ''))) {
          console.log(`${f} was changed and we do care`)
        } else if (!filterFn(f.replace(path, ''))) {
          console.log(`${f} was changed but we don't care`)
        }

      }
    })
  })
}



let depAnalysis = {
  pkgJson: getPackageJSON(),
  onlyRootDependencies: getDependancies(getPackageJSON()),
  localDependencies: [],
  watchFileFilter: gitignore.accepts, //TODO: refact to take path to remove and run correct match, also maybe instantiate a unique fn for each repo/gitignore
  watchLocalPaths
};





addNestedLocalDependancies(getLocalDependancies(getDependancies(getPackageJSON())), (finalDeps) => {
  // console.log('final: ',finalDeps);
  depAnalysis.localDependencies = finalDeps;
  depAnalysis.watchLocalPaths(depAnalysis.localDependencies, depAnalysis.watchFileFilter);
});
