import admin from './firebase.js';

const email = 'adam@gmail.com'
const password = 'testin123'
const customToken = async (email, password) => {
    return await admin.auth().createUser({
        email,
        password
    });
};

console.log(customToken);