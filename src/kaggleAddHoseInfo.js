'use strict';

const fs = require('fs');
const OCLE = require('../../..');

// const getAllCouplings = require('../new/getAllCouplings');
const getAllCouplings = require('./getAllCouplingsAC');


const dataFolder = '/home/acastillo/kaggle/champs-scalar-coupling/';
const structuremol = `${dataFolder}structuresmol/`;

const Util = OCLE.Util;

var train = fs.readFileSync(`${dataFolder}train.csv`).toString().split('\n');
var cs = fs.readFileSync(`${dataFolder}magnetic_shielding_tensors.csv`).toString().split('\n');
var mulliken = fs.readFileSync(`${dataFolder}mulliken_charges.csv`).toString().split('\n');
var lastLineInFile = 1;

let head = train.splice(0, 1);

const maxSphereSize = 5;

console.log(head + ',distance,torsion,angle,csA,csB,mullikenA,mullikenB,path0,path1,path2,hoseA1,hoseA2,hoseA3,hose
A4,hoseA5,hoseB1,hoseB2,hoseB3,hoseB4,hoseB5');

let molid = '';
let diaIDs = null;
let max = train.length - 1;
let map = [];
let inverseMap = [];
let molecule = null;
let couplings = null;
let relatedData = null;
for (let i = 0; i < max; i++) {

  let example = train[i].split(',');
  // if (example[4] === type) {
  example[0] = Number(example[0]);
  example[2] = Number(example[2]);
  example[3] = Number(example[3]);
  example[5] = Number(example[5]);
  // Change of molecule
  if (example[1] !== molid) {
    molid = example[1];
    // Open the molecule
    let result = OCLE.Molecule.fromMolfileWithAtomMap(fs.readFileSync(`${structuremol + molid}.mol`).toString());
    molecule = result.molecule;

    couplings = getAllCouplings(result.molecule, { fromLabel: 'H', toLabel: '', maxLength: 3 });

    diaIDs = molecule.getGroupedDiastereotopicAtomIDs();
    diaIDs.sort(function (a, b) {
      return b.counter - a.counter;
    });

    for (let k = 0; k < diaIDs.length; k++) {
      diaIDs[k].hose = Util.getHoseCodesFromDiastereotopicID(diaIDs[k].oclID, {
        maxSphereSize: maxSphereSize,
        type: 0
      });
    }

    map = result.map;
    inverseMap = [];
    for (let k = 0; k < map.length; k++) {
      inverseMap.push(map.indexOf(k));
    }

    // Add mulliken charges and chemical shifts. We supposed the files are in the same order as in train.csv
    relatedData = {};
    let csLine = cs[lastLineInFile].split(',');
    let mullikenLine = mulliken[lastLineInFile].split(',');
    while (csLine[0] === molid) {
      relatedData[Number(csLine[1])] = { cs: (Number(csLine[2]) + Number(csLine[6]) + Number(csLine[10])) / 3, mulliken: Number(mullikenLine[2]) };
      lastLineInFile++;
      if (lastLineInFile < cs.length) {
        csLine = cs[lastLineInFile].split(',');
        mullikenLine = mulliken[lastLineInFile].split(',');
      } else {
        csLine = ['end'];
      }
    }
  }

  let { hoseFrom, hoseTo } = findHoseCodes(diaIDs, example, map, maxSphereSize);

  let atoms = [];
  molecule.getPath(atoms, inverseMap[example[2]], inverseMap[example[3]], 3);
  let torsion = 0;
  let angle = 0;
  if (atoms.length === 4) {
    torsion = molecule.calculateTorsion(atoms);
  } else if (atoms.length === 3) {
    angle = getAngle(molecule, atoms);
  }

  let group = couplings.find((value) => {
    return value.fromTo.find((pair) => {
      return map[pair[0]] === example[2] && map[pair[1]] === example[3];
    }) != null;
  });

  let csA = relatedData[example[2]].cs;
  let csB = relatedData[example[3]].cs;
  let mullikenA = relatedData[example[2]].mulliken;
  let mullikenB = relatedData[example[3]].mulliken;

  // console.log(group);


  console.log(example[0] + ',' + example[1] + ',' + example[2] + ',' +example[3]
  + ',' +example[4] + ',' +example[5]
  + ',' + distance2(molecule, inverseMap[example[2]], inverseMap[example[3]])
  + ',' + torsion + ',' + angle + ',' + csA + ',' + csB + ',' + mullikenA + ',' + mullikenB
  + ',' + group.code[0] + ',' + (group.code[1] ? group.code[1] : '') + ',' + (group.code[2] ? group.code[2] : '') 
  + ',' + hoseFrom + ',' + hoseTo);


}

function distance2(molecule, atom1, atom2) {
  let dx = molecule.getAtomX(atom1) - molecule.getAtomX(atom2);
  let dy = molecule.getAtomY(atom1) - molecule.getAtomY(atom2);
  let dz = molecule.getAtomZ(atom1) - molecule.getAtomZ(atom2);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getAngle(molecule, path) {
  let ax = molecule.getAtomX(path[0]) - molecule.getAtomX(path[1]);
  let ay = molecule.getAtomY(path[0]) - molecule.getAtomY(path[1]);
  let az = molecule.getAtomZ(path[0]) - molecule.getAtomZ(path[1]);

  let bx = molecule.getAtomX(path[2]) - molecule.getAtomX(path[1]);
  let by = molecule.getAtomY(path[2]) - molecule.getAtomY(path[1]);
  let bz = molecule.getAtomZ(path[2]) - molecule.getAtomZ(path[1]);

  return Math.acos((ax * bx + ay * by + az * bz) / ((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz)));
}

function findHoseCodes(diaIDs, example, map, maxSphereSize){
  let hoseFrom = null;
  let hoseTo = null;
  for (let k = 0; k < diaIDs.length; k++) {
    let value = diaIDs[k];
    for (let n = 0; n < value.atoms.length; n++) {
      let atomID = value.atoms[n];
      if (map[atomID] === example[2]) {
        hoseFrom = '';
        for (let hi = 0; hi < maxSphereSize; hi++) {
          if (value.hose[hi]) {
            hoseFrom += value.hose[hi] + ',';
          } else {
            hoseFrom += ',';
          }
        }
        hoseFrom.substring(0, hoseFrom.length - 1);
        break;
      }
      if (map[atomID] === example[3]) {
        hoseTo = '';
        for (let hi = 0; hi < maxSphereSize; hi++) {
          if (value.hose[hi]) {
            hoseTo += value.hose[hi] + ',';
          } else {
            hoseTo += ',';
          }
        }
        hoseTo.substring(0, hoseTo.length - 1);
        break;
      }
    }
    if (hoseFrom && hoseTo) {
      break;
    }
  }

  return {hoseFrom, hoseTo}
}