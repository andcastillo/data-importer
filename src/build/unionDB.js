'use strict';

const fs = require('fs');

const path = 'data/';
// const types = ['1JHC', '2JHC', '3JHC', '1JHN', '2JHN', '3JHN', '2JHH', '3JHH'];
const types = ['2JHH', '3JHH', '4JHH', '5JHH'];
let db = {};
types.forEach(type => {
    if (fs.existsSync(`${path}/kaggle-abs${type}.json`))
        db[type] = JSON.parse(fs.readFileSync(`${path}/kaggle-abs${type}.json`).toString());
    else if (fs.existsSync(`${path}/spinus${type}.json`)) {
        db[type] = JSON.parse(fs.readFileSync(`${path}/spinus${type}.json`).toString());
        db[type] = [{}, {}, db[type][2]];
    }
    db[type].forEach(x => console.log(Object.keys(x).length));
    //console.log(db[type].length)
});

fs.writeFileSync(`${path}/cheminfo-abs-spinus${types[0].substring(2)}.json`, JSON.stringify(db));

