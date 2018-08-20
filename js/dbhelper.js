/**
 * Common database helper functions.
 */
let dbpromise;
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
  * Open Databases.
  */
  static openDB(){
    const dbPromise = idb.open("restaurants", 1, function(upgradeCallback) {
      if (!upgradeCallback.objectStoreNames.contains("restaurantList")) {
        upgradeCallback.createObjectStore("restaurantList" , {keyPath: "id"});
      }
      if (!upgradeCallback.objectStoreNames.contains("reviewList")) {
        upgradeCallback.createObjectStore("reviewList" , {keyPath: "id"});
      }
      if (!upgradeCallback.objectStoreNames.contains("restaurantList")) {
        upgradeCallback.createObjectStore("reviewOfflineList" , {keyPath: "updatedAt"});
      }
    });
    return dbPromise;
  }

  /**
  * Fetch all restaurants
  */
  static fetchRestaurants(callback) {
    return DBHelper.cacheDataFromDb().then(restaurants => {
      if(restaurants.length && !navigator.onLine){
        callback(null, restaurants);
      } else {
        const fetchURL = DBHelper.DATABASE_URL;
        fetch(fetchURL, {method: "GET"})
        .then(resp => {
          return resp.json();
        })
        .then(restaurants => {
          DBHelper.saveToDB(restaurants); //save to database
          callback(null, restaurants);
        }).catch(error => {
          callback(error, null);
        });
      }
    });
  }

  /**
   * Get Reviews
   */
   static getCachedReviews() {
       const dbPromise = DBHelper.openDB();
       const reviews = dbPromise.then(db => {
         const transaction = db.transaction("reviewList", "readonly");
         const store = transaction.objectStore("reviewList");
         return store.getAll();
       });
       return reviews;
   }

  /**
  * Cache Restaurants from Database
  */
  static cacheDataFromDb(){
    const dbPromise = DBHelper.openDB();
    const restaurants = dbPromise.then(function (db) {
      const transaction = db.transaction("restaurantList", "readonly");
      const store = transaction.objectStore("restaurantList");
      return store.getAll();
    });
    return restaurants;
  }


  /**
   * Save Restaurants to Database
   */
  static saveToDB(restaurants){
    const dbPromise = DBHelper.openDB();
    dbPromise.then(db => {
      if(!db) return ;
      const transaction = db.transaction("restaurantList", "readwrite");
      const store = transaction.objectStore("restaurantList");
      restaurants.forEach(restaurant => {
        store.put(restaurant);
      });
      return transaction.complete;
    });
  }

  /**
   * Save reviews to Database
   */
  static saveReviewToDB(reviews){
    const dbPromise = DBHelper.openDB();
    dbPromise.then(db => {
      if(!db) return ;
      const transaction = db.transaction("reviewList", "readwrite");
      const store = transaction.objectStore("reviewList");
      reviews.forEach(review => {
        store.put(review);
      });
      return transaction.complete;
    });
  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          DBHelper.fetchReviews(id, (error, reviews) => {
            restaurant.reviews = reviews;
            callback(null, restaurant);
          });
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurant reviews by its ID.
   */
  static fetchReviews(id, callback) {
    DBHelper.getCachedReviews().then(data => {
      if (data.length && !navigator.onLine) {
        callback(null, data);
      } else {
      fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`, {method: "GET"})
      .then(response => {
        return response.json();
      }).then(reviews => {
        DBHelper.saveReviewToDB(reviews); //save to database
        callback(null, reviews);
      });
    }
      })
}

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    //return (`/img/${restaurant.photograph}`);
    return (`/img/${restaurant.photograph}.jpg`);
  }

   /**
    * Map marker for a restaurant.
    */
    static mapMarkerForRestaurant(restaurant, map) {
     // https://leafletjs.com/reference-1.3.0.html#marker
     const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
       {title: restaurant.name,
       alt: restaurant.name,
       url: DBHelper.urlForRestaurant(restaurant)
       })
       marker.addTo(newMap);
     return marker;
   }

   /**
    * Update restaurant favorite status
    */
   static updateFavoriteStatus(restaurantId, isFavorite) {
     const fetchURL = `${DBHelper.DATABASE_URL}/${restaurantId}/?is_favorite=${isFavorite}`;
     fetch(fetchURL,{method: 'PUT'})
     .then(() => {
       const dbPromise = DBHelper.openDB();
       dbPromise.then(db => {
         const transaction = db.transaction('restaurantList', 'readwrite');
         const store = transaction.objectStore("restaurantList");
         store.get(restaurantId)
         .then(restaurant => {
           restaurant.is_favorite = isFavorite;
           store.put(restaurant);
         });
       })
     })
   }

   /**
    * Send reviews to API
    */
   static saveReview(review) {
     const offlineReview = {
       data: review,
       object_type: 'review'
     };
     if (!navigator.onLine) {
       DBHelper.sendDataWhenOnline(offlineReview);
       return;
     }
     const reviewSend = {
       "name": review.name,
       "rating": parseInt(review.rating),
       "comments": review.comments,
       "restaurant_id": parseInt(review.restaurant_id)
     };
     console.log('Sending review: ', reviewSend);
     let fetch_options = {
       method: 'POST',
       body: JSON.stringify(reviewSend),
       headers: new Headers({
         'Content-Type': 'application/json'
       })
     };
     fetch(`http://localhost:1337/reviews`, fetch_options).then((response) => {
       const contentType = response.headers.get('content-type');
       if (contentType && contentType.indexOf('application/json') !== -1) {
         return response.json();
       } else {
         return 'API call successful'
       }
     }).then((data) => {
       console.log('Fetch successful')
     })
     .catch(error => console.log('error:', error));
   }

   /**
    * Store review in local storage until back online
    */
   static sendDataWhenOnline(offlineReview) {
     localStorage.setItem('data', JSON.stringify(offlineReview.data));
     window.addEventListener('online', (event) => {
       let data = JSON.parse(localStorage.getItem('data'));
       [...document.querySelectorAll(".reviews_offline")]
       .forEach(el => {
         el.classList.remove("reviews_offline")
         el.querySelector(".offline_label").remove()
       });
       if (data !== null) {
         if (offlineReview.object_type === "review") {
           DBHelper.saveReview(offlineReview.data);
         }
         localStorage.removeItem('data');
       }
     });
   }


}
