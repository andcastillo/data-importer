// eslint-disable-next-line import/unambiguous
'use strict';

const fs = require('fs');

const stat = require('ml-stat/array');

const OCLE = require('../../../..');

const Util = OCLE.Util;

const dataFolder = '/home/acastillo/Documents/kaggle/champs-scalar-coupling/';
const structuremol = `${dataFolder}structuresmol/`;

var test = fs.readFileSync(`${dataFolder}train.csv`).toString().split('\n');

const type = '3JHN';

// first time
var db = JSON.parse(fs.readFileSync('kaggle' + type + '-full.json').toString());

db.forEach((hoseMap) => {
  for (const hose of Object.keys(hoseMap)) {
    hoseMap[hose] = getStats(hoseMap[hose]);
  }
});

fs.writeFileSync('kaggle' + type + '.json', JSON.stringify(db));
// end first time

//var db = JSON.parse(fs.readFileSync('kaggle1JHC.json').toString());

let head = test.splice(0, 1);

// console.log(`${head},scalar_coupling_constant`);
console.log('id,scalar_coupling_constant');

let molid = '';
let diaIDs = null;
let max = test.length - 1;
let map = [];
for (let i = 0; i < max; i++) {
  let example = test[i].split(',');
  let typei = example[4];

  if (typei === type) {
    let id = Number(example[0]);
    let moleculeName = example[1];
    let atom0 = Number(example[2]);
    let atom1 = Number(example[3]);

    // Change of molecule
    if (moleculeName !== molid) {
      molid = moleculeName;
      // Open the molecule
      let result = OCLE.Molecule.fromMolfileWithAtomMap(fs.readFileSync(`${structuremol + molid}.mol`).toString());
      map = result.map;

      diaIDs = result.molecule.getGroupedDiastereotopicAtomIDs({ atomLabel: 'H' });
      diaIDs.sort(function (a, b) {
        return b.counter - a.counter;
      });

      for (let i = 0; i < diaIDs.length; i++) {
        diaIDs[i].hose = Util.getHoseCodesFromDiastereotopicID(diaIDs[i].oclID, {
          maxSphereSize: 5,
          type: 0
        });
      }
    }

    let group = diaIDs.find((value) => {
      return value.atoms.find((atomID) => {
        return map[atomID] === atom0;
      }) != null;
    });

    if (!group) {
      // console.log(example);
    } else {
      let code = group.hose;
      let coupling = code.length;
      for (let k = code.length - 1; k >= 0; k--) {
        coupling = db[k][code[k]];
        if (coupling) {
          break;
        }
      }
      if (!coupling) {
        coupling = { mean: 2, median: 2 };
      }

      coupling.mean = Math.round(coupling.mean * 10e6) / 10e6;
      coupling.median = Math.round(coupling.median * 10e6) / 10e6;

      console.log(`${id},${moleculeName},${atom0},${atom1},${type},${coupling.mean},${coupling.median},${example[5]}`);
      // console.log(`${id},${coupling.median}`);
    }
  }
}

function getStats(entry) {
  const minMax = stat.minMax(entry);
  return {
    min: minMax.min,
    max: minMax.max,
    ncs: entry.length,
    mean: stat.mean(entry),
    median: stat.median(entry),
    std: stat.standardDeviation(entry, false)
  };
}
