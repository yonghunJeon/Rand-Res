let jibunAddress;
let roadAddress;
let map;
let marker;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof naver === 'undefined' || !naver.maps) {
        console.error('Naver Maps API is not loaded.');
        return;
    }

    const recommendButton = document.getElementById('recommend-button');
    const restaurantInfo = document.getElementById('restaurant-info');

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
                    radius: 500,
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
                } else {
                    console.error('상세 주소를 가져오는 데 실패했습니다.');
                }
            })
            .catch(error => {
                console.error('Reverse Geocoding 오류:', error);
            });
    }

    function displayRestaurants(restaurants) {
        // 모든 식당에 주황색 마커를 표시
        restaurants.forEach(restaurant => {
            const latlng = new naver.maps.LatLng(restaurant.y, restaurant.x);
            new naver.maps.Marker({
                position: latlng,
                map: map,
                icon: {
                    content: '<div style="width: 24px; height: 24px; background-color: #FFA500; border-radius: 50%;"></div>',
                    anchor: new naver.maps.Point(12, 12)
                }
            });
        });

        // 랜덤하게 하나의 식당을 선택하여 특별한 마커로 표시
        if (restaurants.length > 0) {
            const randomIndex = Math.floor(Math.random() * restaurants.length);
            const selectedRestaurant = restaurants[randomIndex];
            const selectedLatLng = new naver.maps.LatLng(selectedRestaurant.y, selectedRestaurant.x);
            new naver.maps.Marker({
                position: selectedLatLng,
                map: map,
                icon: {
                    url: '/icon/restaurant-icon.png', // 특별한 마커 아이콘
                    size: new naver.maps.Size(46, 59),
                    origin: new naver.maps.Point(0, 0),
                    anchor: new naver.maps.Point(23, 59)
                }
            });
            console.log('Selected Restaurant:', selectedRestaurant.place_name);
        }
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

    initMap();
});

function extractAddresses(results) {
    let jibunAddress = '';
    let roadAddress = '';
    results.forEach(result => {
        const { region, land } = result;
        const { area1, area2, area3 } = region;
        const { name, number1, number2 } = land;
        const jibunFullAddress = `${area1.name} ${area2.name} ${area3.name} ${number1 ? number1 : ''}${number2 ? '-' + number2 : ''}`;
        const roadFullAddress = `${area1.name} ${area2.name} ${name} ${number1 ? number1 : ''}${number2 ? '-' + number2 : ''}`;
        if (result.name === 'roadaddr') {
            roadAddress = roadFullAddress;
        } else if (result.name === 'addr') {
            jibunAddress = jibunFullAddress;
        }
    });
    return { jibunAddress, roadAddress };
}