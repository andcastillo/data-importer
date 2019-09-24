'use strict'

const OCLE = require('openchemlib-extended');
const Util = OCLE.Util;
const fs = require('fs');
const stat = require('ml-stat/array');

const path = require('path');
const outputFolder = 'data/';


// const stat = require('ml-stat/array');


let folder = '/Users/acastillo//Documents/dataNMR/spinus/'
let data = fs.readdirSync(folder).filter(file => file.indexOf('.mol') >= 0);

let nMols = data.length;
let nSamples = 30000;
let maxSphereSize = 5;
let nHoses = 3;

let types = ['4JHH', '5JHH', '6JHH', '7JHH'];
let dbs = {};
for (let type of types) {
    dbs[type] = [{}, {}, {}];
}

for (let n = 0; n < nSamples; n++) {
    console.log(n)
    let randomSample = Math.round(Math.random() * nMols);
    let molfile = fs.readFileSync(path.join(folder, data[randomSample])).toString();
    let spinus = JSON.parse(fs.readFileSync(path.join(folder, data[randomSample].replace('.mol', '.json'))));
    let molmap = OCLE.Molecule.fromMolfileWithAtomMap(molfile);
    let molecule = molmap.molecule;
    let diaIDs = molecule.getGroupedDiastereotopicAtomIDs({ atomLabel: "H" });
    diaIDs.sort(function (a, b) {
        return b.counter - a.counter;
    });

    let atomMap = {};
    diaIDs.forEach(diaID => {
        diaID.atoms.forEach(atom => atomMap[atom] = diaID);
    });

    // HOSE codes from Diasterotopic atom IDs.
    for (let k = 0; k < diaIDs.length; k++) {
        diaIDs[k].hose = Util.getHoseCodesFromDiastereotopicID(diaIDs[k].oclID, {
            maxSphereSize: maxSphereSize,
            type: 0
        });
    }

    //console.log(JSON.stringify(spinus.map(s => s.j)));
    spinus.forEach(atom => {
        let hoseFrom = atomMap[atom.atomIDs[0]].hose;
        if (atom.j) {
            atom.j.forEach(j => {
                if (j.distance > 3) {
                    let type = `${j.distance}JHH`;
                    let db = dbs[type];
                    let hose = atomMap[j.assignment[0]].hose;
                    try {
                        for (let i = maxSphereSize - 1; i >= maxSphereSize - nHoses; i--) {
                            let key = canCat(hose[i], hoseFrom[i]);
                            if (!db[i - nHoses + 1][key]) {
                                db[i - nHoses + 1][key] = [];
                            }
                            db[i - nHoses + 1][key].push(j.coupling);
                        }
                    } catch (e) {
                        console.log(type);
                        console.log(hose);
                    }

                }
            });
        }
    });
}

function canCat(a, b) {
    if (a < b)
        return a + b;
    else
        return b + a;
}

function getStats(entry) {
    const minMax = stat.minMax(entry);
    return {
        min: Math.round(minMax.min * 1000) / 1000,
        max: Math.round(minMax.max * 1000) / 1000,
        ncs: entry.length,
        mean: Math.round(stat.mean(entry) * 1000) / 1000,
        median: Math.round(stat.median(entry) * 1000) / 1000,
        std: Math.round(stat.standardDeviation(entry, false) * 1000) / 1000
    };
}

for (let type of types) {
    let db = dbs[type];
    fs.writeFileSync(`${outputFolder}/spinus${type}-full.json`, JSON.stringify(db));
    for (let i = 0; i < db.length; i++) {
        let dbi = db[i];
        let keys = Object.keys(dbi);
        for (let key of keys) {
            dbi[key] = getStats(dbi[key]);
            dbi[key].cop2 = [dbi[key].mean, 0, 0];
        }
    }
    fs.writeFileSync(`${outputFolder}/spinus${type}.json`, JSON.stringify(db));

}
