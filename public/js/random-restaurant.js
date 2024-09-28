let jibunAddress;
let jibunAddress1;
let jibunAddress2;
let roadAddress;
let roadAddress1;
let roadAddress2;
let map;
let marker;
let specialMarker = null;
let markers = [];

document.addEventListener('DOMContentLoaded', function() {
    if (typeof naver === 'undefined' || !naver.maps) {
        console.error('Naver Maps API is not loaded.');
        return;
    }

    const recommendButton = document.getElementById('recommend-button');
    const restaurantInfo = document.getElementById('restaurant-info');
    const refreshLocationButton = document.getElementById('refresh-location-button');

    function initMap() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const currentPosition = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);
                console.log('Current Position:', currentPosition);
                map = new naver.maps.Map('map', {
                    center: currentPosition,
                    zoom: 17,
                    scaleControl: true,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: naver.maps.Position.TOP_RIGHT
                    }
                });

                new naver.maps.Marker({
                    position: currentPosition,
                    map: map
                });

                new naver.maps.Circle({
                    map: map,
                    center: currentPosition,
                    radius: 300,
                    strokeColor: '#5347AA',
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    fillColor: '#CFE7FF',
                    fillOpacity: 0.5
                });

                fetchReverseGeocode(position.coords.latitude, position.coords.longitude);
            }, function(error) {
                console.error('Error occurred. Error code: ' + error.code);
                // Handle error case
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        alert("An unknown error occurred.");
                        break;
                }
            });
        } else {
            alert('Geolocation을 지원하지 않는 브라우저입니다.');
        }
    }

    function saveGuestLocation(jibunAddress, roadAddress, latitude, longitude) {
        fetch('/save-guest-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                guest: '게스트',
                jibunAddress: jibunAddress,
                roadAddress: roadAddress,
                latitude: latitude,
                longitude: longitude
            })
        })
        .then(response => response.json())
    }

    function fetchReverseGeocode(lat, lng) {
        fetch(`/proxy/reverse-geocode?lat=${lat}&lng=${lng}`)
            .then(response => response.json())
            .then(data => {
                console.log('Reverse Geocoding 응답:', data);
                if (data.results && data.results.length > 0) {
                    const addresses = extractAddresses(data.results);
                    console.log('지번 주소:', addresses.jibunAddress);
                    console.log('도로명 주소:', addresses.roadAddress);
                    jibunAddress = addresses.jibunAddress;
                    roadAddress = addresses.roadAddress;

                    if (localStorage.getItem('loggedInUsername') === '게스트') {
                        saveGuestLocation(jibunAddress, roadAddress);
                    }
                } else {
                    console.error('상세 주소를 가져오는 데 실패했습니다.');
                }
            })
            .catch(error => {
                console.error('Reverse Geocoding 오류:', error);
            });
    }

    function clearMarkers() {
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        if (specialMarker) {
            specialMarker.setMap(null);
            specialMarker = null;
        }
    }

    function displayRestaurants(restaurants) {
        clearMarkers();

        const randomIndex = Math.floor(Math.random() * restaurants.length);
        const selectedRestaurant = restaurants[randomIndex];

        restaurantInfo.innerHTML = `
            <h2>${selectedRestaurant.place_name}</h2>
            <p class="restaurant-category">[분류] ${selectedRestaurant.category_name}</p>
            <p class="restaurant-address">[주소] ${selectedRestaurant.road_address_name || selectedRestaurant.address_name}</p>
            <p class="restaurant-phone">[번호] ${selectedRestaurant.phone}</p>
            <a href="${selectedRestaurant.place_url}" target="_blank" class="restaurant-link">자세히 보기</a>
        `;

        // Add this line to change overflow to auto when restaurant info is displayed
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';

        const orangeMarkerSVG = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFA500" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>`;
        restaurants.forEach((restaurant, index) => {
            const latlng = new naver.maps.LatLng(restaurant.y, restaurant.x);
            if (index !== randomIndex) {
                const marker = new naver.maps.Marker({
                    position: latlng,
                    map: map,
                    icon: {
                        content: `<div style="width: 24px; height: 24px;">${orangeMarkerSVG}</div>`,
                        anchor: new naver.maps.Point(12, 12)
                    }
                });
                markers.push(marker);
            }
        });

        const selectedLatLng = new naver.maps.LatLng(selectedRestaurant.y, selectedRestaurant.x);
        specialMarker = new naver.maps.Marker({
            position: selectedLatLng,
            map: map,
            icon: {
                url: '/icon/restaurant-icon.png',
                size: new naver.maps.Size(46, 59),
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(23, 59)
            }
        });
        map.setCenter(selectedLatLng);
        console.log('Selected Restaurant:', selectedRestaurant.place_name);
    }

    function searchRestaurants(lat, lng) {
        console.log(`Fetching restaurants at lat: ${lat}, lng: ${lng}`);

        fetch(`/search-restaurant?lat=${lat}&lng=${lng}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server Response:', data);
                if (data.documents && data.documents.length > 0) {
                    displayRestaurants(data.documents);
                } else {
                    console.log('No restaurants found within 500 meters.');
                    restaurantInfo.innerHTML = '반경 500미터 내에 식당이 없습니다.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                restaurantInfo.innerHTML = '식당 정보를 가져오는 중 오류가 발생했습니다.';
            });
    }

    recommendButton.addEventListener('click', function() {
        if (!jibunAddress && !roadAddress) {
            alert('현재 위치를 확인할 수 없습니다.');
            return;
        }

        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            searchRestaurants(lat, lng);
        });
    });

    refreshLocationButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const currentPosition = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);
                map.setCenter(currentPosition);
                fetchReverseGeocode(position.coords.latitude, position.coords.longitude);
            }, function(error) {
                console.error('Error occurred. Error code: ' + error.code);
                // Handle error case
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        alert("An unknown error occurred.");
                        break;
                }
            });
        } else {
            alert('Geolocation을 지원하지 않는 브라우저입니다.');
        }
    });

    initMap();
});

function extractAddresses(results) {
    let jibunAddress = '';
    let roadAddress = '';
    let jibunAddress1 = '';
    let jibunAddress2 = '';
    let roadAddress1 = '';
    let roadAddress2 = '';
    
    results.forEach(result => {
        const { region, land } = result;
        const { area1, area2, area3 } = region;
        const { name, number1, number2 } = land;
        jibunAddress1 = `${area1.name} ${area2.name}`;
        jibunAddress2 = `${area3.name} ${number1 ? number1 : ''} ${number2 ? '-' + number2 : ''}`;
        jibunAddress = `${jibunAddress1} ${jibunAddress2}`;
        roadAddress1 = `${area1.name} ${area2.name}`;
        roadAddress2 = `${name} ${number1 ? number1 : ''} ${number2 ? '-' + number2 : ''}`;
        roadAddress = `${roadAddress1} ${roadAddress2}`;
        
        if (result.name === 'roadaddr') {
            roadAddress = `${roadAddress1} ${roadAddress2}`;
        } else if (result.name === 'addr') {
            jibunAddress = `${jibunAddress1} ${jibunAddress2}`;
        }
    });
    return { jibunAddress, roadAddress, jibunAddress1, jibunAddress2, roadAddress1, roadAddress2 };
}