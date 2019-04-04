const fs = require('fs');
const fetch = require('node-fetch');
const stadtbezirke = require('./stadtbezirke')

const endpoint = (endpoint, id) => Object({
    'MapIt': `https://global.mapit.mysociety.org/area/${id}/covers`,
    'JSONOSM': `http://polygons.openstreetmap.fr/get_geojson.py?id=${id}&params=0`,
    'WKTOSM': `http://polygons.openstreetmap.fr/get_wkt.py?id=${id}&params=0`,
    'POLYOSM': `http://polygons.openstreetmap.fr/get_poly.py?id=${id}&params=0`
})[endpoint];

const sanitize = value => value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/ /g, '-')
    .replace(/\\/g, '-')
    .replace(/\//g, '-')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '');

fetch(endpoint('MapIt', 979191))
    .then(response => response.json())
    .then(json => Object.entries(json))
    .then(areas => [{
        'name': 'Duisburg',
        'osm_rel': 62456
    },...areas.map(area => ({
        'name': area[1].name,
        'osm_rel': area[1].codes.osm_rel
    }))])
    .then(bezirke => Promise.all(bezirke.map(bezirk => [
        fetch(endpoint('JSONOSM', bezirk.osm_rel))
            .then(response => response.json())
            .then(data => JSON.stringify(data))
            .then(data => ({
                ...bezirk,
                data
            }))
            .then(geometries => fs.writeFileSync(`./json/${stadtbezirke[geometries.name]}_${sanitize(geometries.name)}.json`, geometries.data)),
        fetch(endpoint('WKTOSM', bezirk.osm_rel))
            .then(response => response.text())
            .then(data => ({
                ...bezirk,
                data
            }))
            .then(geometries => fs.writeFileSync(`./wkt/${stadtbezirke[geometries.name]}_${sanitize(geometries.name)}.wkt`, geometries.data)),
        fetch(endpoint('POLYOSM', bezirk.osm_rel))
            .then(response => response.text())
            .then(data => ({
                ...bezirk,
                data
            }))
            .then(geometries => fs.writeFileSync(`./poly/${stadtbezirke[geometries.name]}_${sanitize(geometries.name)}.poly`, geometries.data)),
    ]).reduce((a,c) => [...a, ...c],[])))
    .then(() => fs.writeFileSync('README.md', `<p align="center"><img width="400" src="https://raw.githubusercontent.com/codeforduisburg/Logo/default/logo.png"></p>\n\n# Geodata Duisburg\n\n`))
    .then(() => Object.keys(stadtbezirke).map(bezirk => {
        let fname = `${stadtbezirke[bezirk]}_${sanitize(bezirk)}`;
        let types = [];
        for(type of ['json','wkt','poly']){
            let path = `${type}/${fname}.${type}`
            if(fs.existsSync(`./${path}`)) types.push(`[${type}](${path})`) ;
        }
        if(types.length){
            fs.appendFileSync('README.md', `* ${bezirk} (${types.join(', ')})  \n`)
        }else{
            fs.appendFileSync('README.md', `* *${bezirk}*  \n`)
        }
    }))
    .then(() => console.log('Done!'));