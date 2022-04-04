let db;

const request = indexedDB.open('budget', 1);

// this event will emit if the database version changes (nonexistant to version 1,
// v1 to v2, etc.)
request.onupgradeneeded = function(event) {
  // save a reference to the database 
  const db = event.target.result;
  // create table and set it to have an auto incrementing primary key of sorts 
  db.createObjectStore('transactions', { autoIncrement: true });
};

// upon a successful 
request.onsuccess = function(event) {
  // when db is successfully created with its object store (from onupgradedneeded 
  // event above) or simply established a connection, save reference to db in 
  // global variable
  db = event.target.result;

  // check if app is online, if yes run uploadTransaction() function to send 
  // all local db data to api
  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = function(event) {
  // log error here
  console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a transaction and 
// there's no internet connection
function saveRecord(record) {
  // open a new transaction with the database with read and write permissions 
  const transaction = db.transaction(['transactions'], 'readwrite');

  // access the object store for `transactions`
  const transactionObjectStore = transaction.objectStore('transactions');

  // add record to your store with add method
  transactionObjectStore.add(record);
}

function uploadTransaction() {
  // open a transaction to the pending db
  const transaction = db.transaction(['transactions'], 'readwrite');

  // access pending object store
  const transactionObjectStore = transaction.objectStore('transactions');

  // get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  getAll.onsuccess = function() {
    // if there was data in indexedDb's store, send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(['transactions'], 'readwrite');
          const transactionObjectStore = transaction.objectStore('transactions');
          // clear all items in your store
          transactionObjectStore.clear();
        })
        .catch(err => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}