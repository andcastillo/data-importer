'use strict';

const fs = require('fs');
const PolynomialRegression = require('ml-regression-polynomial');
const stat = require('ml-stat/array');

//0: id, molecule_name, atom_index_0, atom_index_1, type,
//5: scalar_coupling_constant, distance, torsion, angle, csA, csB,
//11: mullikenA, mullikenB, path0, path1, path2,
//16: hoseA1, hoseA2, hoseA3, hoseA4, hoseA5,
//21: hoseB1, hoseB2, hoseB3, hoseB4, hoseB5
function build(path, type) {

    var train = fs.readFileSync(`${path}/train-${type}.csv`).toString().split('\n');
    let head = train.splice(0, 1);

    let start = 18; // Attributes to usa as keys
    let nHoses = 3; // how many of them

    let max = train.length - 1;
    let db = new Array(nHoses);
    for(let i = 0; i < nHoses; i++) {
        db[i] = {};
    }

    for (let i = 0; i < max; i++) {
        if (i % 10000 === 0) {
            console.log(i / max * 100);
        }

        let example = train[i].split(',');
        if (example[4] === type) {
            example[0] = Number(example[0]);
            example[2] = Number(example[2]);
            example[3] = Number(example[3]);
            example[5] = Number(example[5]);
            example[6] = Number(example[6]);
            example[7] = Number(example[7]);
            example[8] = Number(example[8]);
            example[9] = Number(example[9]);
            example[10] = Number(example[10]);
            example[11] = Number(example[11]);
            example[12] = Number(example[12]);

            for (let k = start; k < start + nHoses; k--) {
                if (example[k].length > 0) {
                    if (!db[k - start][example[k]]) {
                        db[k - start][example[k]] = { j: [], d: [], t: [] };
                    }

                    db[k - start][example[k]].j.push(example[5]);
                    db[k - start][example[k]].d.push(Math.round(example[6] * 100000) / 100000);
                    db[k - start][example[k]].t.push(Math.round(example[7] * 100000) / 100000);
                    // db[k - start][example[k]].a.push(Math.round(example[8] * 100000) / 100000);
                    // db[k - start][example[k]].cs1.push(Math.round(example[9] * 100000) / 100000);
                    // db[k - start][example[k]].cs2.push(Math.round(example[10] * 100000) / 100000);
                    // db[k - start][example[k]].m1.push(Math.round(example[11] * 100000) / 100000);
                    // db[k - start][example[k]].m2.push(Math.round(example[12] * 100000) / 100000);
                }
            }
        }
    }

    fs.writeFileSync(`${path}/kaggle${type}-full.json`, JSON.stringify(db));
    return db;
}

module.exports = build;


//const dataFolder = '/home/acastillo/Documents/kaggle/champs-scalar-coupling/';
const types = ['1JHC', '2JHC', '3JHC', '1JHN', '2JHN', '3JHN', '2JHH', '3JHH'];
types.forEach(type => {
    const path = 'data/'
    // Step 1
    let db = build('data/', type);
    // let db = JSON.parse(fs.readFileSync(`${path}/kaggle${type}-full.json`).toString());

    const degree = 2; // setup the maximum degree of the polynomial
    db.forEach(dbk => {
        let keys = Object.keys(dbk);
        keys.forEach(key => {
            // J(tetha) = C * cos(2 * tetha) + B * cos(tetha) + A
            // J(tetha) = C * (2 * cos(tetha) ^ 2 - 1) + B * cos(tetha) + A
            // J(tetha) = C * cos(tetha) ^ 2 + B * cos(tetha) + A
            // x = Math.cos(tetha);
            // J(tetha) = C * x ^ 2 + B * x + A
            if (dbk[key].t.length > 17) {
                let x = dbk[key].d;
                if (type.startsWith('3')) {
                    x = dbk[key].t.map(t => Math.cos(t));
                }
                let y = dbk[key].j;
                // dbk[key] = getStats(y));
                dbk[key] = getStats(y.map(val => Math.abs(y)));
                try {
                    const regression = new PolynomialRegression(x, y, degree);
                    dbk[key].cop2 = regression.coefficients;
                } catch (e) {
                    dbk[key].cop2 = [dbk[key].median, 0, 0];
                    console.log('Wrong');
                }
                //dbk[key].reg = regression;
            } else {
                delete dbk[key];
            }
        });

    });

    fs.writeFileSync(`${path}/kaggle-abs${type}.json`, JSON.stringify(db));
});



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
