let jibunAddress; // 지번 주소 저장
let roadAddress; // 도로명 주소 저장
let map; // 지도 객체를 전역 변수로 이동
let marker; // 전역 변수로 마커 선언
let allRestaurants = []; // 모든 음식점 저장
let allResidences = []; // 모든 주거지 저장
const searchRadius = 500; // 검색 반경 (미터 단위)

document.addEventListener('DOMContentLoaded', function() {
    // Naver Maps API 로드 확인
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
                console.log('Current Position:', currentPosition); // 위치 정보 로그 추가
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
                    radius: searchRadius,
                    strokeColor: '#5347AA',
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    fillColor: '#CFE7FF',
                    fillOpacity: 0.5
                });

                // 현재 위치의 상세 주소를 불러옴
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
                    jibunAddress = addresses.jibunAddress; // 지번 주소 저장
                    roadAddress = addresses.roadAddress; // 도로명 주소 저장
                } else {
                    console.error('상세 주소를 가져오는 데 실패했습니다.');
                }
            })
            .catch(error => {
                console.error('Reverse Geocoding 오류:', error);
            });
    }

    function searchRestaurants(lat, lng) {
        console.log(`Fetching restaurants at lat: ${lat}, lng: ${lng}`); // 서버 요청 로그 추가

        fetch(`/search-restaurant?lat=${lat}&lng=${lng}&roadAddress=${encodeURIComponent(roadAddress)}&jibunAddress=${encodeURIComponent(jibunAddress)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server Response:', data); // 서버 응답 로그 추가
                if (data.items && data.items.length > 0) {
                    const randomRestaurant = data.items[Math.floor(Math.random() * data.items.length)]; // 랜덤으로 1개 선택
                    allRestaurants.push(randomRestaurant); // 모든 음식점 저장
                    restaurantInfo.innerHTML = `
                        <h2>${randomRestaurant.title}</h2>
                        <p>${randomRestaurant.address}</p>
                        <p>${randomRestaurant.telephone}</p>
                        <a href="${randomRestaurant.link}" target="_blank">자세히 보기</a>
                    `;
                    // 주소를 지도에 표시
                    geocodeAddress(randomRestaurant.address); // 상세 주소로 지오코딩 요청
                } else {
                    console.log('No restaurants found within 500 meters.'); // 추가 로그
                    restaurantInfo.innerHTML = '반경 500미터 내에 식당이 없습니다.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                restaurantInfo.innerHTML = '식당 정보를 가져오는 중 오류가 발생했습니다.';
                recommendRandomFromAll();
            });
    }

    function geocodeAddress(address) {
        fetch(`/geocode-address?address=${encodeURIComponent(address)}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'OK' && data.addresses.length > 0) {
                    const result = data.addresses[0];
                    const latlng = new naver.maps.LatLng(result.y, result.x);

                    // 반경 조건 확인
                    if (calculateDistance(map.getCenter(), latlng) > searchRadius) {
                        console.log('검색된 위치가 반경을 초과했습니다.');
                        recommendRandomFromAll();
                        return;
                    }

                    // 기존 마커 제거
                    if (marker) {
                        marker.setMap(null);
                    }

                    // 새로운 마커 추가
                    marker = new naver.maps.Marker({
                        position: latlng,
                        map: map
                    });

                    // 지도 중심을 마커 위치로 이동
                    map.setCenter(latlng);

                    // 주거지 검색
                    searchResidences(result.y, result.x);
                } else {
                    alert('주소를 찾을 수 없습니다.');
                }
            })
            .catch(error => {
                console.error('Geocoding 오류:', error);
                recommendRandomFromAll();
            });
    }

    function searchResidences(lat, lng) {
        console.log(`Fetching residences at lat: ${lat}, lng: ${lng}`); // 서버 요청 로그 추가

        fetch(`/search-residence?lat=${lat}&lng=${lng}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server Response:', data); // 서버 응답 로그 추가
                if (data.items && data.items.length > 0) {
                    const randomResidence = data.items[Math.floor(Math.random() * data.items.length)]; // 랜덤으로 1개 선택
                    allResidences.push(randomResidence); // 모든 주거지 저장
                    // 주거지 주소를 기준으로 다시 음식점 검색
                    fetchReverseGeocode(randomResidence.y, randomResidence.x);
                } else {
                    console.log('No residences found within 500 meters.'); // 추가 로그
                    recommendRandomFromAll();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                recommendRandomFromAll();
            });
    }

    function recommendRandomFromAll() {
        // 중복 제거
        const uniqueRestaurants = Array.from(new Set(allRestaurants.map(a => a.address)))
            .map(address => {
                return allRestaurants.find(a => a.address === address);
            });

        const uniqueResidences = Array.from(new Set(allResidences.map(a => a.address)))
            .map(address => {
                return allResidences.find(a => a.address === address);
            });

        // 랜덤 추천
        const allUnique = [...uniqueRestaurants, ...uniqueResidences];
        if (allUnique.length > 0) {
            const randomPlace = allUnique[Math.floor(Math.random() * allUnique.length)];
            restaurantInfo.innerHTML = `
                <h2>${randomPlace.title}</h2>
                <p>${randomPlace.address}</p>
                <p>${randomPlace.telephone}</p>
                <a href="${randomPlace.link}" target="_blank">자세히 보기</a>
            `;
        } else {
            restaurantInfo.innerHTML = '추천할 장소가 없습니다.';
        }
    }

    function calculateDistance(coord1, coord2) {
        const R = 6371e3; // 지구 반지름 (미터 단위)
        const lat1 = coord1.lat();
        const lon1 = coord1.lng();
        const lat2 = coord2.lat();
        const lon2 = coord2.lng();

        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c; // 미터 단위 거리
        return distance;
    }

    recommendButton.addEventListener('click', function() {
        if (!jibunAddress && !roadAddress) {
            alert('현재 위치를 확인할 수 없습니다.');
            return;
        }

        // currentPosition을 기반으로 검색
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