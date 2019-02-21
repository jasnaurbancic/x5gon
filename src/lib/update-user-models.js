// configurations
const config = require('@config/config');

// internal modules
const pg = require('@lib/postgresQL')(config.pg);

const schema = config.pg.schema;

function addObjects(objectA, objectB){
    for (let c in objectB){
        if (objectA.hasOwnProperty(c)){
            objectA[c] += objectB[c];
        }
        else{
            objectA[c] = objectB[c];
        }
    }
    return objectA;
}//function addObjects

function multiplyObjects(objectA, num){
    for (let c in objectA){
        objectA[c] *= num;
    }
    return objectA;
}//function multiplyObjects

function updateUserModel(activity, callback) {

    const {
        uuid,
        url
    } = activity;

    let query = `
        SELECT *
        FROM ${schema}.rec_sys_user_model
        WHERE uuid='${uuid}';`;

    pg.execute(query, [], function(err, user_model) {
        if (err){
            console.log('Error fetching user model: ' + err);
            if (callback && typeof(callback) === 'function') {
                return callback();
            }
        }
        let escapedUri = url.replace('\'', '\'\'');

        let query = `
            SELECT *
            FROM ${schema}.rec_sys_material_model
            WHERE provider_uri LIKE '%${escapedUri}%'`;

        pg.execute(query, [], function(err, material_model){
            if (err){
                console.log('Error fetching material model: ' + err);
                console.log('Query: ' + query);
                if (callback && typeof(callback) === 'function'){
                    return callback();
                }
            }
            if (material_model.length === 0){
                //material is not stored in db
                if (callback && typeof(callback) === 'function') {
                    return callback();
                }
            } else {
                let user;
                const material = material_model[0];
                if (user_model.length === 0){
                    user = {
                        uuid: activity.uuid,
                        language: { },
                        visited: {
                            count: 0
                        },
                        type: { },
                        concepts: { }
                    };
                } else { user = user_model[0]; }
                //check if the user has visited the material before
                if (material && user) {
                    if (user.visited.hasOwnProperty(material.provider_uri)){
                        // user has already seen the material - nothing to do
                        user.visited[material.provider_uri] += 1;
                        return callback();
                    }
                    //if user has not seen the material
                    let count = user.visited.count;
                    let concepts = JSON.parse(JSON.stringify(user.concepts)); // copy concepts object
                    concepts = multiplyObjects(concepts, count);
                    concepts = addObjects(concepts, material.concepts);
                    concepts = multiplyObjects(concepts, 1 / (count + 1));
                    user.concepts = concepts;

                    user.visited[material.provider_uri] = 1;
                    user.visited.count += 1;

                    // handle type
                    if (!user.type.hasOwnProperty(material.type)){
                        user.type[material.type] = 0;
                    }
                    user.type[material.type] += 1;

                    // handle language
                    if (!user.language.hasOwnProperty(material.language)){
                        user.language[material.language] = 0;
                    }
                    user.language[material.language] += 1;

                    console.log('Processing user:', activity.uuid, 'url:', material.provider_uri);
                    pg.upsert(user, { uuid: null }, `${schema}.rec_sys_user_model` , function(err){
                        if (err) {
                            console.log('Error upserting user model: ', + err);
                            return callback(err);
                        }
                        if (callback && typeof(callback) === 'function'){
                            return callback();
                        }
                    });
                } else {
                    if (callback && typeof(callback) === 'function'){
                        return callback();
                    }
                }
            }
        });
    });
}

exports.updateUserModel = updateUserModel;


